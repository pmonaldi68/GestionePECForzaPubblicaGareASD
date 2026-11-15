import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
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
import { ChangeClubModal } from './components/ChangeClubModal';
import { GoogleDriveSyncModal } from './components/GoogleDriveSyncModal';
import { User } from 'firebase/auth';
import { initAuth } from './services/googleDriveService';
import { Calendar, AlertCircle, AlertTriangle, Home, CheckSquare, Plus, FileSpreadsheet, EyeOff, CheckCircle2, Trash2, Building2, Printer, ChevronDown, X } from 'lucide-react';
import { downloadAllDraftsAsZip, resolveMatchCategory, resolveFacilityText } from './utils/pecGenerator';
import { downloadAllPdfsAsZip, downloadConcatenatedPecPdf } from './utils/pdfGenerator';
import { fetchGoogleSheetCsv, parseRawText, DEFAULT_COLUMN_MAPPING, isRiposoMatch } from './utils/sheetParser';
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

/**
 * Ensures matches for categories like Under 19 Provinciale are strictly mapped
 * to CYNTHIA 1920 (President: MENGHINI GABRIELE) instead of Academy Cynthia.
 */
function fixMisassignedClubCategories(matchList: Match[]): Match[] {
  return matchList.map(m => {
    const cat = (m.category || m.campionato || '').toUpperCase();
    if ((cat.includes('UNDER 19') || cat.includes('JUNIORES')) && m.clubId === 'ACADEMY_CYNTHIA') {
      return {
        ...m,
        clubId: 'CYNTHIA_1920' as ClubId,
        facilityText: resolveFacilityText('CYNTHIA_1920', m.category || m.campionato),
      };
    }
    return m;
  });
}

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
          const fixed = fixMisassignedClubCategories(cleaned);
          return deduplicateAndPreserveSentMatches(applyStatusRegistryToMatches(fixed));
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
    const fixedSamples = fixMisassignedClubCategories(samples);
    return deduplicateAndPreserveSentMatches(applyStatusRegistryToMatches(fixedSamples));
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
  const [changeClubTargetMatches, setChangeClubTargetMatches] = useState<Match[] | null>(null);
  const [isDriveSyncModalOpen, setIsDriveSyncModalOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Non-intrusive Toast Notification State (GoogleChrome/modern-web-guidance)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // View Transitions helper for smooth SPA view/filter changes
  const runViewTransition = useCallback((update: () => void) => {
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };
    if (!doc.startViewTransition) {
      update();
      return;
    }
    doc.startViewTransition(() => {
      flushSync(() => {
        update();
      });
    });
  }, []);

  // Initialize Firebase Auth listener for Google Drive Sync
  useEffect(() => {
    const unsubscribe = initAuth(
      user => setCurrentUser(user),
      () => setCurrentUser(null)
    );
    return () => unsubscribe();
  }, []);

  // Auto-sync function: updates matches from Google Sheet link preserving sent status and dates
  const fetchAndSyncFromSheet = async (url: string) => {
    if (!url || !url.trim()) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const csvContent = await fetchGoogleSheetCsv(url);

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

  // Toggle match home/away with immediate save
  const handleToggleIsHome = (id: string) => {
    let targetUpdated: Match | null = null;
    setMatches(prev => {
      const next = prev.map(m => {
        if (m.id === id) {
          const updated = { ...m, isHome: !m.isHome };
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

  // Update facility (quick venue variation)
  const handleUpdateFacility = (matchId: string, newFacilityText: string, applyToEntireCategory: boolean) => {
    const targetMatch = matches.find(m => m.id === matchId);
    if (!targetMatch) return;

    setMatches(prev => {
      const next = prev.map(m => {
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
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });

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

  // Update club, president and home/away condition (fast variation function)
  const handleUpdateMatchClub = (
    targetMatchIds: string[],
    newClubId: ClubId,
    newIsHome: boolean,
    updateFacility: boolean,
    applyToEntireCategory: boolean
  ) => {
    const targetMatch = matches.find(m => targetMatchIds.includes(m.id));
    const matchCat = targetMatch?.category || targetMatch?.campionato;

    setMatches(prev => {
      const next = prev.map(m => {
        const isDirect = targetMatchIds.includes(m.id);
        const isCatMatch =
          applyToEntireCategory &&
          Boolean(matchCat) &&
          (m.category === matchCat || m.campionato === matchCat);

        if (isDirect || isCatMatch) {
          const facText = updateFacility
            ? resolveFacilityText(newClubId, m.category || m.campionato)
            : m.facilityText;
          return {
            ...m,
            clubId: newClubId,
            isHome: isDirect ? newIsHome : m.isHome,
            facilityText: facText,
          };
        }
        return m;
      });

      const clean = deduplicateAndPreserveSentMatches(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
      } catch {}
      return clean;
    });

    if (activePreviewMatch) {
      const isDirectPreview = targetMatchIds.includes(activePreviewMatch.id);
      const isCatPreview =
        applyToEntireCategory &&
        Boolean(matchCat) &&
        (activePreviewMatch.category === matchCat || activePreviewMatch.campionato === matchCat);

      if (isDirectPreview || isCatPreview) {
        setActivePreviewMatch(prev => {
          if (!prev) return null;
          const facText = updateFacility
            ? resolveFacilityText(newClubId, prev.category || prev.campionato)
            : prev.facilityText;
          return {
            ...prev,
            clubId: newClubId,
            isHome: isDirectPreview ? newIsHome : prev.isHome,
            facilityText: facText,
          };
        });
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

  // Export directly all selected matches into a single unified PDF file (1 match per page)
  const handleExportSelectedMergedPdf = () => {
    const selectedMatches = matches.filter(m => selectedMatchIds.includes(m.id));
    if (selectedMatches.length === 0) return;
    downloadConcatenatedPecPdf(selectedMatches, useDynamicAsdName, true);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <Header
        matches={matches}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenBatchExport={() => setIsBatchExportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExportExcel={() => setIsExportExcelOpen(true)}
        onOpenBackupRestore={() => setIsBackupRestoreOpen(true)}
        user={currentUser}
        onOpenDriveSync={() => setIsDriveSyncModalOpen(true)}
        onLoadSampleData={handleLoadSampleData}
        onDownloadAllZip={() => {
          downloadAllDraftsAsZip(matches, useDynamicAsdName);
          showToast('Archivio bozze .TXT generato e scaricato');
        }}
        onDownloadAllPdfsZip={() => {
          downloadAllPdfsAsZip(matches, useDynamicAsdName);
          showToast('Archivio attestazioni PDF generato e scaricato');
        }}
        activeStatusFilter={statusFilter}
        onQuickStatusFilter={status => runViewTransition(() => setStatusFilter(status))}
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

      {/* Sticky Filters Bar */}
      <FiltersBar
        selectedClub={selectedClub}
        onSelectClub={club => runViewTransition(() => setSelectedClub(club))}
        onlyHomeMatches={onlyHomeMatches}
        onToggleOnlyHome={val => runViewTransition(() => setOnlyHomeMatches(val))}
        selectedCategory={selectedCategory}
        onSelectCategory={cat => runViewTransition(() => setSelectedCategory(cat))}
        availableCategories={availableCategories}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={status => runViewTransition(() => setStatusFilter(status))}
        totalFilteredCount={filteredMatches.length}
        totalSentCount={totalSentCount}
        selectedMatchIds={selectedMatchIds}
        onToggleSelectAll={handleToggleSelectAll}
        isAllSelected={isAllFilteredSelected}
        viewMode={viewMode}
        onToggleViewMode={mode => runViewTransition(() => setViewMode(mode))}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onOpenExportExcel={() => setIsExportExcelOpen(true)}
        onDeleteSelected={() => setIsDeleteConfirmOpen(true)}
        onChangeStatusSelected={() => setChangeStatusTargetMatches(matches.filter(m => selectedMatchIds.includes(m.id)))}
        onChangeClubSelected={() => setChangeClubTargetMatches(matches.filter(m => selectedMatchIds.includes(m.id)))}
        onExportSelectedMergedPdf={handleExportSelectedMergedPdf}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Bulk Action Bar for Selected Matches in List View */}
        {selectedMatchIds.length > 0 && (
          <div className="mb-4 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-white shadow-md modal-panel">
            <div className="flex items-center gap-3">
              <span className="font-display font-bold text-white tabular-nums">
                {selectedMatchIds.length} {selectedMatchIds.length === 1 ? 'gara selezionata' : 'gare selezionate'}
              </span>
              <span className="hidden sm:inline text-slate-400">
                Azioni rapide sulle gare spuntate
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  handleExportSelectedMergedPdf();
                  showToast(`PDF unico generato per ${selectedMatchIds.length} gare`);
                }}
                className="inline-flex items-center gap-1.5 h-8 px-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors cursor-pointer text-xs whitespace-nowrap shrink-0"
                title="Esporta direttamente in un unico file PDF unito tutte le richieste PEC selezionate (1 pagina per gara)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PDF Unito ({selectedMatchIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setChangeClubTargetMatches(matches.filter(m => selectedMatchIds.includes(m.id)))}
                className="inline-flex items-center gap-1.5 h-8 px-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer text-xs whitespace-nowrap shrink-0"
                title="Varia la società, il presidente o la condizione casa/trasferta per le gare selezionate"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Varia Società</span>
              </button>
              <button
                type="button"
                onClick={() => setChangeStatusTargetMatches(matches.filter(m => selectedMatchIds.includes(m.id)))}
                className="inline-flex items-center gap-1.5 h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors cursor-pointer text-xs whitespace-nowrap shrink-0"
                title="Procedura per variare lo stato di tutte le gare selezionate"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Varia Stato</span>
              </button>
              <button
                type="button"
                onClick={() => setIsBatchExportOpen(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer text-xs whitespace-nowrap shrink-0"
              >
                Altre Opzioni
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg transition-colors cursor-pointer text-xs whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Elimina ({selectedMatchIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMatchIds([])}
                className="h-8 px-2.5 text-slate-400 hover:text-white transition-colors cursor-pointer text-xs"
              >
                Deseleziona
              </button>
            </div>
          </div>
        )}

        {/* Urgent Upcoming Matches Alert Banner (Within next 3 days) */}
        {urgentUnsentMatches.length > 0 && statusFilter !== 'inviata' && (
          <div className="mb-3 bg-rose-50/90 border border-rose-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-950">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <div className="min-w-0">
                <strong className="font-semibold text-rose-950">
                  Priorità invio PEC: {urgentUnsentMatches.length}{' '}
                  {urgentUnsentMatches.length === 1 ? 'gara casalinga' : 'gare casalinghe'} entro 3 giorni
                </strong>
                <span className="text-rose-800 ml-1.5 hidden sm:inline">
                  · Art. 62 N.O.I.F. (richiesta tempestiva Forza Pubblica)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMatchIds(urgentUnsentMatches.map(m => m.id))}
              className="h-7 px-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg transition-colors cursor-pointer text-xs whitespace-nowrap shrink-0"
            >
              Seleziona {urgentUnsentMatches.length} Imminenti
            </button>
          </div>
        )}

        {/* Unified Compact Operational Context Strip (Replaces stacked multi-banners per content-first-noise-reduction) */}
        {(onlyHomeMatches || (statusFilter === 'da_inviare' && totalSentCount > 0)) && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {statusFilter === 'da_inviare' && totalSentCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-slate-700">
                    <EyeOff className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Visualizzazione operativa: <strong>Da Inviare</strong> ({totalSentCount} inviate nascoste)
                    </span>
                  </span>
                )}
                {statusFilter === 'da_inviare' && totalSentCount > 0 && onlyHomeMatches && (
                  <span aria-hidden="true" className="text-slate-300">·</span>
                )}
                {onlyHomeMatches && (
                  <span className="inline-flex items-center gap-1.5 text-slate-700">
                    <Home className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      Filtro <strong>Solo Gare in Casa</strong> attivo
                    </span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {statusFilter === 'da_inviare' && totalSentCount > 0 && (
                  <button
                    type="button"
                    onClick={() => runViewTransition(() => setStatusFilter('inviata'))}
                    className="font-semibold text-emerald-700 hover:text-emerald-900 hover:underline underline-offset-2 cursor-pointer"
                  >
                    Mostra inviate ({totalSentCount})
                  </button>
                )}
                {onlyHomeMatches && (
                  <button
                    type="button"
                    onClick={() => runViewTransition(() => setOnlyHomeMatches(false))}
                    className="font-semibold text-amber-800 hover:text-amber-950 hover:underline underline-offset-2 cursor-pointer"
                  >
                    Includi trasferte
                  </button>
                )}
                {onlyHomeMatches && (
                  <details className="mwg-details relative inline-block">
                    <summary className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium cursor-pointer select-none">
                      <span>Nota Art. 62 N.O.I.F.</span>
                      <ChevronDown className="w-3 h-3 details-chevron transition-transform duration-150" />
                    </summary>
                    <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 max-w-xl leading-relaxed">
                      In osservanza dell'Art. 62 commi 4–5 N.O.I.F., la società ospitante deve richiedere l'intervento della Forza Pubblica esclusivamente per le proprie gare casalinghe.
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content: Calendar View vs List View (with View Transitions API container) */}
        <div className="workspace-transition-region">
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
                  onToggleStatus={() => {
                    handleToggleStatus(match.id);
                    showToast(
                      match.status === 'inviata'
                        ? 'Gara riportata a Da Inviare'
                        : 'PEC contrassegnata come Inviata con data e protocollo'
                    );
                  }}
                  onToggleIsHome={() => handleToggleIsHome(match.id)}
                  useDynamicAsdName={useDynamicAsdName}
                  onChangeFacility={() => setFacilityModalMatch(match)}
                  onUpdateSentDate={(newDate, newProt) => handleUpdateSentDate(match.id, newDate, newProt)}
                  onUpdateProtocollo={newProt => handleUpdateProtocollo(match.id, newProt)}
                  onChangeStatus={() => setChangeStatusTargetMatches([match])}
                  onChangeClub={() => setChangeClubTargetMatches([match])}
                  onNotify={showToast}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center max-w-lg mx-auto my-8">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-display text-base font-bold text-slate-900">
                Nessuna gara corrispondente ai filtri
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {statusFilter === 'da_inviare' && totalSentCount > 0
                  ? `Tutte le gare casalinghe risultano già inviate (${totalSentCount} inviate nascoste). Passa alla scheda "Inviate" o "Tutte" per visualizzarle e scaricare le attestazioni PDF.`
                  : onlyHomeMatches
                  ? 'Non ci sono gare in casa con i filtri selezionati. Prova a includere le trasferte o a reimpostare la ricerca.'
                  : 'Nessun risultato con i parametri selezionati.'}
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {statusFilter === 'da_inviare' && totalSentCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => runViewTransition(() => setStatusFilter('inviata'))}
                    className="h-9 px-4 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    Visualizza le {totalSentCount} Gare Inviate
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    runViewTransition(() => {
                      setSelectedClub('ALL');
                      setOnlyHomeMatches(false);
                      setSelectedCategory('ALL');
                      setSearchQuery('');
                      setStatusFilter('ALL');
                      setDateRange({ preset: 'ALL' });
                    });
                  }}
                  className="h-9 px-4 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Reimposta Filtri
                </button>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="h-9 px-4 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Importa Foglio
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Non-intrusive Toast Notification (GoogleChrome/modern-web-guidance) */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="toast-enter fixed bottom-5 right-5 z-50 max-w-sm bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-800 flex items-center gap-2.5 text-xs font-medium"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            aria-label="Chiudi notifica"
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
        onChangeClub={() => {
          if (activePreviewMatch) {
            setChangeClubTargetMatches([activePreviewMatch]);
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
        onOpenDriveSync={() => setIsDriveSyncModalOpen(true)}
      />

      <GoogleDriveSyncModal
        isOpen={isDriveSyncModalOpen}
        onClose={() => setIsDriveSyncModalOpen(false)}
        user={currentUser}
        onUserChange={setCurrentUser}
        matches={matches}
        useDynamicAsdName={useDynamicAsdName}
        sheetUrl={sheetUrl}
        lastSyncTime={lastSyncTime}
        onRestoreFromDrive={handleRestoreArchive}
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

      <ChangeClubModal
        isOpen={Boolean(changeClubTargetMatches)}
        onClose={() => setChangeClubTargetMatches(null)}
        matches={changeClubTargetMatches || []}
        allMatches={matches}
        onSave={handleUpdateMatchClub}
      />
    </div>
  );
}
