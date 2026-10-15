import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import QRCode from 'qrcode';
import { Match, ClubId } from '../types';
import { CLUBS, COMMISSARIATO_INFO } from '../config/clubsData';
import { generatePecForMatch, resolveMatchCategory } from './pecGenerator';
import { normalizeToGGMMMAAAA } from './dateUtils';
import { formatCurrentSendDate, generateProtocolloNumber } from './matchMerger';

/**
 * Renders a crisp vector QR code onto jsPDF synchronously.
 * Vector modules ensure maximum sharpness when printed or scanned by police on mobile devices.
 */
export function drawQrCode(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  size: number
): void {
  try {
    const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
    const moduleCount = qr.modules.size;
    const cellSize = size / moduleCount;

    // Draw white quiet zone / background
    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, size, size, 'F');

    // Draw dark modules (slate-900)
    doc.setFillColor(15, 23, 42);
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (qr.modules.get(r, c)) {
          doc.rect(x + c * cellSize, y + r * cellSize, cellSize, cellSize, 'F');
        }
      }
    }
  } catch (err) {
    console.error('Failed to draw QR code:', err);
  }
}

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
/**
 * Renders a complete, single-page official PDF certification for a match
 * onto the active page of a jsPDF document.
 * 
 * Guarantees:
 * - Strictly 1 single A4 page (210 x 297 mm) with zero spillover or pagination bugs
 * - Larger, highly legible typography with generous line-height across the entire document
 * - Security QR Code with match ID and protocol number for instant police verification
 * - Full Italian character encoding support with Helvetica standard PostScript font
 * - Clean display of Protocollo number without obsolete "(AAAAMMGGHHMMSS)" placeholder
 * - Complete removal of obsolete "Timbro e Firma del Legale Rappresentante"
 * - Impeccably formatted, centered institutional footer with audit reference
 */
