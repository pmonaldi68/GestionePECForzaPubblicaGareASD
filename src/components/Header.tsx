import { Shield, FileText, Upload, RefreshCw, Settings, Download, CheckCircle2, AlertCircle, FileSpreadsheet, Database } from 'lucide-react';
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
}) => {
  const homeMatches = matches.filter(m => m.isHome);
  const sentMatches = homeMatches.filter(m => m.status === 'inviata');
  const pendingMatches = homeMatches.filter(m => m.status === 'da_inviare');

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Brand & Subtitle */}
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Gestione PEC Forza Pubblica
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  Gare ASD
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Richiesta servizio d'ordine al Commissariato di Polizia di Stato di Genzano di Roma - Art. 62 commi 4-5 N.O.I.F.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenImport}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Importa Foglio</span>
            </button>

            {onDownloadAllPdfsZip && (
              <button
                onClick={onDownloadAllPdfsZip}
                disabled={homeMatches.length === 0}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer ${
                  homeMatches.length > 0
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
                title="Scarica tutte le attestazioni ufficiali PDF per le gare in casa con ricevuta PEC"
              >
                <Download className="w-4 h-4" />
                <span>Scarica PDF ({homeMatches.length})</span>
              </button>
            )}

            <button
              onClick={onDownloadAllZip}
              disabled={homeMatches.length === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer ${
                homeMatches.length > 0
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              title="Scarica un archivio ZIP con tutte le bozze in singoli file di testo (.txt) a campi separati"
            >
              <Download className="w-4 h-4" />
              <span>Bozze .TXT</span>
            </button>

            <button
              onClick={onOpenBatchExport}
              disabled={homeMatches.length === 0}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                homeMatches.length > 0
                  ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Tutti i Formati (PDF / CSV)</span>
            </button>

            {onOpenExportExcel && (
              <button
                onClick={onOpenExportExcel}
                disabled={matches.length === 0}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer ${
                  matches.length > 0
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
                title="Esporta le gare in formato Excel (.xlsx) o CSV con stato invio PEC, date e protocolli"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Esporta Excel (CSV)</span>
              </button>
            )}

            {onOpenBackupRestore && (
              <button
                onClick={onOpenBackupRestore}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-purple-200 bg-purple-50 text-purple-900 hover:bg-purple-100 hover:border-purple-300 shadow-sm transition-colors cursor-pointer"
                title="Salva una copia di sicurezza su file locale o ripristina un backup precedente"
              >
                <Database className="w-4 h-4 text-purple-600" />
                <span>Backup & Ripristino</span>
              </button>
            )}

            <button
              onClick={onLoadSampleData}
              title="Ricarica i dati di esempio delle 4 ASD con tutte le categorie"
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Dati Demo</span>
            </button>

            <button
              onClick={onOpenSettings}
              title="Configurazione impianti, referenti e PEC commissariato"
              className="inline-flex items-center justify-center p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Metric Bar */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200/60">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Gare Nel Calendario</div>
            <div className="text-lg font-bold text-slate-900 mt-0.5">{matches.length}</div>
          </div>

          <div className="px-3 py-2 bg-amber-50/70 rounded-lg border border-amber-200/60">
            <div className="text-[11px] font-medium text-amber-800 uppercase tracking-wider flex items-center justify-between">
              <span>Gare In Casa</span>
              <span className="text-[10px] font-bold text-amber-700">PEC Necessarie</span>
            </div>
            <div className="text-lg font-bold text-amber-950 mt-0.5">{homeMatches.length}</div>
          </div>

          <div className="px-3 py-2 bg-rose-50/70 rounded-lg border border-rose-200/60">
            <div className="text-[11px] font-medium text-rose-800 uppercase tracking-wider flex items-center justify-between">
              <span>Da Inviare</span>
              <AlertCircle className="w-3 h-3 text-rose-600" />
            </div>
            <div className="text-lg font-bold text-rose-950 mt-0.5">{pendingMatches.length}</div>
          </div>

          <div className="px-3 py-2 bg-emerald-50/70 rounded-lg border border-emerald-200/60">
            <div className="text-[11px] font-medium text-emerald-800 uppercase tracking-wider flex items-center justify-between">
              <span>PEC Inviate</span>
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            </div>
            <div className="text-lg font-bold text-emerald-950 mt-0.5">{sentMatches.length}</div>
          </div>
        </div>
      </div>
    </header>
  );
};
