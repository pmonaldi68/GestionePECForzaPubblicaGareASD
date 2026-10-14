import { Match } from '../types';
import { normalizeToGGMMMAAAA, formatDateToGGMMMAAAA } from './dateUtils';

/**
 * Normalizes string for fingerprinting (removes accents, punctuation, spacing)
 */
function cleanKey(val?: string): string {
  return (val || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Returns a robust unique key for a match based on Home Team, Away Team, and Date.
 * If both teams are missing or blank, returns empty string to prevent collisions.
 */
export function getMatchKey(m: Partial<Match>): string {
  const home = cleanKey(m.squadraCasa);
  const away = cleanKey(m.squadraOspite);
  if (!home && !away) return '';
  const normDate = normalizeToGGMMMAAAA(m.data);
  return `${home}__${away}__${cleanKey(normDate)}`;
}

/**
 * Secondary key using Championship, Round, and Teams (useful if match date was rescheduled)
 */
export function getMatchSecondaryKey(m: Partial<Match>): string {
  const home = cleanKey(m.squadraCasa);
  const away = cleanKey(m.squadraOspite);
  if (!home && !away) return '';
  return `${cleanKey(m.campionato)}__${cleanKey(m.girone)}__${cleanKey(m.giornata)}__${home}__${away}`;
}

/**
 * Formats the current date and time in standard Italian format for the PEC send date.
 * E.g. "14/10/2026 alle 15:30"
 */
export function formatCurrentSendDate(): string {
  const now = new Date();
  const dateStr = formatDateToGGMMMAAAA(now);
  const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return `${dateStr} alle ${timeStr}`;
}

/**
 * Guarantees that every match in the provided list has a strictly unique, stable ID.
 * Prevents React key duplication errors (e.g. from sheet parsing, localStorage, or merging).
 */
export function ensureUniqueMatchIds(list: Match[]): Match[] {
  if (!list || !Array.isArray(list)) return [];
  const seenIds = new Set<string>();

  return list.map((m, idx) => {
    let id = m.id;
    if (!id || seenIds.has(id)) {
      id = `match_u_${idx}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }
    seenIds.add(id);
    if (id === m.id) {
      return m;
    }
    return {
      ...m,
      id,
    };
  });
}

/**
 * Merges freshly parsed/synced matches from Google Sheets with the currently existing matches.
 * Rules enforced strictly:
 * 1. Matches with PEC already sent (status === 'inviata') MUST NOT be updated or overwritten!
 * 2. The sent flag (status: 'inviata') and the saved send date (pecSentDate) are preserved intact.
 * 3. Any previously sent matches that might be omitted from a filtered sheet are retained.
 * 4. User customized facilities or notes on pending matches are preserved where appropriate.
 * 5. Every match in the resulting array is guaranteed to have a completely unique ID so React never encounters duplicate keys.
 */
export function mergeMatchesPreservingSent(
  currentMatches: Match[],
  incomingMatches: Match[]
): Match[] {
  if (!currentMatches || currentMatches.length === 0) {
    return ensureUniqueMatchIds(incomingMatches || []);
  }
  if (!incomingMatches || incomingMatches.length === 0) {
    return ensureUniqueMatchIds(currentMatches);
  }

  // Deduplicate currentMatches first just in case incoming or current state had duplicates
  const cleanCurrent = ensureUniqueMatchIds(currentMatches);

  // Build lookup maps for current matches
  const currentByPrimaryKey = new Map<string, Match>();
  const currentBySecondaryKey = new Map<string, Match>();
  const currentById = new Map<string, Match>();

  cleanCurrent.forEach(m => {
    currentById.set(m.id, m);
    const pKey = getMatchKey(m);
    if (pKey) currentByPrimaryKey.set(pKey, m);
    const sKey = getMatchSecondaryKey(m);
    if (sKey) currentBySecondaryKey.set(sKey, m);
  });

  const claimedCurrentIds = new Set<string>();
  const result: Match[] = [];

  for (const inc of incomingMatches) {
    // 1. Try to find matching existing game
    const pKey = getMatchKey(inc);
    const sKey = getMatchSecondaryKey(inc);

    let existing: Match | undefined;

    // Check by ID first if incoming already has a known ID
    if (inc.id && currentById.has(inc.id) && !claimedCurrentIds.has(inc.id)) {
      existing = currentById.get(inc.id);
    }

    // Check by primary key (Home + Away + Date)
    if (!existing && pKey && currentByPrimaryKey.has(pKey)) {
      const candidate = currentByPrimaryKey.get(pKey);
      if (candidate && !claimedCurrentIds.has(candidate.id)) {
        existing = candidate;
      }
    }

    // Check by secondary key (Campionato + Girone + Giornata + Home + Away)
    if (!existing && sKey && currentBySecondaryKey.has(sKey)) {
      const candidate = currentBySecondaryKey.get(sKey);
      if (candidate && !claimedCurrentIds.has(candidate.id)) {
        existing = candidate;
      }
    }

    if (existing) {
      claimedCurrentIds.add(existing.id);

      // RULE: "quando si aggiornano i dati dal foglio google, le gare con le pec inviate non devono essere aggiornate, il flag di pec inviata deve restare"
      // RULE: "da inserire un campo data invio da aggiornare con la data corrente per verificare l'effettivo invio della pec e non deve essere aggiornato se si ricaricano le gare."
      if (existing.status === 'inviata') {
        // Keep the existing match completely untouched!
        result.push({
          ...existing,
        });
      } else {
        // Match is pending (da_inviare): update latest details from sheet but preserve stable id & user edits
        result.push({
          ...inc,
          id: existing.id, // preserve ID so selection and React keys remain stable
          status: 'da_inviare',
          facilityText: existing.facilityText || inc.facilityText,
          notes: existing.notes || inc.notes,
        });
      }
    } else {
      // New match from Google Sheet - ensure it has a unique fresh ID if needed
      result.push({
        ...inc,
      });
    }
  }

  // Preserve any previously sent matches that were not in incomingMatches (so history is never erased)
  for (const curr of cleanCurrent) {
    if (!claimedCurrentIds.has(curr.id) && curr.status === 'inviata') {
      result.push(curr);
      claimedCurrentIds.add(curr.id);
    }
  }

  // Ensure 100% unique IDs across all matches to prevent any duplicate key errors
  return ensureUniqueMatchIds(result);
}
