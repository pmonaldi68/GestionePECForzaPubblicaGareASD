import React from 'react';
import { Search, Home, Filter, CheckSquare, Square, X, Calendar as CalendarIcon, List } from 'lucide-react';
import { ClubId } from '../types';
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
  selectedMatchIds: string[];
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
  viewMode: 'list' | 'calendar';
  onToggleViewMode: (mode: 'list' | 'calendar') => void;
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
  selectedMatchIds,
  onToggleSelectAll,
  isAllSelected,
  viewMode,
  onToggleViewMode,
}) => {
  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 space-y-3">
        {/* Top row: Club selector tabs & Home toggle */}
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

          {/* View Mode & Strict "Solo Gare In Casa" Toggle & Status filter */}
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

            <button
              onClick={() => onToggleOnlyHome(!onlyHomeMatches)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors ${
                onlyHomeMatches
                  ? 'bg-amber-500 border-amber-600 text-white shadow-xs'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              title="Per regolamento, la PEC di forza pubblica va richiesta solo per le gare disputate in casa"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Solo Gare In Casa</span>
              {onlyHomeMatches && <span className="text-[10px] ml-0.5 font-bold uppercase opacity-90">(Attivo)</span>}
            </button>

            {/* Status Filter */}
            <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs">
              <button
                onClick={() => onStatusFilterChange('ALL')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tutti gli stati
              </button>
              <button
                onClick={() => onStatusFilterChange('da_inviare')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  statusFilter === 'da_inviare' ? 'bg-white text-rose-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Da Inviare
              </button>
              <button
                onClick={() => onStatusFilterChange('inviata')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  statusFilter === 'inviata' ? 'bg-white text-emerald-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Inviate
              </button>
            </div>
          </div>
        </div>

        {/* Bottom row: Search, Category dropdown, and Selection counter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="flex flex-1 items-center gap-2 max-w-xl">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Cerca squadra casa, ospite, data o girone..."
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

            {/* Category Dropdown */}
            {availableCategories.length > 0 && (
              <div className="shrink-0">
                <select
                  value={selectedCategory}
                  onChange={e => onSelectCategory(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white font-medium cursor-pointer"
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
          <div className="flex items-center gap-3 text-xs text-slate-600 justify-between sm:justify-end">
            <span className="font-medium">
              <strong className="text-slate-900 font-bold">{totalFilteredCount}</strong> {totalFilteredCount === 1 ? 'gara trovata' : 'gare trovate'}
            </span>

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
