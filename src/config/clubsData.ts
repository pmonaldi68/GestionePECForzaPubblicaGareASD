import { ClubId, ClubInfo, CategoryFacilityRule } from '../types';

export const CLUBS: Record<ClubId, ClubInfo> = {
  CYNTHIA_1920: {
    id: 'CYNTHIA_1920',
    name: 'CYNTHIA 1920',
    shortName: 'Cynthia 1920',
    primaryColor: '#0284c7', // Sky Blue
    badgeText: 'CYNTHIA 1920',
    president: "D'AURIA ANTONIO",
    contactName: 'MONALDI PAOLO',
    contactPhone: '3289684700',
    aliases: ['CYNTHIA 1920', 'CYNTHIA', 'ASD CYNTHIA', 'CYNTHIA 1920 S.R.L.', 'CYNTHIA GENZANO'],
  },
  ACADEMY_CYNTHIA: {
    id: 'ACADEMY_CYNTHIA',
    name: 'ACADEMY CYNTHIA GENZANO',
    shortName: 'Academy Cynthia',
    primaryColor: '#059669', // Emerald
    badgeText: 'ACADEMY CYNTHIA',
    president: 'AMICI DAMIANO',
    contactName: 'MONALDI PAOLO',
    contactPhone: '3289684700',
    aliases: ['ACADEMY CYNTHIA GENZANO', 'ACADEMY CYNTHIA', 'AC. CYNTHIA', 'ACADEMY CYNTHIA CALCIO'],
  },
  PGS_DON_BOSCO: {
    id: 'PGS_DON_BOSCO',
    name: 'P.G.S. DON BOSCO GENZANO',
    shortName: 'PGS Don Bosco',
    primaryColor: '#d97706', // Amber
    badgeText: 'PGS DON BOSCO',
    president: 'GABBARINI GIANCARLO',
    contactName: 'GABBARINI GIANCARLO',
    contactPhone: '3298622464',
    aliases: ['P.G.S. DON BOSCO GENZANO', 'P.G.S. DON BOSCO', 'PGS DON BOSCO', 'DON BOSCO GENZANO', 'DON BOSCO'],
  },
  ALBACYNTHIA: {
    id: 'ALBACYNTHIA',
    name: 'ALBACYNTHIA',
    shortName: 'Albacynthia',
    primaryColor: '#7c3aed', // Purple
    badgeText: 'ALBACYNTHIA',
    president: 'LEUTI SANDRO',
    contactName: 'MONALDI PAOLO',
    contactPhone: '3289684700',
    aliases: ['ALBACYNTHIA', 'ALBA CYNTHIA', 'ALBACYNTHIA CALCIO'],
  },
};

