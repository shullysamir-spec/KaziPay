/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * 
 * MOTEUR DE PAIE DÉTERMINISTE RDC 2026
 * Code TypeScript pur, déterministe et testable.
 * Aucun appel modèle / IA à l'exécution.
 */

import { StatutoryParams, Payslip, PayslipLine } from '../types/payroll';
import { Currency } from '../types/employee';

export interface CalculationInput {
  employeeId: string;
  employeeMatricule: string;
  employeeName: string;
  department: string;
  position: string;
  period: string; // YYYYMM
  contractType?: 'CDI' | 'CDD' | 'Journalier' | 'STAGE' | 'CONSULTANCE';
  baseSalary: number; // Montant selon le contrat
  currency: Currency; // CDF ou USD
  exchangeRate: number; // Ex: 2850 FC pour 1 USD
  daysWorked?: number; // Défaut 26 jours
  totalStandardDays?: number; // Défaut 26 jours
  overtime130Hours?: number;
  overtime160Hours?: number;
  overtime200Hours?: number;
  hasOvertimeDerogation?: boolean;
  dependentsCount?: number;
  primesCDF?: number;
  allowancesCDF?: number;
  thirteenthMonthCDF?: number;
  performanceBonusCDF?: number;
  activeLoanMonthlyDeduction?: number;
  companyEmployeeCount?: number;
  statutoryParams: StatutoryParams;
}

export const DEFAULT_STATUTORY_PARAMS_2026: StatutoryParams = {
  version: 'RDC_2026_V1',
  effectiveDate: '2026-01-01',
  smigDailyCDF: 21500, // 21 500 FC / jour
  familyAllowanceDailyCDF: Math.round(21500 / 27), // 796 FC par enfant / jour travaillable
  cnssEmployeeRate: 0.05, // 5%
  cnssEmployerRate: 0.09, // 9% total
  cnssEmployerPensionsRate: 0.05, // 5% Pensions
  cnssEmployerWorkRisksRate: 0.015, // 1.5% Risques Professionnels
  cnssEmployerFamilyRate: 0.025, // 2.5% Prestations Familiales
  inppSmallRate: 0.03, // 3% si <= 50 salariés
  inppMediumRate: 0.02, // 2% si 51 à 300
  inppLargeRate: 0.01, // 1% si > 300
  onemRate: 0.002, // 0.2%
  irppMaxPercentage: 0.30, // Plafond impôt <= 30% du salaire imposable
  irppDependentDiscountRate: 0.02, // 2% par personne à charge (max 9 = 18%)
  quotiteCessibleMaxRate: 0.30, // Plafond retenues prêt max 30% du net
  cashRoundingDenominationCDF: 50, // Arrondi à la plus petite coupure 50 FC
  sickLeaveRate: 0.6667, // 66.67% du salaire journalier pour congé maladie (Art 145)
  maternityLeaveRate: 1.00, // 100% du salaire pour congé de maternité (Art 130)
  maxMonthlyOvertimeHours: 48, // 48h max / mois (Art 119)
  irppBrackets: [
    { minAmount: 0, maxAmount: 162000, rate: 0.03 },
    { minAmount: 162000, maxAmount: 1800000, rate: 0.15 },
    { minAmount: 1800000, maxAmount: 3600000, rate: 0.30 },
    { minAmount: 3600000, maxAmount: Infinity, rate: 0.40 },
  ],
  isActive: true,
};

/**
 * Calcul déterministe de la fiche de paie d'un salarié selon la législation de la RDC.
 */
