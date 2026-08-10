/**
 * @license
 * NovarisPay - HR & Payroll Management System
 * Service de Gestion du Profil Entreprise, Logo, Couleurs & Signatures
 */

export interface CompanyConfig {
  name: string;
  rccm: string;
  idNat: string;
  nif: string;
  cnssEmployerNumber: string;
  inppEmployerNumber?: string;
  onemEmployerNumber?: string;
  address: string;
  cityProvince: string;
  phone: string;
  email: string;
  website: string;
  logoUrl?: string; // Base64 or Image URL
  primaryColor: string; // Hex color e.g. #1F3864
  accentColor: string; // Hex color e.g. #BF9000
  signerName: string; // e.g. M. Jean-Luc MUKENDI
  signerTitle: string; // e.g. Directeur des Ressources Humaines
  signatureImageBase64?: string; // Optional digital stamp/signature
}

export const DEFAULT_COMPANY_CONFIG: CompanyConfig = {
  name: 'NOVARISPAY CONGO SARL',
  rccm: 'CD/KIN/RCCM/22-B-01452',
  idNat: '01-93-N48120P',
  nif: 'A2210892X',
  cnssEmployerNumber: '1004812001-C',
  inppEmployerNumber: 'INPP-KIN-88291',
  onemEmployerNumber: 'ONEM-2026-0921',
  address: '14, Avenue de la Justice, Commune de la Gombe',
  cityProvince: 'Kinshasa, RDC',
  phone: '+243 810 000 000',
  email: 'contact@novarispay.cd',
  website: 'www.novarispay.cd',
  primaryColor: '#071D49',
  accentColor: '#287BFF',
  signerName: 'M. MUKENDI Jean-Luc',
  signerTitle: 'Directeur des Ressources Humaines',
};

const COMPANY_STORAGE_KEY = 'novarispay_active_company_config';

export const getCompanyConfig = (): CompanyConfig => {
  try {
    const saved = localStorage.getItem(COMPANY_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_COMPANY_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Error reading company config from local storage:', e);
  }
  return DEFAULT_COMPANY_CONFIG;
};

export const saveCompanyConfig = (config: CompanyConfig): void => {
  try {
    localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Error saving company config:', e);
  }
};

/**
 * Catalogue exhaustif des Postes & Métiers RH par secteur d'activité en RDC
 */
export const RDC_JOB_POSITIONS_BY_SECTOR: Record<string, string[]> = {
  'Mines & Hydrocarbures': [
    'Ingénieur des Mines (Ingénieur de Mine / Fosses)',
    'Géologue d\'Exploration & Contrôle de Teneur',
    'Opérateur d\'Usine de Concentration / Hydrométallurgie',
    'Conducteur d\'Engins Lourds (Dumpers, Pelle Mécanique, Bulldozer)',
    'Mécanicien d\'Engins Miniers & Hydrauliques',
    'Chef de Chantier Minière',
    'Superviseur QHSE & Sécurité Minière',
    'Ingénieur Forages & Minage',
    'Métallurgiste d\'Usine',
    'Technicien de Laboratoire d\'Analyses Chimiques',
  ],
  'Banque, Assurance & Microfinance': [
    'Directeur d\'Agence Bancaire',
    'Analyste Crédit & Risques',
    'Caissier Principal / Caissier Guichet',
    'Chargé de Clientèle Entreprises (Corporate Banker)',
    'Auditeur Interne & Conformité / Anti-Blanchiment (AML)',
    'Contrôleur de Gestion Financière',
    'Gestionnaire de Portefeuille / Trade Finance',
    'Inspecteur de Banques & Crédits',
  ],
  'Télécommunications, IT & Digital': [
    'Ingénieur Réseau Télécom & BTS/Fibre Optique',
    'Administrateur Systèmes & Cybersécurité',
    'Développeur Logiciel Fullstack / Mobile',
    'Architecte Cloud & Base de Données',
    'Chef de Projet Informatique / IT Manager',
    'Technicien Support Réseau & Maintenance',
    'Data Analyst / Business Intelligence',
    'Superviseur Centre d\'Appels / Call Center',
  ],
  'BTP, Génie Civil & Architecture': [
    'Ingénieur Civil / Bâtiment & Travaux Publics',
    'Conducteur de Travaux BTP',
    'Topographe & Géomètre',
    'Architecte Concepteur & Dessinateur CAD',
    'Chef de Chantier Construction',
    'Maçon / Ferrailleur / Coffreur Qualifié',
    'Électricien Bâtiment & Industriel',
    'Ingénieur Structure & Mécanique des Sols',
  ],
  'Transport, Logistique, Port & Douane': [
    'Responsable de la Flotte Automobile & Charroi',
    'Chauffeur Poids Lourds / Remorque / Bus Interurbain',
    'Déclarant en Douane Agréé (DGDA)',
    'Dispatcheur Logistique & Transit',
    'Gestionnaire de Magasin & Stocks Warehousing',
    'Agent d\'Escale Maritime & Fluviale (SCTP / Lignes Maritimes)',
    'Mécanicien Auto & Poids Lourds',
  ],
  'Santé, Pharmaceutique & Médical': [
    'Médecin Généraliste / Médecin Conseil d\'Entreprise',
    'Médecin Spécialiste',
    'Infirmier Diplômé d\'État / Infirmier d\'Entreprise',
    'Pharmacien / Gestionnaire d\'Officine',
    'Technicien de Laboratoire Biologique',
    'Sage-Femme / Accoucheuse',
    'Biologiste / Radiologue',
  ],
  'Éducation, Enseignement & Formation': [
    'Enseignant Primaire / Secondaire',
    'Professeur d\'Université / Chef de Travaux',
    'Formateur Technique & Professionnel (INPP)',
    'Préfet des Études / Directeur d\'École',
    'Encadreur Pédagogique',
  ],
  'ONG, Humanitaire & Projets de Développement': [
    'Chef de Projet Humanitaire / Field Coordinator',
    'Chargé de Suivi & Évaluation (MEAL Officer)',
    'Officier de Protection & VBG',
    'Gestionnaire des Subventions & Procurement',
    'Logisticien Humanitaire',
  ],
  'Commerce, Grande Distribution & Services': [
    'Directeur Commercial & Marketing',
    'Responsable des Ventes / Key Account Manager',
    'Gérant de Magasin / Supermarché',
    'Agent Commercial / Prospection Terrain',
    'Réceptionniste / Agent d\'Accueil',
    'Agent de Propreté & Entretien Facility',
    'Agent de Sécurité Privée / Gardien',
  ],
  'Administration générale & Support RH': [
    'Directeur Général (DG / DGA)',
    'Directeur des Ressources Humaines (DRH)',
    'Gestionnaire de Paie & Administration du Personnel',
    'Comptable Senior / Chef Comptable',
    'Assistant(e) de Direction & Secrétaire de Direction',
    'Responsable Juridique & Contentieux Social',
    'Chargé de Recrutement & Formations',
  ],
};

export const ALL_RDC_JOB_POSITIONS: string[] = Object.values(RDC_JOB_POSITIONS_BY_SECTOR).flat();
