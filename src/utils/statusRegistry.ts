import { Match } from '../types';
import { normalizeToGGMMMAAAA, formatDateToGGMMMAAAA } from './dateUtils';
import { formatCurrentSendDate, generateProtocolloNumber } from './matchMerger';

export const STORAGE_STATUS_REGISTRY_KEY = 'asd_pec_status_registry_v2';

export interface MatchStatusRecord {
  matchId: string;
  status: 'da_inviare' | 'inviata' | 'annullata';
  pecSentDate?: string;
  protocollo?: string;
  notes?: string;
  homeRaw: string;
  awayRaw: string;
  dateRaw: string;
  homeClean: string;
  awayClean: string;
  dateClean: string;
  compositeKey: string;
  category?: string;
  updatedAt: string;
}

/**
 * Normalizes team name by removing accents, punctuation, and common club prefixes/suffixes
 * (e.g. ASD, SSD, SRL, POLISPORTIVA, CALCIO, GENZANO).
 * Guarantees that "ASD CYNTHIA 1920" and "CYNTHIA 1920" produce identical match keys.
 */
export function cleanTeamName(name?: string): string {
  if (!name) return '';
  let str = name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Strip punctuation
  str = str.replace(/[^A-Z0-9\s]/g, ' ');

  // Strip common noisy Italian football club acronyms and filler words
  str = str.replace(
    /\b(A\s*S\s*D|S\s*S\s*D|S\s*R\s*L|U\s*S\s*D|P\s*O\s*L|POLISPORTIVA|POL|CALCIO|GENZANO|SOCIETA|SPORTIVA|DILETTANTISTICA|DILETTANTI|FEMMINILE|MASCHILE|S\s*C)\b/g,
    ' '
  );

  // Compress all whitespace
  const compressed = str.replace(/\s+/g, '').trim();
  if (compressed.length >= 2) {
    return compressed;
  }

  // Fallback to basic alphanumeric cleaner
  return (name || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Normalizes date to 8-digit string DDMMYYYY
 */
export function cleanDate(dateStr?: string): string {
  if (!dateStr) return '';
  const norm = normalizeToGGMMMAAAA(dateStr);
  return norm.replace(/[^0-9]/g, '');
}

/**
 * Constructs a unique, invariant composite key for a match
 */
export function getMatchCompositeKey(home?: string, away?: string, date?: string): string {
  const h = cleanTeamName(home);
  const a = cleanTeamName(away);
  const d = cleanDate(date);
  if (!h && !a) return '';
  return `${h}__${a}__${d}`;
}

/**
 * Loads all stored status records from localStorage
 */
export function loadStatusRegistry(): Record<string, MatchStatusRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_STATUS_REGISTRY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Saves or updates status records in the persistent registry
 */
export function saveStatusToRegistry(records: MatchStatusRecord | MatchStatusRecord[]): void {
  try {
    const current = loadStatusRegistry();
    const list = Array.isArray(records) ? records : [records];

    list.forEach(rec => {
      // Index by ID
      if (rec.matchId) {
        current[rec.matchId] = rec;
      }
      // Index by composite key
      if (rec.compositeKey) {
        current[`key_${rec.compositeKey}`] = rec;
      }
    });

    localStorage.setItem(STORAGE_STATUS_REGISTRY_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('Failed to save status registry to localStorage', err);
  }
}

/**
 * Records a status change for a match and stores it permanently
 */
export function recordMatchStatusChange(
  match: Match,
  newStatus: 'da_inviare' | 'inviata' | 'annullata',
  sentDate?: string,
  protocollo?: string,
  notes?: string
): MatchStatusRecord {
  const homeClean = cleanTeamName(match.squadraCasa);
  const awayClean = cleanTeamName(match.squadraOspite);
  const dateClean = cleanDate(match.data);
  const compositeKey = getMatchCompositeKey(match.squadraCasa, match.squadraOspite, match.data);

  let finalDate = sentDate;
  let finalProt = protocollo;

  if (newStatus === 'inviata') {
    finalDate = finalDate?.trim() || match.pecSentDate || formatCurrentSendDate();
    finalProt = finalProt?.trim() || match.protocollo || generateProtocolloNumber();
  } else if (newStatus === 'da_inviare') {
    finalDate = undefined;
    finalProt = undefined;
  }

  const record: MatchStatusRecord = {
    matchId: match.id,
    status: newStatus,
    pecSentDate: finalDate,
    protocollo: finalProt,
    notes: notes !== undefined ? notes : match.notes,
    homeRaw: match.squadraCasa,
    awayRaw: match.squadraOspite,
    dateRaw: match.data,
    homeClean,
    awayClean,
    dateClean,
    compositeKey,
    category: match.category || match.campionato,
    updatedAt: new Date().toISOString(),
  };

  saveStatusToRegistry(record);
  return record;
}

/**
 * Searches the registry to find if a match has a stored status
 */
export function findStatusInRegistry(
  match: Partial<Match>,
  registry: Record<string, MatchStatusRecord> = loadStatusRegistry()
): MatchStatusRecord | undefined {
  // 1. By ID
  if (match.id && registry[match.id]) {
    return registry[match.id];
  }

  // 2. By Composite Key (Home + Away + Date)
  const compKey = getMatchCompositeKey(match.squadraCasa, match.squadraOspite, match.data);
  if (compKey && registry[`key_${compKey}`]) {
    return registry[`key_${compKey}`];
  }

  // 3. Fallback scan: matches homeClean and awayClean and matching date
  const homeClean = cleanTeamName(match.squadraCasa);
  const awayClean = cleanTeamName(match.squadraOspite);
  const dateClean = cleanDate(match.data);

  const values = Object.values(registry);
  const found = values.find(r => {
    if (r.homeClean === homeClean && r.awayClean === awayClean) {
      if (r.dateClean === dateClean) return true;
    }
    return false;
  });

  return found;
}

/**
 * Applies the persistent status registry to an array of matches.
 * Guarantees that any match marked as 'inviata' is restored with its exact sent date and protocol.
 */
export function applyStatusRegistryToMatches(
  matches: Match[],
  customRegistry?: Record<string, MatchStatusRecord>
): Match[] {
  if (!matches || !Array.isArray(matches)) return [];
  const registry = customRegistry || loadStatusRegistry();

  return matches.map(m => {
    const record = findStatusInRegistry(m, registry);
    if (record) {
      return {
        ...m,
        status: record.status,
        pecSentDate: record.status === 'inviata' ? (record.pecSentDate || m.pecSentDate || formatCurrentSendDate()) : undefined,
        protocollo: record.status === 'inviata' ? (record.protocollo || m.protocollo || generateProtocolloNumber()) : undefined,
        notes: record.notes !== undefined ? record.notes : m.notes,
      };
    }
    return m;
  });
}

/**
 * Deduplicates matches and ensures that for any duplicate match,
 * an 'inviata' status strictly takes precedence over 'da_inviare'.
 * Prevents phantom past matches from reappearing as 'da_inviare'.
 */
export function deduplicateAndPreserveSentMatches(matches: Match[]): Match[] {
  if (!matches || !Array.isArray(matches)) return [];

  const mapByComposite = new Map<string, Match>();
  const idSeen = new Set<string>();
  const result: Match[] = [];

  // Pass 1: register all 'inviata' matches first so they take precedence
  matches.forEach(m => {
    if (m.status === 'inviata') {
      const key = getMatchCompositeKey(m.squadraCasa, m.squadraOspite, m.data);
      if (key) {
        mapByComposite.set(key, m);
      }
    }
  });

  // Pass 2: filter out duplicate 'da_inviare' matches if an 'inviata' match exists for the same teams & date
  for (const m of matches) {
    if (idSeen.has(m.id)) continue;

    const key = getMatchCompositeKey(m.squadraCasa, m.squadraOspite, m.data);

    if (m.status === 'da_inviare' && key && mapByComposite.has(key)) {
      // A sent version of this match already exists! Skip the 'da_inviare' duplicate
      continue;
    }

    idSeen.add(m.id);
    result.push(m);
  }

  return result;
}
