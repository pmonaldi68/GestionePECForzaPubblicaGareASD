import React, { useState } from 'react';
import {
  Search,
  Home,
  CheckSquare,
  Square,
  X,
  Calendar as CalendarIcon,
  List,
  CalendarRange,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet
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
  onOpenExportExcel?: () => void;
  onDeleteSelected?: () => void;
  onChangeStatusSelected?: () => void;
  onChangeClubSelected?: () => void;
  onExportSelectedMergedPdf?: () => void;
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
  onOpenExportExcel,
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
    <div className="bg-white/95 backdrop-blur-xs border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 space-y-2.5">
        {/* Row 1: Club Switcher & Mode/Status Segmented Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5">
          {/* Club Filter Segmented Control */}
          <div
            role="tablist"
            aria-label="Filtro Società"
            className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 scrollbar-none"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedClub === 'ALL'}
              onClick={() => onSelectClub('ALL')}
              className={`h-8 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedClub === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Tutte le Società
            </button>

            {Object.values(CLUBS).map(club => {
              const isSelected = selectedClub === club.id;
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  key={club.id}
                  onClick={() => onSelectClub(club.id)}
                  className={`h-8 px-3 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-xs shrink-0"
                    style={{ backgroundColor: club.primaryColor }}
                    aria-hidden="true"
                  />
                  <span>{club.shortName}</span>
                </button>
              );
            })}
          </div>

          {/* Right Controls: View Mode, Solo Casa, Status */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onToggleViewMode('list')}
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Elenco</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleViewMode('calendar')}
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendario</span>
              </button>
            </div>

            {/* Home Match Toggle */}
            <button
              type="button"
              onClick={() => onToggleOnlyHome(!onlyHomeMatches)}
              aria-pressed={onlyHomeMatches}
              className={`inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                onlyHomeMatches
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Per regolamento N.O.I.F., la PEC di forza pubblica va richiesta solo per le gare disputate in casa"
            >
              <Home className={`w-3.5 h-3.5 ${onlyHomeMatches ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>Solo In Casa</span>
            </button>

            {/* Status Segmented Filter */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs items-center">
              <button
                type="button"
                onClick={() => onStatusFilterChange('da_inviare')}
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === 'da_inviare'
                    ? 'bg-white text-rose-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Gare con richiesta PEC ancora da inviare"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Da Inviare</span>
              </button>

              <button
                type="button"
                onClick={() => onStatusFilterChange('inviata')}
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  statusFilter === 'inviata'
                    ? 'bg-white text-emerald-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Gare con PEC già registrata come inviata"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Inviate ({totalSentCount})</span>
              </button>

              <button
                type="button"
                onClick={() => onStatusFilterChange('ALL')}
                className={`h-7 px-2.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tutte
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Search, Date Range, Category, Count & Select All */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Cerca squadra, data o girone..."
                className="w-full h-8 pl-8 pr-7 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label="Pulisci ricerca"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Range Selector */}
            <div className="inline-flex items-center gap-1.5">
              <div className="relative">
                <select
                  aria-label="Filtro periodo date"
                  value={dateRange.preset}
                  onChange={e => handlePresetSelect(e.target.value as DateRangePreset)}
                  className="h-8 pl-7 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:border-blue-500 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="ALL">Tutte le Date</option>
                  <option value="CURRENT_MONTH">Questo Mese</option>
                  <option value="NEXT_MONTH">Mese Prossimo</option>
                  <option value="THIS_WEEKEND">Questo Fine Settimana</option>
                  <option value="CUSTOM">Periodo Personalizzato...</option>
                </select>
                <CalendarRange className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {showCustomDateInputs && (
                <div className="flex items-center gap-1.5 bg-slate-50 px-2 h-8 rounded-lg border border-slate-200 text-xs">
                  <span className="text-[11px] text-slate-500 font-medium">Da</span>
                  <input
                    type="date"
                    value={dateRange.startDate || ''}
                    onChange={e => onDateRangeChange({ ...dateRange, startDate: e.target.value })}
                    className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-800"
                  />
                  <span className="text-[11px] text-slate-500 font-medium">A</span>
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
                  aria-label="Filtro categoria"
                  value={selectedCategory}
                  onChange={e => onSelectCategory(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:border-blue-500 focus:bg-white font-medium cursor-pointer max-w-[200px] truncate"
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

          {/* Right Utilities: Visible Count, Hidden Sent Link, Export Excel & Select All */}
          <div className="flex items-center gap-3 text-xs text-slate-600 justify-between sm:justify-end shrink-0">
            <div className="flex items-center gap-2 tabular-nums whitespace-nowrap">
              <span>
                <strong className="text-slate-900 font-semibold">{totalFilteredCount}</strong>{' '}
                {totalFilteredCount === 1 ? 'gara' : 'gare'}
              </span>

              {statusFilter === 'da_inviare' && totalSentCount > 0 && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <button
                    type="button"
                    onClick={() => onStatusFilterChange('inviata')}
                    className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-medium underline-offset-2 hover:underline transition-colors cursor-pointer"
                    title="Clicca per visualizzare le gare con PEC già inviata"
                  >
                    <EyeOff className="w-3 h-3 shrink-0" />
                    <span>{totalSentCount} inviate nascoste</span>
                  </button>
                </>
              )}
            </div>

            {totalFilteredCount > 0 && (
              <div className="flex items-center gap-2">
                {onOpenExportExcel && (
                  <button
                    type="button"
                    onClick={onOpenExportExcel}
                    className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    title="Esporta le gare filtrate in formato Excel (.xlsx) o CSV"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden md:inline">Esporta Excel</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onToggleSelectAll}
                  className="inline-flex items-center gap-1.5 h-8 px-2.5 font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer text-xs tabular-nums"
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
