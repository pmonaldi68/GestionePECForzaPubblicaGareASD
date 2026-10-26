import React, { useState, useRef } from 'react';
import { 
  X, 
  Database, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  FileJson, 
  ShieldCheck, 
  Calendar, 
  Clock, 
  RefreshCw,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Match } from '../types';
import { 
  AppArchiveBackup, 
  downloadArchiveBackup, 
  parseAndValidateBackup 
} from '../utils/excelExport';
import { mergeMatchesPreservingSent, ensureUniqueMatchIds } from '../utils/matchMerger';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Match[];
  useDynamicAsdName: boolean;
  sheetUrl: string;
  lastSyncTime: string | null;
  onRestoreArchive: (
    newMatches: Match[], 
    newSettings?: { useDynamicAsdName: boolean; sheetUrl: string; lastSyncTime: string | null },
    restoreSettings?: boolean
  ) => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  matches,
  useDynamicAsdName,
  sheetUrl,
  lastSyncTime,
  onRestoreArchive,
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);

  // Restore state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<AppArchiveBackup | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [restoreSettings, setRestoreSettings] = useState<boolean>(true);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const totalMatches = matches.length;
  const sentMatches = matches.filter(m => m.status === 'inviata').length;
  const pendingMatches = totalMatches - sentMatches;
  const homeMatches = matches.filter(m => m.isHome).length;

  const handleDownloadBackup = () => {
    try {
      downloadArchiveBackup(matches, {
        useDynamicAsdName,
        sheetUrl,
        lastSyncTime,
      });
      setBackupSuccessMessage(
        `Archivio salvato con successo! File di backup scaricato con ${matches.length} gare e ${sentMatches} protocolli.`
      );
      setTimeout(() => setBackupSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(`Errore durante il salvataggio dell'archivio: ${err?.message}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParseError(null);
    setParsedBackup(null);
    setRestoreSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const text = event.target?.result as string;
        const backupData = parseAndValidateBackup(text);
        setParsedBackup(backupData);
      } catch (err: any) {
        setParseError(err?.message || 'Impossibile leggere il file selezionato.');
      }
    };
    reader.onerror = () => {
      setParseError('Errore durante la lettura del file dal disco.');
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    if (!parsedBackup) return;

    try {
      let finalMatches: Match[] = [];
      if (restoreMode === 'replace') {
        finalMatches = ensureUniqueMatchIds(parsedBackup.matches);
      } else {
        // Smart merge: merge backup matches into current matches preserving existing sent status
        finalMatches = mergeMatchesPreservingSent(matches, parsedBackup.matches);
      }

      onRestoreArchive(
        finalMatches,
        parsedBackup.settings,
        restoreSettings
      );

      setRestoreSuccessMessage(
        restoreMode === 'replace'
          ? `Archivio ripristinato con successo! Caricate ${finalMatches.length} gare (${parsedBackup.sentMatchCount} inviate con protocollo).`
          : `Archivio unito con successo! Totale attuale: ${finalMatches.length} gare.`
      );

      // Reset file input after 2 seconds
      setTimeout(() => {
        setSelectedFile(null);
        setParsedBackup(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 2500);
    } catch (err: any) {
      alert(`Errore durante il ripristino dell'archivio: ${err?.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-purple-50 via-indigo-50/70 to-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Salvataggio & Ripristino Locale dell'Archivio
              </h2>
              <p className="text-xs text-slate-500">
                Salva una copia completa su disco e ripristina gare, stati PEC, protocolli e date in qualsiasi momento
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

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('backup')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'backup'
                ? 'border-purple-600 text-purple-900 bg-white rounded-t-lg border-t border-x'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4 text-purple-600" />
            <span>Salva Archivio (Backup Locale)</span>
          </button>

          <button
            onClick={() => setActiveTab('restore')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'restore'
                ? 'border-indigo-600 text-indigo-900 bg-white rounded-t-lg border-t border-x'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>Ripristina Archivio (Restore Locale)</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* ========================================================================= */}
          {/* --- TAB 1: SALVATAGGIO / BACKUP LOCALE --- */}
          {/* ========================================================================= */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              {backupSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{backupSuccessMessage}</span>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                Il salvataggio in locale esporta un file <strong className="text-slate-900">.JSON</strong> contenente l'intero stato dell'applicazione. È perfetto per creare copie di sicurezza prima di modifiche, trasferire l'archivio su un altro computer o archiviare lo storico a fine stagione.
              </p>

              {/* Current Archive Summary Card */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-purple-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                      Stato Attuale dell'Archivio
                    </span>
                  </div>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    {totalMatches} gare registrate
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Totale Gare</span>
                    <strong className="text-base font-bold text-slate-900">{totalMatches}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-emerald-700 block text-[10px] uppercase font-semibold">PEC Inviate</span>
                    <strong className="text-base font-bold text-emerald-700">{sentMatches}</strong>
                    <span className="text-[10px] text-slate-400 block">con protocollo</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-amber-700 block text-[10px] uppercase font-semibold">Da Inviare</span>
                    <strong className="text-base font-bold text-amber-700">{pendingMatches}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-purple-100 shadow-2xs">
                    <span className="text-slate-500 block text-[10px] uppercase font-semibold">Gare in Casa</span>
                    <strong className="text-base font-bold text-slate-800">{homeMatches}</strong>
                  </div>
                </div>

                <div className="text-[11px] text-purple-900/80 space-y-1 pt-1 border-t border-purple-100">
                  <div className="flex items-center justify-between">
                    <span>Sincronizzazione Google Sheet:</span>
                    <strong className="font-mono text-purple-950 truncate max-w-[280px]">
                      {sheetUrl ? 'Configurato' : 'Nessun foglio collegato'}
                    </strong>
                  </div>
                  {lastSyncTime && (
                    <div className="flex items-center justify-between">
                      <span>Ultima sincronizzazione:</span>
                      <strong className="text-purple-950">{lastSyncTime}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Download Backup Button */}
              <div className="pt-2">
                <button
                  onClick={handleDownloadBackup}
                  disabled={totalMatches === 0}
                  className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Scarica Backup Completo dell'Archivio (.JSON)</span>
                </button>
                <p className="text-[11px] text-slate-400 text-center mt-2">
                  Il file scaricato potrà essere ricaricato in qualsiasi momento tramite la scheda "Ripristina Archivio".
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* --- TAB 2: RIPRISTINO / RESTORE LOCALE --- */}
          {/* ========================================================================= */}
          {activeTab === 'restore' && (
            <div className="space-y-4">
              {restoreSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{restoreSuccessMessage}</span>
                </div>
              )}

              {parseError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              <p className="text-xs text-slate-600 leading-relaxed">
                Seleziona un file di backup precedentemente salvato per ripristinare o unire le gare, le ricevute PEC inviate e i protocolli.
              </p>

              {/* File Upload Zone */}
              <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-5 text-center bg-slate-50/60 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                  id="backup-file-input"
                />
                <label
                  htmlFor="backup-file-input"
                  className="flex flex-col items-center justify-center cursor-pointer space-y-2"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <FileJson className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    {selectedFile ? selectedFile.name : 'Clicca per selezionare il file di backup (.json)'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {selectedFile 
                      ? `${(selectedFile.size / 1024).toFixed(1)} KB` 
                      : 'File compatibile con i backup di Gestione PEC Forza Pubblica'}
                  </span>
                </label>
              </div>

              {/* Parsed File Preview & Options */}
              {parsedBackup && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                        Contenuto Rilevato nel File
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                      {parsedBackup.matchCount} gare
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Gare Totali</span>
                      <strong className="text-sm font-bold text-slate-900">{parsedBackup.matchCount}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                      <span className="text-emerald-700 block text-[10px] uppercase font-semibold">PEC Inviate</span>
                      <strong className="text-sm font-bold text-emerald-700">{parsedBackup.sentMatchCount}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100 col-span-2 sm:col-span-1">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Data Backup</span>
                      <strong className="text-[11px] font-semibold text-slate-800 truncate block">
                        {parsedBackup.exportDate}
                      </strong>
                    </div>
                  </div>

                  {/* Mode Selector */}
                  <div className="space-y-2 pt-2 border-t border-indigo-100">
                    <span className="text-xs font-bold text-slate-800 block">
                      Modalità di Ripristino:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                        restoreMode === 'replace'
                          ? 'bg-white border-indigo-500 shadow-xs ring-1 ring-indigo-500'
                          : 'bg-white/60 border-slate-200 hover:bg-white'
                      }`}>
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={restoreMode === 'replace'}
                          onChange={() => setRestoreMode('replace')}
                          className="mt-0.5 w-4 h-4 text-indigo-600"
                        />
                        <div>
                          <strong className="text-slate-900 block font-bold">Sostituisci Tutto (Consigliato)</strong>
                          <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                            Ripristina esattamente l'archivio com'era al momento del salvataggio.
                          </span>
                        </div>
                      </label>

                      <label className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-colors ${
                        restoreMode === 'merge'
                          ? 'bg-white border-indigo-500 shadow-xs ring-1 ring-indigo-500'
                          : 'bg-white/60 border-slate-200 hover:bg-white'
                      }`}>
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={restoreMode === 'merge'}
                          onChange={() => setRestoreMode('merge')}
                          className="mt-0.5 w-4 h-4 text-indigo-600"
                        />
                        <div>
                          <strong className="text-slate-900 block font-bold">Unisci all'Archivio Corrente</strong>
                          <span className="text-[11px] text-slate-500 leading-tight block mt-0.5">
                            Aggiunge le gare dal backup preservando quelle già inviate attuali.
                          </span>
                        </div>
                      </label>
                    </div>

                    <label className="flex items-center gap-2 pt-1 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restoreSettings}
                        onChange={e => setRestoreSettings(e.target.checked)}
                        className="rounded text-indigo-600 w-3.5 h-3.5"
                      />
                      <span>Ripristina anche le impostazioni (link foglio Google e formulazione intestazione ASD)</span>
                    </label>
                  </div>

                  {/* Confirm Restore Button */}
                  <button
                    onClick={handleExecuteRestore}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Conferma Ripristino Archivio ({parsedBackup.matchCount} Gare)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {totalMatches} gare attualmente caricate
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
