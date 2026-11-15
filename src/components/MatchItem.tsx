import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  Mail,
  Eye,
  Home,
  MapPin,
  Calendar,
  Clock,
  Phone,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  CalendarCheck,
  Edit2,
  MoreVertical,
  FileCheck2,
  ShieldCheck,
  Building2
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
  onChangeStatus?: () => void;
  onChangeClub?: () => void;
  onNotify?: (message: string) => void;
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
  onChangeStatus,
  onChangeClub,
  onNotify,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isEditingSentDate, setIsEditingSentDate] = useState<boolean>(false);
  const [customSentDate, setCustomSentDate] = useState<string>(match.pecSentDate || '');
  const [customProtocollo, setCustomProtocollo] = useState<string>(match.protocollo || '');
  const [showQuickMenu, setShowQuickMenu] = useState<boolean>(false);

  const club = CLUBS[match.clubId] || CLUBS.CYNTHIA_1920;
  const pec = generatePecForMatch(match, useDynamicAsdName);
  const priority = getMatchPriority(match.data, match.status);

  const handleCopy = (text: string, fieldName: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    onNotify?.(`${label} copiato negli appunti`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadTxt = (e: React.MouseEvent) => {
    e.stopPropagation();
    const content = formatSeparatedFieldsTxt(match, pec);
    const safeCategory =
      resolveMatchCategory(match)
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || 'GARA';
    const safeDate = match.data.replace(/[^0-9]/g, '-');
    const safeHome = match.squadraCasa.replace(/[^a-zA-Z0-9]/g, '_');
    const safeAway = match.squadraOspite.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Attestazione_PEC_${safeCategory}_${safeDate}_${safeHome}_vs_${safeAway}.txt`;
    downloadTextFile(filename, content);
    onNotify?.(`File .TXT scaricato per ${match.squadraCasa} vs ${match.squadraOspite}`);
  };

  const handleDownloadPdf = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (match.status !== 'inviata') {
      const now = formatCurrentSendDate();
      const prot = match.protocollo || generateProtocolloNumber();
      if (onUpdateSentDate) {
        onUpdateSentDate(now, prot);
      }
      downloadMatchPecPdf({ ...match, status: 'inviata', pecSentDate: now, protocollo: prot }, useDynamicAsdName);
      onNotify?.(`PDF generato e gara contrassegnata come Inviata (Prot. ${prot})`);
    } else {
      const prot = match.protocollo || generateProtocolloNumber();
      if (!match.protocollo && onUpdateProtocollo) {
        onUpdateProtocollo(prot);
      }
      downloadMatchPecPdf({ ...match, protocollo: prot }, useDynamicAsdName);
      onNotify?.(`Attestazione PDF scaricata (Prot. ${prot})`);
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
    onNotify?.('Data invio e numero protocollo aggiornati');
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
    onNotify?.('Impostati data corrente e nuovo protocollo');
  };

  const mailtoLink = createMailtoLink(
    COMMISSARIATO_INFO.pec,
    pec.oggetto,
    pec.testoCompleto
  );

  return (
    <article
      className={`match-card-container rounded-xl border transition-colors duration-150 relative ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/15 bg-white'
          : match.status === 'inviata'
          ? 'border-emerald-200 bg-emerald-50/15 hover:border-emerald-300'
          : priority.isUpcoming
          ? 'border-amber-300 bg-amber-50/20 hover:border-amber-400'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="p-4 sm:px-5 sm:py-4">
        {/* Top Metadata & State Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          {/* Left: Checkbox + Unboxed Club & Category Metadata */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              aria-label={`Seleziona gara ${match.squadraCasa} vs ${match.squadraOspite}`}
              className="w-4 h-4 rounded border-slate-300 cursor-pointer shrink-0"
            />

            {onChangeClub ? (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onChangeClub();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 hover:text-blue-700 transition-colors cursor-pointer group"
                title="Clicca per variare società, presidente o condizione casa/trasferta"
              >
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: club.primaryColor }}
                  aria-hidden="true"
                />
                <span className="group-hover:underline underline-offset-2">{club.name}</span>
                <Building2 className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: club.primaryColor }}
                  aria-hidden="true"
                />
                <span>{club.name}</span>
              </span>
            )}

            <span aria-hidden="true" className="text-slate-300 text-xs">·</span>

            <span className="text-xs font-medium text-slate-600 truncate">
              {match.category || match.campionato}
            </span>

            {priority.isUpcoming && match.status !== 'inviata' && (
              <>
                <span aria-hidden="true" className="text-slate-300 text-xs">·</span>
                <span
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800"
                  title={`Partita entro 3 giorni: ${priority.label}`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{priority.label}</span>
                </span>
              </>
            )}
          </div>

          {/* Right: Interactive State Controls */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onToggleIsHome();
              }}
              title="Clicca per invertire Casa / Trasferta"
              className={`inline-flex items-center gap-1 h-7 px-2 text-[11px] font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                match.isHome
                  ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Home className={`w-3 h-3 ${match.isHome ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>{match.isHome ? 'In Casa' : 'Trasferta'}</span>
            </button>

            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onToggleStatus();
              }}
              className={`inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                match.status === 'inviata'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
              title={
                match.status === 'inviata'
                  ? 'PEC contrassegnata come inviata. Clicca per variare stato.'
                  : 'Clicca per registrare l’invio PEC con la data corrente.'
              }
            >
              {match.status === 'inviata' ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>PEC Inviata</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                  <span>Da Inviare</span>
                </>
              )}
            </button>

            {onChangeStatus && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onChangeStatus();
                }}
                className="inline-flex items-center gap-1 h-7 px-2 text-[11px] font-medium rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Modifica stato, data invio, protocollo e note"
              >
                <Edit2 className="w-3 h-3 text-slate-400" />
                <span className="hidden sm:inline">Varia Stato</span>
              </button>
            )}

            {/* Quick Overflow Actions Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setShowQuickMenu(prev => !prev);
                }}
                aria-label="Altre azioni gara"
                aria-expanded={showQuickMenu}
                className="inline-flex items-center justify-center w-7 h-7 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                title="Altre azioni"
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
                  <div className="modal-panel absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-30 text-xs">
                    {onChangeClub && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setShowQuickMenu(false);
                          onChangeClub();
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-800 font-medium cursor-pointer"
                      >
                        <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Varia Società e Presidente...</span>
                      </button>
                    )}
                    {onChangeStatus && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setShowQuickMenu(false);
                          onChangeStatus();
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-800 font-medium cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Varia Stato e Protocollo...</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setShowQuickMenu(false);
                        onToggleStatus();
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {match.status === 'inviata' ? 'Segna come Da Inviare' : 'Segna PEC Inviata Oggi'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setShowQuickMenu(false);
                        onChangeFacility();
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Cambia Campo di Gioco</span>
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setShowQuickMenu(false);
                        handleDownloadPdf(e);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-rose-700 font-medium cursor-pointer"
                    >
                      <FileCheck2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Scarica Attestazione PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setShowQuickMenu(false);
                        handleDownloadTxt(e);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Salva File .TXT</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center Match Grid: Teams & Schedule */}
        <div className="py-3.5 grid grid-cols-1 md:grid-cols-12 gap-3 items-start md:items-center">
          {/* Teams & Sent Telemetry */}
          <div className="md:col-span-7 space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span
                className={`font-display text-base sm:text-[17px] tracking-tight ${
                  match.isHome ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                }`}
              >
                {match.squadraCasa}
              </span>
              <span className="text-slate-400 font-normal text-xs">vs</span>
              <span
                className={`font-display text-base sm:text-[17px] tracking-tight ${
                  !match.isHome ? 'font-bold text-slate-900' : 'font-medium text-slate-600'
                }`}
              >
                {match.squadraOspite}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>{match.campionato}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>Girone {match.girone}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>{match.giornata}</span>
            </div>

            {/* Sent Date & Protocollo Strip */}
            <div className="pt-1">
              {match.status === 'inviata' ? (
                <div className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 bg-emerald-50/80 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs">
                  <div className="inline-flex items-center gap-1.5 tabular-nums">
                    <CalendarCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="font-medium text-emerald-900">Inviata:</span>
                    <span className="font-semibold text-emerald-800">
                      {match.pecSentDate || 'Data registrata'}
                    </span>
                  </div>

                  <span aria-hidden="true" className="text-emerald-300">·</span>

                  <div className="inline-flex items-center gap-1.5">
                    <span className="font-medium text-emerald-900">Prot.</span>
                    <code className="font-mono font-semibold text-emerald-950 bg-white px-1.5 py-0.5 rounded border border-emerald-200 text-[11px] tabular-nums">
                      {match.protocollo || 'Non generato'}
                    </code>
                    {match.protocollo && (
                      <button
                        type="button"
                        onClick={e => handleCopy(match.protocollo!, 'protocollo', 'Protocollo', e)}
                        className="text-emerald-700 hover:text-emerald-950 p-0.5 rounded cursor-pointer"
                        title="Copia numero protocollo"
                        aria-label="Copia numero protocollo"
                      >
                        {copiedField === 'protocollo' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </button>
                    )}
                  </div>

                  {!isEditingSentDate ? (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        setCustomSentDate(match.pecSentDate || formatCurrentSendDate());
                        setCustomProtocollo(match.protocollo || generateProtocolloNumber());
                        setIsEditingSentDate(true);
                      }}
                      className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 inline-flex items-center gap-0.5 cursor-pointer"
                      title="Modifica data e protocollo"
                    >
                      <span>Modifica</span>
                    </button>
                  ) : (
                    <form
                      onSubmit={handleSaveSentDate}
                      className="inline-flex flex-wrap items-center gap-1"
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={customSentDate}
                        onChange={e => setCustomSentDate(e.target.value)}
                        placeholder="GG/MM/AAAA alle OO:MM"
                        title="Data e ora invio"
                        className="bg-white border border-emerald-300 text-slate-900 px-1.5 py-0.5 rounded text-[11px] font-mono"
                      />
                      <input
                        type="text"
                        value={customProtocollo}
                        onChange={e => setCustomProtocollo(e.target.value)}
                        placeholder="AAAAMMGGHHMMSS"
                        title="Numero protocollo"
                        className="bg-white border border-emerald-300 text-slate-900 px-1.5 py-0.5 rounded text-[11px] font-mono w-32"
                      />
                      <button
                        type="submit"
                        className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[11px] font-semibold hover:bg-emerald-700 cursor-pointer"
                      >
                        Salva
                      </button>
                      <button
                        type="button"
                        onClick={handleSetCurrentDateNow}
                        className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded text-[11px] font-semibold hover:bg-emerald-200 cursor-pointer"
                      >
                        Ora
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>Richiesta PEC non ancora inviata</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Date, Time & Venue */}
          <div className="md:col-span-5 md:text-right space-y-1.5 text-xs">
            <div className="flex flex-wrap md:justify-end items-center gap-3 text-slate-700 tabular-nums">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{match.data}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{match.ora}</span>
              </span>
            </div>

            <div className="flex items-start md:justify-end gap-2 text-slate-600">
              <div className="flex items-start gap-1.5 min-w-0">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="text-xs leading-snug line-clamp-1 text-left md:text-right" title={match.facilityText}>
                  {match.facilityText}
                </span>
              </div>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onChangeFacility();
                }}
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline underline-offset-2 shrink-0 cursor-pointer"
                title="Variazione veloce del campo di gioco"
              >
                Cambia
              </button>
            </div>
          </div>
        </div>

        {/* Footer: Contact Info & Primary Actions */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          {/* Unboxed Contact & President */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {club.contactName} ({club.contactPhone})
              </span>
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            {onChangeClub ? (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onChangeClub();
                }}
                className="inline-flex items-center gap-1 text-slate-600 hover:text-blue-700 hover:underline underline-offset-2 cursor-pointer"
                title="Clicca per variare società e presidente"
              >
                <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Pres. {club.president}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-slate-600">
                <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Pres. {club.president}</span>
              </span>
            )}
          </div>

          {/* Clean Action Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onViewDetails}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-slate-600" />
              <span>Dettagli PEC</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              title={`Scarica attestazione ufficiale PDF con certificazione di invio alla PEC ${COMMISSARIATO_INFO.pec}`}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-rose-600" />
              <span>PDF Attestazione</span>
            </button>

            <button
              type="button"
              onClick={e => handleCopy(pec.oggetto, 'subject', 'Oggetto PEC', e)}
              title="Copia Oggetto Mail (tutto maiuscolo)"
              className="inline-flex items-center gap-1 h-8 px-2.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedField === 'subject' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{copiedField === 'subject' ? 'Copiato' : 'Oggetto'}</span>
            </button>

            <button
              type="button"
              onClick={e => handleCopy(pec.testoCompleto, 'body', 'Testo PEC', e)}
              title="Copia Testo Completo PEC pronto per invio"
              className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedField === 'body' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{copiedField === 'body' ? 'Copiato' : 'Copia Testo'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTxt}
              title="Scarica file di testo con campi separati"
              className="inline-flex items-center gap-1 h-8 px-2 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>.TXT</span>
            </button>

            <a
              href={mailtoLink}
              title={`Apri nel client di posta verso ${COMMISSARIATO_INFO.pec}`}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Client PEC</span>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
};
