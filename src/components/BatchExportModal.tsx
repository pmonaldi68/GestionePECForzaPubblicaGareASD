import React, { useState } from 'react';
import JSZip from 'jszip';
import { X, Download, Archive, FileText, Table, Check, AlertCircle, FileCheck2 } from 'lucide-react';
import { Match } from '../types';
import { CLUBS, COMMISSARIATO_INFO } from '../config/clubsData';
import { 
  generatePecForMatch, 
  formatSeparatedFieldsTxt, 
  downloadTextFile 
} from '../utils/pecGenerator';
import { generateMatchPecPdf } from '../utils/pdfGenerator';
import { formatCurrentSendDate } from '../utils/matchMerger';
import { normalizeToGGMMMAAAA, formatDateToGGMMMAAAA } from '../utils/dateUtils';

interface BatchExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: Match[];
  onMarkMatchesAsSent: (matchIds: string[]) => void;
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
        const safeDate = m.data.replace(/[^0-9]/g, '-');
        const safeClub = m.clubId;
        const safeHome = m.squadraCasa.replace(/[^a-zA-Z0-9]/g, '_');
        const safeAway = m.squadraOspite.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${safeDate}_${safeClub}_${safeHome}_vs_${safeAway}.txt`;
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
      const nowStr = formatCurrentSendDate();

      targetMatches.forEach(m => {
        // Ensure sent date is populated on certificate
        const matchForPdf: Match = {
          ...m,
          status: 'inviata',
          pecSentDate: m.pecSentDate || nowStr,
        };

        const doc = generateMatchPecPdf(matchForPdf, useDynamicAsdName);
        const pdfArrayBuffer = doc.output('arraybuffer');
        const safeDate = m.data.replace(/[^0-9]/g, '-');
        const safeClub = m.clubId;
        const safeHome = m.squadraCasa.replace(/[^a-zA-Z0-9]/g, '_');
        const safeAway = m.squadraOspite.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `Attestazione_PEC_${safeDate}_${safeClub}_${safeHome}_vs_${safeAway}.pdf`;
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
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
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
            Scegli il formato con cui salvare o attestare le richieste per il Commissariato. Ciascun documento include i campi separati obbligatori e l'attestazione ufficiale di trasmissione alla PEC <strong>{COMMISSARIATO_INFO.pec}</strong>.
          </p>

          {/* Export Formats Cards: 4 formats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. File PDF Ufficiali (ZIP) */}
            <div className="p-4 rounded-xl border-2 border-red-200 bg-red-50/40 flex flex-col justify-between hover:border-red-300 transition-colors shadow-2xs">
              <div>
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center mb-2.5">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-red-950">Attestazioni PDF (.ZIP)</h3>
                <p className="text-[11px] text-red-900/80 mt-1">
                  Genera i documenti PDF ufficiali con data di invio e attestazione di avvenuta trasmissione a {COMMISSARIATO_INFO.pec}.
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

            {/* 2. File TXT Unico */}
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

            {/* 3. Archivio ZIP dei singoli TXT */}
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

            {/* 4. Tabella CSV */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between hover:border-slate-300 transition-colors">
              <div>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-2.5">
                  <Table className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">Tabella CSV / Excel</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tabella con colonne separate per ciascun campo (Oggetto, Intestazione, Impianto, etc.).
                </p>
              </div>
              <button
                onClick={handleExportCsv}
                disabled={targetMatches.length === 0}
                className="mt-4 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
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
                    <span className="text-slate-500">{m.category}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">{m.data} {m.ora}</span>
                    {m.status === 'inviata' && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1 rounded ml-auto">
                        Inviata il {m.pecSentDate || 'Data reg.'}
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