export const CATEGORY_FACILITY_RULES: CategoryFacilityRule[] = [
  // CYNTHIA 1920
  {
    clubId: 'CYNTHIA_1920',
    category: 'PROMOZIONE',
    facilityText: 'LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO BRUNO ABBATINI SITO IN VIA EMILIA ROMAGNA,GENZANO DI ROMA (RM).',
    facilityName: 'Impianto Bruno Abbatini',
    facilityAddress: 'Via Emilia Romagna, Genzano di Roma (RM)',
    aliases: ['PROMOZIONE', 'PROM', 'PROMOZIONE LAZIO'],
  },
  {
    clubId: 'CYNTHIA_1920',
    category: 'UNDER 18 REGIONALE FASCIA B',
    facilityText: "LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO CITTA' DELL'INFIORATA, SITO IN VIA SARDEGNA, 14,GENZANO DI ROMA (RM).",
    facilityName: "Impianto Città dell'Infiorata",
    facilityAddress: 'Via Sardegna 14, Genzano di Roma (RM)',
    aliases: ['UNDER 18 REGIONALE FASCIA B', 'UNDER 18 REGIONALE', 'UNDER 18', 'U18 REGIONALE', 'U18'],
  },
  {
    clubId: 'CYNTHIA_1920',
    category: 'UNDER 19 PROVINCIALE',
    facilityText: "LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO CITTA' DELL'INFIORATA, SITO IN VIA SARDEGNA, 14,GENZANO DI ROMA (RM).",
    facilityName: "Impianto Città dell'Infiorata",
    facilityAddress: 'Via Sardegna 14, Genzano di Roma (RM)',
    aliases: ['UNDER 19 PROVINCIALE', 'UNDER 19', 'JUNIORES PROVINCIALE', 'JUNIORES', 'U19 PROVINCIALE', 'U19'],
  },

  // ACADEMY CYNTHIA GENZANO
  {
    clubId: 'ACADEMY_CYNTHIA',
    category: 'UNDER 14 REGIONALI',
    facilityText: "LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO CITTA' DELL'INFIORATA, SITO IN VIA SARDEGNA, 14,GENZANO DI ROMA (RM).",
    facilityName: "Impianto Città dell'Infiorata",
    facilityAddress: 'Via Sardegna 14, Genzano di Roma (RM)',
    aliases: ['UNDER 14 REGIONALI', 'UNDER 14 REGIONALE', 'UNDER 14 REG', 'U14 REGIONALE', 'U14 REG'],
  },
  {
    clubId: 'ACADEMY_CYNTHIA',
    category: 'UNDER 17 PROVINCIALI',
    facilityText: "LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO CITTA' DELL'INFIORATA, SITO IN VIA SARDEGNA, 14,GENZANO DI ROMA (RM).",
    facilityName: "Impianto Città dell'Infiorata",
    facilityAddress: 'Via Sardegna 14, Genzano di Roma (RM)',
    aliases: ['UNDER 17 PROVINCIALI', 'UNDER 17 PROVINCIALE', 'UNDER 17', 'U17 PROVINCIALE', 'U17'],
  },
  {
    clubId: 'ACADEMY_CYNTHIA',
    category: 'UNDER 15 PROVINCIALI',
    facilityText: "LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO CITTA' DELL'INFIORATA, SITO IN VIA SARDEGNA, 14,GENZANO DI ROMA (RM).",
    facilityName: "Impianto Città dell'Infiorata",
    facilityAddress: 'Via Sardegna 14, Genzano di Roma (RM)',
    aliases: ['UNDER 15 PROVINCIALI', 'UNDER 15 PROVINCIALE', 'UNDER 15', 'U15 PROVINCIALE', 'U15'],
  },
  {
    clubId: 'ACADEMY_CYNTHIA',
    category: 'UNDER 16 PROVINCIALI',
    facilityText: "LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO CITTA' DELL'INFIORATA, SITO IN VIA SARDEGNA, 14,GENZANO DI ROMA (RM).",
    facilityName: "Impianto Città dell'Infiorata",
    facilityAddress: 'Via Sardegna 14, Genzano di Roma (RM)',
    aliases: ['UNDER 16 PROVINCIALI', 'UNDER 16 PROVINCIALE', 'UNDER 16', 'U16 PROVINCIALE', 'U16'],
  },
  {
    clubId: 'ACADEMY_CYNTHIA',
    category: '3CATEGORIA',
    facilityText: "LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO CITTA' DELL'INFIORATA, SITO IN VIA SARDEGNA, 14,GENZANO DI ROMA (RM).",
    facilityName: "Impianto Città dell'Infiorata",
    facilityAddress: 'Via Sardegna 14, Genzano di Roma (RM)',
    aliases: ['3CATEGORIA', '3^ CATEGORIA', '3 CATEGORIA', 'TERZA CATEGORIA', '3° CATEGORIA'],
  },
  {
    clubId: 'ACADEMY_CYNTHIA',
    category: 'SERIE D CA5 FEMMINILE',
    facilityText: 'LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO CYNTHIA TRAINING CENTER, VIA MONTEGIOVE 77,GENZANO DI ROMA (RM).',
    facilityName: 'Cynthia Training Center',
    facilityAddress: 'Via Montegiove 77, Genzano di Roma (RM)',
    aliases: ['SERIE D CA5 FEMMINILE', 'SERIE D C5 FEMMINILE', 'SERIE D CALCIO A 5 FEMMINILE', 'SERIE D FEMMINILE C5', 'C5 FEMMINILE SERIE D'],
  },

  // P.G.S. DON BOSCO GENZANO
  {
    clubId: 'PGS_DON_BOSCO',
    category: '2CATEGORIA',
    facilityText: 'LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO DON BOSCO SITO IN VIALE PIAVE, 12,GENZANO DI ROMA (RM).',
    facilityName: 'Impianto Don Bosco',
    facilityAddress: 'Viale Piave 12, Genzano di Roma (RM)',
    aliases: ['2CATEGORIA', '2^ CATEGORIA', '2 CATEGORIA', 'SECONDA CATEGORIA', '2° CATEGORIA'],
  },
  {
    clubId: 'PGS_DON_BOSCO',
    category: 'SERIE C2 C5 MASC',
    facilityText: 'LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO DON STUGI SITO IN VIALE PIAVE, 12,GENZANO DI ROMA (RM).',
    facilityName: 'Impianto Don Stugi',
    facilityAddress: 'Viale Piave 12, Genzano di Roma (RM)',
    aliases: ['SERIE C2 C5 MASC', 'SERIE C2', 'C2 C5 MASC', 'C2 CALCIO A 5 MASCHILE', 'C2 C5', 'SERIE C2 MASCHILE'],
  },
  {
    clubId: 'PGS_DON_BOSCO',
    category: 'SERIE D CA5 FEMMINILE PGS',
    facilityText: 'LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO DON STUGI SITO IN VIALE PIAVE, 12,GENZANO DI ROMA (RM).',
    facilityName: 'Impianto Don Stugi',
    facilityAddress: 'Viale Piave 12, Genzano di Roma (RM)',
    aliases: ['SERIE D CA5 FEMMINILE PGS', 'SERIE D CA5 FEMMINILE', 'SERIE D C5 FEMMINILE PGS', 'SERIE D C5 FEMMINILE', 'SERIE D FEMMINILE PGS'],
  },

  // ALBACYNTHIA
  {
    clubId: 'ALBACYNTHIA',
    category: 'UNDER 14 PROVINCIALI',
    facilityText: "LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO CITTA' DELL'INFIORATA, SITO IN VIA SARDEGNA, 14,GENZANO DI ROMA (RM).",
    facilityName: "Impianto Città dell'Infiorata",
    facilityAddress: 'Via Sardegna 14, Genzano di Roma (RM)',
    aliases: ['UNDER 14 PROVINCIALI', 'UNDER 14 PROVINCIALE', 'UNDER 14', 'U14 PROVINCIALE', 'U14 PROV', 'U14'],
  },
];

