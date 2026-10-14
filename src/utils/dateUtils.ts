/**
 * Robust date parsing and formatting utility strictly adhering to Italian GG/MM/AAAA format.
 * Prevents timezone shifting bugs and supports all Italian Google Sheets / Excel formats.
 */

const ITALIAN_MONTHS: Record<string, number> = {
  gen: 1, gennaio: 1,
  feb: 2, febbraio: 2,
  mar: 3, marzo: 3,
  apr: 4, aprile: 4,
  mag: 5, maggio: 5,
  giu: 6, giugno: 6,
  lug: 7, luglio: 7,
  ago: 8, agosto: 8,
  set: 9, sett: 9, settembre: 9,
  ott: 10, ottobre: 10,
  nov: 11, novembre: 11,
  dic: 12, dicembre: 12,
};

/**
 * Parses any date representation from Google Sheets/Excel into a local Date without timezone shifting.
 */
export function parseMatchDate(dateStr: string | number | null | undefined): Date | null {
  if (dateStr === null || dateStr === undefined || dateStr === '') return null;

  // 1. Handle numeric Excel / Google Sheets serial date (e.g. 46313 = 18/10/2026)
  if (typeof dateStr === 'number' || (!isNaN(Number(dateStr)) && !String(dateStr).includes('/') && !String(dateStr).includes('-') && !String(dateStr).includes(':'))) {
    const serial = Number(dateStr);
    if (serial > 30000 && serial < 75000) {
      const msPerDay = 86400000;
      // Use UTC accessors to avoid any local timezone shift
      const utcDate = new Date((serial - 25569) * msPerDay);
      const year = utcDate.getUTCFullYear();
      const month = utcDate.getUTCMonth();
      const day = utcDate.getUTCDate();
      return new Date(year, month, day);
    }
  }

  let str = String(dateStr).trim();

  // Strip leading day-of-week abbreviations (e.g. "DOM 18/10/2026", "Domenica 18/10")
  str = str.replace(/^(dom|domenica|sab|sabato|ven|venerdì|gio|giovedì|mer|mercoledì|mar|martedì|lun|lunedì)[\s,.-]+/i, '').trim();

  // Strip trailing time if present (e.g. "18/10/2026 15:30:00" or "18/10/2026 ore 15:30")
  str = str.replace(/[\s,]+(?:ore\s+)?\d{1,2}[:.]\d{2}(?:[:.]\d{2})?.*$/i, '').trim();

  // 2. Format: ISO YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // 3. Format: Textual month in Italian (e.g. "18 ottobre 2026", "18-ott-26", "18 ott", "18 ottobre")
  const textMonthMatch = str.match(/^(\d{1,2})[\s\-/.]([a-zA-Zàèéìòù]+)(?:[\s\-/.](20\d{2}|\d{2}))?/i);
  if (textMonthMatch) {
    const day = parseInt(textMonthMatch[1], 10);
    const monthName = textMonthMatch[2].toLowerCase();
    const monthNum = ITALIAN_MONTHS[monthName];
    if (monthNum) {
      let year = 2026;
      if (textMonthMatch[3]) {
        const rawY = parseInt(textMonthMatch[3], 10);
        year = rawY < 100 ? 2000 + rawY : rawY;
      } else {
        // Fallback season year (Aug..Dec -> 2026, Jan..Jul -> 2027)
        year = monthNum >= 8 ? 2026 : 2027;
      }
      return new Date(year, monthNum - 1, day);
    }
  }

  // 4. Format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (also supports 2-digit year: DD/MM/YY)
  const itMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})(?:[\/\.-](\d{2,4}))?/);
  if (itMatch) {
    let p1 = parseInt(itMatch[1], 10);
    let p2 = parseInt(itMatch[2], 10);
    let day = p1;
    let month = p2 - 1;

    // Disambiguation if Google Sheet was in US locale MM/DD/YYYY (e.g. 10/18/2026 where p2 > 12)
    if (p1 <= 12 && p2 > 12) {
      day = p2;
      month = p1 - 1;
    }

    let year = 2026;
    if (itMatch[3]) {
      const rawYear = parseInt(itMatch[3], 10);
      year = rawYear < 100 ? 2000 + rawYear : rawYear;
    } else {
      // Season assumption
      year = (month + 1) >= 8 ? 2026 : 2027;
    }

    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }

  // 5. Fallback date parse
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      // Return as local year/month/day
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Strictly formats a Date object to GG/MM/AAAA (DD/MM/YYYY)
 */
