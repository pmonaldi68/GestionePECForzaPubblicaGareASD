import React, { useState } from 'react';
import { 
  X, 
  Link as LinkIcon, 
  Clipboard, 
  FileSpreadsheet, 
  Sliders, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  DownloadCloud, 
  Info 
} from 'lucide-react';
import { ColumnMapping, Match } from '../types';
import { 
  DEFAULT_COLUMN_MAPPING, 
  parseRawText, 
  parseFileBuffer, 
  getGoogleSheetsCsvUrl 
} from '../utils/sheetParser';
import { SAMPLE_MATCHES } from '../data/sampleMatches';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMatchesImported: (matches: Match[]) => void;
  sheetUrl?: string;
  onSheetUrlChange?: (url: string) => void;
}

type TabType = 'link' | 'paste' | 'file' | 'mapping' | 'sample';

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onMatchesImported,
  sheetUrl: propSheetUrl = '',
  onSheetUrlChange,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('link');
  const [sheetUrl, setSheetUrl] = useState(propSheetUrl);
  const [pastedText, setPastedText] = useState('');
  const [mapping, setMapping] = useState<ColumnMapping>(DEFAULT_COLUMN_MAPPING);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  // Sync prop changes
  React.useEffect(() => {
    if (propSheetUrl) setSheetUrl(propSheetUrl);
  }, [propSheetUrl]);

  if (!isOpen) return null;

  // Handle Google Sheet URL Fetch
  const handleFetchGoogleSheet = async () => {
    setErrorMessage(null);
    setSuccessCount(null);
    setIsLoading(true);

    try {
      const csvUrl = getGoogleSheetsCsvUrl(sheetUrl);
      if (!csvUrl) {
        throw new Error(
          'Formato link non riconosciuto. Inserisci un link valido di Google Sheets (es. https://docs.google.com/spreadsheets/d/...)'
        );
      }

      // Try fetching via local proxy first to avoid CORS issues
      let csvContent = '';
      try {
        const proxyRes = await fetch(`/api/fetch-sheet?url=${encodeURIComponent(csvUrl)}`);
        if (proxyRes.ok) {
          csvContent = await proxyRes.text();
        }
      } catch {
        // Fallback to direct client fetch
      }

      if (!csvContent) {
        const directRes = await fetch(csvUrl);
        if (!directRes.ok) {
          throw new Error(
            `Impossibile scaricare il foglio (Status ${directRes.status}). Assicurati che il foglio Google sia impostato su "Chiunque abbia il link può visualizzare" oppure usa la scheda "Copia e Incolla".`
          );
        }
        csvContent = await directRes.text();
      }

      const matches = parseRawText(csvContent, mapping);
      if (matches.length === 0) {
        throw new Error(
          'Nessuna gara valida trovata nel foglio. Verifica che le colonne corrispondano (C=Campionato, D=Girone, E=Giornata, F=Data, G=Ora, H=Casa, I=Ospite).'
        );
      }

      setSuccessCount(matches.length);
      onSheetUrlChange?.(sheetUrl);
      setTimeout(() => {
        onMatchesImported(matches);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(
        err?.message || 'Errore durante lo scaricamento del foglio Google. Prova a incollare direttamente i dati.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Pasted TSV/CSV
  const handleProcessPastedText = () => {
    setErrorMessage(null);
    setSuccessCount(null);

    if (!pastedText.trim()) {
      setErrorMessage('Incolla prima i dati copiati dal foglio Google!');
      return;
    }

    try {
      const matches = parseRawText(pastedText, mapping);
      if (matches.length === 0) {
        setErrorMessage('Nessuna gara valida trovata. Verifica che i dati contengano squadre e campionati.');
        return;
      }

      setSuccessCount(matches.length);
      setTimeout(() => {
        onMatchesImported(matches);
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(`Errore elaborazione: ${err?.message || 'Formato dati non valido'}`);
    }
  };

  // Handle File Upload (Excel or CSV)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setSuccessCount(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const matches = parseFileBuffer(buffer, mapping);
      if (matches.length === 0) {
        setErrorMessage('Nessuna gara trovata nel file caricato.');
        return;
      }
      setSuccessCount(matches.length);
      setTimeout(() => {
        onMatchesImported(matches);
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(`Errore durante la lettura del file: ${err?.message || 'Formato non supportato'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Loading Sample Demo
  const handleLoadSample = () => {
    onMatchesImported(SAMPLE_MATCHES);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Importa Calendario Gare ASD
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-6 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => { setActiveTab('link'); setErrorMessage(null); }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'link'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Link Google Sheet</span>
          </button>

          <button
            onClick={() => { setActiveTab('paste'); setErrorMessage(null); }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'paste'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clipboard className="w-3.5 h-3.5" />
            <span>Copia e Incolla (Consigliato)</span>
          </button>

          <button
            onClick={() => { setActiveTab('file'); setErrorMessage(null); }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'file'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>File Excel / CSV</span>
          </button>

          <button
            onClick={() => { setActiveTab('mapping'); setErrorMessage(null); }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'mapping'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Colonne (C..I)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 space-y-4">
          {/* TAB 1: Google Sheet URL */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Come collegare il Foglio Google:</p>
                  <p className="text-blue-800 leading-relaxed">
                    Incolla qui il link del tuo foglio Google. Assicurati che nelle impostazioni di condivisione sia selezionato 
                    <strong> "Chiunque abbia il link può visualizzare"</strong> oppure che sia pubblicato sul web tramite <em>File &gt; Condividi &gt; Pubblica sul Web</em>.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  URL del Foglio Google
                </label>
                <input
                  type="url"
                  value={sheetUrl}
                  onChange={e => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1abc.../edit"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleFetchGoogleSheet}
                  disabled={isLoading || !sheetUrl.trim()}
                  className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors ${
                    isLoading || !sheetUrl.trim()
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>{isLoading ? 'Scaricamento in corso...' : 'Carica ed Elabora Gare dal Foglio'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Copy & Paste */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2.5">
                <Clipboard className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Metodo più rapido:</strong> Apri il tuo foglio Google, seleziona tutte le righe con il mouse, premi <strong>Ctrl+C</strong> (o Cmd+C) e incolla direttamente nella casella sottostante.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Incolla le celle qui (TSV / CSV):
                </label>
                <textarea
                  value={pastedText}
                  onChange={e => setPastedText(e.target.value)}
                  rows={8}
                  placeholder={`Campionato\tGirone\tGiornata\tData\tOra\tSquadra Casa\tSquadra Ospite\nPROMOZIONE\tD\t8^ GIORNATA\t18/10/2026\t15:30\tCYNTHIA 1920\tATLETICO LODIGIANI`}
                  className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white resize-y leading-relaxed"
                />
              </div>

              <button
                onClick={handleProcessPastedText}
                disabled={!pastedText.trim()}
                className={`w-full py-2.5 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors ${
                  !pastedText.trim()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                <Clipboard className="w-4 h-4" />
                <span>Elabora Dati Incollati</span>
              </button>
            </div>
          )}

          {/* TAB 3: File Upload */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <label className="block text-xs font-semibold text-slate-800 cursor-pointer">
                  <span>Trascina o clicca per caricare il file del calendario</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supporta formati Microsoft Excel (.xlsx, .xls) e file CSV (.csv)
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: Column Mapping Config */}
          {activeTab === 'mapping' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Configurazione delle colonne secondo le specifiche richieste. Se il foglio Google ha colonne differenti, puoi modificarle qui:
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="font-bold text-slate-700">Colonna C (Indice 2):</span>
                  <div className="text-slate-600 text-[11px] mt-0.5">CAMPIONATO</div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="font-bold text-slate-700">Colonna D (Indice 3):</span>
                  <div className="text-slate-600 text-[11px] mt-0.5">GIRONE</div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="font-bold text-slate-700">Colonna E (Indice 4):</span>
                  <div className="text-slate-600 text-[11px] mt-0.5">GIORNATA</div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="font-bold text-slate-700">Colonna F (Indice 5):</span>
                  <div className="text-slate-600 text-[11px] mt-0.5">DATA</div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="font-bold text-slate-700">Colonna G (Indice 6):</span>
                  <div className="text-slate-600 text-[11px] mt-0.5">ORA</div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-amber-50 border-amber-200">
                  <span className="font-bold text-amber-900">Colonna H (Indice 7):</span>
                  <div className="text-amber-800 text-[11px] mt-0.5">SQUADRA CASA</div>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="font-bold text-slate-700">Colonna I (Indice 8):</span>
                  <div className="text-slate-600 text-[11px] mt-0.5">SQUADRA OSPITE</div>
                </div>
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setMapping(DEFAULT_COLUMN_MAPPING)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Ripristina Mappatura Predefinita C..I
                </button>
              </div>
            </div>
          )}

          {/* Feedback messages */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successCount !== null && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Caricamento completato con successo: {successCount} gare rilevate!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={handleLoadSample}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Carica Dati Demo Completi</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Annulla
          </button>
        </div>
      </div>
    </div>
  );
};
