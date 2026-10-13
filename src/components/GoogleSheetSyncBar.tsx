import React, { useState } from 'react';
import { Link as LinkIcon, RefreshCw, CheckCircle, AlertTriangle, ExternalLink, X } from 'lucide-react';

interface GoogleSheetSyncBarProps {
  sheetUrl: string;
  onSheetUrlChange: (url: string) => void;
  onRefresh: (url: string) => Promise<void>;
  isSyncing: boolean;
  lastSyncTime: string | null;
  syncError: string | null;
  onClearUrl: () => void;
}

export const GoogleSheetSyncBar: React.FC<GoogleSheetSyncBarProps> = ({
  sheetUrl,
  onSheetUrlChange,
  onRefresh,
  isSyncing,
  lastSyncTime,
  syncError,
  onClearUrl,
}) => {
  const [localInput, setLocalInput] = useState(sheetUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localInput.trim()) return;
    onSheetUrlChange(localInput.trim());
    onRefresh(localInput.trim());
  };

  const handleInputChange = (val: string) => {
    setLocalInput(val);
    onSheetUrlChange(val);
  };

  return (
    <div className="bg-white border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Label and Input */}
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0 text-xs font-bold text-slate-700">
              <LinkIcon className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Foglio Google:</span>
            </div>

            <div className="relative flex-1 min-w-0">
              <input
                type="url"
                value={localInput}
                onChange={e => handleInputChange(e.target.value)}
                placeholder="Incolla qui il link del Foglio Google (memorizzato per gli accessi futuri)..."
                className="w-full pl-3 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white font-mono transition-all"
              />
              {localInput && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalInput('');
                    onClearUrl();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title="Cancella link"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Sync status and action buttons */}
          <div className="flex items-center justify-between md:justify-end gap-2 shrink-0 text-xs">
            {/* Last sync info */}
            {lastSyncTime && !syncError && (
              <span className="text-[11px] text-slate-500 hidden lg:inline flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-600 inline" />
                <span>Aggiornato: {lastSyncTime}</span>
              </span>
            )}

            {syncError && (
              <span className="text-[11px] text-rose-600 font-medium flex items-center gap-1 max-w-xs truncate" title={syncError}>
                <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                <span className="truncate">{syncError}</span>
              </span>
            )}

            <button
              type="submit"
              disabled={isSyncing || !localInput.trim()}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors ${
                isSyncing || !localInput.trim()
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
              title="Aggiorna all'istante i dati dal link memorizzato"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizzazione...' : 'Aggiorna Dati'}</span>
            </button>

            {localInput.includes('docs.google.com') && (
              <a
                href={localInput}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                title="Apri il foglio Google in una nuova scheda"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
