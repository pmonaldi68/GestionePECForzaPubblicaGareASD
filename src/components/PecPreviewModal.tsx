import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  UserCheck, 
  Phone, 
  FileText, 
  MapPin, 
  CalendarCheck, 
  FileCheck2, 
  Edit3, 
  Clock 
} from 'lucide-react';
import { Match } from '../types';
import { CLUBS, COMMISSARIATO_INFO } from '../config/clubsData';
import { generatePecForMatch, formatSeparatedFieldsTxt, downloadTextFile, createMailtoLink } from '../utils/pecGenerator';
import { downloadMatchPecPdf } from '../utils/pdfGenerator';
import { formatCurrentSendDate } from '../utils/matchMerger';

interface PecPreviewModalProps {
  match: Match | null;
  onClose: () => void;
  onToggleStatus: (matchId: string) => void;
  useDynamicAsdName: boolean;
  onChangeFacility?: () => void;
  onUpdateSentDate?: (matchId: string, newDate: string) => void;
}

export const PecPreviewModal: React.FC<PecPreviewModalProps> = ({
  match,
  onClose,
  onToggleStatus,
  useDynamicAsdName,
  onChangeFacility,
  onUpdateSentDate,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isEditingDate, setIsEditingDate] = useState<boolean>(false);
  const [customDate, setCustomDate] = useState<string>('');

  if (!match) return null;

  const club = CLUBS[match.clubId] || CLUBS.CYNTHIA_1920;
  const pec = generatePecForMatch(match, useDynamicAsdName);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadTxt = () => {
    const content = formatSeparatedFieldsTxt(match, pec);
    const safeDate = match.data.replace(/[^0-9]/g, '-');
    const safeHome = match.squadraCasa.replace(/[^a-zA-Z0-9]/g, '_');
    const safeAway = match.squadraOspite.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `PEC_ForzaPubblica_${safeDate}_${safeHome}_vs_${safeAway}.txt`;
    downloadTextFile(filename, content);
  };

  const handleDownloadPdf = () => {
    // If not yet sent, set current timestamp
    if (match.status !== 'inviata') {
      const now = formatCurrentSendDate();
      if (onUpdateSentDate) {
        onUpdateSentDate(match.id, now);
      }
      downloadMatchPecPdf({ ...match, status: 'inviata', pecSentDate: now }, useDynamicAsdName);
    } else {
      downloadMatchPecPdf(match, useDynamicAsdName);
    }
  };

  const handleSaveCustomDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateSentDate && customDate.trim()) {
      onUpdateSentDate(match.id, customDate.trim());
    }
    setIsEditingDate(false);
  };

  const handleSetDateToNow = () => {
    const now = formatCurrentSendDate();
    setCustomDate(now);
    if (onUpdateSentDate) {
      onUpdateSentDate(match.id, now);
    }
    setIsEditingDate(false);
  };

  const mailtoLink = createMailtoLink(
    COMMISSARIATO_INFO.pec,
    pec.oggetto,
    pec.testoCompleto
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: club.primaryColor }}
              />
              <h2 className="text-base font-bold text-slate-900">
                Anteprima Campi PEC - Richiesta Forza Pubblica
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {match.squadraCasa} vs {match.squadraOspite} · {match.data} ore {match.ora}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleStatus(match.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                match.status === 'inviata'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
              }`}
            >
              {match.status === 'inviata' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Stato: Inviata</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Stato: Da Inviare</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content: Separated Fields */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm">
          {/* Destinatario Info & Legal Certification Banner */}
          <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                  Destinatario Ufficiale & Certificazione PEC
                </span>
              </div>
              <p className="text-xs text-emerald-950 mt-1">
                La presente comunicazione è da inoltrare (o risulta inviata) alla PEC istituzionale:
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono font-bold text-xs text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200">
                  {COMMISSARIATO_INFO.pec}
                </span>
                <span className="text-xs text-emerald-800">
                  ({COMMISSARIATO_INFO.name})
                </span>
              </div>

              {/* Saved Send Date Info */}
              <div className="mt-2 text-xs flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-slate-700">Data e Ora Invio Registrata:</span>
                <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {match.pecSentDate || (match.status === 'inviata' ? 'Data odierna' : 'Non ancora inviata')}
                </span>

                {!isEditingDate ? (
                  <button
                    onClick={() => {
                      setCustomDate(match.pecSentDate || formatCurrentSendDate());
                      setIsEditingDate(true);
                    }}
                    className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline ml-1 inline-flex items-center gap-0.5"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Modifica data invio</span>
                  </button>
                ) : (
                  <form onSubmit={handleSaveCustomDate} className="inline-flex items-center gap-1 ml-1">
                    <input
                      type="text"
                      value={customDate}
                      onChange={e => setCustomDate(e.target.value)}
                      placeholder="GG/MM/AAAA alle OO:MM"
                      className="bg-white border border-slate-300 text-slate-800 px-2 py-0.5 rounded text-xs font-mono"
                    />
                    <button
                      type="submit"
                      className="bg-emerald-600 text-white px-2 py-0.5 rounded text-xs font-semibold hover:bg-emerald-700"
                    >
                      Salva
                    </button>
                    <button
                      type="button"
                      onClick={handleSetDateToNow}
                      className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded text-xs font-semibold hover:bg-slate-300"
                    >
                      Ora
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
              <button
                onClick={() => handleCopy(COMMISSARIATO_INFO.pec, 'dest')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                {copiedKey === 'dest' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'dest' ? 'Copiato' : 'Copia PEC Destinatario'}</span>
              </button>

              <button
                onClick={handleDownloadPdf}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-xs transition-colors"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Scarica Ricevuta PDF</span>
              </button>
            </div>
          </div>

          {/* 1. OGGETTO MAIL */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Oggetto Mail (Tutto in Maiuscolo)
              </span>
              <button
                onClick={() => handleCopy(pec.oggetto, 'oggetto')}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                {copiedKey === 'oggetto' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'oggetto' ? 'Copiato' : 'Copia'}</span>
              </button>
            </div>
            <div className="p-4 bg-slate-50 font-mono text-xs text-slate-900 whitespace-pre-wrap select-all leading-relaxed">
              {pec.oggetto}
            </div>
          </div>

          {/* 2. INTESTAZIONE MAIL */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Intestazione Mail
              </span>
              <button
                onClick={() => handleCopy(pec.intestazione, 'intestazione')}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                {copiedKey === 'intestazione' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'intestazione' ? 'Copiato' : 'Copia'}</span>
              </button>
            </div>
            <div className="p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
              {pec.intestazione}
            </div>
          </div>

          {/* 3. CORPO MAIL (Dettagli Gara) */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                3. Corpo Mail (Dettagli Gara)
              </span>
              <button
                onClick={() => handleCopy(pec.corpo, 'corpo')}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                {copiedKey === 'corpo' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'corpo' ? 'Copiato' : 'Copia'}</span>
              </button>
            </div>
            <div className="p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50">
              {pec.corpo}
            </div>
          </div>

          {/* 4. IMPIANTO SPORTIVO */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  4. Dettagli Impianto Sportivo
                </span>
                {onChangeFacility && (
                  <button
                    onClick={onChangeFacility}
                    className="text-[10px] font-semibold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 transition-colors"
                  >
                    Varia Campo
                  </button>
                )}
              </div>
              <button
                onClick={() => handleCopy(pec.impianto, 'impianto')}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                {copiedKey === 'impianto' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'impianto' ? 'Copiato' : 'Copia'}</span>
              </button>
            </div>
            <div className="p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
              {pec.impianto}
            </div>
          </div>

          {/* 5. CONTATTI REFERENTE */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                5. Contatti per Informazioni
              </span>
              <button
                onClick={() => handleCopy(pec.contatto, 'contatto')}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                {copiedKey === 'contatto' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'contatto' ? 'Copiato' : 'Copia'}</span>
              </button>
            </div>
            <div className="p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50">
              {pec.contatto}
            </div>
          </div>

          {/* 6. CHIUSURA E FIRMA PRESIDENTE */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                6. Saluti Finali e Firma del Presidente
              </span>
              <button
                onClick={() => handleCopy(pec.chiusuraFirma, 'firma')}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                {copiedKey === 'firma' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'firma' ? 'Copiato' : 'Copia'}</span>
              </button>
            </div>
            <div className="p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
              {pec.chiusuraFirma}
            </div>
          </div>

          {/* 7. TESTO INTEGRALE COMPLETO */}
          <div className="border-2 border-blue-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-blue-50 px-4 py-2 border-b border-blue-200 flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-700" />
                <span>Testo Integrale PEC Pronto per Invio</span>
              </span>
              <button
                onClick={() => handleCopy(pec.testoCompleto, 'completo')}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
              >
                {copiedKey === 'completo' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'completo' ? 'Copiato!' : 'Copia Testo Intero'}</span>
              </button>
            </div>
            <div className="p-4 text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed bg-white">
              {pec.testoCompleto}
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 shadow-xs transition-colors"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Scarica PDF Attestazione</span>
            </button>

            <button
              onClick={handleDownloadTxt}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-xs transition-colors"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Salva File .TXT</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={mailtoLink}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span>Invia con Client PEC</span>
            </a>

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
