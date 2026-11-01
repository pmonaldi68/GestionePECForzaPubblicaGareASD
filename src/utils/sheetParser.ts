import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Match, ClubId, ColumnMapping } from '../types';
import { CLUBS, CATEGORY_FACILITY_RULES } from '../config/clubsData';
import { resolveFacilityText, resolveMatchCategory } from './pecGenerator';
import { normalizeToGGMMMAAAA } from './dateUtils';
import { ensureUniqueMatchIds } from './matchMerger';

export const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  campionatoCol: 2, // Colonna C (0-indexed: 2)
  gironeCol: 3,      // Colonna D (0-indexed: 3)
  giornataCol: 4,    // Colonna E (0-indexed: 4)
  dataCol: 5,        // Colonna F (0-indexed: 5)
  oraCol: 6,         // Colonna G (0-indexed: 6)
  squadraCasaCol: 7, // Colonna H (0-indexed: 7)
  squadraOspiteCol: 8,// Colonna I (0-indexed: 8)
  societaCol: 0,     // Colonna A (facoltativa)
  categoriaCol: 1,   // Colonna B (facoltativa)
};

/**
 * Identifies if a specific team name explicitly matches one of our 4 clubs.
 * IMPORTANT: Opponents named "Academy Ladispoli", "Academy Ferentino", "Don Bosco Gaeta", "Albalonga", etc.
 * must NOT trigger false positives for our clubs!
 */
export function identifyClubInTeamName(teamName: string): ClubId | null {
  if (!teamName || typeof teamName !== 'string') return null;
  const upper = teamName.toUpperCase().trim();
  if (!upper) return null;

  // 1. Albacynthia (must contain ALBACYNTHIA or ALBA CYNTHIA)
  if (upper.includes('ALBACYNTHIA') || upper.includes('ALBA CYNTHIA')) {
    return 'ALBACYNTHIA';
  }

  // 2. Academy Cynthia (MUST contain both ACADEMY/ACCADEMY/AC. and CYNTHIA)
  if (
    (upper.includes('ACADEMY') || upper.includes('ACCADEMY') || upper.includes('AC.')) &&
    upper.includes('CYNTHIA')
  ) {
    return 'ACADEMY_CYNTHIA';
  }

  // 3. PGS Don Bosco Genzano (must have DON BOSCO and either PGS, P.G.S., or GENZANO)
  if (
    upper.includes('P.G.S. DON BOSCO') ||
    upper.includes('PGS DON BOSCO') ||
    upper.includes('DON BOSCO GENZANO') ||
    (upper.includes('DON BOSCO') && upper.includes('GENZANO')) ||
    (upper.includes('DON BOSCO') && (upper.includes('PGS') || upper.includes('P.G.S.')))
  ) {
    return 'PGS_DON_BOSCO';
  }

  // 4. Cynthia 1920
  // Explicit "CYNTHIA 1920"
  if (
    upper.includes('CYNTHIA 1920') ||
    upper.includes('CYNTHIA 1920 S.R.L.') ||
    upper.includes('CYNTHIA 1920 SRL') ||
    upper.includes('ASD CYNTHIA') ||
    upper.includes('CYNTHIA GENZANO')
  ) {
    return 'CYNTHIA_1920';
  }

  // "CYNTHIA" alone (without ACADEMY, ACCADEMY, ALBA)
  if (
    upper.includes('CYNTHIA') &&
    !upper.includes('ACADEMY') &&
    !upper.includes('ACCADEMY') &&
    !upper.includes('ALBA')
  ) {
    return 'CYNTHIA_1920';
  }

  return null;
}

/**
 * Detects the managing club based on official category / championship division.
 * Rules:
 * - CYNTHIA 1920: Promozione, Under 19 (Provinciale / Regionale / Juniores), Under 18 (Regionale)
 * - ACADEMY CYNTHIA: Under 17, Under 16, Under 15, Under 14 Regionali, 3ª Categoria, Serie D C5 Femminile
 * - PGS DON BOSCO: 2ª Categoria, Serie C2 C5 Maschile, Serie D C5 Femminile PGS
 * - ALBACYNTHIA: Under 14 Provinciali
 */
