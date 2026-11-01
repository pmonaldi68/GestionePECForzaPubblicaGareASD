import React from 'react';
import { Match } from '../types';
import { CLUBS } from '../config/clubsData';
import { Trash2, AlertTriangle, AlertCircle, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedMatches: Match[];
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedMatches,
}) => {
  if (!isOpen) return null;

  const count = selectedMatches.length;
  const sentMatches = selectedMatches.filter(m => m.status === 'inviata');
  const unsentMatches = selectedMatches.filter(m => m.status !== 'inviata');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
      >
        {/* Header */}
        <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 id="confirm-delete-title" className="text-base font-bold text-slate-900">
                Conferma eliminazione gare
              </h2>
              <p className="text-xs text-red-700">
                Operazione di eliminazione multipla
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            Stai per eliminare definitivamente <strong className="text-slate-900 font-bold">{count} {count === 1 ? 'gara selezionata' : 'gare selezionate'}</strong> dall'elenco.
          </p>

          {/* Warning if any match is already marked as 'inviata' */}
          {sentMatches.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-amber-950 block">
                  Attenzione: {sentMatches.length} {sentMatches.length === 1 ? 'gara ha' : 'gare hanno'} PEC già inviata
                </strong>
                <span className="text-amber-800/90 mt-0.5 block leading-relaxed">
                  Tra le gare da eliminare ce ne sono alcune per cui è già stato generato il numero di protocollo e la relativa attestazione. L'eliminazione cancellerà anche questi record dall'archivio locale.
                </span>
              </div>
            </div>
          )}

          {/* Summary counts */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <span className="text-slate-500 block">Da inviare:</span>
              <strong className="text-base text-slate-800 font-bold">{unsentMatches.length}</strong>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <span className="text-slate-500 block">Già inviate (con protocollo):</span>
              <strong className="text-base text-slate-800 font-bold">{sentMatches.length}</strong>
            </div>
          </div>

          {/* Matches List Preview */}
          <div>
            <span className="text-xs font-semibold text-slate-600 block mb-1.5">
              Elenco delle gare che verranno rimosse:
            </span>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
              {selectedMatches.map((m, idx) => {
                const club = CLUBS[m.clubId];
                return (
                  <div key={m.id || idx} className="p-2.5 text-xs flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span 
                          className="w-2 h-2 rounded-full shrink-0" 
                          style={{ backgroundColor: club?.primaryColor || '#3b82f6' }} 
                        />
                        <span className="font-semibold text-slate-800 truncate">
                          {m.squadraCasa} vs {m.squadraOspite}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{m.data} {m.ora}</span>
                        <span>•</span>
                        <span className="truncate">{m.category || m.campionato}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {m.status === 'inviata' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Inviata {m.protocollo ? `#${m.protocollo.slice(-4)}` : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-700">
                          Da inviare
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-slate-500 italic">
            Nota: potrai comunque reimportare le gare da Foglio Google, file Excel o archivio di backup in qualsiasi momento.
          </p>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Elimina definitivamente ({count})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
