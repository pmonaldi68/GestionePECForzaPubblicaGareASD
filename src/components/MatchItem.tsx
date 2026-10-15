import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Download, 
  Mail, 
  Eye, 
  Home, 
  ArrowRight, 
  MapPin, 
  Calendar, 
  Clock, 
  Phone, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  FileText, 
  CalendarCheck, 
  Edit2, 
  MoreVertical, 
  FileCheck2 
} from 'lucide-react';
import { Match } from '../types';
import { CLUBS, COMMISSARIATO_INFO } from '../config/clubsData';
import { 
  generatePecForMatch, 
  formatSeparatedFieldsTxt, 
  downloadTextFile, 
  createMailtoLink,
  resolveMatchCategory 
} from '../utils/pecGenerator';
import { downloadMatchPecPdf } from '../utils/pdfGenerator';
import { formatCurrentSendDate, generateProtocolloNumber } from '../utils/matchMerger';
import { getMatchPriority } from '../utils/dateUtils';

interface MatchItemProps {
  match: Match;
  isSelected: boolean;
  onToggleSelect: () => void;
  onViewDetails: () => void;
  onToggleStatus: () => void;
  onToggleIsHome: () => void;
  useDynamicAsdName: boolean;
  onChangeFacility: () => void;
  onUpdateSentDate?: (newDate: string, newProtocollo?: string) => void;
  onUpdateProtocollo?: (newProtocollo: string) => void;
}

