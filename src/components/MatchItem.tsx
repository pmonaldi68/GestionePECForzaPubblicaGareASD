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
  AlertCircle 
} from 'lucide-react';
import { Match } from '../types';
import { CLUBS, COMMISSARIATO_INFO } from '../config/clubsData';
import { generatePecForMatch, formatSeparatedFieldsTxt, downloadTextFile, createMailtoLink } from '../utils/pecGenerator';

interface MatchItemProps {
  match: Match;
  isSelected: boolean;
  onToggleSelect: () => void;
  onViewDetails: () => void;
  onToggleStatus: () => void;
  onToggleIsHome: () => void;
  useDynamicAsdName: boolean;
  onChangeFacility: () => void;
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
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const club = CLUBS[match.clubId] || CLUBS.CYNTHIA_1920;
  const pec = generatePecForMatch(match, useDynamicAsdName);

  const handleCopy = (text: string, fieldName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadTxt = (e: React.MouseEvent) => {
    e.stopPropagation();
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
    <div
      className={`border rounded-xl transition-all duration-150 bg-white ${
        isSelected
          ? 'border-blue-500 shadow-sm ring-1 ring-blue-500'
          : 'border-slate-200/80 hover:border-slate-300 shadow-xs'
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

          <div className="flex items-center gap-2">
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

            {/* Status Button */}
            <button
              onClick={e => {
                e.stopPropagation();
                onToggleStatus();
              }}
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors ${
                match.status === 'inviata'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              {match.status === 'inviata' ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>PEC Inviata</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  <span>Da Inviare</span>
                </>
              )}
            </button>
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
          </div>

          {/* Date, Time & Facility */}
          <div className="md:col-span-5 space-y-1 text-xs">
            <div className="flex items-center gap-3 text-slate-700 font-medium">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{match.data}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{match.ora}</span>
              </div>
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

            {/* Quick Copy Subject */}
            <button
              onClick={e => handleCopy(pec.oggetto, 'subject', e)}
              title="Copia Oggetto Mail (tutto maiuscolo)"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {copiedField === 'subject' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{copiedField === 'subject' ? 'Copiato!' : 'Copia Oggetto'}</span>
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
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Salva .TXT</span>
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
