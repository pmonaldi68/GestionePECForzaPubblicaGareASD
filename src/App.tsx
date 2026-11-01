import React, { useState, useEffect, useMemo } from 'react';
import { Match, ClubId, DateRangeFilter } from './types';
import { SAMPLE_MATCHES } from './data/sampleMatches';
import { Header } from './components/Header';
import { FiltersBar } from './components/FiltersBar';
import { MatchItem } from './components/MatchItem';
import { PecPreviewModal } from './components/PecPreviewModal';
import { ImportModal } from './components/ImportModal';
import { BatchExportModal } from './components/BatchExportModal';
import { SettingsModal } from './components/SettingsModal';
import { ExportExcelModal } from './components/ExportExcelModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { ChangeStatusModal } from './components/ChangeStatusModal';
import { CalendarView } from './components/CalendarView';
import { GoogleSheetSyncBar } from './components/GoogleSheetSyncBar';
import { FacilityChangeModal } from './components/FacilityChangeModal';
import { Calendar, AlertCircle, AlertTriangle, Home, CheckSquare, Plus, FileSpreadsheet, EyeOff, CheckCircle2, Trash2 } from 'lucide-react';
import { downloadAllDraftsAsZip, resolveMatchCategory } from './utils/pecGenerator';
import { downloadAllPdfsAsZip } from './utils/pdfGenerator';
import { getGoogleSheetsCsvUrl, parseRawText, DEFAULT_COLUMN_MAPPING, isRiposoMatch } from './utils/sheetParser';
import { formatDateToGGMMMAAAA, parseMatchDate, getMatchPriority } from './utils/dateUtils';
import { mergeMatchesPreservingSent, formatCurrentSendDate, generateProtocolloNumber, ensureUniqueMatchIds } from './utils/matchMerger';
import { 
  applyStatusRegistryToMatches, 
  deduplicateAndPreserveSentMatches, 
  recordMatchStatusChange 
} from './utils/statusRegistry';

const STORAGE_KEY = 'asd_pec_matches_v1';
const DYNAMIC_ASD_KEY = 'asd_pec_dynamic_name_v1';
const STORAGE_SHEET_URL_KEY = 'asd_pec_google_sheet_url_v1';
const STORAGE_LAST_SYNC_KEY = 'asd_pec_last_sync_v1';

