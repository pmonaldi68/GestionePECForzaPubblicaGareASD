import * as XLSX from 'xlsx';
import { Match } from '../types';
import { CLUBS, COMMISSARIATO_INFO } from '../config/clubsData';
import { generatePecForMatch, resolveMatchCategory } from './pecGenerator';
import { normalizeToGGMMMAAAA } from './dateUtils';
import { formatCurrentSendDate, generateProtocolloNumber } from './matchMerger';

export interface AppArchiveBackup {
  version: '1.0';
  timestamp: string; // ISO string
  exportDate: string; // Formatted date e.g. "26/10/2026 alle 11:45"
  matchCount: number;
  sentMatchCount: number;
  settings: {
    useDynamicAsdName: boolean;
    sheetUrl: string;
    lastSyncTime: string | null;
  };
  matches: Match[];
}

/**
 * Maps a Match object to an orderly, comprehensive record for Excel/CSV export.
 * Includes all required status fields:
 * - Stato di Invio PEC ('Inviata' / 'Da Inviare')
 * - Data di Invio PEC (pecSentDate)
 * - Numero di Protocollo (protocollo)
 */
export function formatMatchRowForExport(m: Match, useDynamicAsdName: boolean = true) {
  const club = CLUBS[m.clubId] || CLUBS.CYNTHIA_1920;
  const pec = generatePecForMatch(m, useDynamicAsdName);
  const resolvedCategory = resolveMatchCategory(m);

  const statoInvio = m.status === 'inviata' ? 'Inviata' : 'Da Inviare';
  const dataInvio = m.pecSentDate || (m.status === 'inviata' ? formatCurrentSendDate() : '');
  const protocollo = m.protocollo || (m.status === 'inviata' ? generateProtocolloNumber() : '');

  return {
    'ID Gara': m.id,
    'Società': club.name,
    'Categoria Ufficiale': resolvedCategory,
    'Campionato': m.campionato || '',
    'Girone': m.girone || '',
    'Giornata': m.giornata || '',
    'Data Incontro': normalizeToGGMMMAAAA(m.data),
    'Ora Incontro': m.ora || '15:00',
    'Squadra Casa': m.squadraCasa || '',
    'Squadra Ospite': m.squadraOspite || '',
    'Tipo Gara': m.isHome ? 'CASA (Obbligo PEC Art. 62)' : 'TRASFERTA',
    'Stato Invio PEC': statoInvio,
    'Data Invio PEC': dataInvio,
    'Numero Protocollo': protocollo,
    'Destinatario PEC': COMMISSARIATO_INFO.pec,
    'Autorità Pubblica Sicurezza': COMMISSARIATO_INFO.name,
    'Impianto Sportivo': pec.impianto,
    'Contatto Referente': pec.contatto,
    'Chiusura e Firma': pec.chiusuraFirma,
    'Oggetto PEC': pec.oggetto,
    'Testo Completo PEC': pec.testoCompleto,
  };
}

/**
 * Downloads a binary blob directly in the browser
 */
function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports a list of matches (e.g. all filtered matches) to a real Excel (.xlsx) workbook.
 */