export function identifyClubFromCategory(campionatoOrCategory: string): ClubId | null {
  if (!campionatoOrCategory || typeof campionatoOrCategory !== 'string') return null;
  const upper = campionatoOrCategory.toUpperCase().trim();
  if (!upper) return null;

  // CYNTHIA 1920 categories:
  if (
    upper.includes('PROMOZIONE') ||
    upper.includes('ECCELLENZA') ||
    upper.includes('UNDER 19') ||
    upper.includes('U19') ||
    upper.includes('JUNIORES') ||
    upper.includes('UNDER 18') ||
    upper.includes('U18')
  ) {
    return 'CYNTHIA_1920';
  }

  // PGS Don Bosco categories:
  if (
    upper.includes('2CATEGORIA') ||
    upper.includes('2 CATEGORIA') ||
    upper.includes('2^ CATEGORIA') ||
    upper.includes('SECONDA CATEGORIA') ||
    upper.includes('SERIE C2') ||
    upper.includes('C2 C5') ||
    (upper.includes('SERIE D') && upper.includes('PGS'))
  ) {
    return 'PGS_DON_BOSCO';
  }

  // Albacynthia categories:
  if (
    upper.includes('ALBACYNTHIA') ||
    (upper.includes('UNDER 14') && (upper.includes('PROV') || upper.includes('PROVINCIALE') || upper.includes('PROVINCIALI'))) ||
    (upper.includes('U14') && (upper.includes('PROV') || upper.includes('PROVINCIALE') || upper.includes('PROVINCIALI')))
  ) {
    return 'ALBACYNTHIA';
  }

  // Academy Cynthia categories:
  if (
    upper.includes('3CATEGORIA') ||
    upper.includes('3 CATEGORIA') ||
    upper.includes('3^ CATEGORIA') ||
    upper.includes('TERZA CATEGORIA') ||
    upper.includes('UNDER 17') ||
    upper.includes('U17') ||
    upper.includes('UNDER 16') ||
    upper.includes('U16') ||
    upper.includes('UNDER 15') ||
    upper.includes('U15') ||
    (upper.includes('UNDER 14') && (upper.includes('REG') || upper.includes('REGIONALE') || upper.includes('REGIONALI'))) ||
    (upper.includes('SERIE D') && !upper.includes('PGS'))
  ) {
    return 'ACADEMY_CYNTHIA';
  }

  return null;
}

/**
 * Detects which club a match belongs to based on team names, category, or dedicated column.
 * Guarantees that Under 19 Provinciale belongs strictly to CYNTHIA 1920 (President: D'AURIA ANTONIO)
 * and opponents with "Academy" or "Don Bosco" are not misidentified as our home club.
 */
export function detectClub(
  squadraCasa: string,
  squadraOspite: string,
  campionato: string,
  extraField: string = ''
): ClubId {
  // 1. If explicit extraField / societa column is provided, check if it specifies the club
  if (extraField) {
    const extraClub = identifyClubInTeamName(extraField);
    if (extraClub) return extraClub;
  }

  // 2. Check team names individually (NOT concatenated!) to identify which team is our club
  const casaClub = identifyClubInTeamName(squadraCasa);
  const ospiteClub = identifyClubInTeamName(squadraOspite);

  // If home team is one of our clubs
  if (casaClub && !ospiteClub) {
    return casaClub;
  }
  // If away team is one of our clubs
  if (ospiteClub && !casaClub) {
    return ospiteClub;
  }
  // If internal derby between our managed clubs, prioritize home team
  if (casaClub && ospiteClub) {
    return casaClub;
  }

  // 3. Check Championship / Category rules (e.g. Under 19 Provinciale -> CYNTHIA_1920)
  const categoryClub = identifyClubFromCategory(campionato) || identifyClubFromCategory(extraField);
  if (categoryClub) {
    return categoryClub;
  }

  // 4. Default fallback: Cynthia 1920
  return 'CYNTHIA_1920';
}

/**
 * Checks if our club is playing at HOME (squadra di casa).
 * Returns true if our club is squadraCasa, false if our club is squadraOspite.
 */