export function calculatePayslip(input: CalculationInput): Payslip {
  const params = input.statutoryParams || DEFAULT_STATUTORY_PARAMS_2026;
  const daysWorked = input.daysWorked ?? 26;
  const totalStandardDays = input.totalStandardDays ?? 26;
  const dependentsCount = Math.max(0, input.dependentsCount ?? 0);
  const companyEmployeeCount = input.companyEmployeeCount ?? 20;

  // Conversion base salary to CDF if defined in USD
  const baseSalaryCDF = input.currency === 'USD'
    ? Math.round(input.baseSalary * input.exchangeRate)
    : Math.round(input.baseSalary);

  // 1. Prorata temporis du salaire de base (entrée / sortie en cours de mois)
  const baseSalaryProratedCDF = Math.round((baseSalaryCDF / totalStandardDays) * daysWorked);

  // 2. Calcul des Heures Supplémentaires (base horaire mensuelle légale RDC = 173.33h)
  const hourlyRateCDF = baseSalaryCDF / 173.33;
  const ot130Amount = Math.round((input.overtime130Hours || 0) * hourlyRateCDF * 1.30);
  const ot160Amount = Math.round((input.overtime160Hours || 0) * hourlyRateCDF * 1.60);
  const ot200Amount = Math.round((input.overtime200Hours || 0) * hourlyRateCDF * 2.00);
  const overtimeTotalCDF = ot130Amount + ot160Amount + ot200Amount;

  // 3. Allocations familiales, Primes, 13ème Mois et Bonus de Performance
  const familyAllowanceCDF = Math.round(params.familyAllowanceDailyCDF * dependentsCount * (daysWorked / totalStandardDays) * 26);
  const primesCDF = Math.round(input.primesCDF || 0);
  const thirteenthMonthCDF = Math.round(input.thirteenthMonthCDF || 0);
  const performanceBonusCDF = Math.round(input.performanceBonusCDF || 0);
  const totalAllowancesCDF = Math.round((input.allowancesCDF || 0) + familyAllowanceCDF);

  // 4. Constitution du Salaire Brut
  const grossSalaryCDF = baseSalaryProratedCDF + overtimeTotalCDF + primesCDF + thirteenthMonthCDF + performanceBonusCDF + totalAllowancesCDF;

  // 5. Assiette CNSS et Cotisation Salariale (QPO - 5%)
  const isConsultant = input.contractType === 'CONSULTANCE';
  const isStagiaire = input.contractType === 'STAGE';

  const cnssBaseCDF = (isConsultant || isStagiaire) ? 0 : grossSalaryCDF;
  const cnssEmployeeCDF = (isConsultant || isStagiaire) ? 0 : Math.round(cnssBaseCDF * params.cnssEmployeeRate);

  // 6. Assiette Imposable (Brut - CNSS Salarié)
  const taxableBaseCDF = Math.max(0, grossSalaryCDF - cnssEmployeeCDF);

  // 7. Calcul IRPP / Retenue à la source
  let irppBrutCDF = 0;
  let irppDiscountDependentsCDF = 0;
  let irppAfterDiscountCDF = 0;
  let irppCapAppliedCDF = 0;
  let irppFinalCDF = 0;

  if (isConsultant) {
    // Retenue à la source 15% Prestation de Services (Loi Fiscale RDC)
    irppBrutCDF = Math.round(grossSalaryCDF * 0.15);
    irppAfterDiscountCDF = irppBrutCDF;
    irppFinalCDF = irppBrutCDF;
  } else if (isStagiaire) {
    // Gratification de stage : IPR 0% si sous le seuil d'imposition
    irppBrutCDF = taxableBaseCDF > 162000 ? Math.round((taxableBaseCDF - 162000) * 0.03) : 0;
    irppAfterDiscountCDF = irppBrutCDF;
    irppFinalCDF = irppBrutCDF;
  } else {
    // Calcul du Barème Progressif IRPP RDC Salarié Ordinaire
    for (const bracket of params.irppBrackets) {
      if (taxableBaseCDF > bracket.minAmount) {
        const taxableInBracket = Math.min(taxableBaseCDF, bracket.maxAmount) - bracket.minAmount;
        if (taxableInBracket > 0) {
          irppBrutCDF += taxableInBracket * bracket.rate;
        }
      }
    }
    irppBrutCDF = Math.round(irppBrutCDF);

    const maxDependentsRatio = Math.min(dependentsCount, 9) * params.irppDependentDiscountRate;
    irppDiscountDependentsCDF = Math.round(irppBrutCDF * maxDependentsRatio);
    irppAfterDiscountCDF = Math.max(0, irppBrutCDF - irppDiscountDependentsCDF);
    const irppCap30CDF = Math.round(taxableBaseCDF * params.irppMaxPercentage);
    irppFinalCDF = Math.min(irppAfterDiscountCDF, irppCap30CDF);
    irppCapAppliedCDF = irppAfterDiscountCDF > irppCap30CDF ? (irppAfterDiscountCDF - irppCap30CDF) : 0;
  }

  // 10. Gestion des Prêts & Quotité Cessible (Plafond Légal RDC : Max 30% du Net Imposable avant Prêt)
  const netBeforeLoanCDF = grossSalaryCDF - cnssEmployeeCDF - irppFinalCDF;
  const maxQuotiteRate = params.quotiteCessibleMaxRate ?? 0.30;
  const maxQuotiteCessibleCDF = Math.round(netBeforeLoanCDF * maxQuotiteRate);
  
  const requestedLoanDeductionCDF = input.activeLoanMonthlyDeduction
    ? (input.currency === 'USD' ? Math.round(input.activeLoanMonthlyDeduction * input.exchangeRate) : Math.round(input.activeLoanMonthlyDeduction))
    : 0;

  const loanDeductionCDF = Math.min(requestedLoanDeductionCDF, Math.max(0, maxQuotiteCessibleCDF));
  const loanRolloverCDF = Math.max(0, requestedLoanDeductionCDF - loanDeductionCDF);
  const loanDeductionWarning = loanRolloverCDF > 0
    ? `Dépassement de la quotité cessible (${Math.round(maxQuotiteRate * 100)}% du net). Retenue plafonnée à ${loanDeductionCDF.toLocaleString()} FC. Reliquat de ${loanRolloverCDF.toLocaleString()} FC reporté.`
    : undefined;

  // 11. Salaire Net & Arrondis Espèces CDF (Plus petite coupure usuelle: ex 50 FC)
  const exactNetSalaryCDF = netBeforeLoanCDF - loanDeductionCDF;
  const cashDenomination = params.cashRoundingDenominationCDF || 50;
  const netSalaryCDF = Math.floor(exactNetSalaryCDF / cashDenomination) * cashDenomination;
  const roundingDifferenceCDF = exactNetSalaryCDF - netSalaryCDF;
  const netSalaryUSD = Number((netSalaryCDF / input.exchangeRate).toFixed(2));

  // 12. Charges Patronales (0% pour Consultants/Stagiaires)
  const cnssEmployerPensionsCDF = (isConsultant || isStagiaire) ? 0 : Math.round(cnssBaseCDF * (params.cnssEmployerPensionsRate ?? 0.05));
  const cnssEmployerWorkRisksCDF = (isConsultant || isStagiaire) ? 0 : Math.round(cnssBaseCDF * (params.cnssEmployerWorkRisksRate ?? 0.015));
  const cnssEmployerFamilyCDF = (isConsultant || isStagiaire) ? 0 : Math.round(cnssBaseCDF * (params.cnssEmployerFamilyRate ?? 0.025));
  const cnssEmployerCDF = cnssEmployerPensionsCDF + cnssEmployerWorkRisksCDF + cnssEmployerFamilyCDF;
  
  let inppRate = params.inppSmallRate; // 3%
  if (companyEmployeeCount > 300) {
    inppRate = params.inppLargeRate; // 1%
  } else if (companyEmployeeCount > 50) {
    inppRate = params.inppMediumRate; // 2%
  }
  const inppEmployerCDF = (isConsultant || isStagiaire) ? 0 : Math.round(grossSalaryCDF * inppRate);
  const onemEmployerCDF = (isConsultant || isStagiaire) ? 0 : Math.round(grossSalaryCDF * params.onemRate);
  const totalEmployerChargesCDF = cnssEmployerCDF + inppEmployerCDF + onemEmployerCDF;

  // Contrôle Heures Supplémentaires & Dérogations
  const overtimeHoursTotal = (input.overtime130Hours || 0) + (input.overtime160Hours || 0) + (input.overtime200Hours || 0);
  const maxOvertimeAllowed = params.maxMonthlyOvertimeHours || 48;
  const overtimeWarning = (overtimeHoursTotal > maxOvertimeAllowed && !input.hasOvertimeDerogation)
    ? `Dépassement du plafond légal des heures sup (${overtimeHoursTotal}h > ${maxOvertimeAllowed}h/mois - Art. 119 RDC) sans dérogation certifiée.`
    : undefined;

  // 13. Lignes détaillées du bulletin
  const lines: PayslipLine[] = [
    {
      code: 'BASE',
      label: 'Salaire de base' + (daysWorked < totalStandardDays ? ` (${daysWorked}/${totalStandardDays}j)` : ''),
      baseCDF: baseSalaryCDF,
      rate: daysWorked / totalStandardDays,
      gainCDF: baseSalaryProratedCDF,
      deductionCDF: 0,
      isTaxable: true,
      isCNSSBase: true,
    }
  ];

  if (overtimeTotalCDF > 0) {
    lines.push({
      code: 'HSUP',
      label: 'Heures supplémentaires (130%, 160%, 200%)',
      baseCDF: overtimeTotalCDF,
      gainCDF: overtimeTotalCDF,
      deductionCDF: 0,
      isTaxable: true,
      isCNSSBase: true,
    });
  }

  if (primesCDF > 0) {
    lines.push({
      code: 'PRIME',
      label: 'Primes & Gratifications',
      baseCDF: primesCDF,
      gainCDF: primesCDF,
      deductionCDF: 0,
      isTaxable: true,
      isCNSSBase: true,
    });
  }

  if (thirteenthMonthCDF > 0) {
    lines.push({
      code: '13EME_MOIS',
      label: 'Gratification du 13ème Mois (Fin d\'Année)',
      baseCDF: thirteenthMonthCDF,
      gainCDF: thirteenthMonthCDF,
      deductionCDF: 0,
      isTaxable: true,
      isCNSSBase: true,
    });
  }

  if (performanceBonusCDF > 0) {
    lines.push({
      code: 'BONUS_PERF',
      label: 'Bonus & Prime de Performance Exceptional',
      baseCDF: performanceBonusCDF,
      gainCDF: performanceBonusCDF,
      deductionCDF: 0,
      isTaxable: true,
      isCNSSBase: true,
    });
  }

  if (familyAllowanceCDF > 0) {
    lines.push({
      code: 'ALLOC_FAM',
      label: `Allocations familiales (${dependentsCount} charge(s))`,
      baseCDF: familyAllowanceCDF,
      gainCDF: familyAllowanceCDF,
      deductionCDF: 0,
      isTaxable: false,
      isCNSSBase: false,
    });
  }

  // Retenues
  lines.push({
    code: 'CNSS_SAL',
    label: 'CNSS Part Salariale (QPO 5%)',
    baseCDF: cnssBaseCDF,
    rate: params.cnssEmployeeRate,
    gainCDF: 0,
    deductionCDF: cnssEmployeeCDF,
    isTaxable: false,
    isCNSSBase: false,
  });

  lines.push({
    code: 'IRPP',
    label: `Impôt sur le Revenu (IRPP RDC)` + (irppCapAppliedCDF > 0 ? ' [Plafonné à 30%]' : ''),
    baseCDF: taxableBaseCDF,
    gainCDF: 0,
    deductionCDF: irppFinalCDF,
    isTaxable: false,
    isCNSSBase: false,
  });

  if (loanDeductionCDF > 0) {
    lines.push({
      code: 'PRET_AVANCE',
      label: 'Remboursement Prêt / Avance',
      baseCDF: requestedLoanDeductionCDF,
      gainCDF: 0,
      deductionCDF: loanDeductionCDF,
      isTaxable: false,
      isCNSSBase: false,
    });
  }

  return {
    runId: '',
    employeeId: input.employeeId,
    employeeMatricule: input.employeeMatricule,
    employeeName: input.employeeName,
    department: input.department,
    position: input.position,
    period: input.period,
    exchangeRate: input.exchangeRate,
    baseCurrency: input.currency,
    baseSalaryContract: input.baseSalary,

    baseSalaryProratedCDF,
    overtimeAmountCDF: overtimeTotalCDF,
    allowancesCDF: totalAllowancesCDF + primesCDF,
    thirteenthMonthCDF,
    performanceBonusCDF,
    grossSalaryCDF,

    cnssBaseCDF,
    cnssEmployeeCDF,
    taxableBaseCDF,
    irppBrutCDF,
    irppDiscountDependentsCDF,
    irppCalculatedCDF: irppAfterDiscountCDF,
    irppCapAppliedCDF,
    irppFinalCDF,

    loanDeductionCDF,
    loanRolloverCDF,
    loanDeductionWarning,
    roundingDifferenceCDF,
    netSalaryCDF,
    netSalaryUSD,

    cnssEmployerCDF,
    cnssEmployerPensionsCDF,
    cnssEmployerWorkRisksCDF,
    cnssEmployerFamilyCDF,
    inppEmployerCDF,
    onemEmployerCDF,
    totalEmployerChargesCDF,

    dependentsCount,
    daysWorked,
    overtimeHoursTotal,
    overtimeWarning,
    hasOvertimeDerogation: input.hasOvertimeDerogation,
    lines,
    createdAt: new Date().toISOString(),
  };
}

