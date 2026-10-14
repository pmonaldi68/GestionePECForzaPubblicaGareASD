import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Home, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  ListOrdered 
} from 'lucide-react';
import { Match, ClubId } from '../types';
import { CLUBS } from '../config/clubsData';
import { parseMatchDate, formatDateToISOString, formatItalianDateWithWeekday } from '../utils/dateUtils';

interface CalendarViewProps {
  matches: Match[];
  onSelectMatch: (match: Match) => void;
  selectedClub: ClubId | 'ALL';
}

type CalendarSubView = 'month' | 'agenda';

export const CalendarView: React.FC<CalendarViewProps> = ({
  matches,
  onSelectMatch,
  selectedClub,
}) => {
  // Determine initial month based on earliest match or current date
  const initialDate = useMemo(() => {
    for (const m of matches) {
      const d = parseMatchDate(m.data);
      if (d) return new Date(d.getFullYear(), d.getMonth(), 1);
    }
    return new Date(2026, 9, 1); // October 2026 default
  }, [matches]);

  const [currentMonth, setCurrentMonth] = useState<Date>(initialDate);
  const [subView, setSubView] = useState<CalendarSubView>('month');

  // Month navigation
  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const jumpToEarliest = () => {
    setCurrentMonth(initialDate);
  };

  // Map matches by YYYY-MM-DD
  const matchesByDate = useMemo(() => {
    const map = new Map<string, Match[]>();
    matches.forEach(m => {
      const d = parseMatchDate(m.data);
      if (d) {
        const key = formatDateToISOString(d);
        const existing = map.get(key) || [];
        existing.push(m);
        // Sort by time
        existing.sort((a, b) => a.ora.localeCompare(b.ora));
        map.set(key, existing);
      }
    });
    return map;
  }, [matches]);

  // Generate calendar grid days for current month
  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Italian week starts on Monday (0=Sun, 1=Mon, ..., 6=Sat)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday is 6th index

    const days: { date: Date; isCurrentMonth: boolean; key: string }[] = [];

    // Previous month padding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ date: d, isCurrentMonth: false, key: formatDateToISOString(d) });
    }

    // Current month days
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const d = new Date(year, month, day);
      days.push({ date: d, isCurrentMonth: true, key: formatDateToISOString(d) });
    }

    // Next month padding days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day);
      days.push({ date: d, isCurrentMonth: false, key: formatDateToISOString(d) });
    }

    return days;
  }, [currentMonth]);

  // Agenda items: sorted matches grouped by date
  const agendaDates = useMemo(() => {
    const dateKeys = Array.from(matchesByDate.keys()).sort();
    return dateKeys.map(key => ({
      dateKey: key,
      dateObj: new Date(key),
      matches: matchesByDate.get(key) || [],
    }));
  }, [matchesByDate]);

  // Total matches in current displayed month
  const matchesInCurrentMonth = useMemo(() => {
    let count = 0;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    matches.forEach(m => {
      const d = parseMatchDate(m.data);
      if (d && d.getFullYear() === year && d.getMonth() === month) {
        count++;
      }
    });
    return count;
  }, [matches, currentMonth]);

  const monthName = currentMonth.toLocaleDateString('it-IT', {
    month: 'long',
    year: 'numeric',
  });

  const weekDayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      {/* Calendar Top Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <CalendarIcon className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 capitalize tracking-tight">
                {monthName}
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-semibold">
                {matchesInCurrentMonth} {matchesInCurrentMonth === 1 ? 'gara' : 'gare'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Visualizzazione orari, impianti e stato PEC differenziati per società sportiva
            </p>
          </div>
        </div>

        {/* Controls: Month Nav & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Subview Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 text-xs">
            <button
              onClick={() => setSubView('month')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                subView === 'month'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Griglia Mese</span>
            </button>
            <button
              onClick={() => setSubView('agenda')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                subView === 'agenda'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Agenda Gare</span>
            </button>
          </div>

          {/* Month Step Buttons */}
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Mese precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={jumpToEarliest}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              title="Torna alle gare in programma"
            >
              Oggi / Gare
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Mese successivo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Clubs Color Legend */}
      <div className="px-5 py-2.5 bg-white border-b border-slate-100 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
          Legenda Società:
        </span>
        {Object.values(CLUBS).map(club => (
          <div key={club.id} className="flex items-center gap-1.5 font-medium text-slate-700">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: club.primaryColor }}
            />
            <span>{club.shortName}</span>
          </div>
        ))}
        <div className="ml-auto hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Home className="w-3 h-3 text-amber-600" />
            <span>Gara in Casa (PEC)</span>
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>PEC Inviata</span>
          </span>
        </div>
      </div>

      {/* SUBVIEW 1: MONTH GRID VIEW */}
      {subView === 'month' && (
        <div className="p-3 sm:p-5">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
            {weekDayNames.map((name, i) => (
              <div
                key={name}
                className={`py-1.5 rounded ${i >= 5 ? 'text-amber-800 bg-amber-50/50' : ''}`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 auto-rows-fr">
            {calendarGrid.map((dayItem, idx) => {
              const dayMatches = matchesByDate.get(dayItem.key) || [];
              const isWeekend = dayItem.date.getDay() === 0 || dayItem.date.getDay() === 6;
              const isToday =
                new Date().toISOString().slice(0, 10) === dayItem.key;

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] sm:min-h-[140px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between transition-colors ${
                    dayItem.isCurrentMonth
                      ? isWeekend
                        ? 'bg-amber-50/20 border-amber-200/40'
                        : 'bg-white border-slate-200/80'
                      : 'bg-slate-50/60 border-slate-100 text-slate-400'
                  } ${isToday ? 'ring-2 ring-blue-500 bg-blue-50/20' : ''}`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-1">
                    <span
                      className={`text-xs font-bold ${
                        dayItem.isCurrentMonth
                          ? isWeekend
                            ? 'text-amber-900'
                            : 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {dayItem.date.getDate()}
                    </span>

                    {dayMatches.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-900 text-white leading-tight">
                        {dayMatches.length}
                      </span>
                    )}
                  </div>

                  {/* Day Events Container */}
                  <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[120px] scrollbar-none">
                    {dayMatches.map((m, mIdx) => {
                      const club = CLUBS[m.clubId] || CLUBS.CYNTHIA_1920;
                      return (
                        <button
                          key={`${m.id}_${mIdx}`}
                          onClick={() => onSelectMatch(m)}
                          className="w-full text-left p-1.5 rounded-lg border transition-all hover:scale-[1.02] hover:shadow-xs group cursor-pointer"
                          style={{
                            borderLeftWidth: '3.5px',
                            borderLeftColor: club.primaryColor,
                            backgroundColor: '#ffffff',
                            borderColor: '#e2e8f0',
                          }}
                          title={`${m.squadraCasa} vs ${m.squadraOspite} - Ore ${m.ora} - Clicca per PEC`}
                        >
                          {/* Time & Badges */}
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span className="font-bold text-slate-800 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5 text-slate-400" />
                              {m.ora}
                            </span>

                            <div className="flex items-center gap-1">
                              {m.isHome ? (
                                <span
                                  className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800"
                                  title="Gara in casa (PEC necessaria)"
                                >
                                  CASA
                                </span>
                              ) : (
                                <span
                                  className="text-[9px] font-medium px-1 py-0.2 rounded bg-slate-100 text-slate-600"
                                  title="Gara in trasferta"
                                >
                                  TRASF
                                </span>
                              )}
                              {m.status === 'inviata' && (
                                <span title="PEC Inviata">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Match Teams */}
                          <div className="text-[11px] font-semibold text-slate-900 leading-tight truncate mt-0.5 group-hover:text-blue-600">
                            {m.squadraCasa}
                          </div>
                          <div className="text-[10px] text-slate-500 leading-tight truncate">
                            vs {m.squadraOspite}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBVIEW 2: AGENDA VIEW */}
      {subView === 'agenda' && (
        <div className="p-4 sm:p-6 space-y-6">
          {agendaDates.length > 0 ? (
            agendaDates.map(group => {
              const formattedDate = formatItalianDateWithWeekday(group.dateObj);

              return (
                <div key={group.dateKey} className="space-y-3">
                  {/* Date Heading */}
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                    <div className="w-2 h-2 rounded-full bg-slate-900" />
                    <h3 className="text-sm font-bold text-slate-900 capitalize">
                      {formattedDate}
                    </h3>
                    <span className="text-xs text-slate-500 font-medium ml-auto">
                      {group.matches.length} {group.matches.length === 1 ? 'partita' : 'partite'}
                    </span>
                  </div>

                  {/* Matches on this date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.matches.map((m, mIdx) => {
                      const club = CLUBS[m.clubId];
                      return (
                        <div
                          key={`${m.id}_${mIdx}`}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all flex flex-col justify-between shadow-xs"
                          style={{
                            borderLeftWidth: '4px',
                            borderLeftColor: club.primaryColor,
                          }}
                        >
                          <div>
                            {/* Top info */}
                            <div className="flex items-center justify-between text-xs pb-1.5">
                              <span className="font-bold text-slate-700">
                                {club.name}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-800 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  {m.ora}
                                </span>
                                {m.isHome ? (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                    IN CASA
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                    TRASFERTA
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Teams */}
                            <h4 className="text-sm font-bold text-slate-900">
                              {m.squadraCasa} vs {m.squadraOspite}
                            </h4>

                            <div className="text-xs text-slate-500 mt-0.5">
                              {m.campionato} · Girone {m.girone} · {m.giornata}
                            </div>

                            {/* Facility */}
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{m.facilityText}</span>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs">
                              {m.status === 'inviata' ? (
                                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>Inviata {m.protocollo ? `· Prot. ${m.protocollo}` : ''}</span>
                                </span>
                              ) : (
                                <span className="text-rose-700 font-semibold flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" /> PEC Da Inviare
                                </span>
                              )}
                            </span>

                            <button
                              onClick={() => onSelectMatch(m)}
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Bozza PEC</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Nessuna gara registrata per l'agenda corrente.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
