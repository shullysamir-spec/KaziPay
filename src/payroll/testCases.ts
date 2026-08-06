/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * 
 * SUITE DE TESTS ET CAS DE RÉFÉRENCE DE PAIE RDC 2026
 */

import { calculatePayslip, DEFAULT_STATUTORY_PARAMS_2026, CalculationInput } from './engine';
import { Payslip } from '../types/payroll';

export interface PayrollTestCase {
  id: string;
  title: string;
  description: string;
  input: CalculationInput;
  expectedResult: {
    grossSalaryCDF: number;
    cnssBaseCDF: number;
    cnssEmployeeCDF: number;
    taxableBaseCDF: number;
    irppBrutCDF: number;
    irppDiscountCDF: number;
    irppCapAppliedCDF: number;
    irppFinalCDF: number;
    netSalaryCDF: number;
    netSalaryUSD: number;
    cnssEmployerCDF: number;
    inppEmployerCDF: number;
    onemEmployerCDF: number;
    totalEmployerChargesCDF: number;
    notes: string;
  };
}

export const REFERENCE_TEST_CASES: PayrollTestCase[] = [
  {
    id: 'SMIG_EMPLOYEE',
    title: '1. Salarié au SMIG (21 500 FC / jour)',
    description: 'Manœuvre travaillant 26 jours au SMIG de 21 500 FC/jour (559 000 FC/mois). 0 enfant à charge.',
    input: {
      employeeId: 'EMP_SMIG',
      employeeMatricule: 'KP-001',
      employeeName: 'Kasongo Jean',
      department: 'Exploitation',
      position: 'Manœuvre',
      period: '202607',
      baseSalary: 559000,
      currency: 'CDF',
      exchangeRate: 2850,
      daysWorked: 26,
      dependentsCount: 0,
      statutoryParams: DEFAULT_STATUTORY_PARAMS_2026,
    },
    expectedResult: {
      grossSalaryCDF: 559000,
      cnssBaseCDF: 559000,
      cnssEmployeeCDF: 27950, // 5%
      taxableBaseCDF: 531050, // 559000 - 27950
      irppBrutCDF: 60218, // (162k*3%) + (369050*15%) = 4860 + 55358
      irppDiscountCDF: 0,
      irppCapAppliedCDF: 0,
      irppFinalCDF: 60218,
      netSalaryCDF: 470800, // 559000 - 27950 - 60218 = 470832 -> arrondi 470800
      netSalaryUSD: 165.19,
      cnssEmployerCDF: 50310, // 9%
      inppEmployerCDF: 16770, // 3%
      onemEmployerCDF: 1118, // 0.2%
      totalEmployerChargesCDF: 68198,
      notes: 'Tranche 1 (3%): 4860 FC. Tranche 2 (15%): 55358 FC. Arrondi espèces à 50 FC près.',
    },
  },
  {
    id: 'HIGH_SALARY_30_CAP',
    title: '2. Haut Salaire (15 000 000 FC) - Plafond IRPP 30%',
    description: 'Cadre dirigeant à 15,0M FC où l\'IRPP calculé par tranche (5,05M FC) dépasse le plafond légal de 30% du salaire imposable.',
    input: {
      employeeId: 'EMP_HIGH',
      employeeMatricule: 'KP-002',
      employeeName: 'Mukendi Pierre',
      department: 'Direction Générale',
      position: 'Directeur Général',
      period: '202607',
      baseSalary: 15000000,
      currency: 'CDF',
      exchangeRate: 2850,
      daysWorked: 26,
      dependentsCount: 0,
      statutoryParams: DEFAULT_STATUTORY_PARAMS_2026,
    },
    expectedResult: {
      grossSalaryCDF: 15000000,
      cnssBaseCDF: 15000000,
      cnssEmployeeCDF: 750000, // 5%
      taxableBaseCDF: 14250000, // 15,0M - 750k
      irppBrutCDF: 5050560, // Total barème par tranches (3%, 15%, 30%, 40%)
      irppDiscountCDF: 0,
      irppCapAppliedCDF: 775560, // Economie réalisée grâce au plafonnement à 30%
      irppFinalCDF: 4275000, // Plafond exact de 30% de 14 250 000 FC
      netSalaryCDF: 9975000,
      netSalaryUSD: 3500.00,
      cnssEmployerCDF: 1350000, // 9%
      inppEmployerCDF: 450000, // 3%
      onemEmployerCDF: 30000, // 0.2%
      totalEmployerChargesCDF: 1830000,
      notes: 'L\'IRPP barème (5 050 560 FC) est écêté à 30% du salaire imposable (4 275 000 FC).',
    },
  },
  {
    id: 'THREE_DEPENDENTS',
    title: '3. Salarié avec 3 Enfants à Charge (6% Réduction IRPP)',
    description: 'Cadre moyen à 3,0M FC avec 3 enfants légaux enregistrés. Réduction directe de 6% sur l\'IRPP brut.',
    input: {
      employeeId: 'EMP_DEP3',
      employeeMatricule: 'KP-003',
      employeeName: 'Tshimanga Joseph',
      department: 'Finance',
      position: 'Comptable Senior',
      period: '202607',
      baseSalary: 3000000,
      currency: 'CDF',
      exchangeRate: 2850,
      daysWorked: 26,
      dependentsCount: 3,
      statutoryParams: DEFAULT_STATUTORY_PARAMS_2026,
    },
    expectedResult: {
      grossSalaryCDF: 3000000,
      cnssBaseCDF: 3000000,
      cnssEmployeeCDF: 150000, // 5%
      taxableBaseCDF: 2850000,
      irppBrutCDF: 565560,
      irppDiscountCDF: 33934, // 6% de 565560
      irppCapAppliedCDF: 0,
      irppFinalCDF: 531626, // 565560 - 33934
      netSalaryCDF: 2318350, // 3,0M - 150k - 531626 = 2318374 -> arrondi 2318350
      netSalaryUSD: 813.46,
      cnssEmployerCDF: 270000, // 9%
      inppEmployerCDF: 90000, // 3%
      onemEmployerCDF: 6000, // 0.2%
      totalEmployerChargesCDF: 366000,
      notes: 'Réduction famille à charge : 3 x 2% = 6% d\'économie directe sur l\'impôt sur le revenu.',
    },
  },
  {
    id: 'ZERO_DEPENDENT',
    title: '4. Salarié avec 0 Enfant à Charge (Comparaison sans réduction)',
    description: 'Même salaire de base (3,0M FC) mais sans aucune personne à charge (0% de réduction).',
    input: {
      employeeId: 'EMP_DEP0',
      employeeMatricule: 'KP-004',
      employeeName: 'Kabila Sarah',
      department: 'Finance',
      position: 'Comptable',
      period: '202607',
      baseSalary: 3000000,
      currency: 'CDF',
      exchangeRate: 2850,
      daysWorked: 26,
      dependentsCount: 0,
      statutoryParams: DEFAULT_STATUTORY_PARAMS_2026,
    },
    expectedResult: {
      grossSalaryCDF: 3000000,
      cnssBaseCDF: 3000000,
      cnssEmployeeCDF: 150000,
      taxableBaseCDF: 2850000,
      irppBrutCDF: 565560,
      irppDiscountCDF: 0,
      irppCapAppliedCDF: 0,
      irppFinalCDF: 565560,
      netSalaryCDF: 2284400, // 3,0M - 150k - 565560 = 2284440 -> arrondi 2284400
      netSalaryUSD: 801.54,
      cnssEmployerCDF: 270000,
      inppEmployerCDF: 90000,
      onemEmployerCDF: 6000,
      totalEmployerChargesCDF: 366000,
      notes: 'Différence nette de +33 934 FC en faveur du salarié avec 3 enfants.',
    },
  },
  {
    id: 'USD_CONTRACT',
    title: '5. Contrat en USD ($2 000 USD à 2 850 FC/USD)',
    description: 'Contrat libellé à $2 000 USD. Conversion au cours de change de la période (2 850 FC).',
    input: {
      employeeId: 'EMP_USD',
      employeeMatricule: 'KP-005',
      employeeName: 'Ilunga Marc',
      department: 'Informatique',
      position: 'Architecte SI',
      period: '202607',
      baseSalary: 2000,
      currency: 'USD',
      exchangeRate: 2850,
      daysWorked: 26,
      dependentsCount: 2,
      statutoryParams: DEFAULT_STATUTORY_PARAMS_2026,
    },
    expectedResult: {
      grossSalaryCDF: 5700000, // $2000 * 2850
      cnssBaseCDF: 5700000,
      cnssEmployeeCDF: 285000, // 5%
      taxableBaseCDF: 5415000,
      irppBrutCDF: 1516560,
      irppDiscountCDF: 60662, // 4% pour 2 enfants
      irppCapAppliedCDF: 0,
      irppFinalCDF: 1455898,
      netSalaryCDF: 3959100, // 5,7M - 285k - 1455898 = 3959102 -> arrondi 3959100
      netSalaryUSD: 1389.16,
      cnssEmployerCDF: 513000, // 9%
      inppEmployerCDF: 171000, // 3%
      onemEmployerCDF: 11400, // 0.2%
      totalEmployerChargesCDF: 695400,
      notes: 'Traitement dual CDF / USD : calculs légaux effectués en CDF puis rendus en USD.',
    },
  },
  {
    id: 'MID_MONTH_HIRE',
    title: '6. Embauche le 15 du Mois (Prorata 12 jours travaillés sur 26)',
    description: 'Prise de fonction le 15 du mois. Calcul prorata temporis strict sur 12 jours ouvrables.',
    input: {
      employeeId: 'EMP_MID_MONTH',
      employeeMatricule: 'KP-006',
      employeeName: 'Mwanza Alain',
      department: 'Ressources Humaines',
      position: 'Chargé de Recrutement',
      period: '202607',
      baseSalary: 2000000,
      currency: 'CDF',
      exchangeRate: 2850,
      daysWorked: 12,
      totalStandardDays: 26,
      dependentsCount: 0,
      statutoryParams: DEFAULT_STATUTORY_PARAMS_2026,
    },
    expectedResult: {
      grossSalaryCDF: 923077, // (2 000 000 / 26) * 12
      cnssBaseCDF: 923077,
      cnssEmployeeCDF: 46154, // 5%
      taxableBaseCDF: 876923,
      irppBrutCDF: 112098, // (162k*3%) + (714923*15%) = 4860 + 107238
      irppDiscountCDF: 0,
      irppCapAppliedCDF: 0,
      irppFinalCDF: 112098,
      netSalaryCDF: 764800, // 923077 - 46154 - 112098 = 764825 -> arrondi 764800
      netSalaryUSD: 268.35,
      cnssEmployerCDF: 83077, // 9%
      inppEmployerCDF: 27692, // 3%
      onemEmployerCDF: 1846, // 0.2%
      totalEmployerChargesCDF: 112615,
      notes: 'Salaire proratisé à 12/26ème. Les assiettes fiscales et sociales s\'ajustent automatiquement.',
    },
  },
];