export function isHomeMatch(clubId: ClubId, squadraCasa: string, squadraOspite: string): boolean {
  const casaClub = identifyClubInTeamName(squadraCasa);
  const ospiteClub = identifyClubInTeamName(squadraOspite);

  // Direct exact match
  if (casaClub === clubId) {
    return true;
  }
  if (ospiteClub === clubId) {
    return false;
  }

  // Check aliases strictly without matching external opponent names
  const club = CLUBS[clubId];
  const casaUpper = (squadraCasa || '').toUpperCase().trim();
  const ospiteUpper = (squadraOspite || '').toUpperCase().trim();

  for (const alias of club.aliases) {
    const aliasUpper = alias.toUpperCase();
    if (casaUpper.includes(aliasUpper)) return true;
    if (ospiteUpper.includes(aliasUpper)) return false;
  }

  // Specific heuristics avoiding substrings matching opponents
  if (clubId === 'CYNTHIA_1920') {
    if (casaUpper.includes('CYNTHIA') && !casaUpper.includes('ACADEMY') && !casaUpper.includes('ACCADEMY') && !casaUpper.includes('ALBA')) {
      return true;
    }
    if (ospiteUpper.includes('CYNTHIA') && !ospiteUpper.includes('ACADEMY') && !ospiteUpper.includes('ACCADEMY') && !ospiteUpper.includes('ALBA')) {
      return false;
    }
  }

  if (clubId === 'ACADEMY_CYNTHIA') {
    if ((casaUpper.includes('ACADEMY') || casaUpper.includes('ACCADEMY')) && casaUpper.includes('CYNTHIA')) return true;
    if ((ospiteUpper.includes('ACADEMY') || ospiteUpper.includes('ACCADEMY')) && ospiteUpper.includes('CYNTHIA')) return false;
  }

  if (clubId === 'PGS_DON_BOSCO') {
    if (casaUpper.includes('DON BOSCO') && (casaUpper.includes('GENZANO') || casaUpper.includes('PGS') || casaUpper.includes('P.G.S.'))) return true;
    if (ospiteUpper.includes('DON BOSCO') && (ospiteUpper.includes('GENZANO') || ospiteUpper.includes('PGS') || ospiteUpper.includes('P.G.S.'))) return false;
  }

  if (clubId === 'ALBACYNTHIA') {
    if (casaUpper.includes('ALBACYNTHIA') || casaUpper.includes('ALBA CYNTHIA')) return true;
    if (ospiteUpper.includes('ALBACYNTHIA') || ospiteUpper.includes('ALBA CYNTHIA')) return false;
  }

  // Default assumption: true (home) so secretary doesn't miss potential PEC
  return true;
}

/**
 * Detects if the first row is a header row
 */
export function isHeaderRow(row: string[]): boolean {
  const combined = row.join(' ').toUpperCase();
  return (
    combined.includes('CAMPIONATO') ||
    combined.includes('GIRONE') ||
    combined.includes('GIORNATA') ||
    combined.includes('SQUADRA') ||
    combined.includes('CASA') ||
    combined.includes('OSPITE')
  );
}

/**
 * Detect column mapping automatically from headers if available
 */
/**
 * Normalizes time string from Google Sheets/Excel (e.g. 15:30:00, 15.30, 0.6458)
 */
