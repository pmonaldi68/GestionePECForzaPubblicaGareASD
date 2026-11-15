import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  FileText,
  Upload,
  RefreshCw,
  Settings,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Database,
  Cloud,
  ChevronDown,
  FileCheck2,
  FolderArchive
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Match } from '../types';

interface HeaderProps {
  matches: Match[];
  onOpenImport: () => void;
  onOpenBatchExport: () => void;
  onOpenSettings: () => void;
  onLoadSampleData: () => void;
  onDownloadAllZip: () => void;
  onDownloadAllPdfsZip?: () => void;
  onOpenExportExcel?: () => void;
  onOpenBackupRestore?: () => void;
  user?: User | null;
  onOpenDriveSync?: () => void;
  activeStatusFilter?: 'ALL' | 'da_inviare' | 'inviata';
  onQuickStatusFilter?: (status: 'ALL' | 'da_inviare' | 'inviata') => void;
}

export const Header: React.FC<HeaderProps> = ({
  matches,
  onOpenImport,
  onOpenBatchExport,
  onOpenSettings,
  onLoadSampleData,
  onDownloadAllZip,
  onDownloadAllPdfsZip,
  onOpenExportExcel,
  onOpenBackupRestore,
  user,
  onOpenDriveSync,
  activeStatusFilter,
  onQuickStatusFilter,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const homeMatches = matches.filter(m => m.isHome);
  const sentMatches = homeMatches.filter(m => m.status === 'inviata');
  const pendingMatches = homeMatches.filter(m => m.status === 'da_inviare');

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <header className="bg-white border-b border-slate-200">
      {/* Compact 1-Row Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Clean Single-Line Brand Mark */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Shield className="w-4.5 h-4.5 text-amber-400" />
          </div>
          <h1 className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap truncate">
            Gestione PEC Forza Pubblica
          </h1>
        </div>

        {/* Zone 2 & 3: Focused Action Cluster + Progressive Disclosure Overflow */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenDriveSync && (
            <button
              type="button"
              onClick={onOpenDriveSync}
              className={`inline-flex items-center gap-2 h-9 px-3 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                user
                  ? 'border-blue-200 bg-blue-50/70 text-blue-800 hover:bg-blue-100/80'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
              title="Sincronizza l'archivio su Google Drive per continuare su un altro PC"
            >
              <Cloud className={`w-4 h-4 ${user ? 'text-blue-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">
                {user ? 'Drive Connesso' : 'Google Drive'}
              </span>
            </button>
          )}

          {/* Overflow Menu for Exports, Backup & Settings (content-first-noise-reduction) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(prev => !prev)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Strumenti & Export</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                  menuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="modal-panel absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 z-40 text-xs"
              >
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400">
                  Esportazione Documenti
                </div>

                {onDownloadAllPdfsZip && (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={homeMatches.length === 0}
                    onClick={() => {
                      setMenuOpen(false);
                      onDownloadAllPdfsZip();
                    }}
                    className="w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <FileCheck2 className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Scarica PDF Attestazioni</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {homeMatches.length}
                    </span>
                  </button>
                )}

                {onOpenExportExcel && (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={matches.length === 0}
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenExportExcel();
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Esporta Excel / CSV</span>
                  </button>
                )}

                <button
                  type="button"
                  role="menuitem"
                  disabled={homeMatches.length === 0}
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenBatchExport();
                  }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Tutti i Formati (PDF / CSV)</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  disabled={homeMatches.length === 0}
                  onClick={() => {
                    setMenuOpen(false);
                    onDownloadAllZip();
                  }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 font-medium disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <FolderArchive className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Archivio Bozze .TXT (ZIP)</span>
                </button>

                <div className="my-1.5 border-t border-slate-100" />
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400">
                  Sistema & Archivio
                </div>

                {onOpenBackupRestore && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenBackupRestore();
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer transition-colors"
                  >
                    <Database className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>Backup & Ripristino Locale</span>
                  </button>
                )}

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Impostazioni Società & PEC</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onLoadSampleData();
                  }}
                  className="w-full text-left px-3 py-2 flex items-center gap-2 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Ripristina Dati Demo</span>
                </button>
              </div>
            )}
          </div>

          {/* Settings Quick Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            title="Configurazione impianti, referenti e PEC commissariato"
            aria-label="Impostazioni"
            className="hidden sm:inline-flex items-center justify-center w-9 h-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Primary Action */}
          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importa Foglio</span>
          </button>
        </div>
      </div>

      {/* Clean Hairline KPI Telemetry Strip (Zero Nested Cards) */}
      <div className="border-t border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <p className="text-xs text-slate-500">
            Richiesta servizio d'ordine al <span className="font-medium text-slate-700">Commissariato di P.S. Genzano di Roma</span> · Art. 62 commi 4–5 N.O.I.F.
          </p>

          <div className="grid grid-cols-4 divide-x divide-slate-200 border border-slate-200/90 bg-white rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => onQuickStatusFilter?.('ALL')}
              className={`px-3.5 py-2 text-left transition-colors cursor-pointer hover:bg-slate-50 ${
                activeStatusFilter === 'ALL' ? 'bg-slate-50' : ''
              }`}
              title="Mostra tutte le gare nel calendario"
            >
              <span className="block text-[11px] font-medium text-slate-500 whitespace-nowrap">
                Calendario
              </span>
              <span className="block font-display text-lg font-bold text-slate-900 tabular-nums leading-tight mt-0.5">
                {matches.length}
              </span>
            </button>

            <div className="px-3.5 py-2 text-left">
              <span className="block text-[11px] font-medium text-slate-500 whitespace-nowrap">
                In Casa
              </span>
              <span className="block font-display text-lg font-bold text-amber-700 tabular-nums leading-tight mt-0.5">
                {homeMatches.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onQuickStatusFilter?.('da_inviare')}
              className={`px-3.5 py-2 text-left transition-colors cursor-pointer hover:bg-rose-50/40 ${
                activeStatusFilter === 'da_inviare' ? 'bg-rose-50/40' : ''
              }`}
              title="Filtra gare con PEC da inviare"
            >
              <span className="flex items-center gap-1 text-[11px] font-medium text-rose-700 whitespace-nowrap">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>Da Inviare</span>
              </span>
              <span className="block font-display text-lg font-bold text-rose-700 tabular-nums leading-tight mt-0.5">
                {pendingMatches.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onQuickStatusFilter?.('inviata')}
              className={`px-3.5 py-2 text-left transition-colors cursor-pointer hover:bg-emerald-50/40 ${
                activeStatusFilter === 'inviata' ? 'bg-emerald-50/40' : ''
              }`}
              title="Filtra gare con PEC inviata"
            >
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 whitespace-nowrap">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>PEC Inviate</span>
              </span>
              <span className="block font-display text-lg font-bold text-emerald-700 tabular-nums leading-tight mt-0.5">
                {sentMatches.length}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
