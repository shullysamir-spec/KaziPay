/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 */

export type Currency = 'CDF' | 'USD';

export type ContractType = 'CDI' | 'CDD' | 'Journalier' | 'STAGE' | 'CONSULTANCE';

export type EmployeeStatus = 'Actif' | 'En congé' | 'En maladie' | 'Suspendu' | 'Mis à pied' | 'Inactif';

export type CircumstanceNature =
  | 'CONGE'
  | 'MALADIE'
  | 'SUSPENSION'
  | 'MISE_A_PIED'
  | 'RUPTURE_CONTRAT'
  | 'LICENCIEMENT'
  | 'FIN_CDD'
  | 'DEMISSION'
  | 'DECES';

export interface EmployeeCircumstance {
  id?: string;
  employeeId: string;
  nature: CircumstanceNature;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  reason: string;
  paymentRate: number; // 1.0 (100%), 0.66 (maladie), 0.0 (suspension non payée)
  status: 'EN_COURS' | 'TERMINE' | 'ANNULE';
  returnedEarlyDate?: string;
  returnedEarlyBy?: string;
  createdAt: string;
  createdBy: string;
}

export interface PhotoRecord {
  url: string;
  capturedAt: string;
  capturedBy: string;
  method: 'CAMERA' | 'UPLOAD';
}

export interface Dependent {
  id: string;
  fullName: string;
  birthDate: string;
  relationship: 'Enfant' | 'Conjoint' | 'Autre en charge';
}

export interface Employee {
  id?: string;
  matricule: string;
  lastName: string;
  firstName: string;
  gender: 'M' | 'F';
  birthDate: string;
  civilStatus?: string; // Célibataire, Marié(e), Divorcé(e), Veuf/Veuve
  nif: string; // Numéro impôt
  cnss: string; // Numéro CNSS
  phone: string; // +243...
  email: string;
  address: string;
  bankName: string;
  bankAccount: string;
  swiftIban?: string;
  mobileMoneyNumber?: string;
  mobileMoneyProvider?: 'M-Pesa' | 'Airtel Money' | 'Orange Money' | 'Afrimoney' | 'Autre';
  
  // Expatriate Tracking
  isExpatriate?: boolean;
  nationality?: string;
  countryOfOrigin?: string;
  expatDocs?: {
    visaNumber?: string;
    visaExpiryDate?: string;
    workPermitNumber?: string;
    workPermitExpiryDate?: string;
    residencePermitNumber?: string;
    residencePermitExpiryDate?: string;
    passportNumber?: string;
    passportExpiryDate?: string;
    contractExpiryDate?: string;
  };
  expatCompensation?: {
    currency: Currency;
    expatriationAllowance: number;
    housingAllowance?: number;
    specialTaxTreatment?: boolean;
    notes?: string;
  };

  site: string;
  department: string;
  position: string;
  hireDate: string;
  dependents: Dependent[];
  photoUrl?: string;
  photoHistory?: PhotoRecord[];
  status?: EmployeeStatus;
  userRole?: string;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Contract {
  id?: string;
  employeeId: string;
  type: ContractType;
  startDate: string;
  endDate?: string;
  baseSalary: number;
  currency: Currency;
  academicInstitution?: string; // Pour les stagiaires (Université / École)
  consultantNif?: string; // NIF ou Registre de Commerce du consultant
  consultancyType?: string; // Domaine de consultance
  isCurrent: boolean;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeWithContract extends Employee {
  currentContract?: Contract;
  seniorityYears?: number;
  seniorityMonths?: number;
}