export default function App() {
  // Load saved matches or fallback to samples, guaranteeing strictly unique IDs and restoring persistent status
  const [matches, setMatches] = useState<Match[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = ensureUniqueMatchIds(parsed)
            .filter(m => !isRiposoMatch(m))
            .map(m => ({
              ...m,
              category: resolveMatchCategory(m),
            }));
          return deduplicateAndPreserveSentMatches(applyStatusRegistryToMatches(cleaned));
        }
      }
    } catch {
      // Ignore
    }
    const samples = ensureUniqueMatchIds(SAMPLE_MATCHES)
      .filter(m => !isRiposoMatch(m))
      .map(m => ({
        ...m,
        category: resolveMatchCategory(m),
      }));
    return deduplicateAndPreserveSentMatches(applyStatusRegistryToMatches(samples));
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

  // USER REQUIREMENT: "all'apertura dell'app devono essere visulaizzate solo le pec da inviare quelle inviate restano nascoste"
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'da_inviare' | 'inviata'>('da_inviare');

  // USER REQUIREMENT: Date Range picker
  const [dateRange, setDateRange] = useState<DateRangeFilter>({ preset: 'ALL' });

  // Selection & Modals State
  const [selectedMatchIds, setSelectedMatchIds] = useState<string[]>([]);
  const [activePreviewMatch, setActivePreviewMatch] = useState<Match | null>(null);
  const [facilityModalMatch, setFacilityModalMatch] = useState<Match | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isBatchExportOpen, setIsBatchExportOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isExportExcelOpen, setIsExportExcelOpen] = useState<boolean>(false);
  const [isBackupRestoreOpen, setIsBackupRestoreOpen] = useState<boolean>(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [changeStatusTargetMatches, setChangeStatusTargetMatches] = useState<Match[] | null>(null);

  // Auto-sync function: updates matches from Google Sheet link preserving sent status and dates
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

      const rawParsed = parseRawText(csvContent, DEFAULT_COLUMN_MAPPING).filter(m => !isRiposoMatch(m));
      const parsedWithStatus = applyStatusRegistryToMatches(rawParsed);
      if (parsedWithStatus.length === 0) {
        throw new Error('Nessuna gara valida trovata nel foglio.');
      }

      // USER REQUIREMENT: "quando si aggiornano i dati dal foglio google, le gare con le pec inviate non devono essere aggiornate, il flag di pec inviata deve restare"
      // USER REQUIREMENT: "da inserire un campo data invio da aggioanre con la data corrente per verificare l'effettivo invio della pec e non deve essere aggiornato se si ricaricano le gare."
      setMatches(prev => {
        const merged = mergeMatchesPreservingSent(prev, parsedWithStatus);
        const clean = deduplicateAndPreserveSentMatches(merged);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
        } catch {}
        return clean;
      });

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

  // Total count of sent matches that are currently hidden
  const totalSentCount = useMemo(() => {
    return matches.filter(m => {
      if (selectedClub !== 'ALL' && m.clubId !== selectedClub) return false;
      if (onlyHomeMatches && !m.isHome) return false;
      return m.status === 'inviata';
    }).length;
  }, [matches, selectedClub, onlyHomeMatches]);

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

      // Status filter (defaults to 'da_inviare' so sent ones are hidden at startup)
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

      // Date Range Filter
      if (dateRange.preset !== 'ALL') {
        const matchDateObj = parseMatchDate(m.data);
        if (matchDateObj) {
          const now = new Date();
          if (dateRange.preset === 'CURRENT_MONTH') {
            if (matchDateObj.getFullYear() !== now.getFullYear() || matchDateObj.getMonth() !== now.getMonth()) {
              return false;
            }
          } else if (dateRange.preset === 'NEXT_MONTH') {
            const nextMonth = (now.getMonth() + 1) % 12;
            const nextMonthYear = nextMonth === 0 ? now.getFullYear() + 1 : now.getFullYear();
            if (matchDateObj.getFullYear() !== nextMonthYear || matchDateObj.getMonth() !== nextMonth) {
              return false;
            }
          } else if (dateRange.preset === 'THIS_WEEKEND') {
            const dayOfWeek = now.getDay();
            const diffToFriday = (5 - dayOfWeek + 7) % 7;
            const fri = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (dayOfWeek === 0 ? -2 : (dayOfWeek === 6 ? -1 : diffToFriday)));
            fri.setHours(0, 0, 0, 0);
            const sun = new Date(fri.getFullYear(), fri.getMonth(), fri.getDate() + 2);
            sun.setHours(23, 59, 59, 999);
            if (matchDateObj < fri || matchDateObj > sun) {
              return false;
            }
          } else if (dateRange.preset === 'CUSTOM') {
            if (dateRange.startDate) {
              const start = new Date(dateRange.startDate);
              start.setHours(0, 0, 0, 0);
              if (matchDateObj < start) return false;
            }
            if (dateRange.endDate) {
              const end = new Date(dateRange.endDate);
              end.setHours(23, 59, 59, 999);
              if (matchDateObj > end) return false;
            }
          }
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
  }, [matches, selectedClub, onlyHomeMatches, statusFilter, selectedCategory, searchQuery, dateRange]);

  // Urgent unsent home matches within the next 3 days (or overdue)
  const urgentUnsentMatches = useMemo(() => {
    return matches.filter(
      m => m.isHome && m.status !== 'inviata' && getMatchPriority(m.data, m.status).isUpcoming
    );
  }, [matches]);

  // New procedure: Save and persist status from ChangeStatusModal (single or bulk)
  const handleSaveStatus = (updatedMatches: Match[]) => {
    const updatedMap = new Map(updatedMatches.map(m => [m.id, m]));
    setMatches(prev => {
      const next = prev.map(m => updatedMap.get(m.id) || m);
      const clean = deduplicateAndPreserveSentMatches(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
      } catch {}
      return clean;
    });

    if (activePreviewMatch) {
      const updatedPreview = updatedMap.get(activePreviewMatch.id);
      if (updatedPreview) {
        setActivePreviewMatch(updatedPreview);
      }
    }
  };

  // Toggle match status (da_inviare <-> inviata) with immediate persistent registry save
  const handleToggleStatus = (id: string) => {
    let targetUpdated: Match | null = null;
    setMatches(prev => {
      const next = prev.map(m => {
        if (m.id === id) {
          const nextStatus = m.status === 'inviata' ? 'da_inviare' : 'inviata';
          const sentDate = nextStatus === 'inviata' ? (m.pecSentDate || formatCurrentSendDate()) : undefined;
          const protocollo = nextStatus === 'inviata' ? (m.protocollo || generateProtocolloNumber()) : undefined;
          const updated: Match = {
            ...m,
            status: nextStatus,
            pecSentDate: sentDate,
            protocollo: protocollo,
          };
          recordMatchStatusChange(updated, nextStatus, sentDate, protocollo);
          targetUpdated = updated;
          return updated;
        }
        return m;
      });
      const clean = deduplicateAndPreserveSentMatches(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
      } catch {}
      return clean;
    });

    if (activePreviewMatch && activePreviewMatch.id === id && targetUpdated) {
      setActivePreviewMatch(targetUpdated);
    }
  };

  // Update specific send date and protocollo with immediate registry save
  const handleUpdateSentDate = (id: string, newDate: string, newProtocollo?: string) => {
    let targetUpdated: Match | null = null;
    setMatches(prev => {
      const next = prev.map(m => {
        if (m.id === id) {
          const prot = newProtocollo || m.protocollo || generateProtocolloNumber();
          const updated: Match = {
            ...m,
            status: 'inviata',
            pecSentDate: newDate,
            protocollo: prot,
          };
          recordMatchStatusChange(updated, 'inviata', newDate, prot);
          targetUpdated = updated;
          return updated;
        }
        return m;
      });
      const clean = deduplicateAndPreserveSentMatches(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
      } catch {}
      return clean;
    });

    if (activePreviewMatch && activePreviewMatch.id === id && targetUpdated) {
      setActivePreviewMatch(targetUpdated);
    }
  };

  // Update protocollo directly with immediate registry save
  const handleUpdateProtocollo = (id: string, newProtocollo: string) => {
    let targetUpdated: Match | null = null;
    setMatches(prev => {
      const next = prev.map(m => {
        if (m.id === id) {
          const updated: Match = { ...m, protocollo: newProtocollo };
          recordMatchStatusChange(updated, updated.status, updated.pecSentDate, newProtocollo);
          targetUpdated = updated;
          return updated;
        }
        return m;
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

    if (activePreviewMatch && activePreviewMatch.id === id && targetUpdated) {
      setActivePreviewMatch(targetUpdated);
    }
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

  // Batch mark matches as sent with current send date and ordered advancing protocollo (AAAAMMGGHHMMSS)
  const handleMarkMatchesAsSent = (ids: string[], sendDate?: string) => {
    const now = new Date();
    const defaultNowStr = formatCurrentSendDate();
    const dateToUse = sendDate?.trim() || defaultNowStr;
    let offsetSec = 0;
    setMatches(prev => {
      const next = prev.map(m => {
        if (ids.includes(m.id)) {
          const prot = m.protocollo || generateProtocolloNumber(now, offsetSec++);
          const updated: Match = {
            ...m,
            status: 'inviata',
            pecSentDate: dateToUse,
            protocollo: prot,
          };
          recordMatchStatusChange(updated, 'inviata', dateToUse, prot);
          return updated;
        }
        return m;
      });
      const clean = deduplicateAndPreserveSentMatches(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
      } catch {}
      return clean;
    });
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

  // Selected matches to delete in bulk
  const selectedMatchesToDelete = useMemo(() => {
    return matches.filter(m => selectedMatchIds.includes(m.id));
  }, [matches, selectedMatchIds]);

  // Bulk delete selected matches after user confirmation dialog
  const handleConfirmBulkDelete = () => {
    setMatches(prev => prev.filter(m => !selectedMatchIds.includes(m.id)));
    setSelectedMatchIds([]);
    setIsDeleteConfirmOpen(false);
  };

  // Import new matches with safe merging and excluding RIPOSO
  const handleMatchesImported = (imported: Match[]) => {
    const valid = imported.filter(m => !isRiposoMatch(m));
    const withReg = applyStatusRegistryToMatches(valid);
    setMatches(prev => {
      const merged = mergeMatchesPreservingSent(prev, withReg);
      const clean = deduplicateAndPreserveSentMatches(merged);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
      } catch {}
      return clean;
    });
    setSelectedMatchIds([]);
  };

  // Reset to sample data (excluding RIPOSO) with status registry applied
  const handleLoadSampleData = () => {
    const samples = ensureUniqueMatchIds(SAMPLE_MATCHES).filter(m => !isRiposoMatch(m));
    const clean = deduplicateAndPreserveSentMatches(applyStatusRegistryToMatches(samples));
    setMatches(clean);
    setSelectedMatchIds([]);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch {}
  };

  // Full Archive Restore Handler
  const handleRestoreArchive = (
    newMatches: Match[],
    newSettings?: { useDynamicAsdName: boolean; sheetUrl: string; lastSyncTime: string | null },
    restoreSettings: boolean = true
  ) => {
    const cleanMatches = ensureUniqueMatchIds(newMatches)
      .filter(m => !isRiposoMatch(m))
      .map(m => ({
        ...m,
        category: resolveMatchCategory(m),
      }));
    const withReg = deduplicateAndPreserveSentMatches(applyStatusRegistryToMatches(cleanMatches));
    withReg.forEach(m => {
      if (m.status === 'inviata') {
        recordMatchStatusChange(m, 'inviata', m.pecSentDate, m.protocollo, m.notes);
      }
    });
    setMatches(withReg);
    setSelectedMatchIds([]);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(withReg));
    } catch {}

    if (restoreSettings && newSettings) {
      if (newSettings.useDynamicAsdName !== undefined) {
        setUseDynamicAsdName(newSettings.useDynamicAsdName);
        try {
          localStorage.setItem(DYNAMIC_ASD_KEY, JSON.stringify(newSettings.useDynamicAsdName));
        } catch {}
      }
      if (newSettings.sheetUrl !== undefined) {
        setSheetUrl(newSettings.sheetUrl);
        try {
          localStorage.setItem(STORAGE_SHEET_URL_KEY, newSettings.sheetUrl);
        } catch {}
      }
      if (newSettings.lastSyncTime !== undefined) {
        setLastSyncTime(newSettings.lastSyncTime);
        try {
          if (newSettings.lastSyncTime) {
            localStorage.setItem(STORAGE_LAST_SYNC_KEY, newSettings.lastSyncTime);
          } else {
            localStorage.removeItem(STORAGE_LAST_SYNC_KEY);
          }
        } catch {}
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <Header
        matches={matches}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenBatchExport={() => setIsBatchExportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExportExcel={() => setIsExportExcelOpen(true)}
        onOpenBackupRestore={() => setIsBackupRestoreOpen(true)}
        onLoadSampleData={handleLoadSampleData}
        onDownloadAllZip={() => downloadAllDraftsAsZip(matches, useDynamicAsdName)}
        onDownloadAllPdfsZip={() => downloadAllPdfsAsZip(matches, useDynamicAsdName)}
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
        totalSentCount={totalSentCount}
        selectedMatchIds={selectedMatchIds}
        onToggleSelectAll={handleToggleSelectAll}
        isAllSelected={isAllFilteredSelected}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onOpenExportExcel={() => setIsExportExcelOpen(true)}
        onDeleteSelected={() => setIsDeleteConfirmOpen(true)}
        onChangeStatusSelected={() => setChangeStatusTargetMatches(matches.filter(m => selectedMatchIds.includes(m.id)))}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Bulk Action Bar for Selected Matches in List View */}
        {selectedMatchIds.length > 0 && (
          <div className="mb-4 bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-white shadow-md animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-3">
              <span className="bg-blue-600 text-white font-bold px-2.5 py-1 rounded-lg text-xs">
                {selectedMatchIds.length} {selectedMatchIds.length === 1 ? 'gara selezionata' : 'gare selezionate'}
              </span>
              <p className="text-slate-300">
                Azioni rapide per gli elementi selezionati nella lista delle gare.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setChangeStatusTargetMatches(matches.filter(m => selectedMatchIds.includes(m.id)))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs shadow-xs"
                title="Procedura per variare lo stato di tutte le gare selezionate"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Varia Stato ({selectedMatchIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBatchExportOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors cursor-pointer text-xs"
              >
                Esporta / Stampa ({selectedMatchIds.length})
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Elimina Selezionate ({selectedMatchIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMatchIds([])}
                className="px-2.5 py-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
              >
                Deseleziona
              </button>
            </div>
          </div>
        )}

        {/* Urgent Upcoming Matches Alert Banner (Within next 3 days) */}
        {urgentUnsentMatches.length > 0 && statusFilter !== 'inviata' && (
          <div className="mb-4 bg-rose-50 border border-rose-300 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-950 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-rose-100 rounded-lg text-rose-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
              </span>
              <div>
                <strong className="font-bold text-rose-900">
                  Priorità Alta Invio PEC: {urgentUnsentMatches.length} {urgentUnsentMatches.length === 1 ? 'partita casalinga' : 'partite casalinghe'} in programma entro i prossimi 3 giorni!
                </strong>
                <p className="text-rose-800/90 mt-0.5">
                  Ai sensi dell'Art. 62 N.O.I.F., richiedi tempestivamente l'intervento della Forza Pubblica per garantire la regolarità delle gare.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedMatchIds(urgentUnsentMatches.map(m => m.id));
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-3 py-1.5 rounded-lg shadow-2xs transition-colors cursor-pointer text-xs"
              >
                Seleziona {urgentUnsentMatches.length} Gare Imminenti
              </button>
            </div>
          </div>
        )}

        {/* Startup Mode Notice (PEC Inviate Nascoste di Default) */}
        {statusFilter === 'da_inviare' && totalSentCount > 0 && (
          <div className="mb-4 bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-emerald-950">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                <strong>Modalità operativa attiva:</strong> visualizzazione esclusiva delle PEC ancora <strong>Da Inviare</strong>. Le <strong>{totalSentCount} gare con PEC già inviata</strong> sono nascoste per facilitare il lavoro.
              </span>
            </div>
            <button
              onClick={() => setStatusFilter('inviata')}
              className="font-bold text-emerald-800 hover:text-emerald-950 underline shrink-0 cursor-pointer"
            >
              Mostra gare inviate ({totalSentCount})
            </button>
          </div>
        )}

        {/* Banner Informative Rules: Home Matches */}
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
              className="text-amber-800 hover:text-amber-950 underline font-semibold shrink-0 cursor-pointer"
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
            {filteredMatches.map((match, idx) => (
              <MatchItem
                key={`${match.id}_${idx}`}
                match={match}
                isSelected={selectedMatchIds.includes(match.id)}
                onToggleSelect={() => handleToggleSelectMatch(match.id)}
                onViewDetails={() => setActivePreviewMatch(match)}
                onToggleStatus={() => handleToggleStatus(match.id)}
                onToggleIsHome={() => handleToggleIsHome(match.id)}
                useDynamicAsdName={useDynamicAsdName}
                onChangeFacility={() => setFacilityModalMatch(match)}
                onUpdateSentDate={(newDate, newProt) => handleUpdateSentDate(match.id, newDate, newProt)}
                onUpdateProtocollo={newProt => handleUpdateProtocollo(match.id, newProt)}
                onChangeStatus={() => setChangeStatusTargetMatches([match])}
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
              {statusFilter === 'da_inviare' && totalSentCount > 0
                ? `Tutte le gare casalinghe risultano già inviate (${totalSentCount} inviate nascoste). Clicca su "Inviate" o "Tutte" per visualizzarle e scaricare le attestazioni PDF.`
                : onlyHomeMatches
                ? 'Non ci sono gare in casa con i filtri selezionati. Prova a disattivare il filtro "Solo Gare In Casa" o a reimpostare la ricerca.'
                : 'Nessun risultato con i parametri selezionati.'}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {statusFilter === 'da_inviare' && totalSentCount > 0 ? (
                <button
                  onClick={() => setStatusFilter('inviata')}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors cursor-pointer"
                >
                  Visualizza le {totalSentCount} Gare Inviate
                </button>
              ) : null}
              <button
                onClick={() => {
                  setSelectedClub('ALL');
                  setOnlyHomeMatches(false);
                  setSelectedCategory('ALL');
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setDateRange({ preset: 'ALL' });
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Reimposta tutti i filtri
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
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
        onUpdateSentDate={handleUpdateSentDate}
        onChangeStatus={() => {
          if (activePreviewMatch) {
            setChangeStatusTargetMatches([activePreviewMatch]);
          }
        }}
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

      <ExportExcelModal
        isOpen={isExportExcelOpen}
        onClose={() => setIsExportExcelOpen(false)}
        filteredMatches={filteredMatches}
        totalMatchesCount={matches.length}
        selectedClub={selectedClub}
        onlyHomeMatches={onlyHomeMatches}
        statusFilter={statusFilter}
        selectedCategory={selectedCategory}
        dateRange={dateRange}
        useDynamicAsdName={useDynamicAsdName}
      />

      <BackupRestoreModal
        isOpen={isBackupRestoreOpen}
        onClose={() => setIsBackupRestoreOpen(false)}
        matches={matches}
        useDynamicAsdName={useDynamicAsdName}
        sheetUrl={sheetUrl}
        lastSyncTime={lastSyncTime}
        onRestoreArchive={handleRestoreArchive}
      />

      <ConfirmDeleteModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        selectedMatches={selectedMatchesToDelete}
      />

      <ChangeStatusModal
        isOpen={Boolean(changeStatusTargetMatches)}
        onClose={() => setChangeStatusTargetMatches(null)}
        matches={changeStatusTargetMatches || []}
        onSaveStatus={handleSaveStatus}
        useDynamicAsdName={useDynamicAsdName}
      />
    </div>
  );
}
