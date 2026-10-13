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
