import React, { useState } from 'react';
import { 
  Search, 
  Home, 
  Filter, 
  CheckSquare, 
  Square, 
  X, 
  Calendar as CalendarIcon, 
  List, 
  Clock, 
  CalendarRange, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { ClubId, DateRangeFilter, DateRangePreset } from '../types';
import { CLUBS } from '../config/clubsData';

interface FiltersBarProps {
  selectedClub: ClubId | 'ALL';
  onSelectClub: (club: ClubId | 'ALL') => void;
  onlyHomeMatches: boolean;
  onToggleOnlyHome: (val: boolean) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  availableCategories: string[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: 'ALL' | 'da_inviare' | 'inviata';
  onStatusFilterChange: (status: 'ALL' | 'da_inviare' | 'inviata') => void;
  totalFilteredCount: number;
  totalSentCount: number;
  selectedMatchIds: string[];
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  viewMode: 'list' | 'calendar';
  onToggleViewMode: (mode: 'list' | 'calendar') => void;
  dateRange: DateRangeFilter;
  onDateRangeChange: (val: DateRangeFilter) => void;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  selectedClub,
  onSelectClub,
  onlyHomeMatches,
  onToggleOnlyHome,
  selectedCategory,
  onSelectCategory,
  availableCategories,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  totalFilteredCount,
  totalSentCount,
  selectedMatchIds,
  onToggleSelectAll,
  isAllSelected,
  viewMode,
  onToggleViewMode,
  dateRange,
  onDateRangeChange,
}) => {
  const [showCustomDateInputs, setShowCustomDateInputs] = useState(dateRange.preset === 'CUSTOM');

  const handlePresetSelect = (preset: DateRangePreset) => {
    if (preset === 'CUSTOM') {
      setShowCustomDateInputs(true);
      onDateRangeChange({ preset: 'CUSTOM', startDate: dateRange.startDate || '', endDate: dateRange.endDate || '' });
    } else {
      setShowCustomDateInputs(false);
      onDateRangeChange({ preset });
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 space-y-3">
        {/* Top row: Club selector tabs & Main Toggles */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Club Segmented Switcher */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              onClick={() => onSelectClub('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedClub === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Tutte le Società
            </button>

            {Object.values(CLUBS).map(club => {
              const isSelected = selectedClub === club.id;
              return (
                <button
                  key={club.id}
                  onClick={() => onSelectClub(club.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: club.primaryColor }}
                  />
                  <span>{club.shortName}</span>
                </button>
              );
            })}
          </div>

          {/* Right side controls: View Mode, Solo Gare Casa, and Status Filter */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
              <button
                onClick={() => onToggleViewMode('list')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Elenco</span>
              </button>
              <button
                onClick={() => onToggleViewMode('calendar')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-semibold transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendario</span>
              </button>
            </div>

            {/* Strict Home match toggle */}
            <button
              onClick={() => onToggleOnlyHome(!onlyHomeMatches)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                onlyHomeMatches
                  ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              title="Per regolamento N.O.I.F., la PEC di forza pubblica va richiesta solo per le gare disputate in casa"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Solo Gare In Casa</span>
              {onlyHomeMatches && <span className="text-[10px] ml-0.5 font-bold uppercase opacity-90">(Attivo)</span>}
            </button>

            {/* Status Filter (Default: da_inviare, with hidden sent notification) */}
            <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs items-center">
              <button
                onClick={() => onStatusFilterChange('da_inviare')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold transition-colors ${
                  statusFilter === 'da_inviare'
                    ? 'bg-white text-rose-700 shadow-xs ring-1 ring-rose-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Gare con richiesta PEC ancora da inviare (predefinito all'apertura)"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Da Inviare</span>
              </button>

              <button
                onClick={() => onStatusFilterChange('inviata')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-semibold transition-colors ${
                  statusFilter === 'inviata'
                    ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-emerald-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Gare con PEC già registrata come inviata"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Inviate ({totalSentCount})</span>
              </button>

              <button
                onClick={() => onStatusFilterChange('ALL')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tutte
              </button>
            </div>
          </div>
        </div>

        {/* Second row: Search, Category, Date Range Picker, and Selection Count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {/* Search input */}
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Cerca squadra, data o girone..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Range Selector */}
            <div className="inline-flex items-center gap-1.5">
              <div className="relative">
                <select
                  value={dateRange.preset}
                  onChange={e => handlePresetSelect(e.target.value as DateRangePreset)}
                  className="pl-7 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="ALL">Tutte le Date</option>
                  <option value="CURRENT_MONTH">Questo Mese</option>
                  <option value="NEXT_MONTH">Mese Prossimo</option>
                  <option value="THIS_WEEKEND">Questo Fine Settimana</option>
                  <option value="CUSTOM">Periodo Personalizzato...</option>
                </select>
                <CalendarRange className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Custom Date Inputs if CUSTOM is active */}
              {showCustomDateInputs && (
                <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-200 text-xs">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Da</span>
                  <input
                    type="date"
                    value={dateRange.startDate || ''}
                    onChange={e => onDateRangeChange({ ...dateRange, startDate: e.target.value })}
                    className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-800"
                  />
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">A</span>
                  <input
                    type="date"
                    value={dateRange.endDate || ''}
                    onChange={e => onDateRangeChange({ ...dateRange, endDate: e.target.value })}
                    className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-800"
                  />
                </div>
              )}
            </div>

            {/* Category Dropdown */}
            {availableCategories.length > 0 && (
              <div className="shrink-0">
                <select
                  value={selectedCategory}
                  onChange={e => onSelectCategory(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white font-medium cursor-pointer max-w-[190px] truncate"
                >
                  <option value="ALL">Tutte le Categorie ({availableCategories.length})</option>
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Selection & Count helpers */}
          <div className="flex items-center gap-3 text-xs text-slate-600 justify-between sm:justify-end shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">
                <strong className="text-slate-900 font-bold">{totalFilteredCount}</strong> {totalFilteredCount === 1 ? 'gara visibile' : 'gare visibili'}
              </span>

              {statusFilter === 'da_inviare' && totalSentCount > 0 && (
                <button
                  onClick={() => onStatusFilterChange('inviata')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 transition-colors"
                  title="All'apertura le PEC inviate sono nascoste. Clicca per visualizzarle."
                >
                  <EyeOff className="w-3 h-3 text-emerald-600" />
                  <span>{totalSentCount} inviate nascoste</span>
                </button>
              )}
            </div>

            {totalFilteredCount > 0 && (
              <button
                onClick={onToggleSelectAll}
                className="inline-flex items-center gap-1.5 font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                {isAllSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>
                  {selectedMatchIds.length > 0
                    ? `Selezionate (${selectedMatchIds.length})`
                    : 'Seleziona tutte'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
