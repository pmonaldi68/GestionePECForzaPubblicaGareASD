import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  UserCheck, 
  Phone, 
  Home, 
  Car, 
  Check, 
  MapPin, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Match, ClubId } from '../types';
import { CLUBS } from '../config/clubsData';
import { resolveFacilityText } from '../utils/pecGenerator';

interface ChangeClubModalProps {
  matches: Match[];
  allMatches?: Match[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    targetMatchIds: string[],
    newClubId: ClubId,
    newIsHome: boolean,
    updateFacility: boolean,
    applyToEntireCategory: boolean
  ) => void;
}

export const ChangeClubModal: React.FC<ChangeClubModalProps> = ({
  matches,
  allMatches = [],
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !matches || matches.length === 0) return null;

  const isSingle = matches.length === 1;
  const targetMatch = matches[0];

  // Initial local state from first selected match
  const [selectedClubId, setSelectedClubId] = useState<ClubId>(targetMatch.clubId || 'CYNTHIA_1920');
  const [isHome, setIsHome] = useState<boolean>(targetMatch.isHome);
  const [updateFacility, setUpdateFacility] = useState<boolean>(true);
  const [applyToEntireCategory, setApplyToEntireCategory] = useState<boolean>(false);

  const selectedClub = CLUBS[selectedClubId];

  // Count how many matches share this category/campionato in the archive
  const matchCat = targetMatch.category || targetMatch.campionato;
  const categoryMatchCount = allMatches.filter(
    m => (m.category === matchCat || m.campionato === matchCat)
  ).length;

  const previewFacility = resolveFacilityText(selectedClubId, matchCat);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ids = matches.map(m => m.id);
    onSave(ids, selectedClubId, isHome, updateFacility, isSingle && applyToEntireCategory);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full my-6 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Variazione Società, Presidente e Tipo Gara
              </h2>
              <p className="text-xs text-slate-500">
                {isSingle 
                  ? 'Verifica e correggi l\'abbinamento della società, presidente e la condizione Casa / Trasferta.'
                  : `Modifica rapida per ${matches.length} gare selezionate.`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Chiudi finestra"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Target Match Recap */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isSingle ? 'Gara da Aggiornare' : `${matches.length} Gare Selezionate`}
            </div>
            {isSingle ? (
              <div>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>{targetMatch.squadraCasa}</span>
                  <span className="text-slate-400 font-normal text-xs">vs</span>
                  <span>{targetMatch.squadraOspite}</span>
                </div>
                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2 mt-1">
                  <span className="font-semibold text-blue-700">{targetMatch.category || targetMatch.campionato}</span>
                  <span>·</span>
                  <span>Data: <strong>{targetMatch.data}</strong> ore <strong>{targetMatch.ora}</strong></span>
                  <span>·</span>
                  <span>Girone {targetMatch.girone} ({targetMatch.giornata})</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-700">
                Verranno aggiornate tutte le <strong>{matches.length}</strong> gare selezionate con la società e il tipo di gara indicati di seguito.
              </div>
            )}
          </div>

          {/* 1. Tipo di Gara: Casa vs Trasferta */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Tipo di Gara (Condizione Campo)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsHome(true)}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  isHome
                    ? 'border-amber-400 bg-amber-50/80 ring-2 ring-amber-300 text-amber-950 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg mt-0.5 ${isHome ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-500'}`}>
                  <Home className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wide">Gara in Casa</span>
                    {isHome && <Check className="w-4 h-4 text-amber-700" />}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    Disputata presso il nostro impianto. <strong>Richiede l'invio della PEC</strong> di Forza Pubblica (art. 62 NOIF).
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsHome(false)}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  !isHome
                    ? 'border-blue-400 bg-blue-50/80 ring-2 ring-blue-300 text-blue-950 shadow-xs'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg mt-0.5 ${!isHome ? 'bg-blue-200 text-blue-900' : 'bg-slate-100 text-slate-500'}`}>
                  <Car className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wide">Gara in Trasferta</span>
                    {!isHome && <Check className="w-4 h-4 text-blue-700" />}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                    Disputata fuori casa. <strong>Non richiede</strong> richiesta di Forza Pubblica né PEC da parte nostra.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Selezione Società e Presidente Corrispondente */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Società Gestore e Relativo Presidente
              </label>
              <span className="text-[11px] text-slate-500">
                Il presidente e il contatto vengono aggiornati in automatico
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(CLUBS) as ClubId[]).map(clubId => {
                const c = CLUBS[clubId];
                const isSelected = selectedClubId === clubId;

                // Category hints per club
                let categoriesHint = '';
                if (clubId === 'CYNTHIA_1920') {
                  categoriesHint = 'Under 19 Prov., Under 18 Reg., Promozione';
                } else if (clubId === 'ACADEMY_CYNTHIA') {
                  categoriesHint = 'Under 17, 16, 15, 14 Reg., 3ª Cat., C5 Femm.';
                } else if (clubId === 'PGS_DON_BOSCO') {
                  categoriesHint = '2ª Categoria, Serie C2 C5, Serie D C5 PGS';
                } else if (clubId === 'ALBACYNTHIA') {
                  categoriesHint = 'Under 14 Provinciali';
                }

                return (
                  <div
                    key={clubId}
                    onClick={() => setSelectedClubId(clubId)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: c.primaryColor }}
                        />
                        <span className="text-xs font-bold text-slate-900 tracking-tight">
                          {c.name}
                        </span>
                      </div>
                      {isSelected ? (
                        <span className="p-0.5 bg-blue-600 text-white rounded-full">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-300" />
                      )}
                    </div>

                    {/* President & Contact details */}
                    <div className="space-y-1 text-xs text-slate-600 bg-white/70 rounded-lg p-2 border border-slate-100">
                      <div className="flex items-center gap-1.5 font-medium text-slate-900">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Presidente: <strong>{c.president}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Referente: {c.contactName} ({c.contactPhone})</span>
                      </div>
                      <div className="text-[10px] text-slate-400 italic pt-0.5">
                        {categoriesHint}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active President Live Preview */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </span>
              <div>
                <span className="font-semibold text-emerald-950">Chiusura PEC Attestata:</span>
                <span className="ml-1 text-emerald-900">
                  "IL PRESIDENTE <strong>{selectedClub.president}</strong>"
                </span>
                <div className="text-[11px] text-emerald-700">
                  Società firmataria: {selectedClub.name}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Impianto Sportivo Automations */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={updateFacility}
                onChange={e => setUpdateFacility(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <div className="text-xs text-slate-700">
                <span className="font-semibold text-slate-900">
                  Aggiorna automaticamente l'impianto sportivo predefinito
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  Imposta l'impianto di gioco ufficiale assegnato alla categoria per <strong>{selectedClub.name}</strong>.
                </p>
                {updateFacility && (
                  <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{previewFacility}</span>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* 4. Applicazione di Massa a Tutta la Categoria */}
          {isSingle && categoryMatchCount > 1 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToEntireCategory}
                  onChange={e => setApplyToEntireCategory(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-amber-600 border-amber-300 focus:ring-amber-500 cursor-pointer"
                />
                <div className="text-xs text-amber-950">
                  <span className="font-bold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-700" />
                    <span>
                      Applica a TUTTE le {categoryMatchCount} gare del campionato "{matchCat}"
                    </span>
                  </span>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
                    Seleziona questa casella se l'intero girone/categoria appartiene a <strong>{selectedClub.name}</strong> con presidente <strong>{selectedClub.president}</strong> per correggere in un solo clic tutte le gare importate.
                  </p>
                </div>
              </label>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Annulla
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>
              {isSingle 
                ? (applyToEntireCategory ? `Salva per Tutte le ${categoryMatchCount} Gare` : 'Salva Modifiche Gara')
                : `Salva Modifiche (${matches.length} Gare)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
