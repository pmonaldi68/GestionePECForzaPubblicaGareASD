import React, { useState } from 'react';
import { X, MapPin, Check, Building2, Edit3, ArrowRight, Sparkles } from 'lucide-react';
import { Match } from '../types';
import { STANDARD_FACILITIES, FacilityPreset } from '../config/clubsData';

interface FacilityChangeModalProps {
  isOpen: boolean;
  match: Match | null;
  onClose: () => void;
  onUpdateFacility: (matchId: string, newFacilityText: string, applyToEntireCategory: boolean) => void;
}

export const FacilityChangeModal: React.FC<FacilityChangeModalProps> = ({
  isOpen,
  match,
  onClose,
  onUpdateFacility,
}) => {
  if (!isOpen || !match) return null;

  const [selectedText, setSelectedText] = useState<string>(match.facilityText);
  const [applyToEntireCategory, setApplyToEntireCategory] = useState<boolean>(false);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  const handleSelectPreset = (preset: FacilityPreset) => {
    setSelectedText(preset.text);
    setIsCustomMode(false);
  };

  const handleConfirm = () => {
    if (!selectedText.trim()) return;
    onUpdateFacility(match.id, selectedText.trim(), applyToEntireCategory);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Variazione Veloce Campo di Gioco
              </h2>
              <p className="text-xs text-slate-500">
                {match.squadraCasa} vs {match.squadraOspite} · {match.category}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600">
            Seleziona con un click uno degli impianti sportivi ufficiali di Genzano di Roma oppure modifica il testo personalizzato per questa gara:
          </p>

          {/* Presets List */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Impianti Sportivi Predefiniti:
            </span>

            <div className="grid grid-cols-1 gap-2">
              {STANDARD_FACILITIES.map(preset => {
                const isSelected = selectedText.trim() === preset.text.trim();
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <Building2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-slate-900">{preset.name}</span>
                        {preset.recommendedFor && (
                          <span className="text-[10px] text-slate-500 hidden sm:inline">
                            · {preset.recommendedFor}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 pl-6 leading-tight">
                        {preset.address}
                      </p>
                    </div>

                    <div className="shrink-0 mt-0.5">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-slate-300" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Text Editor Section */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                <span>Testo Integrale nel Corpo PEC:</span>
              </label>
              {!isCustomMode ? (
                <button
                  type="button"
                  onClick={() => setIsCustomMode(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Personalizza Testo
                </button>
              ) : (
                <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                  Modalità personalizzata attiva
                </span>
              )}
            </div>

            <textarea
              value={selectedText}
              onChange={e => {
                setSelectedText(e.target.value);
                setIsCustomMode(true);
              }}
              rows={3}
              className="w-full p-2.5 text-xs font-sans bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-y leading-relaxed"
            />
          </div>

          {/* Option: Apply to Entire Category */}
          <div className="pt-2 border-t border-slate-100 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="applyCategory"
              checked={applyToEntireCategory}
              onChange={e => setApplyToEntireCategory(e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer mt-0.5"
            />
            <label htmlFor="applyCategory" className="text-xs text-slate-700 cursor-pointer">
              <strong>Applica a tutte le gare casalinghe</strong> di <em>{match.category}</em> ({match.squadraCasa})
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Annulla
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow-xs transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Conferma Variazione Campo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
