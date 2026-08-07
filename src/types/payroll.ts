/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 */

import { Currency } from './employee';

export interface IRPPBracket {
  minAmount: number; // Borne inf en FC
  maxAmount: number; // Borne sup en FC (ex: 162000, 1800000, 3600000, Infinity)
  rate: number; // Ex: 0.03 (3%), 0.15 (15%), 0.30 (30%), 0.40 (40%)
}

export interface StatutoryParams {
  id?: string;
  version: string; // Ex: "RDC_2026_V1"
  effectiveDate: string; // Ex: "2026-01-01"
  smigDailyCDF: number; // 21 500 FC par jour
  familyAllowanceDailyCDF: number; // 21 500 / 27 FC par enfant
  cnssEmployeeRate: number; // 0.05 (5%)
  
  // Ventilation CNSS Patronal (Branches RDC)
  cnssEmployerRate: number; // Total patronal (ex: 0.09 = 9%)
  cnssEmployerPensionsRate: number; // Branche Pensions (5%)
  cnssEmployerWorkRisksRate: number; // Branche Risques Professionnels (1.5%)
  cnssEmployerFamilyRate: number; // Branche Prestations Familiales (2.5%)

  inppSmallRate: number; // 0.03 (3% si <= 50 salariés)
  inppMediumRate: number; // 0.02 (2% si 51 à 300)
  inppLargeRate: number; // 0.01 (1% si > 300)
  onemRate: number; // 0.002 (0.2%)
  
  irppMaxPercentage: number; // 0.30 (Plafond 30% du salaire imposable)
  irppDependentDiscountRate: number; // 0.02 (2% de réduction d'impôt par enfant, max 9 = 18%)
  quotiteCessibleMaxRate: number; // 0.30 (Max 30% du net imposable pour retenues)
  cashRoundingDenominationCDF: number; // 50 FC (plus petite coupure usuelle)
  
  // Congés & Absences Légales
  sickLeaveRate: number; // 0.6667 (66.67% ou 100% selon convention)
  maternityLeaveRate: number; // 1.00 (100% légal RDC)
  maxMonthlyOvertimeHours: number; // 48h légal max par mois
  
  irppBrackets: IRPPBracket[];
  isActive: boolean;
  createdByName?: string;
  createdAt?: string;
  changeNotes?: string;
}

export type PayrollRunStatus = 'DRAFT' | 'CALCULATED' | 'VALIDATED' | 'CLOSED';

export interface PayrollRun {
  id?: string;
  period: string; // YYYYMM (ex: 202607)
  label: string; // "Paie Juillet 2026"
  exchangeRate: number; // Taux de change CDF / USD (ex: 2850 FC)
  status: PayrollRunStatus;
  createdAt: string;
  closedAt?: string;
  createdBy?: string;
  statutoryVersion: string;
  totalGrossCDF: number;
  totalNetCDF: number;
  totalNetUSD: number;
  totalIRPPCDF: number;
  totalCNSSEmployeeCDF: number;
  totalEmployerChargesCDF: number;
  employeeCount: number;
}

export interface PayslipLine {
  code: string;
  label: string;
  baseCDF: number;
  rate?: number;
  gainCDF: number;
  deductionCDF: number;
  isTaxable: boolean;
  isCNSSBase: boolean;
}

export interface Payslip {
  id?: string;
  runId: string;
  employeeId: string;
  employeeMatricule: string;
  employeeName: string;
  department: string;
  position: string;
  period: string;
  exchangeRate: number;
  baseCurrency: Currency;
  baseSalaryContract: number;

  // Extended Employee Metadata for Audit & Compliance
  contractType?: 'CDI' | 'CDD' | 'Journalier' | 'STAGE' | 'CONSULTANCE';
  hireDate?: string;
  seniorityText?: string;
  grade?: string;
  costCenter?: string;
  nationality?: string;
  cnssNumber?: string;
  nif?: string;
  bankName?: string;
  bankAccountMasked?: string;
  paymentMethod?: string;
  paymentReference?: string;
  payDate?: string;