export const MatchItem: React.FC<MatchItemProps> = ({
  match,
  isSelected,
  onToggleSelect,
  onViewDetails,
  onToggleStatus,
  onToggleIsHome,
  useDynamicAsdName,
  onChangeFacility,
  onUpdateSentDate,
  onUpdateProtocollo,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditingSentDate, setIsEditingSentDate] = useState<boolean>(false);
  const [customSentDate, setCustomSentDate] = useState<string>(match.pecSentDate || '');
  const [customProtocollo, setCustomProtocollo] = useState<string>(match.protocollo || '');
  const [showQuickMenu, setShowQuickMenu] = useState<boolean>(false);

  const club = CLUBS[match.clubId] || CLUBS.CYNTHIA_1920;
  const pec = generatePecForMatch(match, useDynamicAsdName);
  const priority = getMatchPriority(match.data, match.status);

  const handleCopy = (text: string, fieldName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadTxt = (e: React.MouseEvent) => {
    e.stopPropagation();
    const content = formatSeparatedFieldsTxt(match, pec);
    const safeCategory = resolveMatchCategory(match)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'GARA';
    const safeDate = match.data.replace(/[^0-9]/g, '-');
    const safeHome = match.squadraCasa.replace(/[^a-zA-Z0-9]/g, '_');
    const safeAway = match.squadraOspite.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Attestazione_PEC_${safeCategory}_${safeDate}_${safeHome}_vs_${safeAway}.txt`;
    downloadTextFile(filename, content);
  };

  const handleDownloadPdf = (e: React.MouseEvent) => {
    e.stopPropagation();
    // If not yet sent, set current date and generate protocollo so the certificate has verified timestamp & protocol
    if (match.status !== 'inviata') {
      const now = formatCurrentSendDate();
      const prot = match.protocollo || generateProtocolloNumber();
      if (onUpdateSentDate) {
        onUpdateSentDate(now, prot);
      }
      downloadMatchPecPdf({ ...match, status: 'inviata', pecSentDate: now, protocollo: prot }, useDynamicAsdName);
    } else {
      const prot = match.protocollo || generateProtocolloNumber();
      if (!match.protocollo && onUpdateProtocollo) {
        onUpdateProtocollo(prot);
      }
      downloadMatchPecPdf({ ...match, protocollo: prot }, useDynamicAsdName);
    }
  };

  const handleSaveSentDate = (e: React.FormEvent) => {
    e.preventDefault();
    const dateToSave = customSentDate.trim() || formatCurrentSendDate();
    const protToSave = customProtocollo.trim() || match.protocollo || generateProtocolloNumber();
    if (onUpdateSentDate) {
      onUpdateSentDate(dateToSave, protToSave);
    }
    setIsEditingSentDate(false);
  };

  const handleSetCurrentDateNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = formatCurrentSendDate();
    const prot = generateProtocolloNumber();
    setCustomSentDate(now);
    setCustomProtocollo(prot);
    if (onUpdateSentDate) {
      onUpdateSentDate(now, prot);
    }
    setIsEditingSentDate(false);
  };

  const mailtoLink = createMailtoLink(
    COMMISSARIATO_INFO.pec,
    pec.oggetto,
    pec.testoCompleto
  );

  return (
    <div
      className={`border rounded-xl transition-all duration-150 relative ${
        isSelected
          ? 'border-blue-500 shadow-sm ring-1 ring-blue-500 bg-white'
          : match.status === 'inviata'
          ? 'border-emerald-200/90 shadow-2xs bg-emerald-50/15'
          : priority.isUpcoming
          ? `border-amber-300 ${priority.colorClasses.border} ${priority.colorClasses.bgGlow} shadow-xs hover:border-amber-400`
          : 'border-slate-200/90 hover:border-slate-300 shadow-xs bg-white'
      }`}
    >
      <div className="p-4 sm:p-5">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {/* Selection Checkbox */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
            />

            {/* Club Pill */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: club.primaryColor }}
              />
              <span>{club.name}</span>
            </div>

            <span className="text-slate-300 text-xs">/</span>

            {/* Category / Campionato text */}
            <span className="text-xs font-medium text-slate-600">
              {match.category || match.campionato}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Visual Priority Badge: next to match if date is within 3 days */}
            {priority.isUpcoming && (
              <div
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md border ${priority.colorClasses.badge}`}
                title={`Partita prossima (entro i prossimi 3 giorni): ${priority.label}. Inviare la richiesta PEC di Forza Pubblica tempestivamente ai sensi dell'Art. 62 N.O.I.F.`}
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${priority.colorClasses.icon} shrink-0`} />
                <span>
                  {match.status === 'inviata'
                    ? `Gara ${priority.shortBadge} (Inviata)`
                    : priority.label}
                </span>
              </div>
            )}

            {/* Home / Away Badge with click toggle */}
            <button
              onClick={e => {
                e.stopPropagation();
                onToggleIsHome();
              }}
              title="Clicca per invertire Casa / Trasferta"
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors ${
                match.isHome
                  ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Home className="w-3 h-3 text-amber-700" />
              <span>{match.isHome ? 'IN CASA' : 'TRASFERTA'}</span>
            </button>

            {/* Status Button (Toggle Sent / Da Inviare) */}
            <button
              onClick={e => {
                e.stopPropagation();
                onToggleStatus();
              }}
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                match.status === 'inviata'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200 shadow-2xs'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
              title={match.status === 'inviata' ? 'PEC contrassegnata come inviata. Clicca per cambiare stato.' : 'Clicca per registrare l’invio con la data corrente.'}
            >
              {match.status === 'inviata' ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  <span>PEC Inviata</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  <span>Da Inviare</span>
                </>
              )}
            </button>

            {/* Quick Floating Actions Menu Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setShowQuickMenu(!showQuickMenu);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                title="Azioni veloci"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showQuickMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-20" 
                    onClick={e => {
                      e.stopPropagation();
                      setShowQuickMenu(false);
                    }} 
                  />
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setShowQuickMenu(false);
                        onToggleStatus();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{match.status === 'inviata' ? 'Segna come Da Inviare' : 'Segna PEC Inviata Oggi'}</span>
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setShowQuickMenu(false);
                        onChangeFacility();
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                    >
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      <span>Cambia Campo di Gioco</span>
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setShowQuickMenu(false);
                        handleDownloadPdf(e);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-blue-700 font-semibold"
                    >
                      <FileCheck2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Scarica Attestazione PDF</span>
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setShowQuickMenu(false);
                        handleDownloadTxt(e);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Salva File .TXT</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center: Match Teams, Championship & Date */}
        <div className="py-3.5 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Teams */}
          <div className="md:col-span-7">
            <div className="flex items-center gap-2">
              <span className={`text-base font-bold tracking-tight ${match.isHome ? 'text-slate-900' : 'text-slate-700'}`}>
                {match.squadraCasa}
              </span>
              <span className="text-slate-400 font-medium text-xs">vs</span>
              <span className={`text-base font-semibold ${!match.isHome ? 'text-slate-900' : 'text-slate-600'}`}>
                {match.squadraOspite}
              </span>
            </div>

            {/* Metadata in unboxed text */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mt-1">
              <span>{match.campionato}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>Girone {match.girone}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>{match.giornata}</span>
            </div>

            {/* SEND DATE & PROTOCOLLO FIELD */}
            <div className="mt-2.5">
              {match.status === 'inviata' ? (
                <div className="inline-flex flex-wrap items-center gap-2 bg-emerald-50/90 border border-emerald-200/90 rounded-lg px-2.5 py-1 text-xs">
                  {/* Data Invio */}
                  <div className="flex items-center gap-1.5">
                    <CalendarCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="font-semibold text-emerald-900">Data Invio:</span>
                    <span className="font-medium text-emerald-800">
                      {match.pecSentDate || 'Data registrata'}
                    </span>
                  </div>

                  <span className="text-emerald-300">·</span>

                  {/* Protocollo AAAAMMGGHHMMSS */}
                  <div className="flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="font-semibold text-emerald-900">Protocollo N.:</span>
                    <span className="font-mono font-bold text-emerald-950 bg-white/90 px-1.5 py-0.5 rounded border border-emerald-300 text-[11px] tracking-wider">
                      {match.protocollo || 'Non generato'}
                    </span>
                    {match.protocollo && (
                      <button
                        onClick={e => handleCopy(match.protocollo!, 'protocollo', e)}
                        className="text-emerald-700 hover:text-emerald-950 p-0.5 rounded cursor-pointer"
                        title="Copia numero protocollo"
                      >
                        {copiedField === 'protocollo' ? (
                          <Check className="w-3 h-3 text-emerald-700" />
                        ) : (
                          <Copy className="w-3 h-3 text-emerald-600" />
                        )}
                      </button>
                    )}
                  </div>
                  
                  {!isEditingSentDate ? (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setCustomSentDate(match.pecSentDate || formatCurrentSendDate());
                        setCustomProtocollo(match.protocollo || generateProtocolloNumber());
                        setIsEditingSentDate(true);
                      }}
                      className="ml-1 text-[10px] font-semibold text-emerald-700 hover:text-emerald-950 underline inline-flex items-center gap-0.5 cursor-pointer"
                      title="Modifica data e protocollo"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                      <span>Modifica</span>
                    </button>
                  ) : (
                    <form onSubmit={handleSaveSentDate} className="inline-flex flex-wrap items-center gap-1 ml-1" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={customSentDate}
                        onChange={e => setCustomSentDate(e.target.value)}
                        placeholder="GG/MM/AAAA alle OO:MM"
                        title="Data e ora invio"
                        className="bg-white border border-emerald-300 text-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <input
                        type="text"
                        value={customProtocollo}
                        onChange={e => setCustomProtocollo(e.target.value)}
                        placeholder="AAAAMMGGHHMMSS"
                        title="Numero protocollo"
                        className="bg-white border border-emerald-300 text-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono w-36 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="submit"
                        className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[10px] font-semibold hover:bg-emerald-700 cursor-pointer"
                      >
                        Salva
                      </button>
                      <button
                        type="button"
                        onClick={handleSetCurrentDateNow}
                        className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-semibold hover:bg-emerald-200 cursor-pointer"
                        title="Imposta data e protocollo correnti"
                      >
                        Ora
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Nessun invio PEC registrato per questa gara casalinga.</span>
                </div>
              )}
            </div>
          </div>

          {/* Date, Time & Facility */}
          <div className="md:col-span-5 space-y-1.5 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 text-slate-700 font-medium">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-900">{match.data}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-900">{match.ora}</span>
              </div>
              {priority.isUpcoming && match.status !== 'inviata' && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${priority.colorClasses.badge}`}
                  title="Partita entro 3 giorni: inviare PEC con massima priorità"
                >
                  <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                  <span>{priority.shortBadge}</span>
                </span>
              )}
            </div>

            <div className="flex items-start justify-between gap-2 text-slate-600 pt-0.5">
              <div className="flex items-start gap-1.5 min-w-0 flex-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-tight line-clamp-1" title={match.facilityText}>
                  {match.facilityText}
                </span>
              </div>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onChangeFacility();
                }}
                className="text-[10px] font-semibold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200/80 shrink-0 transition-colors"
                title="Variazione veloce del campo di gioco"
              >
                Cambia Campo
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          {/* Contact & President Quick Glance */}
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{club.contactName} ({club.contactPhone})</span>
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-slate-400" />
              <span>Pres. {club.president}</span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* View Full PEC */}
            <button
              onClick={onViewDetails}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-slate-600" />
              <span>Dettagli PEC</span>
            </button>

            {/* OFFICIAL PDF DOWNLOAD (Certificazione di Invio PEC) */}
            <button
              onClick={handleDownloadPdf}
              title={`Scarica attestazione ufficiale PDF con certificazione di invio alla PEC ${COMMISSARIATO_INFO.pec}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors shadow-2xs"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-red-600" />
              <span>Scarica PDF Attestazione</span>
            </button>

            {/* Quick Copy Subject */}
            <button
              onClick={e => handleCopy(pec.oggetto, 'subject', e)}
              title="Copia Oggetto Mail (tutto maiuscolo)"
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {copiedField === 'subject' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{copiedField === 'subject' ? 'Copiato!' : 'Oggetto'}</span>
            </button>

            {/* Quick Copy Complete Body */}
            <button
              onClick={e => handleCopy(pec.testoCompleto, 'body', e)}
              title="Copia Testo Completo PEC pronto per invio"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {copiedField === 'body' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{copiedField === 'body' ? 'Copiato!' : 'Copia Testo PEC'}</span>
            </button>

            {/* Download .TXT with Separated Fields */}
            <button
              onClick={handleDownloadTxt}
              title="Scarica file di testo con campi separati come richiesto"
              className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>.TXT</span>
            </button>

            {/* Open Mailto */}
            <a
              href={mailtoLink}
              title={`Apri nel client di posta verso ${COMMISSARIATO_INFO.pec}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Client PEC</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
