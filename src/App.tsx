import React, { useState, useEffect, useMemo } from 'react';
import { Match, ClubId } from './types';
import { SAMPLE_MATCHES } from './data/sampleMatches';
import { Header } from './components/Header';
import { FiltersBar } from './components/FiltersBar';
import { MatchItem } from './components/MatchItem';
import { PecPreviewModal } from './components/PecPreviewModal';
import { ImportModal } from './components/ImportModal';
import { BatchExportModal } from './components/BatchExportModal';
import { SettingsModal } from './components/SettingsModal';
import { CalendarView } from './components/CalendarView';
import { GoogleSheetSyncBar } from './components/GoogleSheetSyncBar';
import { FacilityChangeModal } from './components/FacilityChangeModal';
import { Calendar, AlertCircle, Home, CheckSquare, Plus, FileSpreadsheet } from 'lucide-react';
import { downloadAllDraftsAsZip } from './utils/pecGenerator';
import { getGoogleSheetsCsvUrl, parseRawText, DEFAULT_COLUMN_MAPPING } from './utils/sheetParser';
import { formatDateToGGMMMAAAA } from './utils/dateUtils';

const STORAGE_KEY = 'asd_pec_matches_v1';
const DYNAMIC_ASD_KEY = 'asd_pec_dynamic_name_v1';
const STORAGE_SHEET_URL_KEY = 'asd_pec_google_sheet_url_v1';
const STORAGE_LAST_SYNC_KEY = 'asd_pec_last_sync_v1';