  // Attendance & Time Summary
  totalStandardDays?: number;
  daysWorked: number;
  paidDays?: number;
  normalHours?: number;
  overtime130Hours?: number;
  overtime160Hours?: number;
  overtime200Hours?: number;
  overtimeHoursTotal?: number;
  nightHours?: number;
  sundayHours?: number;
  holidayHours?: number;
  absenceDays?: number;
  paidLeaveDays?: number;
  sickLeaveDays?: number;
  unpaidLeaveDays?: number;

  // Elements du Brut
  baseSalaryProratedCDF: number;
  housingAllowanceCDF?: number;
  transportAllowanceCDF?: number;
  riskAllowanceCDF?: number;
  responsibilityAllowanceCDF?: number;
  overtimeAmountCDF: number;
  allowancesCDF: number;
  primesCDF?: number;
  familyAllowanceCDF?: number;
  thirteenthMonthCDF?: number;
  performanceBonusCDF?: number;
  grossSalaryCDF: number;

  // Cotisations & Impôts
  cnssBaseCDF: number;
  cnssEmployeeCDF: number; // 5%
  taxableBaseCDF: number;
  irppBrutCDF: number;
  irppDiscountDependentsCDF: number;
  irppCalculatedCDF?: number;
  irppCapAppliedCDF: number; // Plafond 30%
  irppFinalCDF: number;

  // Retenues & Prêts
  loanDeductionCDF: number;
  loanRolloverCDF?: number; // Reliquat reporté si plafonnement à 30%
  loanDeductionWarning?: string; // Alerte sur dépassement quotité cessible
  roundingDifferenceCDF?: number; // Écart d'arrondi espèces
  totalDeductionsCDF?: number;
  netSalaryCDF: number;
  netSalaryUSD: number;

  // Solde de Congés
  leaveEarnedDays?: number;
  leaveTakenDays?: number;
  leaveRemainingDays?: number;

  // Charges Patronales
  cnssEmployerCDF: number; // Total CNSS Patronal
  cnssEmployerPensionsCDF?: number; // Branche Pensions (5%)
  cnssEmployerWorkRisksCDF?: number; // Branche Risques Professionnels (1.5%)
  cnssEmployerFamilyCDF?: number; // Branche Prestations Familiales (2.5%)
  inppEmployerCDF: number; // 1%, 2% ou 3%
  onemEmployerCDF: number; // 0.2%
  totalEmployerChargesCDF: number;
  totalEmployerCostCDF?: number; // Brut + Charges patronales

  // Données de contrôle
  dependentsCount: number;
  overtimeWarning?: string;
  hasOvertimeDerogation?: boolean;
  payslipRef?: string;
  lines: PayslipLine[];
  createdAt: string;
}

export type ContractTerminationReason =
  | 'FIN_CDD'
  | 'DEMISSION'
  | 'LICENCIEMENT_FAUTE_LOURDE'
  | 'LICENCIEMENT_AVEC_PREAVIS'
  | 'LICENCIEMENT_ECONOMIC'
  | 'DEPART_RETRAITE';

export interface SoldeDeToutCompte {
  id?: string;
  employeeId: string;
  employeeMatricule: string;
  employeeName: string;
  contractType: 'CDI' | 'CDD' | 'Journalier' | 'STAGE' | 'CONSULTANCE';
  terminationReason: ContractTerminationReason;
  terminationDate: string;
  seniorityYears: number;
  daysWorkedInMonth: number;
  totalStandardDays: number;
  baseSalaryMonthly: number;
  currency: Currency;
  exchangeRate: number;

  // Indemnités & Composantes
  proratedSalaryCDF: number;
  unusedLeaveDays: number;
  unusedLeaveIndemnityCDF: number;
  noticePeriodDays: number;
  noticeIndemnityCDF: number;
  severanceIndemnityCDF: number; // Gratification / Indemnité de licenciement
  pendingPrimesCDF: number;
  remainingLoanBalanceCDF: number;

  totalGrossCDF: number;
  totalDeductionsCDF: number;
  netPayableCDF: number;
  netPayableUSD: number;
  remarks: string;
  createdAt: string;
  createdBy: string;
}

export interface PayrollRectificatif {
  id?: string;
  runId: string;
  employeeId: string;
  employeeName: string;
  period: string;
  oldNetSalaryCDF: number;
  newNetSalaryCDF: number;
  adjustmentReason: string;
  authorEmail: string;
  timestamp: string;
}