export function exportMatchesToXlsx(
  matches: Match[],
  customFilename?: string,
  useDynamicAsdName: boolean = true
): void {
  if (!matches || matches.length === 0) return;

  const rows = matches.map(m => formatMatchRowForExport(m, useDynamicAsdName));
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-fit column widths nicely based on header and data length
  const colWidths = Object.keys(rows[0] || {}).map(key => {
    let maxLen = key.length;
    for (const r of rows) {
      const valStr = String((r as any)[key] || '');
      // Don't let huge multi-line fields blow up column width
      const firstLine = valStr.split('\n')[0];
      if (firstLine.length > maxLen) {
        maxLen = Math.min(60, firstLine.length);
      }
    }
    return { wch: Math.max(12, maxLen + 3) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Gare PEC Forza Pubblica');

  const xlsxBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([xlsxBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `Gare_Filtrate_PEC_ForzaPubblica_${dateStr}_(${matches.length}_gare).xlsx`;
  triggerBrowserDownload(blob, filename);
}

/**
 * Exports a list of matches to a standardized CSV file with UTF-8 BOM and ';' delimiter
 * for direct double-click opening in Microsoft Excel.
 */
export function exportMatchesToCsv(
  matches: Match[],
  customFilename?: string,
  useDynamicAsdName: boolean = true
): void {
  if (!matches || matches.length === 0) return;

  const rows = matches.map(m => formatMatchRowForExport(m, useDynamicAsdName));
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);

  const escapeCsvField = (val: any): string => {
    const str = String(val ?? '');
    const clean = str.replace(/"/g, '""');
    return `"${clean}"`;
  };

  const csvRows: string[] = [];
  // Header row
  csvRows.push(headers.map(escapeCsvField).join(';'));

  // Data rows
  rows.forEach(r => {
    const line = headers.map(h => escapeCsvField((r as any)[h])).join(';');
    csvRows.push(line);
  });

  // UTF-8 BOM (\uFEFF) ensures Excel opens accented letters (à, è, é, ì, ò, ù) correctly
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `Gare_Filtrate_PEC_ForzaPubblica_${dateStr}_(${matches.length}_gare).csv`;
  triggerBrowserDownload(blob, filename);
}

/**
 * Generates and downloads a complete JSON snapshot file of the entire local archive.
 */
export function downloadArchiveBackup(
  matches: Match[],
  settings: {
    useDynamicAsdName: boolean;
    sheetUrl: string;
    lastSyncTime: string | null;
  }
): void {
  const now = new Date();
  const sentCount = matches.filter(m => m.status === 'inviata').length;

  const backupData: AppArchiveBackup = {
    version: '1.0',
    timestamp: now.toISOString(),
    exportDate: `${normalizeToGGMMMAAAA(now.toLocaleDateString('it-IT'))} alle ${now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`,
    matchCount: matches.length,
    sentMatchCount: sentCount,
    settings,
    matches,
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

  const dateStr = now.toISOString().slice(0, 10);
  const filename = `Backup_Archivio_PEC_ForzaPubblica_${dateStr}.json`;
  triggerBrowserDownload(blob, filename);
}

/**
 * Validates and parses a JSON string into a structured AppArchiveBackup.
 * Throws a descriptive Italian error if the format is invalid.
 */
export function parseAndValidateBackup(jsonString: string): AppArchiveBackup {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err: any) {
    throw new Error('Il file selezionato non è un JSON valido: ' + (err?.message || 'sintassi non corretta'));
  }

  // Support both direct AppArchiveBackup format and legacy raw Match[] array format
  if (Array.isArray(parsed)) {
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      exportDate: 'Archivio importato da elenco gare',
      matchCount: parsed.length,
      sentMatchCount: parsed.filter((m: any) => m?.status === 'inviata').length,
      settings: {
        useDynamicAsdName: true,
        sheetUrl: '',
        lastSyncTime: null,
      },
      matches: parsed,
    };
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.matches)) {
    throw new Error('Il file non contiene un archivio gare valido (chiave "matches" mancante).');
  }

  return {
    version: parsed.version || '1.0',
    timestamp: parsed.timestamp || new Date().toISOString(),
    exportDate: parsed.exportDate || 'Data non specificata',
    matchCount: parsed.matches.length,
    sentMatchCount: parsed.matches.filter((m: any) => m?.status === 'inviata').length,
    settings: {
      useDynamicAsdName: parsed.settings?.useDynamicAsdName ?? true,
      sheetUrl: parsed.settings?.sheetUrl || '',
      lastSyncTime: parsed.settings?.lastSyncTime || null,
    },
    matches: parsed.matches,
  };
}
