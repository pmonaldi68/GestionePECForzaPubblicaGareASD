import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Match } from '../types';
import { STATUS_REGISTRY_STORAGE_KEY } from '../utils/statusRegistry';

// MANDATORY: Exported SCOPES matching set_up_oauth configuration
export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file'
];

export const DRIVE_FOLDER_NAME = 'Richieste PEC Forza Pubblica - Archivio';
export const DRIVE_BACKUP_FILENAME = 'archivio_gare_pec_forza_pubblica.json';

// Initialize Firebase App & Auth
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach(s => provider.addScope(s));
provider.setCustomParameters({
  prompt: 'select_account'
});

// In-memory token cache (DO NOT store in localStorage or sessionStorage per security guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Initializes the auth listener to track authentication status and clear in-memory token on logout.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token not in memory; user needs to re-authenticate via button
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Initiates the Google Sign-in popup flow and caches the OAuth access token in memory.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Impossibile ottenere il token di accesso Google per Drive.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieves the current cached access token from memory.
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Signs the user out and clears the memory token cache.
 */
export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Finds or creates the dedicated application folder on Google Drive.
 */
export async function findOrCreateAppFolder(token: string): Promise<string> {
  const query = encodeURIComponent(`name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Errore durante la ricerca della cartella Drive: ${errText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder if it doesn't exist yet
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Archivio sincronizzato per la gestione delle richieste PEC di Forza Pubblica',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Errore creazione cartella su Google Drive: ${errText}`);
  }

  const createData = await createRes.json();
  return createData.id;
}

/**
 * Checks if a backup file already exists in the dedicated Drive folder.
 */
export async function checkDriveBackupStatus(token: string): Promise<{
  exists: boolean;
  fileId?: string;
  folderId?: string;
  modifiedTime?: string;
  matchCount?: number;
  webViewLink?: string;
} | null> {
  try {
    const folderId = await findOrCreateAppFolder(token);
    const query = encodeURIComponent(`name='${DRIVE_BACKUP_FILENAME}' and '${folderId}' in parents and trashed=false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size,webViewLink)`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!searchRes.ok) return null;
    const data = await searchRes.json();
    if (!data.files || data.files.length === 0) {
      return { exists: false, folderId };
    }

    const file = data.files[0];
    return {
      exists: true,
      fileId: file.id,
      folderId,
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
    };
  } catch (err) {
    console.warn('Failed to check Drive backup status:', err);
    return null;
  }
}

export interface DriveSyncPayload {
  version: string;
  timestamp: string;
  app: string;
  sourceDevice: string;
  settings: {
    useDynamicAsdName: boolean;
    sheetUrl: string;
    lastSyncTime: string | null;
  };
  statusRegistry: any;
  matches: Match[];
}

/**
 * Saves the entire local workspace (matches, status registry, settings)
 * into a JSON file inside the Google Drive folder.
 */
export async function saveWorkspaceToGoogleDrive(
  token: string,
  dataToSave: {
    matches: Match[];
    useDynamicAsdName: boolean;
    sheetUrl: string;
    lastSyncTime: string | null;
  }
): Promise<{ fileId: string; folderId: string; modifiedTime: string }> {
  const folderId = await findOrCreateAppFolder(token);

  // Retrieve current status registry map
  let currentStatusRegistry: any = {};
  try {
    const rawReg = localStorage.getItem(STATUS_REGISTRY_STORAGE_KEY);
    if (rawReg) currentStatusRegistry = JSON.parse(rawReg);
  } catch {
    // Ignore
  }

  const payload: DriveSyncPayload = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    app: 'ASD PEC Forza Pubblica',
    sourceDevice: navigator.userAgent || 'Web Browser',
    settings: {
      useDynamicAsdName: dataToSave.useDynamicAsdName,
      sheetUrl: dataToSave.sheetUrl,
      lastSyncTime: dataToSave.lastSyncTime,
    },
    statusRegistry: currentStatusRegistry,
    matches: dataToSave.matches,
  };

  const fileContent = JSON.stringify(payload, null, 2);

  // Check if file exists in folder
  const query = encodeURIComponent(`name='${DRIVE_BACKUP_FILENAME}' and '${folderId}' in parents and trashed=false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const searchData = await searchRes.json();
  const existingFile = searchData.files && searchData.files.length > 0 ? searchData.files[0] : null;

  if (existingFile) {
    // Update existing file content
    const updateRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: fileContent,
    });

    if (!updateRes.ok) {
      const err = await updateRes.text();
      throw new Error(`Errore durante l'aggiornamento del file su Google Drive: ${err}`);
    }

    const updated = await updateRes.json();
    return {
      fileId: existingFile.id,
      folderId,
      modifiedTime: updated.modifiedTime || new Date().toISOString(),
    };
  } else {
    // Create new file with multipart upload
    const metadata = {
      name: DRIVE_BACKUP_FILENAME,
      parents: [folderId],
      mimeType: 'application/json',
      description: 'Archivio sincronizzato gare e richieste PEC per Forza Pubblica',
    };

    const boundary = '-------ASD_DRIVE_BOUNDARY_' + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      fileContent +
      closeDelimiter;

    const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Errore creazione file su Google Drive: ${err}`);
    }

    const created = await createRes.json();
    return {
      fileId: created.id,
      folderId,
      modifiedTime: created.modifiedTime || new Date().toISOString(),
    };
  }
}

/**
 * Downloads and parses the workspace backup from Google Drive.
 */
export async function loadWorkspaceFromGoogleDrive(token: string): Promise<{
  payload: DriveSyncPayload;
  fileId: string;
  folderId: string;
  modifiedTime: string;
} | null> {
  const folderId = await findOrCreateAppFolder(token);

  const query = encodeURIComponent(`name='${DRIVE_BACKUP_FILENAME}' and '${folderId}' in parents and trashed=false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!searchRes.ok) {
    throw new Error('Impossibile verificare i file nella cartella Google Drive.');
  }

  const searchData = await searchRes.json();
  if (!searchData.files || searchData.files.length === 0) {
    return null;
  }

  const file = searchData.files[0];
  const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!downloadRes.ok) {
    throw new Error('Impossibile scaricare il file di archivio da Google Drive.');
  }

  const payload: DriveSyncPayload = await downloadRes.json();
  return {
    payload,
    fileId: file.id,
    folderId,
    modifiedTime: file.modifiedTime || new Date().toISOString(),
  };
}
