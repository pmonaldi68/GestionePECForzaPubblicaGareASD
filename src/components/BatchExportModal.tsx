import React, { useState } from 'react';
import JSZip from 'jszip';
import { 
  X, 
  Download, 
  Archive, 
  FileText, 
  Table, 
  Check, 
  AlertCircle, 
  FileCheck2, 
  Printer, 
  Zap, 
  CheckCircle2, 
  Calendar 
} from 'lucide-react';
import { Match } from '../types';
import { CLUBS, COMMISSARIATO_INFO } from '../config/clubsData';
import { 
  generatePecForMatch, 
  formatSeparatedFieldsTxt, 
  downloadTextFile,
  resolveMatchCategory 
} from '../utils/pecGenerator';
import { generateMatchPecPdf, generateConcatenatedPecPdf } from '../utils/pdfGenerator';
import { formatCurrentSendDate, generateProtocolloNumber } from '../utils/matchMerger';
import { normalizeToGGMMMAAAA, formatDateToGGMMMAAAA } from '../utils/dateUtils';

interface BatchExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Match[];
  onMarkMatchesAsSent: (matchIds: string[], sendDate?: string) => void;
  useDynamicAsdName: boolean;
}

export const BatchExportModal: React.FC<BatchExportModalProps> = ({
  isOpen,
  onClose,
  matches,
  onMarkMatchesAsSent,
  useDynamicAsdName,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => matches.map(m => m.id));
  const [autoMarkSent, setAutoMarkSent] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [quickActionFeedback, setQuickActionFeedback] = useState<string | null>(null);
  const [customQuickDate, setCustomQuickDate] = useState<string>('');
  const [localMarkedIds, setLocalMarkedIds] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const targetMatches = matches.filter(m => selectedIds.includes(m.id));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === matches.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(matches.map(m => m.id));
    }
  };

  // Quick Action: Mark all currently selected items as 'Inviata' with a single click
  const handleQuickMarkAllSelectedAsSent = () => {
    if (targetMatches.length === 0) return;
    const nowStr = formatCurrentSendDate();
    const dateToUse = customQuickDate.trim() || nowStr;
    onMarkMatchesAsSent(selectedIds, dateToUse);

    // Update local state map so labels immediately show "Inviata"
    const updated: Record<string, string> = { ...localMarkedIds };
    selectedIds.forEach(id => {
      updated[id] = dateToUse;
    });
    setLocalMarkedIds(updated);

    setQuickActionFeedback(
      `Operazione completata! ${targetMatches.length} ${targetMatches.length === 1 ? 'gara contrassegnata' : 'gare contrassegnate'} come "INVIATA" (Data: ${dateToUse})!`
    );
    setTimeout(() => setQuickActionFeedback(null), 5000);
  };

  // 1. Export Unified TXT File
  const handleExportUnifiedTxt = () => {
    if (targetMatches.length === 0) return;

    let output = `================================================================================
ARCHIVIO GENERAZIONE RICHIESTE PEC FORZA PUBBLICA - GARE IN CASA
Art. 62 commi 4 e 5 N.O.I.F. - Commissariato di Polizia di Stato
Destinatario: ${COMMISSARIATO_INFO.name} (${COMMISSARIATO_INFO.pec})
Generato il: ${formatDateToGGMMMAAAA(new Date())} alle ore ${new Date().toLocaleTimeString('it-IT')}
Totale gare incluse: ${targetMatches.length}
================================================================================\n\n`;

    targetMatches.forEach((m, idx) => {
      const pec = generatePecForMatch(m, useDynamicAsdName);
      const dataGGMM = normalizeToGGMMMAAAA(m.data);
      output += `\n################################################################################\n`;
      output += `GARA ${idx + 1} DI ${targetMatches.length}: ${m.squadraCasa} vs ${m.squadraOspite} (${dataGGMM} ore ${m.ora})\n`;
      if (m.pecSentDate) {
        output += `DATA INVIO PEC REGISTRATA: ${m.pecSentDate}\n`;
      }
      output += `################################################################################\n\n`;
      output += formatSeparatedFieldsTxt(m, pec);
      output += `\n\n`;
    });

    const filename = `Archivio_Campi_Separati_PEC_ForzaPubblica_${new Date().toISOString().slice(0, 10)}.txt`;
    downloadTextFile(filename, output);

    if (autoMarkSent) {
      onMarkMatchesAsSent(targetMatches.map(m => m.id));
    }
    setExportSuccess('File TXT unico generato e scaricato!');
    setTimeout(() => setExportSuccess(null), 3000);
  };

  // 2. Export ZIP Archive of Individual TXT Files
  const handleExportZip = async () => {
    if (targetMatches.length === 0) return;
    setIsExporting(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder('PEC_Forza_Pubblica_TXT');

      targetMatches.forEach(m => {
        const pec = generatePecForMatch(m, useDynamicAsdName);
        const content = formatSeparatedFieldsTxt(m, pec);
        const safeCategory = resolveMatchCategory(m)
          .replace(/[^a-zA-Z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '') || 'GARA';
        const safeDate = m.data.replace(/[^0-9]/g, '-');
        const safeHome = m.squadraCasa.replace(/[^a-zA-Z0-9]/g, '_');
        const safeAway = m.squadraOspite.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `PEC_${safeCategory}_${safeDate}_${safeHome}_vs_${safeAway}.txt`;
        folder?.file(filename, content);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Archivio_TXT_PEC_ForzaPubblica_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (autoMarkSent) {
        onMarkMatchesAsSent(targetMatches.map(m => m.id));
      }
      setExportSuccess('Archivio ZIP con tutti i file .TXT generato con successo!');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err: any) {
      alert(`Errore nella generazione dello ZIP: ${err?.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 3. Export ZIP Archive of Official PDF Certificates
  const handleExportPdfsZip = async () => {
    if (targetMatches.length === 0) return;
    setIsExporting(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder('Attestazioni_PEC_PDF');
      const now = new Date();
      const nowStr = formatCurrentSendDate();

      targetMatches.forEach((m, idx) => {
        // Ensure sent date and ordered sequential protocollo is populated on certificate
        const matchForPdf: Match = {
          ...m,
          status: 'inviata',
          pecSentDate: m.pecSentDate || nowStr,
          protocollo: m.protocollo || generateProtocolloNumber(now, idx),
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
        const filename = `Attestazione_PEC_${safeCategory}_${safeDate}_${safeHome}_vs_${safeAway}.pdf`;
        folder?.file(filename, pdfArrayBuffer);
      });

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Archivio_Attestazioni_PDF_PEC_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (autoMarkSent) {
        onMarkMatchesAsSent(targetMatches.map(m => m.id));
      }
      setExportSuccess('Archivio ZIP con tutte le attestazioni ufficiali PDF generato!');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err: any) {
      alert(`Errore nella generazione dell'archivio PDF: ${err?.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 3b. Export Single Concatenated PDF File (Each Match on its own A4 page)
  const handleExportConcatenatedPdf = () => {
    if (targetMatches.length === 0) return;
    setIsExporting(true);

    try {
      const now = new Date();
      const nowStr = formatCurrentSendDate();

      const preparedMatches: Match[] = targetMatches.map((m, idx) => ({
        ...m,
        status: 'inviata',
        pecSentDate: m.pecSentDate || nowStr,
        protocollo: m.protocollo || generateProtocolloNumber(now, idx),
      }));

      const doc = generateConcatenatedPecPdf(preparedMatches, useDynamicAsdName);
      const dateStr = new Date().toISOString().slice(0, 10);
      const categories = Array.from(new Set(targetMatches.map(m => resolveMatchCategory(m))));
      const catPrefix = categories.length === 1 
        ? `${categories[0].replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}_` 
        : '';
      const filename = `Attestazioni_PEC_${catPrefix}Tutte_Le_Gare_${dateStr}_(${targetMatches.length}_gare).pdf`;
      doc.save(filename);

      if (autoMarkSent) {
        onMarkMatchesAsSent(targetMatches.map(m => m.id));
      }
      setExportSuccess(`File PDF unico generato con successo (${targetMatches.length} pagine A4, 1 per gara)!`);
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err: any) {
      alert(`Errore nella generazione del PDF unico: ${err?.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 4. Export CSV with Separated Fields as Columns
  const handleExportCsv = () => {
    if (targetMatches.length === 0) return;

    const headers = [
      'Societa',
      'Categoria',
      'Campionato',
      'Girone',
      'Giornata',
      'Data',
      'Ora',
      'Squadra_Casa',
      'Squadra_Ospite',
      'Stato_PEC',
      'Data_Invio_PEC',
      'Destinatario_PEC',
      'OGGETTO_MAIL',
      'INTESTAZIONE_MAIL',
      'CORPO_MAIL',
      'IMPIANTO_SPORTIVO',
      'CONTATTO_REFERENTE',
      'CHIUSURA_E_FIRMA',
      'TESTO_COMPLETO_PEC',
    ];

    const escapeCsv = (str: string) => {
      const clean = (str || '').replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = targetMatches.map(m => {
      const club = CLUBS[m.clubId];
      const pec = generatePecForMatch(m, useDynamicAsdName);
      return [
        escapeCsv(club.name),
        escapeCsv(m.category),
        escapeCsv(m.campionato),
        escapeCsv(m.girone),
        escapeCsv(m.giornata),
        escapeCsv(normalizeToGGMMMAAAA(m.data)),
        escapeCsv(m.ora),
        escapeCsv(m.squadraCasa),
        escapeCsv(m.squadraOspite),
        escapeCsv(m.status),
        escapeCsv(m.pecSentDate || ''),
        escapeCsv(COMMISSARIATO_INFO.pec),
        escapeCsv(pec.oggetto),
        escapeCsv(pec.intestazione),
        escapeCsv(pec.corpo),
        escapeCsv(pec.impianto),
        escapeCsv(pec.contatto),
        escapeCsv(pec.chiusuraFirma),
        escapeCsv(pec.testoCompleto),
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Campi_Separati_PEC_ForzaPubblica_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (autoMarkSent) {
      onMarkMatchesAsSent(targetMatches.map(m => m.id));
    }
    setExportSuccess('File CSV con colonne separate esportato!');
    setTimeout(() => setExportSuccess(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Esporta Richieste PEC (Campi Separati e PDF)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-600 leading-relaxed">
            Scegli il formato con cui salvare o attestare le richieste per il Commissariato. Ciascun documento include i campi separati obbligatori, caratteri ad alta leggibilità, codice QR per controlli di polizia e l'attestazione formale di trasmissione alla PEC <strong>{COMMISSARIATO_INFO.pec}</strong>.
          </p>

          {/* ========================================================= */}
          {/* --- QUICK ACTIONS SECTION (1-Click Mark All As Sent) --- */}
          {/* ========================================================= */}
          <div className="rounded-xl border-2 border-emerald-300 bg-linear-to-r from-emerald-50 via-teal-50/70 to-emerald-50 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Zap className="w-4 h-4 fill-white text-emerald-100" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                      Azioni Rapide · Quick Actions
                    </h3>
                    <span className="text-[10px] bg-emerald-200/90 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                      1-Click
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-900/80 mt-0.5">
                    Contrassegna tutte le gare selezionate ({targetMatches.length} di {matches.length}) come <strong>"Inviata"</strong> con un solo clic, applicando la data odierna come data di invio predefinita e assegnando i numeri di protocollo.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center">
                <button
                  type="button"
                  onClick={handleQuickMarkAllSelectedAsSent}
                  disabled={targetMatches.length === 0}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer hover:shadow-md active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Segna Selezionate come Inviate ({targetMatches.length})</span>
                </button>
              </div>
            </div>

            {/* Quick Actions Details & Controls */}
            <div className="mt-3 pt-2.5 border-t border-emerald-200/70 flex flex-wrap items-center justify-between gap-2 text-[11px] text-emerald-800">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-emerald-950">Data Invio Predefinita:</span>
                <span className="bg-white/90 border border-emerald-300 px-2 py-0.5 rounded-md font-bold text-emerald-900 flex items-center gap-1 shadow-2xs">
                  <Calendar className="w-3 h-3 text-emerald-600" />
                  {customQuickDate.trim() || `Oggi, ${formatCurrentSendDate()}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const custom = prompt(
                      'Inserisci data e ora di invio PEC personalizzata (es. "15/10/2026 alle 10:30"):',
                      customQuickDate || formatCurrentSendDate()
                    );
                    if (custom !== null) {
                      setCustomQuickDate(custom);
                    }
                  }}
                  className="text-[10px] text-emerald-700 underline hover:text-emerald-950 font-medium cursor-pointer ml-1"
                >
                  {customQuickDate ? 'Modifica data' : 'Personalizza data'}
                </button>
                {customQuickDate && (
                  <button
                    type="button"
                    onClick={() => setCustomQuickDate('')}
                    className="text-[10px] text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    (Ripristina odierna)
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-white/80 border border-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md font-medium">
                  Da Inviare: <strong>{targetMatches.filter(m => m.status !== 'inviata' && !localMarkedIds[m.id]).length}</strong>
                </span>
                <span className="text-[10px] bg-white/80 border border-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md font-medium">
                  Già Inviate: <strong>{targetMatches.filter(m => m.status === 'inviata' || localMarkedIds[m.id]).length}</strong>
                </span>
              </div>
            </div>

            {quickActionFeedback && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-100/90 border border-emerald-300 text-xs text-emerald-900 font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{quickActionFeedback}</span>
              </div>
            )}
          </div>

          {/* Export Formats Cards: 5 formats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. File PDF Unico (Concatenato - 1 pagina per gara) - FEATURED */}
            <div className="p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 flex flex-col justify-between hover:border-indigo-300 transition-colors shadow-2xs">
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Printer className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-200/80 text-indigo-800 px-2 py-0.5 rounded-full">
                    Stampa Facile
                  </span>
                </div>
                <h3 className="text-xs font-bold text-indigo-950">PDF Unico (Tutte le Gare)</h3>
                <p className="text-[11px] text-indigo-900/80 mt-1">
                  Un solo documento PDF con tutte le attestazioni: ciascuna gara ha la sua pagina A4 dedicata, pronto per la stampa immediata.
                </p>
              </div>
              <button
                onClick={handleExportConcatenatedPdf}
                disabled={targetMatches.length === 0 || isExporting}
                className="mt-4 w-full py-2 px-3 text-xs font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Generazione in corso...' : `Scarica PDF Unico (${targetMatches.length} Pag.)`}</span>
              </button>
            </div>

            {/* 2. File PDF Ufficiali (ZIP) */}
            <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50/40 flex flex-col justify-between hover:border-red-300 transition-colors shadow-2xs">
              <div>
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center mb-2.5">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-red-950">Attestazioni PDF Singole (.ZIP)</h3>
                <p className="text-[11px] text-red-900/80 mt-1">
                  Genera un archivio .ZIP contenente ciascun file PDF separato per ogni gara casalinga con codice QR di verifica e protocollo.
                </p>
              </div>
              <button
                onClick={handleExportPdfsZip}
                disabled={targetMatches.length === 0 || isExporting}
                className="mt-4 w-full py-2 px-3 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isExporting ? 'Generazione PDF...' : 'Scarica Tutti i PDF (.ZIP)'}
              </button>
            </div>

            {/* 3. File TXT Unico */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div>
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2.5">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">File TXT Unificato</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Un unico file di testo strutturato con tutti i campi separati per ogni gara casalinga.
                </p>
              </div>
              <button
                onClick={handleExportUnifiedTxt}
                disabled={targetMatches.length === 0}
                className="mt-4 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Scarica File .TXT
              </button>
            </div>

            {/* 4. Archivio ZIP dei singoli TXT */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div>
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-2.5">
                  <Archive className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">Archivio TXT Singoli (.ZIP)</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Un archivio compresso con un singolo file .txt dedicato a ciascuna gara casalinga.
                </p>
              </div>
              <button
                onClick={handleExportZip}
                disabled={targetMatches.length === 0 || isExporting}
                className="mt-4 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isExporting ? 'Compressione...' : 'Scarica Singoli .TXT (.ZIP)'}
              </button>
            </div>

            {/* 5. Tabella CSV (Spans full width on sm screens if odd) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between hover:border-slate-300 transition-colors sm:col-span-2">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Table className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Tabella CSV / Excel</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tabella compatibile con Excel e Fogli Google con colonne separate per ciascun campo (Oggetto, Intestazione, Impianto, etc.).
                  </p>
                </div>
              </div>
              <button
                onClick={handleExportCsv}
                disabled={targetMatches.length === 0}
                className="mt-3 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Scarica File .CSV
              </button>
            </div>
          </div>

          {/* Options & Matches Selection Checklist */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-800">
                Gare Selezionate da Includere ({targetMatches.length} di {matches.length})
              </span>
              <button
                onClick={selectAll}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                {selectedIds.length === matches.length ? 'Deseleziona Tutte' : 'Seleziona Tutte'}
              </button>
            </div>

            {/* Match List Scrollbox */}
            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 text-xs">
              {matches.map((m, mIdx) => {
                const isChecked = selectedIds.includes(m.id);
                return (
                  <label
                    key={`${m.id}_${mIdx}`}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(m.id)}
                      className="w-3.5 h-3.5 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-800">{m.squadraCasa} vs {m.squadraOspite}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 font-medium">{resolveMatchCategory(m)}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">{m.data} {m.ora}</span>
                    {(m.status === 'inviata' || localMarkedIds[m.id]) && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded ml-auto flex items-center gap-1 font-medium">
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                        Inviata il {localMarkedIds[m.id] || m.pecSentDate || 'Data reg.'}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Checkbox Auto-mark as sent */}
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <input
                type="checkbox"
                id="autoSent"
                checked={autoMarkSent}
                onChange={e => setAutoMarkSent(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="autoSent" className="text-xs text-slate-700 cursor-pointer">
                Aggiorna automaticamente le gare selezionate con lo stato <strong>"PEC Inviata"</strong> e la data corrente
              </label>
            </div>
          </div>

          {exportSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportSuccess}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