export interface TestExecutionResult {
  testCase: PayrollTestCase;
  actualPayslip: Payslip;
  passed: boolean;
  diffs: Array<{ field: string; expected: number; actual: number; delta: number }>;
}

export function runPayrollTestSuite(): TestExecutionResult[] {
  return REFERENCE_TEST_CASES.map((tc) => {
    const actualPayslip = calculatePayslip(tc.input);
    const diffs: Array<{ field: string; expected: number; actual: number; delta: number }> = [];

    const checkField = (field: string, expected: number, actual: number) => {
      const delta = Math.abs(expected - actual);
      if (delta > 2) { // tolérance de 2 FC pour arrondis
        diffs.push({ field, expected, actual, delta });
      }
    };

    checkField('grossSalaryCDF', tc.expectedResult.grossSalaryCDF, actualPayslip.grossSalaryCDF);
    checkField('cnssBaseCDF', tc.expectedResult.cnssBaseCDF, actualPayslip.cnssBaseCDF);
    checkField('cnssEmployeeCDF', tc.expectedResult.cnssEmployeeCDF, actualPayslip.cnssEmployeeCDF);
    checkField('taxableBaseCDF', tc.expectedResult.taxableBaseCDF, actualPayslip.taxableBaseCDF);
    checkField('irppBrutCDF', tc.expectedResult.irppBrutCDF, actualPayslip.irppBrutCDF);
    checkField('irppDiscountCDF', tc.expectedResult.irppDiscountCDF, actualPayslip.irppDiscountDependentsCDF);
    checkField('irppCapAppliedCDF', tc.expectedResult.irppCapAppliedCDF, actualPayslip.irppCapAppliedCDF);
    checkField('irppFinalCDF', tc.expectedResult.irppFinalCDF, actualPayslip.irppFinalCDF);
    checkField('netSalaryCDF', tc.expectedResult.netSalaryCDF, actualPayslip.netSalaryCDF);
    checkField('cnssEmployerCDF', tc.expectedResult.cnssEmployerCDF, actualPayslip.cnssEmployerCDF);
    checkField('inppEmployerCDF', tc.expectedResult.inppEmployerCDF, actualPayslip.inppEmployerCDF);
    checkField('onemEmployerCDF', tc.expectedResult.onemEmployerCDF, actualPayslip.onemEmployerCDF);
    checkField('totalEmployerChargesCDF', tc.expectedResult.totalEmployerChargesCDF, actualPayslip.totalEmployerChargesCDF);

    return {
      testCase: tc,
      actualPayslip,
      passed: diffs.length === 0,
      diffs,
    };
  });
}