export const COMMISSARIATO_INFO = {
  name: 'Commissariato di P.S. Genzano di Roma',
  pec: 'dipps175.00i0@pecps.poliziadistato.it',
  address: 'Via Italo Belardi 81, 00045 Genzano di Roma (RM)',
  telephone: '06 937121',
};

export interface FacilityPreset {
  id: string;
  name: string;
  address: string;
  text: string;
  recommendedFor?: string;
}

export const STANDARD_FACILITIES: FacilityPreset[] = [
  {
    id: 'cynthia_training_center',
    name: 'Cynthia Training Center',
    address: 'Via Montegiove 77, Genzano di Roma (RM)',
    text: 'LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO CYNTHIA TRAINING CENTER, VIA MONTEGIOVE 77,GENZANO DI ROMA (RM).',
    recommendedFor: 'Academy Cynthia - Serie D CA5 Femminile',
  },
  {
    id: 'citta_dell_infiorata',
    name: "Città dell'Infiorata",
    address: 'Via Sardegna 14, Genzano di Roma (RM)',
    text: "LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO CITTA' DELL'INFIORATA, SITO IN VIA SARDEGNA, 14,GENZANO DI ROMA (RM).",
    recommendedFor: 'Academy Cynthia (U14-U17, 3^Cat), Albacynthia, Cynthia 1920 (U18, U19)',
  },
  {
    id: 'bruno_abbatini',
    name: 'Bruno Abbatini',
    address: 'Via Emilia Romagna, Genzano di Roma (RM)',
    text: 'LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO BRUNO ABBATINI SITO IN VIA EMILIA ROMAGNA,GENZANO DI ROMA (RM).',
    recommendedFor: 'Cynthia 1920 - Promozione',
  },
  {
    id: 'don_bosco',
    name: 'Don Bosco',
    address: 'Viale Piave 12, Genzano di Roma (RM)',
    text: 'LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO DON BOSCO SITO IN VIALE PIAVE, 12,GENZANO DI ROMA (RM).',
    recommendedFor: 'PGS Don Bosco - 2^ Categoria',
  },
  {
    id: 'don_stugi',
    name: 'Don Stugi',
    address: 'Viale Piave 12, Genzano di Roma (RM)',
    text: 'LA GARA SI DISPUTERÀ PRESSO L’IMPIANTO SPORTIVO DON STUGI SITO IN VIALE PIAVE, 12,GENZANO DI ROMA (RM).',
    recommendedFor: 'PGS Don Bosco - Serie C2 C5 Masc / Serie D CA5 Femm',
  },
];
