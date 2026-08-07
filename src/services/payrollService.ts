/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * 
 * SERVICE DE TRAITEMENT ET DE CLÔTURE DE LA PAIE
 */

import { collection, doc, getDocs, getDoc, setDoc, updateDoc, addDoc, query, where } from 'firebase/firestore';
import { db, sanitizeData } from '../lib/firebase';
import { PayrollRun, Payslip, StatutoryParams, PayrollRectificatif, SoldeDeToutCompte } from '../types/payroll';
import { calculatePayslip, DEFAULT_STATUTORY_PARAMS_2026, calculateSoldeDeToutCompte } from '../payroll/engine';
import { getEmployees } from './employeeService';
import { getAttendanceByPeriod } from './attendanceService';
import { getLoans, updateLoanBalance } from './loanService';
import { logAuditEvent } from './auditService';

/**
 * Récupérer l'historique complet des barèmes légaux versionnés
 */
export async function getStatutoryParamsHistory(): Promise<StatutoryParams[]> {
  try {
    const snap = await getDocs(collection(db, 'statutoryParams'));
    if (snap.empty) {
      return [DEFAULT_STATUTORY_PARAMS_2026];
    }
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StatutoryParams));
    return list.sort((a, b) => (b.effectiveDate || '').localeCompare(a.effectiveDate || ''));
  } catch (err) {
    console.warn('Erreur getStatutoryParamsHistory, utilisation de la version par défaut:', err);
    return [DEFAULT_STATUTORY_PARAMS_2026];
  }
}

/**
 * Récupérer les paramètres légaux RDC applicables à une date de période (ex: period = "202607" -> "2026-07-01")
 */
export async function getStatutoryParamsForDate(periodOrDate: string): Promise<StatutoryParams> {
  const history = await getStatutoryParamsHistory();
  let targetDateStr = periodOrDate;
  if (periodOrDate.length === 6) {
    targetDateStr = `${periodOrDate.substring(0, 4)}-${periodOrDate.substring(4, 6)}-01`;
  }

  // Trouver la version la plus récente avec date d'effet <= targetDateStr
  const activeVersion = history.find((p) => (p.effectiveDate || '2000-01-01') <= targetDateStr);
  return activeVersion || history[0] || DEFAULT_STATUTORY_PARAMS_2026;
}

/**
 * Enregistrer un nouveau barème légal versionné par date d'effet
 */
export async function saveStatutoryParams(
  params: Omit<StatutoryParams, 'id'>,
  userEmail: string,
  userName: string
): Promise<string> {
  const docRef = await addDoc(collection(db, 'statutoryParams'), {
    ...params,
    createdAt: new Date().toISOString(),
    createdByName: userName,
  });

  await logAuditEvent(
    'UPDATE_STATUTORY_PARAMS',
    'PARAMETRES_LEGAUX',
    `Nouveau barème légal RDC version ${params.version} enregistré (Date d'effet: ${params.effectiveDate})`,
    userEmail,
    userName
  );

  return docRef.id;
}

export async function getPayrollRuns(): Promise<PayrollRun[]> {
  try {
    const snap = await getDocs(collection(db, 'payrollRuns'));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as PayrollRun))
      .sort((a, b) => b.period.localeCompare(a.period));
  } catch (err) {
    console.error('Erreur getPayrollRuns:', err);
    return [];
  }
}

export async function createPayrollRun(
  period: string,
  label: string,
  exchangeRate: number,
  createdBy: string
): Promise<string> {
  const newRunRef = doc(collection(db, 'payrollRuns'));
  const runId = newRunRef.id;

  const runData: PayrollRun = {
    id: runId,
    period,
    label,
    exchangeRate,
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    createdBy,
    statutoryVersion: DEFAULT_STATUTORY_PARAMS_2026.version,
    totalGrossCDF: 0,
    totalNetCDF: 0,
    totalNetUSD: 0,
    totalIRPPCDF: 0,
    totalCNSSEmployeeCDF: 0,
    totalEmployerChargesCDF: 0,
    employeeCount: 0,
  };

  await setDoc(newRunRef, sanitizeData(runData));
  return runId;
}

/**
 * Calculer la paie pour un traitement en mode Brouillon ou Calculé
 */