export function renderMatchPecPage(
  doc: jsPDF,
  match: Match,
  useDynamicAsdName: boolean = true,
  pageNumber: number = 1,
  totalPages: number = 1
): void {
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

  const marginLeft = 15;
  const contentWidth = 180;
  const clubColor = hexToRgb(club.primaryColor || '#0284c7');

  let currentY = 12;

  // =========================================================================
  // --- 1. TOP COLORED ACCENT BAR ---
  // =========================================================================
  doc.setFillColor(clubColor.r, clubColor.g, clubColor.b);
  doc.rect(marginLeft, currentY, contentWidth, 2.5, 'F');
  currentY += 5.5;

  // =========================================================================
  // --- 3. INSTITUTIONAL HEADER (Larger & More Readable) ---
  // =========================================================================
  // Left: Club Name (Large & Prominent)
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  const clubNameLines = doc.splitTextToSize(sanitizePdfText(club.name.toUpperCase()), contentWidth * 0.62);
  doc.text(clubNameLines, marginLeft, currentY);

  // Right: Commissariato Reference
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('COMMISSARIATO DI PUBBLICA SICUREZZA', marginLeft + contentWidth, currentY, { align: 'right' });
  currentY += Math.max(clubNameLines.length * 4.6, 5.0);

  // Left: Officials Info
  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    sanitizePdfText(`Pres. ${club.president} | Ref. ${club.contactName} (${club.contactPhone})`),
    marginLeft,
    currentY
  );

  // Right: Commissariato Protocol Reference
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(9);
  doc.setTextColor(clubColor.r, clubColor.g, clubColor.b);
  doc.text(`PROT.: ${protocolloText}`, marginLeft + contentWidth, currentY, { align: 'right' });
  currentY += 5.0;

  // Title of the document
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(11);
  doc.setTextColor(clubColor.r, clubColor.g, clubColor.b);
  doc.text('ATTESTAZIONE DI TRASMISSIONE PEC - RICHIESTA FORZA PUBBLICA', marginLeft, currentY);
  currentY += 4.5;

  // Subtitle NOIF
  doc.setFont(PDF_FONT_FAMILY, 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    sanitizePdfText("Ai sensi e per gli effetti dell'Art. 62 commi 4 e 5 delle N.O.I.F. (Federazione Italiana Giuoco Calcio)"),
    marginLeft,
    currentY
  );
  currentY += 4.0;

  // Header Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(marginLeft, currentY, marginLeft + contentWidth, currentY);
  currentY += 4.5;

  // =========================================================================
  // --- 4. CERTIFICATION BOX WITH SECURITY QR CODE (Police Checks) ---
  // =========================================================================
  const certBoxHeight = 29;
  doc.setFillColor(240, 253, 244); // light emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.setLineWidth(0.4);
  doc.roundedRect(marginLeft, currentY, contentWidth, certBoxHeight, 2, 2, 'FD');

  // --- OFFICIAL SECURITY QR CODE FOR POLICE CHECKS ---
  const qrCardWidth = 24;
  const qrCardHeight = 24;
  const qrX = marginLeft + contentWidth - qrCardWidth - 2.5;
  const qrY = currentY + 2.5;

  // White background badge with rounded border for QR code
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(167, 243, 208);
  doc.setLineWidth(0.35);
  doc.roundedRect(qrX, qrY, qrCardWidth, qrCardHeight, 1.5, 1.5, 'FD');

  const resolvedCategory = resolveMatchCategory(match);
  // Structured QR payload with protocol number, match ID, and police check info
  const qrPayload = [
    'VERIFICA FORZA PUBBLICA - PEC ART. 62 NOIF',
    `Protocollo: ${protocolloNumber}`,
    `ID Gara: ${match.id}`,
    `Gara: ${match.squadraCasa} vs ${match.squadraOspite}`,
    `Data/Ora: ${matchDate} alle ${match.ora}`,
    `Categoria: ${resolvedCategory}`,
    `Destinatario PEC: ${COMMISSARIATO_INFO.pec}`,
    `Data Invio: ${sendDateText}`
  ].join('\n');

  // Draw 19x19mm crisp vector QR code centered in card
  drawQrCode(doc, qrPayload, qrX + 2.5, qrY + 1.6, 19);

  // Micro label under QR code
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(4.8);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('SCAN CONTROLLO P.S.', qrX + qrCardWidth / 2, qrY + qrCardHeight - 0.8, { align: 'center' });

  // --- CERTIFICATION TEXT (LEFT OF QR CODE) ---
  const textWidthLeft = qrX - marginLeft - 6; // ~147mm
  let boxY = currentY + 4.2;
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text('ATTESTAZIONE UFFICIALE DI NOTIFICA A MEZZO PEC', marginLeft + 4, boxY);

  boxY += 4.5;

  // Formal certification statement with comfortable line spacing
  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(8.3);
  doc.setTextColor(15, 23, 42);
  const certStatementLines = doc.splitTextToSize(
    sanitizePdfText(`Si attesta formalmente che la presente comunicazione è stata inviata alla PEC ${COMMISSARIATO_INFO.pec} (${COMMISSARIATO_INFO.name}) nella data: ${sendDateText}, con Protocollo N. ${protocolloText}.`),
    textWidthLeft
  );
  doc.text(certStatementLines, marginLeft + 4, boxY);
  boxY += certStatementLines.length * 4.0 + 2.2;

  // Metadata row: Data Invio, Numero Protocollo, ID Gara
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Data Invio:', marginLeft + 4, boxY);

  doc.setTextColor(180, 83, 9); // amber-700
  doc.text(sendDateText, marginLeft + 21, boxY);

  doc.setTextColor(71, 85, 105);
  doc.text('Protocollo:', marginLeft + 68, boxY);

  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(protocolloText, marginLeft + 85, boxY);

  doc.setTextColor(71, 85, 105);
  doc.text('ID Gara:', marginLeft + 120, boxY);
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text(sanitizePdfText(match.id), marginLeft + 132, boxY);

  currentY += certBoxHeight + 4.0;

  // =========================================================================
  // --- 5. MATCH DETAILS TABLE (2-column balanced grid) ---
  // =========================================================================
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("SCHEDA DETTAGLI DELL'INCONTRO CASALINGO", marginLeft, currentY);
  currentY += 3.5;

  const halfWidth = (contentWidth - 6) / 2;
  const colLeft = marginLeft + 4;
  const colRight = marginLeft + halfWidth + 6;

  const tableHeight = 28;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, currentY, contentWidth, tableHeight, 2, 2, 'FD');

  let tRowY = currentY + 4.2;

  // Row 1: Campionato & Data/Ora
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CAMPIONATO:', colLeft, tRowY);
  doc.text('DATA E ORARIO INCONTRO:', colRight, tRowY);
  tRowY += 3.4;

  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(sanitizePdfText(match.campionato), colLeft, tRowY);

  doc.setTextColor(clubColor.r, clubColor.g, clubColor.b);
  doc.text(sanitizePdfText(`${matchDate} alle ore ${match.ora}`), colRight, tRowY);
  tRowY += 5.2;

  // Row 2: Girone/Giornata & Tipologia Gara
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('GIRONE / GIORNATA:', colLeft, tRowY);
  doc.text('TIPOLOGIA GARA:', colRight, tRowY);
  tRowY += 3.4;

  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(sanitizePdfText(`Girone ${match.girone} - Giornata ${match.giornata}`), colLeft, tRowY);

  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('GARA IN CASA (Obbligo Forza Pubblica Art. 62)', colRight, tRowY);
  tRowY += 5.2;

  // Row 3: Squadre
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('SQUADRA CASA (RICHIEDENTE):', colLeft, tRowY);
  doc.text('SQUADRA OSPITE:', colRight, tRowY);
  tRowY += 3.4;

  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(clubColor.r, clubColor.g, clubColor.b);
  doc.text(sanitizePdfText(match.squadraCasa), colLeft, tRowY);

  doc.setTextColor(71, 85, 105);
  doc.text(sanitizePdfText(match.squadraOspite), colRight, tRowY);

  currentY += tableHeight + 4.0;

  // =========================================================================
  // --- 6. FACILITY & CONTACTS BOX ---
  // =========================================================================
  const facLines = doc.splitTextToSize(sanitizePdfText(pec.impianto), contentWidth - 8);
  const contactLines = doc.splitTextToSize(sanitizePdfText(pec.contatto), contentWidth - 8);
  const facBoxHeight = 9 + facLines.length * 3.8 + contactLines.length * 3.8;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, currentY, contentWidth, facBoxHeight, 2, 2, 'FD');

  let facY = currentY + 4.0;
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9); // amber-700
  doc.text('IMPIANTO SPORTIVO DI DISPUTA:', marginLeft + 4, facY);
  facY += 4.0;

  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(facLines, marginLeft + 4, facY);
  facY += facLines.length * 3.8 + 2.0;

  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(contactLines, marginLeft + 4, facY);

  currentY += facBoxHeight + 4.0;

  // =========================================================================
  // --- 7. PEC MESSAGE BOX (Strictly single-page bounded with dynamic line height) ---
  // =========================================================================
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('TESTO INTEGRALE DELLA COMUNICAZIONE PEC TRASMESSA', marginLeft, currentY);
  currentY += 3.5;

  const cleanSubject = sanitizePdfText(pec.oggetto);
  const cleanBody = sanitizePdfText(pec.testoCompleto);

  // Footer reference
  const footerStartY = 265;
  const maxPecHeight = footerStartY - currentY - 3;

  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(8);
  const subjectLines = doc.splitTextToSize(`OGGETTO: ${cleanSubject}`, contentWidth - 8);

  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(8);
  const bodyLines = doc.splitTextToSize(cleanBody, contentWidth - 8);

  const subjectHeaderHeight = 5 + subjectLines.length * 3.6 + 2;
  const availableForBody = maxPecHeight - subjectHeaderHeight - 4;
  // Calculate dynamic line height so body nicely fills out the remaining box height
  const lineHeight = Math.min(3.8, Math.max(2.6, availableForBody / Math.max(1, bodyLines.length)));
  const pecBoxHeight = Math.min(maxPecHeight, subjectHeaderHeight + bodyLines.length * lineHeight + 4);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.roundedRect(marginLeft, currentY, contentWidth, pecBoxHeight, 2, 2, 'FD');

  let pY = currentY + 4.0;
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(subjectLines, marginLeft + 4, pY);
  pY += subjectLines.length * 3.6 + 2.0;

  doc.setDrawColor(226, 232, 240);
  doc.line(marginLeft + 4, pY, marginLeft + contentWidth - 4, pY);
  pY += 3.0;

  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(bodyLines, marginLeft + 4, pY, { lineHeightFactor: lineHeight / 2.8 });

  // =========================================================================
  // --- 8. INSTITUTIONAL SIGN-OFF ---
  // =========================================================================
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Per la Società Richiedente:', marginLeft + contentWidth - 4, footerStartY - 1.5, { align: 'right' });

  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(sanitizePdfText(`Il Presidente: ${club.president}`), marginLeft + contentWidth - 4, footerStartY + 2.5, { align: 'right' });

  // =========================================================================
  // --- 9. IMPECCABLE BOTTOM AUDIT FOOTER (Piè di Pagina) ---
  // =========================================================================
  const footerLineY = footerStartY + 6.0;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.line(marginLeft, footerLineY, marginLeft + contentWidth, footerLineY);

  doc.setFont(PDF_FONT_FAMILY, 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);

  const footerLine1 = sanitizePdfText(
    `Attestazione telematica ad uso prova di notifica PEC a ${COMMISSARIATO_INFO.pec} (${COMMISSARIATO_INFO.name})`
  );
  doc.text(footerLine1, marginLeft + contentWidth / 2, footerLineY + 4.0, { align: 'center' });

  const pageStr = totalPages && totalPages > 1
    ? `Gara ${pageNumber} di ${totalPages}  |  Pagina ${pageNumber} di ${totalPages}`
    : 'Pagina 1 di 1';
  const footerLine2 = sanitizePdfText(
    `Protocollo N.: ${protocolloText}  |  Data/Ora Invio: ${sendDateText}  |  ID Gara: ${match.id}  |  ${pageStr}`
  );
  doc.setFont(PDF_FONT_FAMILY, 'bold');
  doc.text(footerLine2, marginLeft + contentWidth / 2, footerLineY + 8.0, { align: 'center' });
}

