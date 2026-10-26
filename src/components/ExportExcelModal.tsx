import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar, 
  Filter, 
  Download,
  Clock,
  Building2
} from 'lucide-react';
import { Match, ClubId, DateRangeFilter } from '../types';
import { CLUBS } from '../config/clubsData';
import { exportMatchesToXlsx, exportMatchesToCsv } from '../utils/excelExport';

interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredMatches: Match[];
  totalMatchesCount: number;
  selectedClub: ClubId | 'ALL';
  onlyHomeMatches: boolean;
  statusFilter: 'ALL' | 'da_inviare' | 'inviata';
  selectedCategory: string;
  dateRange: DateRangeFilter;
  useDynamicAsdName: boolean;
}

export const ExportExcelModal: React.FC<ExportExcelModalProps> = ({
  isOpen,
  onClose,
  filteredMatches,
  totalMatchesCount,
  selectedClub,
  onlyHomeMatches,
  statusFilter,
  selectedCategory,
  dateRange,
  useDynamicAsdName,
}) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const sentCount = filteredMatches.filter(m => m.status === 'inviata').length;
  const pendingCount = filteredMatches.length - sentCount;
  const clubName = selectedClub === 'ALL' ? 'Tutte le Società' : CLUBS[selectedClub]?.shortName || selectedClub;

  const handleExportXlsx = () => {
    try {
      exportMatchesToXlsx(filteredMatches, undefined, useDynamicAsdName);
      setSuccessMessage('File Excel (.xlsx) scaricato con successo!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      alert(`Errore durante l'esportazione Excel: ${err?.message}`);
    }
  };

  const handleExportCsv = () => {
    try {
      exportMatchesToCsv(filteredMatches, undefined, useDynamicAsdName);
      setSuccessMessage('File CSV (.csv con codifica UTF-8 BOM) scaricato con successo!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      alert(`Errore durante l'esportazione CSV: ${err?.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-emerald-50 via-teal-50/60 to-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Esportazione Excel & CSV Gare Filtrate
              </h2>
              <p className="text-xs text-slate-500">
                Esporta le gare attualmente visualizzate con le colonne di stato PEC, date e protocolli
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

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Success Banner */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Filter Summary Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Riepilogo Filtri Attivi
                </span>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {filteredMatches.length} {filteredMatches.length === 1 ? 'gara selezionata' : 'gare selezionate'} (su {totalMatchesCount} totali)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Società</span>
                <span className="font-bold text-slate-800 truncate block">{clubName}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tipologia</span>
                <span className="font-bold text-slate-800">{onlyHomeMatches ? 'Solo Casa' : 'Tutte (Casa+Trasferta)'}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Stato PEC</span>
                <span className="font-bold text-slate-800">
                  {statusFilter === 'ALL' ? 'Tutte' : statusFilter === 'inviata' ? 'Solo Inviate' : 'Solo Da Inviare'}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Categoria</span>
                <span className="font-bold text-slate-800 truncate block">{selectedCategory === 'ALL' ? 'Tutte' : selectedCategory}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 px-1 text-slate-600">
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <strong>{sentCount}</strong> PEC Inviate
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <strong>{pendingCount}</strong> Da Inviare
                </span>
              </div>
            </div>
          </div>

          {/* Included Columns Specification */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Colonne Istituzionali Incluse nell'Export</span>
            </h3>
            <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-950 space-y-2">
              <p className="leading-relaxed">
                Il file generato include espressamente tutti i dati di tracciamento richiesti per controlli di pubblica sicurezza e audit interno:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[10.5px]">
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                  <strong className="text-emerald-900 block font-bold">1. Stato Invio PEC</strong>
                  <span className="text-slate-600 text-[10px]">Valori: "Inviata" o "Da Inviare"</span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                  <strong className="text-emerald-900 block font-bold">2. Data Invio PEC</strong>
                  <span className="text-slate-600 text-[10px]">Data e ora esatta salvata</span>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                  <strong className="text-emerald-900 block font-bold">3. Numero Protocollo</strong>
                  <span className="text-slate-600 text-[10px]">Formato AAAAMMGGHHMMSS</span>
                </div>
              </div>
              <p className="text-[10px] text-emerald-800 pt-1">
                Comprende inoltre: Società, Categoria Ufficiale, Campionato, Girone, Giornata, Squadre, Data/Ora, Impianto, Destinatario PEC, Oggetto e Testo Integrale.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Format 1: Native Excel .xlsx */}
            <div className="p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/40 flex flex-col justify-between hover:border-emerald-300 transition-colors shadow-2xs">
              <div>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2.5">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-emerald-950">Formato Microsoft Excel (.XLSX)</h4>
                <p className="text-[11px] text-emerald-900/80 mt-1 leading-relaxed">
                  Foglio di calcolo nativo con intestazioni evidenziate e larghezza colonne ottimizzata per Microsoft Excel e LibreOffice.
                </p>
              </div>
              <button
                onClick={handleExportXlsx}
                disabled={filteredMatches.length === 0}
                className="mt-4 w-full py-2.5 px-3 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Scarica Excel (.XLSX)</span>
              </button>
            </div>

            {/* Format 2: CSV Standard */}
            <div className="p-4 rounded-xl border-2 border-teal-200 bg-teal-50/40 flex flex-col justify-between hover:border-teal-300 transition-colors shadow-2xs">
              <div>
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center mb-2.5">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-teal-950">Formato CSV con UTF-8 BOM (.CSV)</h4>
                <p className="text-[11px] text-teal-900/80 mt-1 leading-relaxed">
                  File di testo delimitato da punto e virgola (;) con codifica UTF-8 BOM, immediatamente apribile con un doppio clic in Excel.
                </p>
              </div>
              <button
                onClick={handleExportCsv}
                disabled={filteredMatches.length === 0}
                className="mt-4 w-full py-2.5 px-3 text-xs font-bold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Scarica CSV (.CSV)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {filteredMatches.length} righe pronte per l'esportazione
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