export async function calculatePayrollRun(
  runId: string,
  bonusConfig?: { include13thMonth?: boolean; performanceBonuses?: Record<string, number> }
): Promise<Payslip[]> {
  const runDoc = await getDoc(doc(db, 'payrollRuns', runId));
  if (!runDoc.exists()) throw new Error('Traitement de paie introuvable.');

  const run = runDoc.data() as PayrollRun;
  const statutoryParams = await getStatutoryParamsForDate(run.period);
  const employees = await getEmployees();
  const attendances = await getAttendanceByPeriod(run.period);
  const loans = await getLoans();

  const generatedPayslips: Payslip[] = [];
  let totalGrossCDF = 0;
  let totalNetCDF = 0;
  let totalNetUSD = 0;
  let totalIRPPCDF = 0;
  let totalCNSSEmployeeCDF = 0;
  let totalEmployerChargesCDF = 0;

  for (const emp of employees) {
    const contract = emp.currentContract;
    if (!contract || !contract.baseSalary) continue;

    const att = attendances.find((a) => a.employeeId === emp.id);
    const activeLoan = loans.find((l) => l.employeeId === emp.id && l.status === 'EN_COURS' && l.remainingBalance > 0);

    const baseSalaryCDF = contract.currency === 'USD'
      ? Math.round(contract.baseSalary * run.exchangeRate)
      : Math.round(contract.baseSalary);

    const thirteenthMonthAmount = bonusConfig?.include13thMonth ? baseSalaryCDF : 0;
    const customBonusAmount = bonusConfig?.performanceBonuses?.[emp.id || ''] || 0;

    const payslip = calculatePayslip({
      employeeId: emp.id || '',
      employeeMatricule: emp.matricule,
      employeeName: `${emp.lastName} ${emp.firstName}`,
      department: emp.department,
      position: emp.position,
      period: run.period,
      contractType: contract.type,
      baseSalary: contract.baseSalary,
      currency: contract.currency,
      exchangeRate: run.exchangeRate,
      daysWorked: att ? att.daysWorked : 26,
      overtime130Hours: att?.overtime130,
      overtime160Hours: att?.overtime160,
      overtime200Hours: att?.overtime200,
      dependentsCount: emp.dependents ? emp.dependents.length : 0,
      thirteenthMonthCDF: thirteenthMonthAmount,
      performanceBonusCDF: customBonusAmount,
      activeLoanMonthlyDeduction: activeLoan ? activeLoan.monthlyDeduction : 0,
      companyEmployeeCount: employees.length,
      statutoryParams: statutoryParams,
    });

    payslip.runId = runId;
    generatedPayslips.push(payslip);

    totalGrossCDF += payslip.grossSalaryCDF;
    totalNetCDF += payslip.netSalaryCDF;
    totalNetUSD += payslip.netSalaryUSD;
    totalIRPPCDF += payslip.irppFinalCDF;
    totalCNSSEmployeeCDF += payslip.cnssEmployeeCDF;
    totalEmployerChargesCDF += payslip.totalEmployerChargesCDF;
  }

  // Sauvegarder les fiches générées
  for (const payslip of generatedPayslips) {
    const payslipDocId = `${runId}_${payslip.employeeId}`;
    await setDoc(doc(db, 'payslips', payslipDocId), sanitizeData(payslip));
  }

  // Mettre à jour les totaux du traitement
  await updateDoc(doc(db, 'payrollRuns', runId), sanitizeData({
    status: 'CALCULATED',
    statutoryVersion: statutoryParams.version || '2026.1',
    totalGrossCDF,
    totalNetCDF,
    totalNetUSD,
    totalIRPPCDF,
    totalCNSSEmployeeCDF,
    totalEmployerChargesCDF,
    employeeCount: generatedPayslips.length,
  }));

  return generatedPayslips;
}

/**
 * Valider le traitement de paie
 */
export async function validatePayrollRun(runId: string): Promise<void> {
  await updateDoc(doc(db, 'payrollRuns', runId), { status: 'VALIDATED' });
}

/**
 * Clôturer définitivement la paie (fige les montants et amortit les prêts)
 */
export async function closePayrollRun(runId: string): Promise<void> {
  const payslips = await getPayslipsForRun(runId);
  const loans = await getLoans();

  // Déduire les prêts remboursés lors de la clôture
  for (const payslip of payslips) {
    if (payslip.loanDeductionCDF > 0) {
      const activeLoan = loans.find((l) => l.employeeId === payslip.employeeId && l.status === 'EN_COURS');
      if (activeLoan && activeLoan.id) {
        const deductionInLoanCurrency = activeLoan.currency === 'USD'
          ? payslip.loanDeductionCDF / payslip.exchangeRate
          : payslip.loanDeductionCDF;
        await updateLoanBalance(activeLoan.id, activeLoan.remainingBalance - deductionInLoanCurrency);
      }
    }
  }

  await updateDoc(doc(db, 'payrollRuns', runId), {
    status: 'CLOSED',
    closedAt: new Date().toISOString(),
  });
}