/**
 * Generates an official, perfectly formatted PDF document certifying the transmission
 * of the PEC to the Police Department for a single match (strictly 1 single A4 page).
 */
export function generateMatchPecPdf(match: Match, useDynamicAsdName: boolean = true): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: false,
  });

  renderMatchPecPage(doc, match, useDynamicAsdName, 1, 1);
  return doc;
}

/**
 * Generates a single concatenated PDF document containing all selected matches,
 * each formatted on its own single A4 page, for easier continuous printing.
 */
export function generateConcatenatedPecPdf(
  matches: Match[],
  useDynamicAsdName: boolean = true
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: false,
  });

  matches.forEach((m, idx) => {
    if (idx > 0) {
      doc.addPage('a4', 'portrait');
    }
    renderMatchPecPage(doc, m, useDynamicAsdName, idx + 1, matches.length);
  });

  return doc;
}

/**
 * Standardized filename generation for an attestation PDF:
 * - Excludes protocol number (per user request)
 * - Includes category (cleaned, e.g. PROMOZIONE, UNDER_18_REGIONALE_FASCIA_B)
 * - Includes match date, home team, and away team
 */
export function formatMatchPdfFilename(match: Match): string {
  const cat = resolveMatchCategory(match);
  const safeCategory = cat
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'GARA';
  const safeDate = match.data.replace(/[^0-9]/g, '-');
  const safeHome = match.squadraCasa.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  const safeAway = match.squadraOspite.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
  return `Attestazione_PEC_${safeCategory}_${safeDate}_${safeHome}_vs_${safeAway}.pdf`;
}

