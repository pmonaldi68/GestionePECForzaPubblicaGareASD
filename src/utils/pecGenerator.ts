import { Match, PecOutput, ClubId } from '../types';
import { CLUBS, CATEGORY_FACILITY_RULES } from '../config/clubsData';
import { normalizeToGGMMMAAAA } from './dateUtils';

/**
 * Normalizes text to help find matching categories or clubs
 */
export function normalize(text: string): string {
  return (text || '')
    .toUpperCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves the facility text based on club and category/campionato
 */
export function resolveFacilityText(clubId: ClubId, categoryOrCampionato: string): string {
  const normInput = normalize(categoryOrCampionato);

  // First try direct club match
  const clubRules = CATEGORY_FACILITY_RULES.filter(r => r.clubId === clubId);
  for (const rule of clubRules) {
    if (normInput.includes(normalize(rule.category))) {
      return rule.facilityText;
    }
    for (const alias of rule.aliases) {
      if (normInput.includes(normalize(alias))) {
        return rule.facilityText;
      }
    }
  }

  // Check specific fallbacks per club
  if (clubId === 'CYNTHIA_1920') {
    if (normInput.includes('PROMOZIONE') || normInput.includes('PRIMA SQUADRA')) {
      return 'LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO BRUNO ABBATINI SITO IN VIA EMILIA ROMAGNA,GENZANO DI ROMA (RM).';
    }
    return "LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO CITTA' DELL'INFIORATA, SITO IN VIA SARDEGNA, 14,GENZANO DI ROMA (RM).";
  }

  if (clubId === 'ACADEMY_CYNTHIA') {
    if (normInput.includes('FEMMINILE') || normInput.includes('CA5') || normInput.includes('C5')) {
      return 'LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO CYNTHIA TRAINING CENTER, VIA MONTEGIOVE 77,GENZANO DI ROMA (RM).';
    }
    return "LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO CITTA' DELL'INFIORATA, SITO IN VIA SARDEGNA, 14,GENZANO DI ROMA (RM).";
  }

  if (clubId === 'PGS_DON_BOSCO') {
    if (normInput.includes('C2') || normInput.includes('FEMMINILE') || normInput.includes('C5') || normInput.includes('STUGI')) {
      return 'LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO DON STUGI SITO IN VIALE PIAVE, 12,GENZANO DI ROMA (RM).';
    }
    return 'LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO DON BOSCO SITO IN VIALE PIAVE, 12,GENZANO DI ROMA (RM).';
  }

  if (clubId === 'ALBACYNTHIA') {
    return "LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO CITTA' DELL'INFIORATA, SITO IN VIA SARDEGNA, 14,GENZANO DI ROMA (RM).";
  }

  // Default fallback
  return "LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO CITTA' DELL'INFIORATA, SITO IN VIA SARDEGNA, 14,GENZANO DI ROMA (RM).";
}

/**
 * Robustly resolves the official match category, even if category field is empty,
 * null, lowercase, or only present in 'campionato' or custom aliases.
 */
export function resolveMatchCategory(match: Partial<Match>): string {
  if (match.category && match.category.trim()) {
    return match.category.trim();
  }
  if ((match as any)?.categoria && typeof (match as any).categoria === 'string' && (match as any).categoria.trim()) {
    return (match as any).categoria.trim();
  }
  const searchStr = `${match.campionato || ''} ${match.squadraCasa || ''} ${match.notes || ''}`;
  const normSearch = normalize(searchStr);
  for (const rule of CATEGORY_FACILITY_RULES) {
    if (normSearch.includes(normalize(rule.category))) {
      return rule.category;
    }
    for (const alias of rule.aliases) {
      if (normSearch.includes(normalize(alias))) {
        return rule.category;
      }
    }
  }
  return match.campionato?.trim() || 'GARA';
}

/**
 * Returns contact string for a club
 */
export function getContactText(clubId: ClubId): string {
  const club = CLUBS[clubId];
  if (clubId === 'PGS_DON_BOSCO') {
    return 'PER INFORMAZIONI IN MERITO ALLA GARA POTETE CONTATTARE IL SIGNOR GABBARINI GIANCARLO 📞 3298622464';
  }
  return 'PER INFORMAZIONI IN MERITO ALLA GARA POTETE CONTATTARE IL SIGNOR MONALDI PAOLO 📞3289684700';
}

/**
 * Returns president closing text for a club
 */
export function getSignoffText(clubId: ClubId): string {
  const club = CLUBS[clubId];
  return `SI RINGRAZIA PER LA CORTESE ATTENZIONE E SI PORGONO CORDIALI SALUTI.\nIL PRESIDENTE ${club.president}`;
}

/**
 * Generates the PEC data structure with separated fields
 */
export function generatePecForMatch(match: Match, useDynamicAsdName: boolean = true): PecOutput {
  const club = CLUBS[match.clubId] || CLUBS.CYNTHIA_1920;
  const dataGGMM = normalizeToGGMMMAAAA(match.data);

  // OGGETTO MAIL: tutto in maiuscolo come specificato
  // RICHIESTA DEL SERVIZIO D'ORDINE PER LA GARA DI CALCIO DEL CAMPIONATO - "nella colonna C CAMPIONATO - GIRONE "colonna D" - GIORNATA "colonna E" TRA "colonna H SQUADRA CASA" e "colonna I SQUADRA OSPITE" DI "colonna F DATA"  ORE "colonna G ORA", tutto il maiuscolo
  const rawSubject = `RICHIESTA DEL SERVIZIO D'ORDINE PER LA GARA DI CALCIO DEL CAMPIONATO - ${match.campionato.trim()} - GIRONE ${match.girone.trim()} - GIORNATA ${match.giornata.trim()} TRA ${match.squadraCasa.trim()} E ${match.squadraOspite.trim()} DI ${dataGGMM}  ORE ${match.ora.trim()}`;
  const oggetto = rawSubject.toUpperCase();

  // INTESTAZIONE MAIL
  const asdName = useDynamicAsdName ? club.name : 'CYNTHIA 1920';
  const intestazione = `CON LA PRESENTE, L’ASSOCIAZIONE SPORTIVA DILETTANTISTICA ${asdName} RICHIEDE LA FORZA PUBBLICA, COME DA DISPOSIZIONI IMPARTITE DALLE REGOLE FEDERALI, INERENTI AL MANTENIMENTO DELL’ORDINE PUBBLICO NEI CAMPI SPORTIVI DI CALCIO, DI CUI ALL’ARTICOLO 62/4 E 5 DELLE N.O.I.F. PER LA SEGUENTE GARA:`;

  // CORPO MAIL
  const corpo = `CAMPIONATO; - ${match.campionato.trim()}
GIRONE: ${match.girone.trim()}
GIORNATA: ${match.giornata.trim()}
DATA:  ${dataGGMM}  ORE ${match.ora.trim()},
GARA: ${match.squadraCasa.trim()} e ${match.squadraOspite.trim()}`;

  // IMPIANTO
  const impianto = match.facilityText || resolveFacilityText(match.clubId, match.category || match.campionato);

  // CONTATTO
  const contatto = getContactText(match.clubId);

  // CHIUSURA E FIRMA
  const chiusuraFirma = getSignoffText(match.clubId);

  // TESTO COMPLETO COMPILATO PRONTO PER PEC
  const testoCompleto = `${intestazione}

${corpo}

${impianto}

${contatto}

${chiusuraFirma}`;

  return {
    oggetto,
    intestazione,
    corpo,
    impianto,
    contatto,
    chiusuraFirma,
    testoCompleto,
  };
}

/**
 * Formats a match into a text file representation with distinct separated fields
 */
export function formatSeparatedFieldsTxt(match: Match, pec: PecOutput): string {
  const club = CLUBS[match.clubId];
  const dataGGMM = normalizeToGGMMMAAAA(match.data);
  return `================================================================================
RICHIESTA PEC FORZA PUBBLICA - GARA CASALINGA
Società: ${club.name}
Gara: ${match.squadraCasa} vs ${match.squadraOspite}
Data/Ora: ${dataGGMM} ore ${match.ora}
================================================================================

[CAMPO: OGGETTO MAIL]
${pec.oggetto}

--------------------------------------------------------------------------------
[CAMPO: INTESTAZIONE MAIL]
${pec.intestazione}

--------------------------------------------------------------------------------
[CAMPO: CORPO MAIL]
${pec.corpo}

--------------------------------------------------------------------------------
[CAMPO: IMPIANTO SPORTIVO]
${pec.impianto}

--------------------------------------------------------------------------------
[CAMPO: CONTATTO REFERENTE GARA]
${pec.contatto}

--------------------------------------------------------------------------------
[CAMPO: CHIUSURA E FIRMA PRESIDENTE]
${pec.chiusuraFirma}

================================================================================
[TESTO INTEGRALE PEC - PRONTO PER L'INVIO]
================================================================================
OGGETTO: ${pec.oggetto}

${pec.testoCompleto}
================================================================================
`;
}

/**
 * Downloads a string as a text file
 */
export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Builds mailto: link for desktop mail clients
 */
import JSZip from 'jszip';

/**
 * Downloads all drafts as a ZIP archive of individual .txt files with separated fields
 */
export async function downloadAllDraftsAsZip(matches: Match[], useDynamicAsdName: boolean = true): Promise<void> {
  const homeMatches = matches.filter(m => m.isHome);
  if (homeMatches.length === 0) return;

  const zip = new JSZip();
  const folder = zip.folder('bozze_pec_forza_pubblica');

  homeMatches.forEach((match, idx) => {
    const pec = generatePecForMatch(match, useDynamicAsdName);
    const content = formatSeparatedFieldsTxt(match, pec);
    const safeDate = match.data.replace(/[^0-9]/g, '-');
    const safeHome = match.squadraCasa.replace(/[^a-zA-Z0-9]/g, '_');
    const safeAway = match.squadraOspite.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Bozza_${String(idx + 1).padStart(2, '0')}_${match.clubId}_${safeDate}_${safeHome}_vs_${safeAway}.txt`;
    folder?.file(filename, content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Tutte_le_Bozze_PEC_ForzaPubblica_${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function createMailtoLink(pecEmail: string, subject: string, body: string): string {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `mailto:${pecEmail}?subject=${encodedSubject}&body=${encodedBody}`;
}