export function normalizeTime(rawTime: string | number): string {
  if (!rawTime && rawTime !== 0) return '15:00';
  const str = String(rawTime).trim();
  // Excel decimal time between 0 and 1
  if (!isNaN(Number(str)) && Number(str) > 0 && Number(str) < 1) {
    const totalMinutes = Math.round(Number(str) * 24 * 60);
    const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const m = String(totalMinutes % 60).padStart(2, '0');
    return `${h}:${m}`;
  }
  const match = str.match(/(\d{1,2})[:.](\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return str || '15:00';
}

/**
 * Detect column mapping automatically from headers if available
 */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { ...DEFAULT_COLUMN_MAPPING };

  headers.forEach((h, idx) => {
    const header = h.toUpperCase().trim();
    if (header.includes('CAMPIONATO') || header.includes('TORNEO')) mapping.campionatoCol = idx;
    else if (header.includes('GIRONE') || header === 'GIR.') mapping.gironeCol = idx;
    else if (header.includes('GIORNATA') || header.includes('TURNO') || header === 'G.') mapping.giornataCol = idx;
    else if (header.includes('DATA') || header.includes('GIORNO') || header === 'D.' || header === 'DATE') mapping.dataCol = idx;
    else if (header.includes('ORA') || header.includes('ORARIO') || header === 'TIME') mapping.oraCol = idx;
    else if ((header.includes('SQUADRA') && header.includes('CASA')) || header === 'CASA' || header.includes('LOCALE') || header === 'SQUADRA 1') mapping.squadraCasaCol = idx;
    else if ((header.includes('SQUADRA') && (header.includes('OSPITE') || header.includes('TRASFERTA'))) || header === 'OSPITE' || header.includes('VISITATORE') || header === 'SQUADRA 2') mapping.squadraOspiteCol = idx;
    else if (header.includes('SOCIET') || header.includes('CLUB')) mapping.societaCol = idx;
    else if (header.includes('CATEGOR')) mapping.categoriaCol = idx;
  });

  return mapping;
}

/**
 * Identifies if a match, row or team indicates a rest turn ("RIPOSO" / "RIPOSA").
 * Any match containing "RIPOSO" or "RIPOSA" must NOT be included in the list of matches.
 */
export function isRiposoMatch(m: {
  squadraCasa?: string;
  squadraOspite?: string;
  campionato?: string;
  notes?: string;
  category?: string;
  girone?: string;
  giornata?: string;
} | null | undefined): boolean {
  if (!m) return false;
  const fields = [m.squadraCasa, m.squadraOspite, m.campionato, m.notes, m.category, m.girone, m.giornata];
  return fields.some(field => {
    if (!field || typeof field !== 'string') return false;
    const upper = field.trim().toUpperCase();
    return upper.includes('RIPOSO') || upper.includes('RIPOSA') || /\bRIPOS[OA]\b/.test(upper);
  });
}

/**
 * Converts 2D array of strings into Match models
 */
export function parseGridToMatches(grid: string[][], mapping: ColumnMapping = DEFAULT_COLUMN_MAPPING): Match[] {
  if (!grid || grid.length === 0) return [];

  let startRow = 0;
  let activeMapping = { ...mapping };

  // Search first 5 rows for a header row
  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(grid.length, 5); r++) {
    if (grid[r] && isHeaderRow(grid[r])) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex !== -1) {
    activeMapping = autoDetectColumnMapping(grid[headerRowIndex]);
    startRow = headerRowIndex + 1;
  }

  const matches: Match[] = [];

  for (let r = startRow; r < grid.length; r++) {
    const row = grid[r];
    if (!row || row.length === 0 || row.every(cell => !cell || !cell.trim())) {
      continue;
    }

    // Skip entire row if it mentions "RIPOSO" or "RIPOSA" anywhere
    const isRiposoRow = row.some(cell => {
      if (!cell || typeof cell !== 'string') return false;
      const upper = cell.trim().toUpperCase();
      return upper.includes('RIPOSO') || upper.includes('RIPOSA') || /\bRIPOS[OA]\b/.test(upper);
    });
    if (isRiposoRow) {
      continue;
    }

    const campionato = (row[activeMapping.campionatoCol] || '').trim();
    const girone = (row[activeMapping.gironeCol] || '').trim();
    const giornata = (row[activeMapping.giornataCol] || '').trim();
    const rawData = (row[activeMapping.dataCol] || '').trim();
    const data = normalizeToGGMMMAAAA(rawData);
    
    // Time handling: use ora column, or extract if mixed inside rawData
    let rawOra = (row[activeMapping.oraCol] || '').trim();
    if (!rawOra) {
      const timeInDate = rawData.match(/(\d{1,2}[:.]\d{2})/);
      if (timeInDate) rawOra = timeInDate[1];
    }
    const ora = normalizeTime(rawOra);

    const squadraCasa = (row[activeMapping.squadraCasaCol] || '').trim();
    const squadraOspite = (row[activeMapping.squadraOspiteCol] || '').trim();

    // Skip if crucial fields are missing
    if (!squadraCasa && !squadraOspite && !campionato) {
      continue;
    }

    // Exclude matches where home, away, or championship indicates a rest turn
    if (isRiposoMatch({ squadraCasa, squadraOspite, campionato, girone, giornata })) {
      continue;
    }

    const societaVal = activeMapping.societaCol !== undefined ? (row[activeMapping.societaCol] || '').trim() : '';
    const categoriaVal = activeMapping.categoriaCol !== undefined ? (row[activeMapping.categoriaCol] || '').trim() : '';

    const clubId = detectClub(squadraCasa, squadraOspite, campionato || categoriaVal, societaVal);
    const category = resolveMatchCategory({
      category: categoriaVal,
      campionato,
      squadraCasa,
      squadraOspite,
      clubId,
    });
    const isHome = isHomeMatch(clubId, squadraCasa, squadraOspite);
    const facilityText = resolveFacilityText(clubId, category || campionato);

    matches.push({
      id: `match_${r}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      clubId,
      campionato: campionato || 'CAMPIONATO REGIONALE',
      girone: girone || 'A',
      giornata: giornata || '1',
      data: data || 'DATA DA DEFINIRE',
      ora: ora || '15:00',
      squadraCasa: squadraCasa || 'SQUADRA CASA',
      squadraOspite: squadraOspite || 'SQUADRA OSPITE',
      isHome,
      facilityText,
      category,
      status: 'da_inviare',
      rawRowIndex: r,
    });
  }

  return ensureUniqueMatchIds(matches);
}

/**
 * Parses raw text (TSV copied from Google Sheets or CSV)
 */
export function parseRawText(text: string, mapping: ColumnMapping = DEFAULT_COLUMN_MAPPING): Match[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Use PapaParse to parse CSV or TSV
  const parsed = Papa.parse(trimmed, {
    delimiter: '', // auto-detect
    skipEmptyLines: true,
  });

  const grid = (parsed.data as string[][]) || [];
  return parseGridToMatches(grid, mapping);
}

/**
 * Parses an Excel or CSV file buffer/array
 */
export function parseFileBuffer(data: ArrayBuffer, mapping: ColumnMapping = DEFAULT_COLUMN_MAPPING): Match[] {
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const grid = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as string[][];

  // Convert numbers or dates if needed
  const stringGrid = grid.map(row => row.map(cell => String(cell ?? '')));
  return parseGridToMatches(stringGrid, mapping);
}

/**
 * Extracts a clean Google Sheets CSV URL from various Google Sheets links
 */
export function getGoogleSheetsCsvUrl(url: string): string | null {
  try {
    const trimmed = url.trim();

    // Direct CSV export link
    if (trimmed.includes('output=csv') || trimmed.includes('format=csv')) {
      return trimmed;
    }

    // Standard Google Sheet URL: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/...
    const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      const sheetId = match[1];
      // Check for gid (specific sheet tab)
      const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
      const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
      return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;
    }

    // Published web link: /spreadsheets/d/e/{EXPORT_ID}/pubhtml
    const pubMatch = trimmed.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
    if (pubMatch && pubMatch[1]) {
      const pubId = pubMatch[1];
      return `https://docs.google.com/spreadsheets/d/e/${pubId}/pub?output=csv`;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Computes a normalized key for a match to identify the same match across reloads
 */
export function getMatchKey(m: { squadraCasa: string; squadraOspite: string; data: string }): string {
  const norm = (s: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const dataNorm = normalizeToGGMMMAAAA(m.data);
  return `${norm(m.squadraCasa)}_${norm(m.squadraOspite)}_${dataNorm}`;
}

/**
 * Merges newly imported matches with existing ones, strictly preserving:
 * - status: 'inviata'
 * - pecSentDate (data di invio effettiva)
 * - facility variations (variazione campo di gioco)
 * - custom notes
 */
export function mergeMatchesPreservingStatus(existingMatches: Match[], incomingMatches: Match[]): Match[] {
  if (!existingMatches || existingMatches.length === 0) return incomingMatches;

  const existingMap = new Map<string, Match>();
  existingMatches.forEach(m => {
    existingMap.set(getMatchKey(m), m);
  });

  const merged = incomingMatches.map(incoming => {
    const key = getMatchKey(incoming);
    const existing = existingMap.get(key);

    if (existing) {
      return {
        ...incoming,
        id: existing.id,
        // PRESERVE SENT STATUS & SENT DATE
        status: existing.status,
        pecSentDate: existing.pecSentDate,
        // PRESERVE FACILITY OVERRIDE
        facilityText: existing.facilityText || incoming.facilityText,
        isHome: existing.isHome !== undefined ? existing.isHome : incoming.isHome,
        notes: existing.notes || incoming.notes,
      };
    }

    return incoming;
  });

  return merged;
}
