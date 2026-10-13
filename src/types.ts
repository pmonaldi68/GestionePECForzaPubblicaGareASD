export type ClubId = 
  | 'CYNTHIA_1920'
  | 'ACADEMY_CYNTHIA'
  | 'PGS_DON_BOSCO'
  | 'ALBACYNTHIA';

export interface ClubInfo {
  id: ClubId;
  name: string;
  shortName: string;
  primaryColor: string;
  badgeText: string;
  president: string;
  contactName: string;
  contactPhone: string;
  aliases: string[];
}

export interface CategoryFacilityRule {
  clubId: ClubId;
  category: string;
  facilityText: string;
  facilityName: string;
  facilityAddress: string;
  aliases: string[];
}

export interface Match {
  id: string;
  clubId: ClubId;
  campionato: string;
  girone: string;
  giornata: string;
  data: string;
  ora: string;
  squadraCasa: string;
  squadraOspite: string;
  isHome: boolean;
  facilityText: string;
  category: string;
  status: 'da_inviare' | 'inviata' | 'annullata';
  pecSentDate?: string;
  notes?: string;
  rawRowIndex?: number;
}

export interface PecOutput {
  oggetto: string;
  intestazione: string;
  corpo: string;
  impianto: string;
  contatto: string;
  chiusuraFirma: string;
  testoCompleto: string;
}

export interface ColumnMapping {
  campionatoCol: number; // Default 2 (col C)
  gironeCol: number;      // Default 3 (col D)
  giornataCol: number;    // Default 4 (col E)
  dataCol: number;        // Default 5 (col F)
  oraCol: number;         // Default 6 (col G)
  squadraCasaCol: number; // Default 7 (col H)
  squadraOspiteCol: number;// Default 8 (col I)
  societaCol?: number;    // Optional col A or B
  categoriaCol?: number;  // Optional col A or B
}