/**
 * Récupérer les bulletins d'un traitement
 */
export async function getPayslipsForRun(runId: string): Promise<Payslip[]> {
  try {
    const snap = await getDocs(collection(db, 'payslips'));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Payslip))
      .filter((p) => p.runId === runId);
  } catch (err) {
    console.error('Erreur getPayslipsForRun:', err);
    return [];
  }
}

/**
 * Récupérer toutes les fiches de paie d'un employé pour son suivi individuel
 */
export async function getPayslipsForEmployee(employeeId: string): Promise<Payslip[]> {
  try {
    const snap = await getDocs(collection(db, 'payslips'));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Payslip))
      .filter((p) => p.employeeId === employeeId)
      .sort((a, b) => b.period.localeCompare(a.period));
  } catch (err) {
    console.error('Erreur getPayslipsForEmployee:', err);
    return [];
  }
}

/**
 * Créer un RECTIFICATIF officiel pour une période clôturée
 */
export async function createPayrollRectificatif(
  runId: string,
  employeeId: string,
  newNetSalaryCDF: number,
  adjustmentReason: string,
  authorEmail: string = 'admin@novarispay.cd'
): Promise<PayrollRectificatif> {
  const payslipDocId = `${runId}_${employeeId}`;
  const payslipRef = doc(db, 'payslips', payslipDocId);
  const snap = await getDoc(payslipRef);

  if (!snap.exists()) {
    throw new Error('Bulletin de paie introuvable pour ce rectificatif.');
  }

  const currentPayslip = snap.data() as Payslip;
  const oldNetSalaryCDF = currentPayslip.netSalaryCDF;

  const rectificatif: PayrollRectificatif = {
    runId,
    employeeId,
    employeeName: currentPayslip.employeeName,
    period: currentPayslip.period,
    oldNetSalaryCDF,
    newNetSalaryCDF,
    adjustmentReason,
    authorEmail,
    timestamp: new Date().toISOString(),
  };

  // Enregistrer le rectificatif
  const docRef = await addDoc(collection(db, 'payrollRectificatifs'), rectificatif);
  rectificatif.id = docRef.id;

  // Mettre à jour le bulletin
  await updateDoc(payslipRef, {
    netSalaryCDF: newNetSalaryCDF,
    netSalaryUSD: Number((newNetSalaryCDF / currentPayslip.exchangeRate).toFixed(2)),
  });

  // Tracer l'événement dans le journal d'audit avec old et new values
  await logAuditEvent(
    'RECTIFICATIF',
    'PAYROLL',
    `Rectificatif de paie ${currentPayslip.period} pour ${currentPayslip.employeeName} : ${adjustmentReason}`,
    authorEmail,
    'ADMINISTRATEUR',
    payslipDocId,
    { netSalaryCDF: oldNetSalaryCDF },
    { netSalaryCDF: newNetSalaryCDF, reason: adjustmentReason }
  );

  return rectificatif;
}

/**
 * Récupérer les rectificatifs
 */
export async function getRectificatifsForRun(runId: string): Promise<PayrollRectificatif[]> {
  try {
    const snap = await getDocs(collection(db, 'payrollRectificatifs'));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as PayrollRectificatif))
      .filter((r) => r.runId === runId);
  } catch (err) {
    console.error('Erreur getRectificatifsForRun:', err);
    return [];
  }
}

/**
 * Enregistrer un Solde de Tout Compte
 */
export async function saveSoldeDeToutCompte(solde: SoldeDeToutCompte): Promise<string> {
  const ref = await addDoc(collection(db, 'soldesDeToutCompte'), sanitizeData(solde));

  await logAuditEvent(
    'CREATE',
    'PAYROLL',
    `Génération du Solde de Tout Compte pour ${solde.employeeName} (Motif: ${solde.terminationReason}) - Net: ${solde.netPayableCDF.toLocaleString()} CDF`,
    solde.createdBy || 'admin@novarispay.cd',
    'GESTIONNAIRE_RH',
    ref.id,
    null,
    solde
  );

  return ref.id;
}

/**
 * Récupérer l'historique des Soldes de Tout Compte
 */
export async function getSoldeDeToutCompteHistory(): Promise<SoldeDeToutCompte[]> {
  try {
    const snap = await getDocs(collection(db, 'soldesDeToutCompte'));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as SoldeDeToutCompte))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (err) {
    console.error('Erreur getSoldeDeToutCompteHistory:', err);
    return [];
  }
}

