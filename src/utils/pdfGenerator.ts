import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { Match, ClubId } from '../types';
import { CLUBS, COMMISSARIATO_INFO } from '../config/clubsData';
import { generatePecForMatch } from './pecGenerator';
import { normalizeToGGMMMAAAA } from './dateUtils';
import { formatCurrentSendDate, generateProtocolloNumber } from './matchMerger';

// ==========================================
// EXPLICIT DOCUMENT DIMENSIONS & MARGINS (A4)
// Standard A4: 210 x 297 mm
// Strict Margins: 16 mm left/right, 15 mm top/bottom
// ==========================================
export const PAGE_WIDTH_MM = 210;
export const PAGE_HEIGHT_MM = 297;

export const MARGIN_LEFT_MM = 16;
export const MARGIN_RIGHT_MM = 16;
export const MARGIN_TOP_MM = 15;
export const MARGIN_BOTTOM_MM = 15;

export const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_LEFT_MM - MARGIN_RIGHT_MM; // Exactly 178 mm
export const CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - MARGIN_TOP_MM - MARGIN_BOTTOM_MM; // Exactly 267 mm

/**
 * Standard font configured for universal Italian text support.
 * Helvetica is the core standard PostScript / PDF font (compatible with Arial)
 * with native support for the full Italian accented character set (ISO-8859-1 / Latin-1).
 */
export const PDF_FONT_FAMILY = 'helvetica';

/**
 * Prepares and sanitizes text for standard PDF rendering.
 * - Fixes common UTF-8 double-encoding artifacts (mojibake like Ã¨, â€™)
 * - Converts curly quotes and typographic apostrophes to standard ASCII apostrophe
 * - Converts communication emojis (telephone, mobile, email) to clean text labels
 * - PRESERVES all genuine Italian accented vowels (à, è, é, ì, ò, ù, À, È, É, Ì, Ò, Ù) and symbols (°, €)
 * - Removes non-printable control characters while retaining standard printable ASCII and Latin-1 supplement
 */
export function sanitizePdfText(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .normalize('NFC')
    // 1. Repair common UTF-8 mojibake
    .replace(/Ã¨/g, 'è')
    .replace(/Ã©/g, 'é')
    .replace(/Ã /g, 'à')
    .replace(/Ã²/g, 'ò')
    .replace(/Ã¹/g, 'ù')
    .replace(/Ã¬/g, 'ì')
    .replace(/Ã€/g, 'À')
    .replace(/Ãˆ/g, 'È')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã’/g, 'Ò')
    .replace(/Ã™/g, 'Ù')
    .replace(/ÃŒ/g, 'Ì')
    .replace(/â€™/g, "'")
    .replace(/â€“/g, '-')
    .replace(/â€”/g, '-')
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    // 2. Remove variation selectors from emojis
    .replace(/\uFE0F/g, '')
    // 3. Replace communication emojis with clean text
    .replace(/[📞☎]/g, 'Tel. ')
    .replace(/[📱📲]/g, 'Cell. ')
    .replace(/📧/g, 'Email: ')
    // 4. Replace curly apostrophes & smart quotes with clean standard quotes
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u02BC']/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB"]/g, '"')
    // 5. Replace dashes and bullet points
    .replace(/[\u2013\u2014\u2015]/g, '-')
    .replace(/[\u2022\u25E6\u2023\u2043\u25AA\u25AB]/g, '-')
    .replace(/[\u00B7\u22C5]/g, '.')
    // 6. Clean newlines
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // 7. Retain standard ASCII printable + Latin-1 Supplement (0xA0-0xFF which includes à, è, é, ì, ò, ù, À, È, É, Ì, Ò, Ù, °)
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, ' ')
    // 8. Normalize spacing
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n');
}