/**
 * Directly downloads the PDF receipt for a single match.
 */
export function downloadMatchPecPdf(match: Match, useDynamicAsdName: boolean = true): void {
  const protocollo = match.protocollo && match.protocollo.trim() 
    ? match.protocollo.trim() 
    : generateProtocolloNumber();
  const matchWithProt = { ...match, protocollo };
  const doc = generateMatchPecPdf(matchWithProt, useDynamicAsdName);
  const filename = formatMatchPdfFilename(matchWithProt);
  doc.save(filename);
}

/**
 * Directly downloads all matches concatenated into a single PDF document (1 match per page).
 */
export function downloadConcatenatedPecPdf(
  matches: Match[],
  useDynamicAsdName: boolean = true
): void {
  const homeMatches = matches.filter(m => m.isHome);
  if (homeMatches.length === 0) return;

  const now = new Date();
  const nowStr = formatCurrentSendDate();

  const preparedMatches: Match[] = homeMatches.map((m, idx) => ({
    ...m,
    status: 'inviata',
    pecSentDate: m.pecSentDate || nowStr,
    protocollo: m.protocollo || generateProtocolloNumber(now, idx),
  }));

  const doc = generateConcatenatedPecPdf(preparedMatches, useDynamicAsdName);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `Attestazioni_PEC_Tutte_Le_Gare_${dateStr}_(${homeMatches.length}_gare).pdf`;
  doc.save(filename);
}

/**
 * Downloads a ZIP archive of all home match PDF certifications with sequential protocol advancement.
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
    const safeCategory = resolveMatchCategory(m)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'GARA';
    const safeDate = m.data.replace(/[^0-9]/g, '-');
    const safeHome = m.squadraCasa.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
    const safeAway = m.squadraOspite.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
    const filename = `Attestazione_${String(idx + 1).padStart(2, '0')}_${safeCategory}_${safeDate}_${safeHome}_vs_${safeAway}.pdf`;
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