export default function App() {
  // Load saved matches or fallback to samples
  const [matches, setMatches] = useState<Match[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    return SAMPLE_MATCHES;
  });

  const [useDynamicAsdName, setUseDynamicAsdName] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(DYNAMIC_ASD_KEY);
      if (saved !== null) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return true;
  });

  // Persistent Google Sheet URL & sync state
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_SHEET_URL_KEY) || '';
    } catch {
      return '';
    }
  });

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_LAST_SYNC_KEY);
    } catch {
      return null;
    }
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // View Mode: 'list' or 'calendar'
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Filters State
  const [selectedClub, setSelectedClub] = useState<ClubId | 'ALL'>('ALL');
  // NOTE: Default to true as user specified: "bisogna richiedere la forza pubblica solo per le gare in casa"
  const [onlyHomeMatches, setOnlyHomeMatches] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'da_inviare' | 'inviata'>('ALL');

  // Selection & Modals State
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [activePreviewMatch, setActivePreviewMatch] = useState<Match | null>(null);
  const [facilityModalMatch, setFacilityModalMatch] = useState<Match | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isBatchExportOpen, setIsBatchExportOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Auto-sync function: updates matches from Google Sheet link
  const fetchAndSyncFromSheet = async (url: string) => {
    if (!url || !url.trim()) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const csvUrl = getGoogleSheetsCsvUrl(url);
      if (!csvUrl) {
        throw new Error('Link non riconosciuto come Foglio Google.');
      }

      let csvContent = '';
      try {
        const proxyRes = await fetch(`/api/fetch-sheet?url=${encodeURIComponent(csvUrl)}`);
        if (proxyRes.ok) {
          csvContent = await proxyRes.text();
        }
      } catch {
        // Fallback
      }

      if (!csvContent) {
        const directRes = await fetch(csvUrl);
        if (!directRes.ok) {
          throw new Error(`Errore HTTP ${directRes.status}. Verifica condivisione foglio.`);
        }
        csvContent = await directRes.text();
      }

      const parsedMatches = parseRawText(csvContent, DEFAULT_COLUMN_MAPPING);
      if (parsedMatches.length === 0) {
        throw new Error('Nessuna gara valida trovata nel foglio.');
      }

      setMatches(parsedMatches);
      const nowStr = `${formatDateToGGMMMAAAA(new Date())} alle ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
      setLastSyncTime(nowStr);
      try {
        localStorage.setItem(STORAGE_LAST_SYNC_KEY, nowStr);
        localStorage.setItem(STORAGE_SHEET_URL_KEY, url);
      } catch {}
    } catch (err: any) {
      setSyncError(err?.message || 'Errore sincronizzazione foglio Google');
    } finally {
      setIsSyncing(false);
    }
  };

  // "aggiorna i dati ogni volta che si accede": triggers auto-update on mount
  useEffect(() => {
    const storedUrl = localStorage.getItem(STORAGE_SHEET_URL_KEY);
    if (storedUrl && storedUrl.trim()) {
      fetchAndSyncFromSheet(storedUrl.trim());
    }
  }, []);

  const handleSheetUrlChange = (newUrl: string) => {
    setSheetUrl(newUrl);
    try {
      localStorage.setItem(STORAGE_SHEET_URL_KEY, newUrl);
    } catch {}
  };

  const handleClearUrl = () => {
    setSheetUrl('');
    setLastSyncTime(null);
    setSyncError(null);
    try {
      localStorage.removeItem(STORAGE_SHEET_URL_KEY);
      localStorage.removeItem(STORAGE_LAST_SYNC_KEY);
    } catch {}
  };

  // Persist matches & settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
    } catch {
      // Storage limits or private mode
    }
  }, [matches]);

  useEffect(() => {
    try {
      localStorage.setItem(DYNAMIC_ASD_KEY, JSON.stringify(useDynamicAsdName));
    } catch {
      // Storage limits
    }
  }, [useDynamicAsdName]);

  // Available categories for selected club or all
  const availableCategories = useMemo(() => {
    const relevant = selectedClub === 'ALL' 
      ? matches 
      : matches.filter(m => m.clubId === selectedClub);
    const catSet = new Set<string>();
    relevant.forEach(m => {
      const cat = m.category || m.campionato;
      if (cat) catSet.add(cat);
    });
    return Array.from(catSet).sort();
  }, [matches, selectedClub]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      // Club filter
      if (selectedClub !== 'ALL' && m.clubId !== selectedClub) {
        return false;
      }

      // Home filter
      if (onlyHomeMatches && !m.isHome) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && m.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'ALL') {
        const matchCat = (m.category || m.campionato || '').toUpperCase();
        if (!matchCat.includes(selectedCategory.toUpperCase())) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const textToSearch = `${m.squadraCasa} ${m.squadraOspite} ${m.campionato} ${m.girone} ${m.giornata} ${m.data} ${m.facilityText}`.toLowerCase();
        if (!textToSearch.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [matches, selectedClub, onlyHomeMatches, statusFilter, selectedCategory, searchQuery]);

  // Toggle match status (da_inviare <-> inviata)
  const handleToggleStatus = (id: string) => {
    setMatches(prev =>
      prev.map(m => {
        if (m.id === id) {
          const nextStatus = m.status === 'inviata' ? 'da_inviare' : 'inviata';
          return {
            ...m,
            status: nextStatus,
            pecSentDate: nextStatus === 'inviata' ? new Date().toISOString() : undefined,
          };
        }
        return m;
      })
    );
  };

  // Toggle match home/away
  const handleToggleIsHome = (id: string) => {
    setMatches(prev =>
      prev.map(m => (m.id === id ? { ...m, isHome: !m.isHome } : m))
    );
  };

  // Update facility (quick venue variation)
  const handleUpdateFacility = (matchId: string, newFacilityText: string, applyToEntireCategory: boolean) => {
    const targetMatch = matches.find(m => m.id === matchId);
    if (!targetMatch) return;

    setMatches(prev =>
      prev.map(m => {
        if (m.id === matchId) {
          return { ...m, facilityText: newFacilityText };
        }
        if (
          applyToEntireCategory &&
          m.clubId === targetMatch.clubId &&
          (m.category === targetMatch.category || m.campionato === targetMatch.campionato) &&
          m.isHome
        ) {
          return { ...m, facilityText: newFacilityText };
        }
        return m;
      })
    );

    // If active preview is currently open, sync it
    if (activePreviewMatch) {
      if (
        activePreviewMatch.id === matchId ||
        (applyToEntireCategory &&
          activePreviewMatch.clubId === targetMatch.clubId &&
          (activePreviewMatch.category === targetMatch.category || activePreviewMatch.campionato === targetMatch.campionato))
      ) {
        setActivePreviewMatch(prev => (prev ? { ...prev, facilityText: newFacilityText } : null));
      }
    }
  };

  // Batch mark matches as sent
  const handleMarkMatchesAsSent = (ids: string[]) => {
    setMatches(prev =>
      prev.map(m => (ids.includes(m.id) ? { ...m, status: 'inviata', pecSentDate: new Date().toISOString() } : m))
    );
  };

  // Toggle single selection
  const handleToggleSelectMatch = (id: string) => {
    setSelectedMatchIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Toggle select all filtered
  const isAllFilteredSelected = filteredMatches.length > 0 && filteredMatches.every(m => selectedMatchIds.includes(m.id));
  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      const filteredIdSet = new Set(filteredMatches.map(m => m.id));
      setSelectedMatchIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    } else {
      const newIds = new Set([...selectedMatchIds, ...filteredMatches.map(m => m.id)]);
      setSelectedMatchIds(Array.from(newIds));
    }
  };

  // Import new matches
  const handleMatchesImported = (imported: Match[]) => {
    setMatches(imported);
    setSelectedMatchIds([]);
  };

  // Reset to sample data
  const handleLoadSampleData = () => {
    setMatches(SAMPLE_MATCHES);
    setSelectedMatchIds([]);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <Header
        matches={matches}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenBatchExport={() => setIsBatchExportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLoadSampleData={handleLoadSampleData}
        onDownloadAllZip={() => downloadAllDraftsAsZip(matches, useDynamicAsdName)}
      />

      {/* Persistent Google Sheet Sync Bar */}
      <GoogleSheetSyncBar
        sheetUrl={sheetUrl}
        onSheetUrlChange={handleSheetUrlChange}
        onRefresh={fetchAndSyncFromSheet}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        syncError={syncError}
        onClearUrl={handleClearUrl}
      />

      {/* Filters Bar */}
      <FiltersBar
        selectedClub={selectedClub}
        onSelectClub={setSelectedClub}
        onlyHomeMatches={onlyHomeMatches}
        onToggleOnlyHome={setOnlyHomeMatches}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        availableCategories={availableCategories}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        totalFilteredCount={filteredMatches.length}
        selectedMatchIds={selectedMatchIds}
        onToggleSelectAll={handleToggleSelectAll}
        isAllSelected={isAllFilteredSelected}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Banner Informative Rules */}
        {onlyHomeMatches && (
          <div className="mb-4 bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-start gap-2.5">
              <Home className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Filtro attivo: Visualizzazione esclusiva Gare in Casa.</strong>
                <p className="text-amber-900/90 mt-0.5 leading-relaxed">
                  In osservanza dell'Art. 62/4-5 N.O.I.F., la società ospitante deve richiedere l'intervento della Forza Pubblica solo per le proprie gare interne.
                  Le gare in trasferta sono temporaneamente nascoste.
                </p>
              </div>
            </div>
            <button
              onClick={() => setOnlyHomeMatches(false)}
              className="text-amber-800 hover:text-amber-950 underline font-semibold shrink-0"
            >
              Mostra anche trasferte
            </button>
          </div>
        )}

        {/* Content: Calendar View vs List View */}
        {viewMode === 'calendar' ? (
          <CalendarView
            matches={filteredMatches}
            onSelectMatch={match => setActivePreviewMatch(match)}
            selectedClub={selectedClub}
          />
        ) : filteredMatches.length > 0 ? (
          <div className="space-y-3">
            {filteredMatches.map(match => (
              <MatchItem
                key={match.id}
                match={match}
                isSelected={selectedMatchIds.includes(match.id)}
                onToggleSelect={() => handleToggleSelectMatch(match.id)}
                onViewDetails={() => setActivePreviewMatch(match)}
                onToggleStatus={() => handleToggleStatus(match.id)}
                onToggleIsHome={() => handleToggleIsHome(match.id)}
                useDynamicAsdName={useDynamicAsdName}
                onChangeFacility={() => setFacilityModalMatch(match)}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">
              Nessuna gara corrispondente ai filtri
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {onlyHomeMatches
                ? 'Non ci sono gare in casa con i filtri selezionati. Prova a disattivare il filtro "Solo Gare In Casa" o a reimpostare la ricerca.'
                : 'Nessun risultato con i parametri selezionati.'}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => {
                  setSelectedClub('ALL');
                  setOnlyHomeMatches(false);
                  setSelectedCategory('ALL');
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                Reimposta tutti i filtri
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Importa Nuovo Foglio
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <PecPreviewModal
        match={activePreviewMatch}
        onClose={() => setActivePreviewMatch(null)}
        onToggleStatus={handleToggleStatus}
        useDynamicAsdName={useDynamicAsdName}
        onChangeFacility={() => setFacilityModalMatch(activePreviewMatch)}
      />

      <FacilityChangeModal
        isOpen={Boolean(facilityModalMatch)}
        match={facilityModalMatch}
        onClose={() => setFacilityModalMatch(null)}
        onUpdateFacility={handleUpdateFacility}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onMatchesImported={handleMatchesImported}
        sheetUrl={sheetUrl}
        onSheetUrlChange={handleSheetUrlChange}
      />

      <BatchExportModal
        isOpen={isBatchExportOpen}
        onClose={() => setIsBatchExportOpen(false)}
        matches={matches.filter(m => m.isHome)}
        onMarkMatchesAsSent={handleMarkMatchesAsSent}
        useDynamicAsdName={useDynamicAsdName}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        useDynamicAsdName={useDynamicAsdName}
        onToggleDynamicAsdName={setUseDynamicAsdName}
      />
    </div>
  );
}
