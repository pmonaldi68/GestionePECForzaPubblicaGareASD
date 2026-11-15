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
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Calendar Top Toolbar */}
      <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
            <CalendarIcon className="w-4.5 h-4.5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-baseline gap-2.5">
              <h2 className="font-display text-lg font-bold text-slate-900 capitalize tracking-tight">
                {monthName}
              </h2>
              <span className="text-xs text-slate-500 font-medium tabular-nums">
                · {matchesInCurrentMonth} {matchesInCurrentMonth === 1 ? 'gara' : 'gare'}
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
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSubView('month')}
              className={`h-7 px-3 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                subView === 'month'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Griglia Mese</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('agenda')}
              className={`h-7 px-3 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                subView === 'agenda'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Agenda Gare</span>
            </button>
          </div>

          {/* Month Step Buttons */}
          <div className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Mese precedente"
              aria-label="Mese precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={jumpToEarliest}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              title="Torna alle gare in programma"
            >
              Oggi / Gare
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Mese successivo"
              aria-label="Mese successivo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Clubs Color Legend */}
      <div className="px-6 py-2.5 bg-white border-b border-slate-100 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="font-medium text-slate-400">
          Società:
        </span>
        {Object.values(CLUBS).map(club => (
          <div key={club.id} className="flex items-center gap-1.5 font-medium text-slate-700">
            <span
              className="w-2.5 h-2.5 rounded-xs shrink-0"
              style={{ backgroundColor: club.primaryColor }}
              aria-hidden="true"
            />
            <span>{club.shortName}</span>
          </div>
        ))}
        <div className="ml-auto hidden sm:flex items-center gap-4 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Home className="w-3.5 h-3.5 text-amber-600" />
            <span>Gara in Casa (PEC)</span>
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>PEC Inviata</span>
          </span>
        </div>
      </div>

      {/* SUBVIEW 1: MONTH GRID VIEW */}
      {subView === 'month' && (
        <div className="p-3 sm:p-5">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center text-xs font-semibold text-slate-500">
            {weekDayNames.map((name, i) => (
              <div
                key={name}
                className={`py-1.5 rounded-md ${i >= 5 ? 'text-amber-800 bg-amber-50/60' : ''}`}
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
              const isToday = new Date().toISOString().slice(0, 10) === dayItem.key;

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] sm:min-h-[136px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between transition-colors ${
                    dayItem.isCurrentMonth
                      ? isWeekend
                        ? 'bg-amber-50/20 border-amber-200/50'
                        : 'bg-white border-slate-200'
                      : 'bg-slate-50/70 border-slate-100 text-slate-400'
                  } ${isToday ? 'ring-2 ring-blue-500/30 border-blue-400 bg-blue-50/15' : ''}`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-1 tabular-nums">
                    <span
                      className={`text-xs font-semibold ${
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
                      <span className="text-[11px] font-semibold text-slate-500">
                        {dayMatches.length} {dayMatches.length === 1 ? 'gara' : 'gare'}
                      </span>
                    )}
                  </div>

                  {/* Day Events Container */}
                  <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[120px] scrollbar-none">
                    {dayMatches.map((m, mIdx) => {
                      const club = CLUBS[m.clubId] || CLUBS.CYNTHIA_1920;
                      return (
                        <button
                          type="button"
                          key={`${m.id}_${mIdx}`}
                          onClick={() => onSelectMatch(m)}
                          className="w-full text-left p-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 transition-colors group cursor-pointer"
                          title={`${m.squadraCasa} vs ${m.squadraOspite} - Ore ${m.ora} - Clicca per PEC`}
                        >
                          <div className="flex items-center justify-between gap-1 text-[10px]">
                            <span className="font-semibold text-slate-700 inline-flex items-center gap-1 tabular-nums">
                              <span
                                className="w-2 h-2 rounded-xs shrink-0"
                                style={{ backgroundColor: club.primaryColor }}
                                aria-hidden="true"
                              />
                              <span>{m.ora}</span>
                            </span>

                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[9px] font-semibold ${
                                  m.isHome ? 'text-amber-700' : 'text-slate-400'
                                }`}
                              >
                                {m.isHome ? 'Casa' : 'Trasf'}
                              </span>
                              {m.status === 'inviata' && (
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              )}
                            </div>
                          </div>

                          <div className="text-[11px] font-semibold text-slate-900 leading-tight truncate mt-0.5 group-hover:text-blue-700">
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
                  <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200">
                    <h3 className="font-display text-sm font-bold text-slate-900 capitalize">
                      {formattedDate}
                    </h3>
                    <span className="text-xs text-slate-500 font-medium ml-auto tabular-nums">
                      {group.matches.length} {group.matches.length === 1 ? 'partita' : 'partite'}
                    </span>
                  </div>

                  {/* Matches on this date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.matches.map((m, mIdx) => {
                      const club = CLUBS[m.clubId] || CLUBS.CYNTHIA_1920;
                      return (
                        <div
                          key={`${m.id}_${mIdx}`}
                          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between text-xs pb-2">
                              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                                <span
                                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                                  style={{ backgroundColor: club.primaryColor }}
                                  aria-hidden="true"
                                />
                                <span>{club.name}</span>
                              </span>
                              <div className="flex items-center gap-2 tabular-nums">
                                <span className="font-semibold text-slate-800 inline-flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  {m.ora}
                                </span>
                                <span className="text-slate-300">·</span>
                                <span className={`font-semibold ${m.isHome ? 'text-amber-700' : 'text-slate-500'}`}>
                                  {m.isHome ? 'In Casa' : 'Trasferta'}
                                </span>
                              </div>
                            </div>

                            <h4 className="font-display text-sm font-bold text-slate-900">
                              {m.squadraCasa} vs {m.squadraOspite}
                            </h4>

                            <div className="text-xs text-slate-500 mt-0.5">
                              {m.campionato} · Girone {m.girone} · {m.giornata}
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-2.5 pt-2.5 border-t border-slate-100">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{m.facilityText}</span>
                            </div>
                          </div>

                          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="text-xs tabular-nums">
                              {m.status === 'inviata' ? (
                                <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                  <span>Inviata {m.protocollo ? `· Prot. ${m.protocollo}` : ''}</span>
                                </span>
                              ) : (
                                <span className="text-rose-700 font-semibold inline-flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                  <span>PEC Da Inviare</span>
                                </span>
                              )}
                            </span>

                            <button
                              type="button"
                              onClick={() => onSelectMatch(m)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold h-8 px-3 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
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
