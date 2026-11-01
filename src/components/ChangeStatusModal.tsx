import React, { useState, useEffect } from 'react';
import { Match } from '../types';
import { CLUBS } from '../config/clubsData';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  X, 
  Calendar, 
  Hash, 
  FileText, 
  Save, 
  RotateCcw, 
  ShieldCheck, 
  Sparkles,
  AlertTriangle,
  Ban
} from 'lucide-react';
import { formatCurrentSendDate, generateProtocolloNumber } from '../utils/matchMerger';
import { recordMatchStatusChange } from '../utils/statusRegistry';

interface ChangeStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Match[]; // 1 match for single edit, >1 for bulk change
  onSaveStatus: (updatedMatches: Match[]) => void;
  useDynamicAsdName: boolean;
}

export const ChangeStatusModal: React.FC<ChangeStatusModalProps> = ({
  isOpen,
  onClose,
  matches,
  onSaveStatus,
  useDynamicAsdName,
}) => {
  if (!isOpen || !matches || matches.length === 0) return null;

  const isBulk = matches.length > 1;
  const primaryMatch = matches[0];

  // Determine initial status: if all matches share the same status, use it; otherwise default to 'inviata'
  const allSameStatus = matches.every(m => m.status === primaryMatch.status);
  const initialStatus: 'da_inviare' | 'inviata' | 'annullata' = allSameStatus 
    ? primaryMatch.status 
    : 'inviata';

  const [selectedStatus, setSelectedStatus] = useState<'da_inviare' | 'inviata' | 'annullata'>(initialStatus);
  const [sendDate, setSendDate] = useState<string>(
    primaryMatch.pecSentDate || formatCurrentSendDate()
  );
  const [protocollo, setProtocollo] = useState<string>(
    primaryMatch.protocollo || generateProtocolloNumber()
  );
  const [notes, setNotes] = useState<string>(primaryMatch.notes || '');
  const [isSuccessFeedback, setIsSuccessFeedback] = useState<boolean>(false);

  // Sync state if match changes
  useEffect(() => {
    if (primaryMatch) {
      setSelectedStatus(allSameStatus ? primaryMatch.status : 'inviata');
      setSendDate(primaryMatch.pecSentDate || formatCurrentSendDate());
      setProtocollo(primaryMatch.protocollo || generateProtocolloNumber());
      setNotes(primaryMatch.notes || '');
      setIsSuccessFeedback(false);
    }
  }, [primaryMatch?.id, isOpen]);

  const handleSetDateNow = () => {
    setSendDate(formatCurrentSendDate());
  };

  const handleRegenerateProtocollo = () => {
    setProtocollo(generateProtocolloNumber());
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const now = new Date();
    let offsetSec = 0;

    const updatedMatches: Match[] = matches.map((m, idx) => {
      let finalDate = sendDate.trim();
      let finalProt = protocollo.trim();

      if (selectedStatus === 'inviata') {
        if (!finalDate) {
          finalDate = formatCurrentSendDate();
        }
        if (isBulk && (!finalProt || finalProt === primaryMatch.protocollo)) {
          // If bulk and no unique protocol entered, assign orderly advancing protocol numbers
          finalProt = generateProtocolloNumber(now, offsetSec++);
        } else if (!finalProt) {
          finalProt = generateProtocolloNumber();
        }
      } else {
        finalDate = undefined as any;
        finalProt = undefined as any;
      }

      const updated: Match = {
        ...m,
        status: selectedStatus,
        pecSentDate: finalDate,
        protocollo: finalProt,
        notes: notes.trim() ? notes.trim() : m.notes,
      };

      // Permanently record in persistent status registry
      recordMatchStatusChange(updated, selectedStatus, finalDate, finalProt, notes.trim());

      return updated;
    });

    setIsSuccessFeedback(true);
    setTimeout(() => {
      onSaveStatus(updatedMatches);
      onClose();
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-status-title"
      >
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="change-status-title" className="text-base font-bold text-slate-900">
                {isBulk ? `Variazione Stato di Gruppo (${matches.length} gare)` : 'Variazione Stato PEC e Protocollo'}
              </h2>
              <p className="text-xs text-slate-500">
                Procedura guidata di aggiornamento e memorizzazione permanente dello stato
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/80 transition-colors cursor-pointer"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {/* Target Match Summary Card */}
          {!isBulk ? (
            <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-700">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-bold text-slate-900 text-sm">
                  {primaryMatch.squadraCasa} vs {primaryMatch.squadraOspite}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white border border-slate-200 text-slate-600">
                  {primaryMatch.category || primaryMatch.campionato}
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {primaryMatch.data} alle ore {primaryMatch.ora}
                </span>
                <span>•</span>
                <span>
                  Stato attuale: <strong className={primaryMatch.status === 'inviata' ? 'text-emerald-700' : 'text-rose-700'}>
                    {primaryMatch.status === 'inviata' ? `Inviata (${primaryMatch.pecSentDate || 'Data registrata'})` : 'Da Inviare'}
                  </strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-950">
              <div className="flex items-center gap-2 font-bold mb-1">
                <Sparkles className="w-4 h-4 text-blue-700" />
                <span>Stai modificando {matches.length} gare contemporaneamente</span>
              </div>
              <p className="text-blue-900/90 leading-relaxed">
                Lo stato selezionato verrà applicato a tutte le gare scelte, garantendo che non vengano sovrascritte o reimpostate come 'da inviare' alle prossime aperture dell'app.
              </p>
            </div>
          )}

          {/* Status Selection Cards */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Seleziona Nuovo Stato Gara
            </label>

            {/* Option 1: PEC Inviata */}
            <div 
              onClick={() => setSelectedStatus('inviata')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                selectedStatus === 'inviata'
                  ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="match_status"
                  value="inviata"
                  checked={selectedStatus === 'inviata'}
                  onChange={() => setSelectedStatus('inviata')}
                  className="mt-1 w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900">PEC Inviata (Notifica Conclusa)</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Consigliato
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Registra la comunicazione PEC come regolarmente inviata al Commissariato di Polizia. La gara viene salvata permanentemente con data di invio e numero di protocollo.
                  </p>
                </div>
              </div>
            </div>

            {/* Option 2: Da Inviare */}
            <div 
              onClick={() => setSelectedStatus('da_inviare')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                selectedStatus === 'da_inviare'
                  ? 'border-rose-500 bg-rose-50/30 ring-1 ring-rose-500 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="match_status"
                  value="da_inviare"
                  checked={selectedStatus === 'da_inviare'}
                  onChange={() => setSelectedStatus('da_inviare')}
                  className="mt-1 w-4 h-4 text-rose-600 focus:ring-rose-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span className="font-bold text-slate-900">Da Inviare (In Attesa di Invio)</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Reimposta la gara come ancora da inoltrare. Verrà proposta nell'elenco operativo delle PEC da inviare all'apertura dell'applicazione.
                  </p>
                </div>
              </div>
            </div>

            {/* Option 3: Annullata / Non Richiesta */}
            <div 
              onClick={() => setSelectedStatus('annullata')}
              className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                selectedStatus === 'annullata'
                  ? 'border-slate-600 bg-slate-50 ring-1 ring-slate-600 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="match_status"
                  value="annullata"
                  checked={selectedStatus === 'annullata'}
                  onChange={() => setSelectedStatus('annullata')}
                  className="mt-1 w-4 h-4 text-slate-600 focus:ring-slate-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Ban className="w-4 h-4 text-slate-500" />
                    <span className="font-bold text-slate-900">Gara Annullata / Forza Pubblica Non Necessaria</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Per gare rinviate d'ufficio, disputate a porte chiuse o per le quali non è necessaria la richiesta delle forze dell'ordine.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Fields if 'inviata' is selected */}
          {selectedStatus === 'inviata' && (
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-4 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 uppercase tracking-wide">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span>Estremi di Invio e Protocollo Ufficiale</span>
              </div>

              {/* Data e Ora Invio */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Data e Ora Effettiva Invio PEC
                  </label>
                  <button
                    type="button"
                    onClick={handleSetDateNow}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                  >
                    Imposta su adesso
                  </button>
                </div>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={sendDate}
                    onChange={e => setSendDate(e.target.value)}
                    placeholder="Es. 18/10/2026 alle 15:30"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Questa data comparirà nell'attestazione ufficiale per la forza pubblica.
                </p>
              </div>

              {/* Numero Protocollo */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Numero di Protocollo Assegnato (AAAAMMGGHHMMSS)
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateProtocollo}
                    className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                  >
                    Genera Nuovo
                  </button>
                </div>
                <div className="relative">
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={protocollo}
                    onChange={e => setProtocollo(e.target.value)}
                    placeholder="Es. 20261018153022"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {isBulk 
                    ? 'In caso di modifica multipla, ciascuna gara riceverà un numero di protocollo progressivo unico ordinato nel tempo.'
                    : 'Il protocollo viene integrato nell\'attestazione PDF e nel relativo codice QR di verifica.'}
                </p>
              </div>

              {/* Note facoltative */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Note Aggiuntive / Ricevuta Accettazione (Facoltativo)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Es. Ricevuta n. 987654321 / Trasmessa via Aruba PEC"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                />
              </div>
            </div>
          )}

          {/* Safety Guarantee Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 leading-relaxed">
            <strong className="text-slate-800 block mb-0.5">Garanzia di persistenza:</strong>
            La variazione viene registrata sia nella sessione locale sia nel registro permanente delle notifiche. Se il foglio Google Sheet viene sincronizzato nuovamente, lo stato <strong>Inviata</strong> verrà preservato e la gara non tornerà 'da inviare'.
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="submit"
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-all cursor-pointer ${
                isSuccessFeedback
                  ? 'bg-emerald-700 scale-98'
                  : selectedStatus === 'inviata'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : selectedStatus === 'annullata'
                  ? 'bg-slate-700 hover:bg-slate-800'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSuccessFeedback ? 'Stato Salvato!' : 'Salva e Conferma Stato'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