export interface SoldeDeToutCompteInput {
  employeeId: string;
  employeeMatricule: string;
  employeeName: string;
  contractType: 'CDI' | 'CDD' | 'Journalier' | 'STAGE' | 'CONSULTANCE';
  terminationReason: 'FIN_CDD' | 'DEMISSION' | 'LICENCIEMENT_FAUTE_LOURDE' | 'LICENCIEMENT_AVEC_PREAVIS' | 'LICENCIEMENT_ECONOMIC' | 'DEPART_RETRAITE';
  terminationDate: string;
  seniorityYears: number;
  daysWorkedInMonth: number;
  totalStandardDays?: number;
  baseSalary: number;
  currency: Currency;
  exchangeRate: number;
  unusedLeaveDays: number;
  noticeWorked?: boolean; // Vrai si le préavis a été effectué
  pendingPrimesCDF?: number;
  remainingLoanBalanceCDF?: number;
  createdBy?: string;
}

/**
 * Calcul déterministe du Solde de Tout Compte conforme au Code du Travail RDC (Loi n° 15/013).
 */
export function calculateSoldeDeToutCompte(input: SoldeDeToutCompteInput) {
  const totalStandardDays = input.totalStandardDays || 26;
  const baseSalaryCDF = input.currency === 'USD'
    ? Math.round(input.baseSalary * input.exchangeRate)
    : Math.round(input.baseSalary);

  const dailyRateCDF = baseSalaryCDF / totalStandardDays;

  // 1. Salaire du mois au prorata des jours travaillés
  const proratedSalaryCDF = Math.round(dailyRateCDF * input.daysWorkedInMonth);

  // 2. Indemnité compensatrice de congé payé non pris (1.833j par mois de travail en RDC)
  const unusedLeaveIndemnityCDF = Math.round(input.unusedLeaveDays * dailyRateCDF);

  // 3. Indemnité de préavis (si le préavis n'a pas été exécuté et que la faute lourde n'est pas invoquée)
  let noticePeriodDays = 0;
  if (!input.noticeWorked && input.terminationReason !== 'LICENCIEMENT_FAUTE_LOURDE' && input.terminationReason !== 'DEMISSION') {
    if (input.seniorityYears < 1) {
      noticePeriodDays = 14; // 14 jours ouvrables
    } else if (input.seniorityYears <= 5) {
      noticePeriodDays = 26; // 1 mois (26j ouvrables)
    } else {
      noticePeriodDays = 52; // 2 mois (52j ouvrables)
    }
  }
  const noticeIndemnityCDF = Math.round(noticePeriodDays * dailyRateCDF);

  // 4. Indemnité de licenciement / Gratification de fin de contrat (Art 78 / Convention Interprofessionnelle RDC)
  let severanceIndemnityCDF = 0;
  if (input.terminationReason === 'LICENCIEMENT_AVEC_PREAVIS' || input.terminationReason === 'LICENCIEMENT_ECONOMIC' || input.terminationReason === 'DEPART_RETRAITE') {
    if (input.seniorityYears >= 1) {
      if (input.seniorityYears <= 5) {
        severanceIndemnityCDF = Math.round(baseSalaryCDF * 0.50 * input.seniorityYears);
      } else if (input.seniorityYears <= 10) {
        severanceIndemnityCDF = Math.round(baseSalaryCDF * 0.75 * input.seniorityYears);
      } else {
        severanceIndemnityCDF = Math.round(baseSalaryCDF * 1.00 * input.seniorityYears);
      }
    }
  } else if (input.terminationReason === 'FIN_CDD') {
    // Prime / Gratification de fin de CDD (5% du total des salaires bruts perçus)
    severanceIndemnityCDF = Math.round(baseSalaryCDF * 0.05 * Math.max(1, input.seniorityYears * 12));
  }

  const pendingPrimesCDF = Math.round(input.pendingPrimesCDF || 0);
  const totalGrossCDF = proratedSalaryCDF + unusedLeaveIndemnityCDF + noticeIndemnityCDF + severanceIndemnityCDF + pendingPrimesCDF;

  const remainingLoanBalanceCDF = Math.round(input.remainingLoanBalanceCDF || 0);
  const totalDeductionsCDF = remainingLoanBalanceCDF;

  const netPayableCDF = Math.max(0, totalGrossCDF - totalDeductionsCDF);
  const netPayableUSD = Number((netPayableCDF / input.exchangeRate).toFixed(2));

  let remarks = `Solde de tout compte établi pour le motif : ${input.terminationReason}. `;
  if (input.terminationReason === 'LICENCIEMENT_FAUTE_LOURDE') {
    remarks += "Absence d'indemnités de préavis et de licenciement en raison d'une faute lourde avérée (Code du travail Art. 72).";
  } else if (input.terminationReason === 'FIN_CDD') {
    remarks += "Terme du contrat à durée déterminée respecté avec droit aux congés payés et gratification.";
  }

  return {
    employeeId: input.employeeId,
    employeeMatricule: input.employeeMatricule,
    employeeName: input.employeeName,
    contractType: input.contractType,
    terminationReason: input.terminationReason,
    terminationDate: input.terminationDate,
    seniorityYears: input.seniorityYears,
    daysWorkedInMonth: input.daysWorkedInMonth,
    totalStandardDays,
    baseSalaryMonthly: input.baseSalary,
    currency: input.currency,
    exchangeRate: input.exchangeRate,

    proratedSalaryCDF,
    unusedLeaveDays: input.unusedLeaveDays,
    unusedLeaveIndemnityCDF,
    noticePeriodDays,
    noticeIndemnityCDF,
    severanceIndemnityCDF,
    pendingPrimesCDF,
    remainingLoanBalanceCDF,

    totalGrossCDF,
    totalDeductionsCDF,
    netPayableCDF,
    netPayableUSD,
    remarks,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy || 'RH System',
  };
}

