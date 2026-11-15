import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, RefreshCw, CheckCircle2, AlertTriangle, ExternalLink, X } from 'lucide-react';

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

  useEffect(() => {
    setLocalInput(sheetUrl);
  }, [sheetUrl]);

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
    <div className="bg-slate-50/70 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Label and URL Input */}
          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            <label
              htmlFor="google-sheet-sync-input"
              className="flex items-center gap-1.5 shrink-0 text-xs font-semibold text-slate-600 whitespace-nowrap"
            >
              <LinkIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Foglio Google</span>
            </label>

            <div className="relative flex-1 min-w-0">
              <input
                id="google-sheet-sync-input"
                type="url"
                value={localInput}
                onChange={e => handleInputChange(e.target.value)}
                placeholder="Incolla il link del Foglio Google (es. calendario condiviso)..."
                className="w-full h-8 pl-3 pr-7 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-blue-500 font-mono transition-colors"
              />
              {localInput && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalInput('');
                    onClearUrl();
                  }}
                  aria-label="Cancella link foglio Google"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                  title="Cancella link"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Sync Status & Actions */}
          <div className="flex items-center justify-between md:justify-end gap-2.5 shrink-0 text-xs">
            {lastSyncTime && !syncError && (
              <span className="text-[11px] text-slate-500 hidden lg:inline-flex items-center gap-1.5 tabular-nums whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Aggiornato: {lastSyncTime}</span>
              </span>
            )}

            {syncError && (
              <span
                className="text-[11px] text-rose-700 font-medium inline-flex items-center gap-1 max-w-xs truncate"
                title={syncError}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="truncate">{syncError}</span>
              </span>
            )}

            <button
              type="submit"
              disabled={isSyncing || !localInput.trim()}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isSyncing || !localInput.trim()
                  ? 'bg-slate-200/70 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
              title="Aggiorna all'istante i dati dal link memorizzato"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizzo...' : 'Aggiorna Dati'}</span>
            </button>

            {localInput.includes('docs.google.com') && (
              <a
                href={localInput}
                target="_blank"
                rel="noreferrer"
                aria-label="Apri Foglio Google in una nuova scheda"
                className="inline-flex items-center justify-center w-8 h-8 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors shrink-0"
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
