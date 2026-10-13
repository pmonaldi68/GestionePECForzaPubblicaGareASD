import React from 'react';
import { X, Building2, User, Phone, ShieldCheck, Mail, MapPin } from 'lucide-react';
import { CLUBS, CATEGORY_FACILITY_RULES, COMMISSARIATO_INFO } from '../config/clubsData';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  useDynamicAsdName: boolean;
  onToggleDynamicAsdName: (val: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  useDynamicAsdName,
  onToggleDynamicAsdName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">
              Configurazione Società & Commissariato di P.S.
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          {/* Commissariato Info Box */}
          <div className="border border-blue-200 bg-blue-50/60 rounded-xl p-4 space-y-2">
            <h3 className="font-bold text-sm text-blue-950 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-blue-600" />
              <span>Destinatario Istituzionale PEC</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div>
                <span className="font-semibold text-blue-900 block">Autorità di Pubblica Sicurezza:</span>
                <span className="text-blue-800">{COMMISSARIATO_INFO.name}</span>
              </div>
              <div>
                <span className="font-semibold text-blue-900 block">Indirizzo PEC Ufficiale:</span>
                <span className="font-mono text-blue-950 font-bold select-all">{COMMISSARIATO_INFO.pec}</span>
              </div>
              <div>
                <span className="font-semibold text-blue-900 block">Indirizzo:</span>
                <span className="text-blue-800">{COMMISSARIATO_INFO.address}</span>
              </div>
              <div>
                <span className="font-semibold text-blue-900 block">Telefono Centralino:</span>
                <span className="text-blue-800">{COMMISSARIATO_INFO.telephone}</span>
              </div>
            </div>
          </div>

          {/* Setting: Dynamic vs Static ASD Name in Header */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
            <h3 className="font-bold text-slate-900">Formulazione Intestazione PEC</h3>
            <p className="text-slate-600 leading-relaxed">
              Scegli se inserire nell'intestazione la specifica ASD che gioca in casa oppure la sola Cynthia 1920:
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-300 bg-white cursor-pointer hover:bg-slate-50 flex-1">
                <input
                  type="radio"
                  name="asdHeader"
                  checked={useDynamicAsdName}
                  onChange={() => onToggleDynamicAsdName(true)}
                  className="w-4 h-4 text-blue-600 border-slate-300"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Dinamica (Consigliata)</span>
                  <span className="text-[11px] text-slate-500">
                    Usa il nome esatto dell'ASD di appartenenza per ciascuna gara.
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-300 bg-white cursor-pointer hover:bg-slate-50 flex-1">
                <input
                  type="radio"
                  name="asdHeader"
                  checked={!useDynamicAsdName}
                  onChange={() => onToggleDynamicAsdName(false)}
                  className="w-4 h-4 text-blue-600 border-slate-300"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Fissa CYNTHIA 1920</span>
                  <span className="text-[11px] text-slate-500">
                    Usa sempre "ASSOCIAZIONE SPORTIVA DILETTANTISTICA CYNTHIA 1920".
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* ASD Clubs & Category Facility Matrix */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-900">
              Regole Assegnazione Impianti, Referenti e Presidenti
            </h3>

            <div className="space-y-3">
              {Object.values(CLUBS).map(club => {
                const clubRules = CATEGORY_FACILITY_RULES.filter(r => r.clubId === club.id);
                return (
                  <div key={club.id} className="border border-slate-200 rounded-xl p-4 bg-white space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: club.primaryColor }}
                        />
                        <h4 className="font-bold text-slate-900 text-sm">{club.name}</h4>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Presidente: <strong className="text-slate-800">{club.president}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Referente Gara: <strong className="text-slate-800">{club.contactName}</strong> 📞 {club.contactPhone}</span>
                    </div>

                    <div className="pt-1">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Impianti Disputa Gare per Categoria:
                      </span>
                      <div className="space-y-1">
                        {clubRules.map((rule, idx) => (
                          <div key={idx} className="bg-slate-50 p-2 rounded text-[11px] border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <span className="font-semibold text-slate-800">{rule.category}</span>
                            <span className="text-slate-600 italic sm:text-right">{rule.facilityName} ({rule.facilityAddress})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
