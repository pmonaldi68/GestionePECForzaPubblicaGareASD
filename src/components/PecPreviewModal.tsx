import React, { useState } from 'react';
import { X, Copy, Check, Download, Mail, CheckCircle2, AlertCircle, Building2, UserCheck, Phone, FileText, MapPin } from 'lucide-react';
import { Match } from '../types';
import { CLUBS, COMMISSARIATO_INFO } from '../config/clubsData';
import { generatePecForMatch, formatSeparatedFieldsTxt, downloadTextFile, createMailtoLink } from '../utils/pecGenerator';

interface PecPreviewModalProps {
  match: Match | null;
  onClose: () => void;
  onToggleStatus: (matchId: string) => void;
  useDynamicAsdName: boolean;
  onChangeFacility?: () => void;
}

export const PecPreviewModal: React.FC<PecPreviewModalProps> = ({
  match,
  onClose,
  onToggleStatus,
  useDynamicAsdName,
  onChangeFacility,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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

  const mailtoLink = createMailtoLink(
    COMMISSARIATO_INFO.pec,
    pec.oggetto,
    pec.testoCompleto
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                match.status === 'inviata'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              {match.status === 'inviata' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
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
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content: Separated Fields */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Destinatario Info */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Destinatario Istituzionale (Commissariato di P.S.)
              </span>
              <span className="text-xs font-mono font-medium text-slate-800">
                {COMMISSARIATO_INFO.pec}
              </span>
              <span className="text-xs text-slate-500 ml-2">({COMMISSARIATO_INFO.name})</span>
            </div>
            <button
              onClick={() => handleCopy(COMMISSARIATO_INFO.pec, 'dest')}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded text-slate-600 hover:bg-slate-200 transition-colors"
            >
              {copiedKey === 'dest' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'dest' ? 'Copiato' : 'Copia PEC'}</span>
            </button>
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
            <div className="p-4 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
              {pec.intestazione}
            </div>
          </div>

          {/* 3. CORPO MAIL */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                3. Corpo Mail (Dati Gara)
              </span>
              <button
                onClick={() => handleCopy(pec.corpo, 'corpo')}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                {copiedKey === 'corpo' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'corpo' ? 'Copiato' : 'Copia'}</span>
              </button>
            </div>
            <div className="p-4 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-loose">
              {pec.corpo}
            </div>
          </div>

          {/* 4. IMPIANTO SPORTIVO */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>4. Impianto Sportivo (Specifico per Categoria)</span>
              </span>
              <div className="flex items-center gap-1.5">
                {onChangeFacility && (
                  <button
                    type="button"
                    onClick={onChangeFacility}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs"
                    title="Varia velocemente l'impianto sportivo"
                  >
                    <MapPin className="w-3 h-3 text-amber-700" />
                    <span>Varia Campo</span>
                  </button>
                )}
                <button
                  onClick={() => handleCopy(pec.impianto, 'impianto')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  {copiedKey === 'impianto' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'impianto' ? 'Copiato' : 'Copia'}</span>
                </button>
              </div>
            </div>
            <div className="p-4 text-xs font-semibold text-slate-800 leading-relaxed bg-amber-50/30">
              {pec.impianto}
            </div>
          </div>

          {/* 5. CONTATTO REFERENTE */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>5. Contatto Referente (Specifico per Società)</span>
              </span>
              <button
                onClick={() => handleCopy(pec.contatto, 'contatto')}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                {copiedKey === 'contatto' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'contatto' ? 'Copiato' : 'Copia'}</span>
              </button>
            </div>
            <div className="p-4 text-xs font-semibold text-slate-800 leading-relaxed">
              {pec.contatto}
            </div>
          </div>

          {/* 6. CHIUSURA E FIRMA */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-100/70 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>6. Chiusura e Firma Presidente (Specifico per Società)</span>
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
          <button
            onClick={handleDownloadTxt}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Salva File di Testo (.TXT con Campi Separati)</span>
          </button>

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