/**
 * Converts HEX color to RGB object
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16) || 2,
    g: parseInt(clean.substring(2, 4), 16) || 132,
    b: parseInt(clean.substring(4, 6), 16) || 199,
  };
}

/**
 * Generates an official, perfectly formatted PDF document certifying the transmission
 * of the PEC to the Police Department (dipps172.5600@pecps.poliziadistato.it).
 * 
 * Features:
 * - Explicit A4 dimensions (210 x 297 mm) and margins (15 mm left/right, 14 mm top/bottom)
 * - Standard Helvetica font with full Italian accented character support (à, è, é, ì, ò, ù, etc.)
 * - Strict bounding boxes with dynamic word-wrapping (no text outside margins)
 * - Automatic pagination if the PEC message exceeds the single page boundary
 */
export function generateMatchPecPdf(match: Match, useDynamicAsdName: boolean = true): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: false,
  });

  const club = CLUBS[match.clubId] || CLUBS.CYNTHIA_1920;
  const pec = generatePecForMatch(match, useDynamicAsdName);
  const matchDate = normalizeToGGMMMAAAA(match.data);

  // Send date: formatted saved date or current fallback
  const rawSendDate = match.pecSentDate && match.pecSentDate.trim()
    ? match.pecSentDate
    : `${normalizeToGGMMMAAAA(new Date().toLocaleDateString('it-IT'))} alle ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
  const sendDateText = sanitizePdfText(rawSendDate);

  // Protocol number (format AAAAMMGGHHMMSS)
  const protocolloNumber = match.protocollo && match.protocollo.trim()
    ? match.protocollo.trim()
    : generateProtocolloNumber();
  const protocolloText = sanitizePdfText(protocolloNumber);

  const marginLeft = MARGIN_LEFT_MM;
  const contentWidth = CONTENT_WIDTH_MM;
  const pageHeight = PAGE_HEIGHT_MM;
  const marginBottom = MARGIN_BOTTOM_MM;
  const clubColor = hexToRgb(club.primaryColor || '#0284c7');

  let currentY = MARGIN_TOP_MM;

  // Helper to ensure page space or trigger clean pagination
  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - marginBottom - 22) {
      doc.addPage();
      currentY = MARGIN_TOP_MM;
      drawSubsequentHeader();
    }
  };

  const drawSubsequentHeader = () => {
    doc.setFillColor(clubColor.r, clubColor.g, clubColor.b);
    doc.rect(marginLeft, currentY, contentWidth, 2, 'F');
    currentY += 5;
    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      sanitizePdfText(`${club.name} - Attestazione PEC Forza Pubblica (Continua - Prot. ${protocolloText})`),
      marginLeft,
      currentY
    );
    currentY += 4.5;
    doc.setDrawColor(226, 232, 240);
    doc.line(marginLeft, currentY, marginLeft + contentWidth, currentY);
    currentY += 5;
  };

  // --- 1. TOP COLORED ACCENT BAR ---
  doc.setFillColor(clubColor.r, clubColor.g, clubColor.b);
  doc.rect(marginLeft, currentY, contentWidth, 3, 'F');
  currentY += 6.5;

  // --- 2. INSTITUTIONAL HEADER ---
  // Left: Club Name (wrapped to 60% of content width)
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42); // slate-900
  const clubNameLines = doc.splitTextToSize(sanitizePdfText(club.name.toUpperCase()), contentWidth * 0.58);
  doc.text(clubNameLines, marginLeft, currentY);

  // Right: Commissariato Reference
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('COMMISSARIATO DI PUBBLICA SICUREZZA', marginLeft + contentWidth, currentY, { align: 'right' });
  currentY += Math.max(clubNameLines.length * 4.2, 4.5);

  // Left: Officials Info
  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    sanitizePdfText(`Pres. ${club.president} | Ref. ${club.contactName} (${club.contactPhone})`),
    marginLeft,
    currentY
  );

  // Right: Commissariato City & Protocol Reference
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(2, 132, 199);
  doc.text(`PROT. REGISTRAZIONE: ${protocolloText}`, marginLeft + contentWidth, currentY, { align: 'right' });
  currentY += 4.5;

  // Title of the document
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(10);
  doc.setTextColor(2, 132, 199); // Blue accent
  doc.text('ATTESTAZIONE DI TRASMISSIONE PEC - RICHIESTA FORZA PUBBLICA', marginLeft, currentY);
  currentY += 4;

  // Subtitle
  doc.setFont(PDF_FONT_FAMILY, 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    sanitizePdfText("Ai sensi e per gli effetti dell'Art. 62 commi 4 e 5 delle N.O.I.F. (Federazione Italiana Giuoco Calcio)"),
    marginLeft,
    currentY
  );
  currentY += 4.5;

  // Header Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(marginLeft, currentY, marginLeft + contentWidth, currentY);
  currentY += 4.5;

  // --- 3. CERTIFICATION BOX (Green Institutional Box) ---
  const certBoxHeight = 30;
  doc.setFillColor(240, 253, 244); // light emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.setLineWidth(0.5);
  doc.roundedRect(marginLeft, currentY, contentWidth, certBoxHeight, 2, 2, 'FD');

  let boxY = currentY + 4.2;
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text('ATTESTAZIONE UFFICIALE DI NOTIFICA A MEZZO PEC', marginLeft + 4, boxY);

  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(16, 185, 129); // emerald-600
  doc.text(`PROTOCOLLO N. ${protocolloText}`, marginLeft + contentWidth - 4, boxY, { align: 'right' });
  boxY += 4.2;

  // Formal certification statement as explicitly requested
  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  const certStatementLines = doc.splitTextToSize(
    sanitizePdfText(`Si attesta formalmente che la presente comunicazione è stata inviata alla PEC ${COMMISSARIATO_INFO.pec} (${COMMISSARIATO_INFO.name}) nella data di invio: ${sendDateText}, con Protocollo Identificativo N. ${protocolloText}.`),
    contentWidth - 8
  );
  doc.text(certStatementLines, marginLeft + 4, boxY);
  boxY += certStatementLines.length * 3.4 + 2;

  // Metadata row
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Data Invio:', marginLeft + 4, boxY);

  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(sendDateText, marginLeft + 20, boxY);

  doc.setTextColor(71, 85, 105);
  doc.text('Numero Protocollo (AAAAMMGGHHMMSS):', marginLeft + 75, boxY);

  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(protocolloText, marginLeft + 138, boxY);

  currentY += certBoxHeight + 4.5;

  // --- 4. MATCH DETAILS TABLE (2-column balanced grid) ---
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("SCHEDA DETTAGLI DELL'INCONTRO CASALINGO", marginLeft, currentY);
  currentY += 3.2;

  const halfWidth = (contentWidth - 4) / 2;
  const colLeft = marginLeft + 4;
  const colRight = marginLeft + halfWidth + 4;

  const campLines = doc.splitTextToSize(sanitizePdfText(match.campionato), halfWidth - 6);
  const homeLines = doc.splitTextToSize(sanitizePdfText(match.squadraCasa), halfWidth - 6);
  const awayLines = doc.splitTextToSize(sanitizePdfText(match.squadraOspite), halfWidth - 6);

  const tableHeight = 36;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, currentY, contentWidth, tableHeight, 1.5, 1.5, 'FD');

  let tRowY = currentY + 4;

  // Row 1: Campionato & Data/Ora
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('CAMPIONATO:', colLeft, tRowY);
  doc.text('DATA E ORARIO INCONTRO:', colRight, tRowY);
  tRowY += 3.2;

  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(campLines[0] || '', colLeft, tRowY);

  doc.setTextColor(2, 132, 199);
  doc.text(sanitizePdfText(`${matchDate} alle ore ${match.ora}`), colRight, tRowY);
  tRowY += 5;

  // Row 2: Girone/Giornata & Tipologia Gara
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('GIRONE / GIORNATA:', colLeft, tRowY);
  doc.text('TIPOLOGIA GARA:', colRight, tRowY);
  tRowY += 3.2;

  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(sanitizePdfText(`Girone ${match.girone} - Giornata ${match.giornata}`), colLeft, tRowY);

  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('GARA IN CASA (Obbligo Forza Pubblica Art. 62)', colRight, tRowY);
  tRowY += 5;

  // Row 3: Squadre
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('SQUADRA CASA (RICHIEDENTE):', colLeft, tRowY);
  doc.text('SQUADRA OSPITE:', colRight, tRowY);
  tRowY += 3.2;

  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(2, 132, 199);
  doc.text(homeLines[0] || '', colLeft, tRowY);

  doc.setTextColor(71, 85, 105);
  doc.text(awayLines[0] || '', colRight, tRowY);

  currentY += tableHeight + 4.5;

  // --- 5. FACILITY & CONTACTS BOX ---
  const facLines = doc.splitTextToSize(sanitizePdfText(pec.impianto), contentWidth - 8);
  const contactLines = doc.splitTextToSize(sanitizePdfText(pec.contatto), contentWidth - 8);
  const facBoxHeight = 10 + facLines.length * 3.4 + contactLines.length * 3.4 + 4;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, currentY, contentWidth, facBoxHeight, 1.5, 1.5, 'FD');

  let facY = currentY + 4.2;
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text('IMPIANTO SPORTIVO DI DISPUTA:', marginLeft + 4, facY);
  facY += 3.8;

  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(facLines, marginLeft + 4, facY);
  facY += facLines.length * 3.4 + 2;

  // Contact line
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(contactLines, marginLeft + 4, facY);

  currentY += facBoxHeight + 4.5;

  // --- 6. PEC MESSAGE PREVIEW BOX (Strict Margin Bounded) ---
  ensureSpace(40);

  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('TESTO INTEGRALE DELLA COMUNICAZIONE PEC TRASMESSA', marginLeft, currentY);
  currentY += 3.2;

  const cleanSubject = sanitizePdfText(pec.oggetto);
  const cleanBody = sanitizePdfText(pec.testoCompleto);

  const subjectLines = doc.splitTextToSize(`OGGETTO: ${cleanSubject}`, contentWidth - 8);
  const bodyLines = doc.splitTextToSize(cleanBody, contentWidth - 8);

  const remainingPageHeight = pageHeight - currentY - marginBottom - 22;
  const neededPecHeight = 8 + subjectLines.length * 3.4 + 4 + bodyLines.length * 3.2 + 5;

  if (neededPecHeight <= remainingPageHeight) {
    // Fits on current page
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginLeft, currentY, contentWidth, neededPecHeight, 1.5, 1.5, 'FD');

    let pY = currentY + 4.2;
    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(subjectLines, marginLeft + 4, pY);
    pY += subjectLines.length * 3.4 + 2;

    doc.setDrawColor(226, 232, 240);
    doc.line(marginLeft + 4, pY, marginLeft + contentWidth - 4, pY);
    pY += 3.2;

    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(bodyLines, marginLeft + 4, pY);

    currentY += neededPecHeight + 5;
  } else {
    // Multi-page split: print first chunk, then continue on page 2
    const firstChunkCount = Math.max(4, Math.floor((remainingPageHeight - 14 - subjectLines.length * 3.4) / 3.2));
    const firstChunk = bodyLines.slice(0, firstChunkCount);
    const secondChunk = bodyLines.slice(firstChunkCount);

    const firstBoxHeight = 8 + subjectLines.length * 3.4 + 4 + firstChunk.length * 3.2 + 4;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginLeft, currentY, contentWidth, firstBoxHeight, 1.5, 1.5, 'FD');

    let pY = currentY + 4.2;
    doc.setFont(PDF_FONT_FAMILY, 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(subjectLines, marginLeft + 4, pY);
    pY += subjectLines.length * 3.4 + 2;

    doc.setDrawColor(226, 232, 240);
    doc.line(marginLeft + 4, pY, marginLeft + contentWidth - 4, pY);
    pY += 3.2;

    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(firstChunk, marginLeft + 4, pY);

    // Page 2
    doc.addPage();
    currentY = MARGIN_TOP_MM;
    drawSubsequentHeader();

    const secondBoxHeight = secondChunk.length * 3.2 + 8;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(marginLeft, currentY, contentWidth, secondBoxHeight, 1.5, 1.5, 'FD');

    doc.setFont(PDF_FONT_FAMILY, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(secondChunk, marginLeft + 4, currentY + 5);

    currentY += secondBoxHeight + 5;
  }

  // --- 7. SIGNATURE BLOCK & AUDIT FOOTER ---
  ensureSpace(20);

  const sigY = pageHeight - marginBottom - 14;
  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Per la Società Richiedente:", marginLeft + contentWidth - 65, sigY);

  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Il Presidente: ${sanitizePdfText(club.president)}`, marginLeft + contentWidth - 65, sigY + 4.5);

  // Left stamp area
  doc.setFont(PDF_FONT_FAMILY, 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Timbro e Firma del Legale Rappresentante', marginLeft, sigY + 4.5);

  // Bottom Audit Footer Line
  doc.setDrawColor(226, 232, 240);
  doc.line(marginLeft, pageHeight - marginBottom - 5, marginLeft + contentWidth, pageHeight - marginBottom - 5);

  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  const footerNote = sanitizePdfText(
    `Documento informatico ad uso prova invio PEC a ${COMMISSARIATO_INFO.pec}. Protocollo N.: ${protocolloText} - Data invio registrata: ${sendDateText}. ID Gara: ${match.id}`
  );
  doc.text(footerNote, marginLeft, pageHeight - marginBottom - 2);

  return doc;
}