export function formatDateToGGMMMAAAA(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Normalizes any input date representation to standard GG/MM/AAAA format string.
 * Preserves the exact day and month from the original source.
 */
export function normalizeToGGMMMAAAA(rawDate: string | number | null | undefined): string {
  if (rawDate === null || rawDate === undefined || rawDate === '') {
    return 'DATA DA DEFINIRE';
  }

  const parsed = parseMatchDate(rawDate);
  if (parsed) {
    return formatDateToGGMMMAAAA(parsed);
  }

  // If already matches DD/MM/YYYY or similar text, return cleaned up
  const cleanStr = String(rawDate).trim().replace(/-/g, '/');
  return cleanStr;
}

export function formatDateToISOString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatItalianDateWithWeekday(date: Date): string {
  const weekday = date.toLocaleDateString('it-IT', { weekday: 'long' });
  const ggmmaaaa = formatDateToGGMMMAAAA(date);
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)} ${ggmmaaaa}`;
}

export interface MatchPriority {
  isUpcoming: boolean;       // True if match date is within 3 days (<= 3 days) or overdue while not sent
  daysDiff: number | null;   // Calendar days difference from today: 0 = oggi, 1 = domani, 2 = tra 2 giorni, 3 = tra 3 giorni
  label: string;             // Detailed badge label: "OGGI", "DOMANI", "Tra 2 giorni", "Tra 3 giorni", "Data superata"
  shortBadge: string;        // Compact badge label: "OGGI", "DOMANI", "2 gg", "3 gg"
  urgency: 'critical' | 'high' | 'medium' | 'none';
  colorClasses: {
    badge: string;
    icon: string;
    border: string;
    bgGlow: string;
    text: string;
  };
}

/**
 * Calculates whether a match date is imminent (within the next 3 days)
 * to provide visual priority indicators ensuring timely PEC dispatch.
 */
export function getMatchPriority(
  matchDateStr: string | number | null | undefined,
  status?: 'da_inviare' | 'inviata' | 'annullata'
): MatchPriority {
  const parsed = parseMatchDate(matchDateStr);
  if (!parsed) {
    return {
      isUpcoming: false,
      daysDiff: null,
      label: '',
      shortBadge: '',
      urgency: 'none',
      colorClasses: { badge: '', icon: '', border: '', bgGlow: '', text: '' },
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - today.getTime();
  const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Overdue: match date in the past (< 0 days)
  const isOverdue = daysDiff < 0;

  if (isOverdue) {
    const absDays = Math.abs(daysDiff);
    return {
      isUpcoming: true,
      daysDiff,
      label: `DATA SUPERATA (${absDays} ${absDays === 1 ? 'giorno fa' : 'giorni fa'})`,
      shortBadge: `${absDays} gg fa`,
      urgency: 'critical',
      colorClasses: {
        badge: 'bg-red-100 text-red-900 border-red-300 font-bold shadow-2xs',
        icon: 'text-red-600',
        border: 'border-l-4 border-l-red-500',
        bgGlow: 'bg-red-50/40',
        text: 'text-red-700',
      },
    };
  }

  if (daysDiff === 0) {
    return {
      isUpcoming: true,
      daysDiff: 0,
      label: 'OGGI - GARA ENTRO 24 ORE',
      shortBadge: 'GARA OGGI',
      urgency: 'critical',
      colorClasses: {
        badge: 'bg-rose-100 text-rose-950 border-rose-400 font-bold animate-pulse ring-1 ring-rose-300 shadow-2xs',
        icon: 'text-rose-600',
        border: 'border-l-4 border-l-rose-500',
        bgGlow: 'bg-rose-50/50',
        text: 'text-rose-700',
      },
    };
  }

  if (daysDiff === 1) {
    return {
      isUpcoming: true,
      daysDiff: 1,
      label: 'DOMANI - INVIO PEC TEMPESTIVO',
      shortBadge: 'GARA DOMANI',
      urgency: 'critical',
      colorClasses: {
        badge: 'bg-amber-100 text-amber-950 border-amber-400 font-bold ring-1 ring-amber-300 shadow-2xs',
        icon: 'text-amber-600',
        border: 'border-l-4 border-l-amber-500',
        bgGlow: 'bg-amber-50/40',
        text: 'text-amber-800',
      },
    };
  }

  if (daysDiff === 2) {
    return {
      isUpcoming: true,
      daysDiff: 2,
      label: 'TRA 2 GIORNI - PRIORITÀ ALTA',
      shortBadge: 'Tra 2 gg',
      urgency: 'high',
      colorClasses: {
        badge: 'bg-orange-50 text-orange-950 border-orange-300 font-semibold shadow-2xs',
        icon: 'text-orange-600',
        border: 'border-l-4 border-l-orange-400',
        bgGlow: 'bg-orange-50/30',
        text: 'text-orange-800',
      },
    };
  }

  if (daysDiff === 3) {
    return {
      isUpcoming: true,
      daysDiff: 3,
      label: 'TRA 3 GIORNI - IN SCADENZA',
      shortBadge: 'Tra 3 gg',
      urgency: 'medium',
      colorClasses: {
        badge: 'bg-yellow-50 text-yellow-950 border-yellow-300 font-semibold shadow-2xs',
        icon: 'text-yellow-600',
        border: 'border-l-4 border-l-yellow-400',
        bgGlow: 'bg-yellow-50/25',
        text: 'text-yellow-800',
      },
    };
  }

  return {
    isUpcoming: false,
    daysDiff,
    label: '',
    shortBadge: '',
    urgency: 'none',
    colorClasses: { badge: '', icon: '', border: '', bgGlow: '', text: '' },
  };
}

