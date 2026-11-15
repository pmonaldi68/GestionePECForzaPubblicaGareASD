import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Laptop,
  ArrowRight,
  LogOut,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Clock,
  Layers
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Match } from '../types';
import {
  DRIVE_FOLDER_NAME,
  DRIVE_BACKUP_FILENAME,
  googleSignIn,
  googleSignOut,
  saveWorkspaceToGoogleDrive,
  loadWorkspaceFromGoogleDrive,
  checkDriveBackupStatus,
  getAccessToken,
  DriveSyncPayload
} from '../services/googleDriveService';
import { mergeMatchesPreservingSent, ensureUniqueMatchIds } from '../utils/matchMerger';
import { STATUS_REGISTRY_STORAGE_KEY } from '../utils/statusRegistry';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUserChange: (user: User | null) => void;
  matches: Match[];
  useDynamicAsdName: boolean;
  sheetUrl: string;
  lastSyncTime: string | null;
  onRestoreFromDrive: (
    newMatches: Match[],
    newSettings?: { useDynamicAsdName: boolean; sheetUrl: string; lastSyncTime: string | null },
    restoreSettings?: boolean
  ) => void;
}

export const GoogleDriveSyncModal: React.FC<GoogleDriveSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserChange,
  matches,
  useDynamicAsdName,
  sheetUrl,
  lastSyncTime,
  onRestoreFromDrive,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cloud status state
  const [cloudStatus, setCloudStatus] = useState<{
    exists: boolean;
    fileId?: string;
    folderId?: string;
    modifiedTime?: string;
    webViewLink?: string;
  } | null>(null);
  const [isCheckingCloud, setIsCheckingCloud] = useState<boolean>(false);

  // Confirmation dialogs
  const [confirmSaveOpen, setConfirmSaveOpen] = useState<boolean>(false);
  const [confirmLoadOpen, setConfirmLoadOpen] = useState<boolean>(false);
  const [loadMode, setLoadMode] = useState<'replace' | 'merge'>('replace');

  // Check cloud status when user logs in or modal opens
  useEffect(() => {
    let isMounted = true;
    if (isOpen && user) {
      setIsCheckingCloud(true);
      setErrorMessage(null);
      getAccessToken()
        .then(token => {
          if (!token) {
            if (isMounted) setIsCheckingCloud(false);
            return;
          }
          return checkDriveBackupStatus(token);
        })
        .then(res => {
          if (isMounted && res) {
            setCloudStatus(res);
          }
        })
        .catch(err => {
          console.warn('Error checking drive backup:', err);
        })
        .finally(() => {
          if (isMounted) setIsCheckingCloud(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  if (!isOpen) return null;

  const totalMatches = matches.length;
  const sentMatches = matches.filter(m => m.status === 'inviata').length;
  const pendingMatches = totalMatches - sentMatches;

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onUserChange(res.user);
        setSuccessMessage(`Accesso effettuato con ${res.user.email}!`);
        // Check cloud status
        const status = await checkDriveBackupStatus(res.accessToken);
        if (status) setCloudStatus(status);
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch (err: any) {
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Accesso annullato: la finestra di accesso Google è stata chiusa.');
      } else if (err?.code === 'auth/popup-blocked') {
        setErrorMessage('Il browser ha bloccato il popup di accesso Google. Consenti i popup per questo sito e riprova.');
      } else if (err?.code === 'auth/cancelled-popup-request') {
        setErrorMessage('Richiesta di accesso annullata perché era già aperta un\'altra finestra.');
      } else if (err?.code === 'auth/unauthorized-domain') {
        setErrorMessage(
          `Dominio "${host}" non ancora autorizzato in Firebase Authentication. Aggiungi "${host}" tra i Domini autorizzati su Firebase Console (progetto gen-lang-client-0474127624) e tra le origini JavaScript autorizzate del Client OAuth.`
        );
      } else {
        setErrorMessage(err?.message || 'Errore durante l\'accesso con Google.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await googleSignOut();
      onUserChange(null);
      setCloudStatus(null);
      setSuccessMessage('Disconnessione effettuata con successo.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Errore durante la disconnessione.');
    } finally {
      setIsLoading(false);
    }
  };

  const executeSaveToDrive = async () => {
    setConfirmSaveOpen(false);
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let token = await getAccessToken();
      if (!token) {
        // Re-authenticate if token is missing
        const loginRes = await googleSignIn();
        if (!loginRes) throw new Error('Autenticazione richiesta.');
        token = loginRes.accessToken;
        onUserChange(loginRes.user);
      }

      const res = await saveWorkspaceToGoogleDrive(token, {
        matches,
        useDynamicAsdName,
        sheetUrl,
        lastSyncTime,
      });

      setSuccessMessage(
        `Archivio salvato con successo su Google Drive nella cartella "${DRIVE_FOLDER_NAME}"! (${totalMatches} gare, ${sentMatches} protocolli).`
      );

      // Refresh cloud status
      setCloudStatus({
        exists: true,
        fileId: res.fileId,
        folderId: res.folderId,
        modifiedTime: res.modifiedTime,
      });
    } catch (err: any) {
      setErrorMessage(`Errore durante il salvataggio su Google Drive: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const executeLoadFromDrive = async () => {
    setConfirmLoadOpen(false);
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let token = await getAccessToken();
      if (!token) {
        const loginRes = await googleSignIn();
        if (!loginRes) throw new Error('Autenticazione richiesta.');
        token = loginRes.accessToken;
        onUserChange(loginRes.user);
      }

      const backup = await loadWorkspaceFromGoogleDrive(token);
      if (!backup) {
        throw new Error('Nessun file di archivio trovato nella cartella Google Drive.');
      }

      const payload: DriveSyncPayload = backup.payload;
      if (!payload.matches || !Array.isArray(payload.matches)) {
        throw new Error('Il file presente su Google Drive non ha una struttura valida.');
      }

      // Restore status registry to localStorage if present in payload
      if (payload.statusRegistry && typeof payload.statusRegistry === 'object') {
        try {
          localStorage.setItem(STATUS_REGISTRY_STORAGE_KEY, JSON.stringify(payload.statusRegistry));
        } catch {
          // Ignore
        }
      }

      let finalMatches: Match[] = [];
      if (loadMode === 'replace') {
        finalMatches = ensureUniqueMatchIds(payload.matches);
      } else {
        finalMatches = mergeMatchesPreservingSent(matches, payload.matches);
      }

      onRestoreFromDrive(
        finalMatches,
        payload.settings,
        true
      );

      setSuccessMessage(
        loadMode === 'replace'
          ? `Lavoro ripristinato con successo da Google Drive! Caricate ${finalMatches.length} gare con i rispettivi protocolli e stati PEC.`
          : `Gare da Google Drive unite con successo all'archivio corrente. Totale: ${finalMatches.length} gare.`
      );

      // Update cloud status
      setCloudStatus(prev => ({
        exists: true,
        fileId: backup.fileId,
        folderId: backup.folderId,
        modifiedTime: backup.modifiedTime,
        webViewLink: prev?.webViewLink,
      }));
    } catch (err: any) {
      setErrorMessage(`Errore durante il caricamento da Google Drive: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs overflow-y-auto">
      <div className="modal-panel bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-blue-50 via-sky-50 to-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Sincronizzazione Google Drive
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  Multi-Dispositivo
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Salva il tuo lavoro sul cloud e riprendi le richieste PEC su un altro computer in tempo reale
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alerts */}
        <div className="px-6 pt-4 space-y-2">
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <div className="flex-1">{errorMessage}</div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          {/* User Authentication Status Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Utente'}
                    className="w-10 h-10 rounded-full border border-blue-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-xs font-bold text-slate-900">
                      {user.displayName || user.email}
                    </strong>
                    <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Connesso
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    {user.email}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <strong className="text-xs font-bold text-slate-900 block">
                  Nessun account Google collegato
                </strong>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Accedi con il tuo account Google per salvare l'archivio direttamente nel tuo Google Drive personale.
                </p>
              </div>
            )}

            <div>
              {user ? (
                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                  <span>Disconnetti</span>
                </button>
              ) : (
                <button
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  {/* Official Google 'G' icon */}
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{isLoading ? 'Accesso in corso...' : 'Accedi con Google'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Multi-Device Instructions Guide */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
            <div className="flex items-center gap-2 text-blue-950 font-bold text-xs uppercase tracking-wider">
              <Laptop className="w-4 h-4 text-blue-600" />
              <span>Come proseguire il lavoro da un altro PC:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Salva qui su Drive</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Clicca su <strong>"Salva Lavoro su Drive"</strong>. Verrà creata la cartella <em>"{DRIVE_FOLDER_NAME}"</em> con tutte le gare e i protocolli.
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Apri l'altro PC</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Accedi all'applicazione dal nuovo computer ed effettua il login con lo stesso account Google (<strong>{user?.email || 'paolomonaldi@gmail.com'}</strong>).
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Carica da Drive</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Clicca su <strong>"Carica da Drive"</strong>. Tutte le gare, le ricevute PEC inviate e i protocolli saranno ripristinati istantaneamente!
                </p>
              </div>
            </div>
          </div>

          {/* Cloud Status Info */}
          {user && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Cartella Google Drive: <span className="text-blue-700">{DRIVE_FOLDER_NAME}</span>
                  </span>
                </div>
                {isCheckingCloud ? (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                    Verifica cloud...
                  </span>
                ) : cloudStatus?.exists ? (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Archivio presente su Drive
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Nessun backup trovato su Drive
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Stato Locale Attuale</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <strong className="text-base font-bold text-slate-900">{totalMatches}</strong>
                    <span className="text-[11px] text-slate-500">gare ({sentMatches} inviate)</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Ultimo Aggiornamento Cloud</span>
                  <div className="mt-1">
                    {cloudStatus?.modifiedTime ? (
                      <span className="text-xs font-semibold text-slate-800">
                        {new Date(cloudStatus.modifiedTime).toLocaleDateString('it-IT')} alle {new Date(cloudStatus.modifiedTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Non ancora sincronizzato</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Save to Drive Button */}
            <button
              onClick={() => {
                if (!user) {
                  handleSignIn();
                } else {
                  setConfirmSaveOpen(true);
                }
              }}
              disabled={isLoading || matches.length === 0}
              className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Salva Lavoro su Google Drive</span>
            </button>

            {/* Load from Drive Button */}
            <button
              onClick={() => {
                if (!user) {
                  handleSignIn();
                } else {
                  setConfirmLoadOpen(true);
                }
              }}
              disabled={isLoading || (!cloudStatus?.exists && Boolean(user))}
              className={`py-3 px-4 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                cloudStatus?.exists
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              }`}
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Carica da Google Drive</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {user ? `Account: ${user.email}` : 'Accesso Google per sincronizzazione cloud'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODAL: SAVE TO DRIVE */}
      {confirmSaveOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-blue-700">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <UploadCloud className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Conferma Salvataggio su Google Drive
                </h3>
                <span className="text-xs text-slate-500">
                  Account: {user?.email}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Stai per caricare l'intero archivio nella cartella <strong className="text-slate-900">"{DRIVE_FOLDER_NAME}"</strong> su Google Drive:
            </p>

            <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-950 space-y-1">
              <div className="flex justify-between">
                <span>Gare nel calendario:</span>
                <strong className="font-bold">{totalMatches}</strong>
              </div>
              <div className="flex justify-between">
                <span>Ricevute PEC inviate e protocolli:</span>
                <strong className="font-bold text-emerald-800">{sentMatches}</strong>
              </div>
              <div className="flex justify-between">
                <span>File di destinazione:</span>
                <span className="font-mono text-[11px] text-blue-800">{DRIVE_BACKUP_FILENAME}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Se esisteva già una copia precedente sul cloud, verrà aggiornata con lo stato corrente.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmSaveOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={executeSaveToDrive}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Sì, Salva su Google Drive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: LOAD FROM DRIVE */}
      {confirmLoadOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-emerald-700">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DownloadCloud className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Conferma Caricamento da Google Drive
                </h3>
                <span className="text-xs text-slate-500">
                  Ripristina archivio su questo PC
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Vuoi scaricare e applicare l'archivio salvato su Google Drive?
            </p>

            {/* Mode selection */}
            <div className="space-y-2 text-xs">
              <label className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer ${
                loadMode === 'replace'
                  ? 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500'
                  : 'bg-white border-slate-200'
              }`}>
                <input
                  type="radio"
                  name="driveLoadMode"
                  checked={loadMode === 'replace'}
                  onChange={() => setLoadMode('replace')}
                  className="mt-0.5 text-emerald-600"
                />
                <div>
                  <strong className="text-slate-900 block font-bold">Sostituisci Tutto (Consigliato per cambio PC)</strong>
                  <span className="text-[11px] text-slate-500 leading-tight block">
                    Carica esattamente la versione presente su Google Drive.
                  </span>
                </div>
              </label>

              <label className={`p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer ${
                loadMode === 'merge'
                  ? 'bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500'
                  : 'bg-white border-slate-200'
              }`}>
                <input
                  type="radio"
                  name="driveLoadMode"
                  checked={loadMode === 'merge'}
                  onChange={() => setLoadMode('merge')}
                  className="mt-0.5 text-emerald-600"
                />
                <div>
                  <strong className="text-slate-900 block font-bold">Unisci con le gare attuali</strong>
                  <span className="text-[11px] text-slate-500 leading-tight block">
                    Mantiene eventuali gare non presenti nel file cloud.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmLoadOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={executeLoadFromDrive}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                Sì, Carica da Google Drive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