/**
 * Directly downloads the PDF receipt for a match
 */
export function downloadMatchPecPdf(match: Match, useDynamicAsdName: boolean = true): void {
  const protocollo = match.protocollo && match.protocollo.trim() 
    ? match.protocollo.trim() 
    : generateProtocolloNumber();
  const matchWithProt = { ...match, protocollo };
  const doc = generateMatchPecPdf(matchWithProt, useDynamicAsdName);
  const safeDate = match.data.replace(/[^0-9]/g, '-');
  const safeHome = match.squadraCasa.replace(/[^a-zA-Z0-9]/g, '_');
  const safeAway = match.squadraOspite.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Attestazione_PEC_Prot_${protocollo}_${safeDate}_${safeHome}_vs_${safeAway}.pdf`;
  doc.save(filename);
}

/**
 * Downloads a ZIP archive of all home match PDF certifications with sequential protocol advancement
 */
export async function downloadAllPdfsAsZip(matches: Match[], useDynamicAsdName: boolean = true): Promise<void> {
  const homeMatches = matches.filter(m => m.isHome);
  if (homeMatches.length === 0) return;

  const zip = new JSZip();
  const folder = zip.folder('Attestazioni_PEC_PDF');
  const now = new Date();
  const nowStr = formatCurrentSendDate();

  homeMatches.forEach((m, idx) => {
    const protocollo = m.protocollo || generateProtocolloNumber(now, idx);
    const matchForPdf: Match = {
      ...m,
      status: 'inviata',
      pecSentDate: m.pecSentDate || nowStr,
      protocollo,
    };
    const doc = generateMatchPecPdf(matchForPdf, useDynamicAsdName);
    const pdfArrayBuffer = doc.output('arraybuffer');
    const safeDate = m.data.replace(/[^0-9]/g, '-');
    const safeClub = m.clubId;
    const safeHome = m.squadraCasa.replace(/[^a-zA-Z0-9]/g, '_');
    const safeAway = m.squadraOspite.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Attestazione_${String(idx + 1).padStart(2, '0')}_Prot_${protocollo}_${safeClub}_${safeDate}_${safeHome}_vs_${safeAway}.pdf`;
    folder?.file(filename, pdfArrayBuffer);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Archivio_Attestazioni_PEC_PDF_${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
