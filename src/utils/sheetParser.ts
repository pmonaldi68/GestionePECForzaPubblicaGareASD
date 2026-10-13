import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Match, ClubId, ColumnMapping } from '../types';
import { CLUBS, CATEGORY_FACILITY_RULES } from '../config/clubsData';
import { resolveFacilityText } from './pecGenerator';
import { normalizeToGGMMMAAAA } from './dateUtils';

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
 * Detects which club a match belongs to based on team names, category, or dedicated column
 */
export function detectClub(
  squadraCasa: string,
  squadraOspite: string,
  campionato: string,
  extraField: string = ''
): ClubId {
  const text = `${squadraCasa} ${squadraOspite} ${campionato} ${extraField}`.toUpperCase();

  // 1. Albacynthia
  if (text.includes('ALBACYNTHIA') || text.includes('ALBA CYNTHIA')) {
    return 'ALBACYNTHIA';
  }

  // 2. PGS Don Bosco Genzano
  if (
    text.includes('DON BOSCO') ||
    text.includes('P.G.S.') ||
    text.includes('PGS DON BOSCO') ||
    text.includes('SERIE C2') ||
    text.includes('C2 C5')
  ) {
    return 'PGS_DON_BOSCO';
  }

  // 3. Academy Cynthia Genzano
  if (
    text.includes('ACADEMY') ||
    text.includes('AC. CYNTHIA') ||
    text.includes('ACADEMY CYNTHIA')
  ) {
    return 'ACADEMY_CYNTHIA';
  }

  // 4. Cynthia 1920
  if (text.includes('CYNTHIA 1920') || text.includes('CYNTHIA')) {
    return 'CYNTHIA_1920';
  }

  // Match by championship if teams are shortened
  if (text.includes('PROMOZIONE') || text.includes('UNDER 18') || text.includes('UNDER 19')) {
    return 'CYNTHIA_1920';
  }
  if (text.includes('2CATEGORIA') || text.includes('2 CATEGORIA') || text.includes('SECONDA CATEGORIA')) {
    return 'PGS_DON_BOSCO';
  }
  if (text.includes('3CATEGORIA') || text.includes('3 CATEGORIA') || text.includes('UNDER 15') || text.includes('UNDER 16') || text.includes('UNDER 17')) {
    return 'ACADEMY_CYNTHIA';
  }

  return 'CYNTHIA_1920'; // default
}

/**
 * Checks if our club is playing at HOME (squadra di casa)
 */
export function isHomeMatch(clubId: ClubId, squadraCasa: string, squadraOspite: string): boolean {
  const club = CLUBS[clubId];
  const casaUpper = squadraCasa.toUpperCase();
  const ospiteUpper = squadraOspite.toUpperCase();

  // Check aliases for club
  for (const alias of club.aliases) {
    const aliasUpper = alias.toUpperCase();
    if (casaUpper.includes(aliasUpper)) {
      return true;
    }
    if (ospiteUpper.includes(aliasUpper)) {
      return false;
    }
  }

  // Generic keyword heuristics
  if (clubId === 'CYNTHIA_1920') {
    if (casaUpper.includes('CYNTHIA') && !casaUpper.includes('ACADEMY') && !casaUpper.includes('ALBA')) {
      return true;
    }
    if (ospiteUpper.includes('CYNTHIA') && !ospiteUpper.includes('ACADEMY') && !ospiteUpper.includes('ALBA')) {
      return false;
    }
  }

  if (clubId === 'ACADEMY_CYNTHIA') {
    if (casaUpper.includes('ACADEMY') || casaUpper.includes('AC. CYNTHIA')) return true;
    if (ospiteUpper.includes('ACADEMY') || ospiteUpper.includes('AC. CYNTHIA')) return false;
  }

  if (clubId === 'PGS_DON_BOSCO') {
    if (casaUpper.includes('DON BOSCO') || casaUpper.includes('PGS')) return true;
    if (ospiteUpper.includes('DON BOSCO') || ospiteUpper.includes('PGS')) return false;
  }

  if (clubId === 'ALBACYNTHIA') {
    if (casaUpper.includes('ALBACYNTHIA') || casaUpper.includes('ALBA')) return true;
    if (ospiteUpper.includes('ALBACYNTHIA') || ospiteUpper.includes('ALBA')) return false;
  }

  // Default assumption if not found: true so secretary doesn't miss potential PEC
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

    const societaVal = activeMapping.societaCol !== undefined ? (row[activeMapping.societaCol] || '').trim() : '';
    const categoriaVal = activeMapping.categoriaCol !== undefined ? (row[activeMapping.categoriaCol] || '').trim() : '';

    const clubId = detectClub(squadraCasa, squadraOspite, campionato || categoriaVal, societaVal);
    const category = categoriaVal || campionato;
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

  return matches;
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
