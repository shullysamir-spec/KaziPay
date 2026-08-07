/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * 
 * SERVICE EMPLOYÉS ET CONTRATS
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
} from 'firebase/firestore';
import { db, sanitizeData } from '../lib/firebase';
import { Employee, Contract, EmployeeWithContract, EmployeeStatus, EmployeeCircumstance, PhotoRecord } from '../types/employee';
import { logAuditEvent } from './auditService';
import { calculateSoldeDeToutCompte } from '../payroll/engine';
import { saveSoldeDeToutCompte } from './payrollService';

/**
 * Dérivation dynamique du statut employé à partir des circonstances datées et de la date du jour
 */
export function deriveEmployeeStatus(
  emp: Employee,
  circumstances: EmployeeCircumstance[]
): EmployeeStatus {
  if (emp.isDeleted) return 'Inactif';

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Chercher si une circonstance définitive active existe
  const definitiveCirc = circumstances.find((c) => {
    if (c.status === 'ANNULE') return false;
    const isDefinitive = [
      'RUPTURE_CONTRAT',
      'LICENCIEMENT',
      'FIN_CDD',
      'DEMISSION',
      'DECES',
    ].includes(c.nature);
    return isDefinitive && c.startDate <= todayStr;
  });

  if (definitiveCirc) return 'Inactif';

  // 2. Chercher si une circonstance temporaire est en cours aujourd'hui
  const activeTempCirc = circumstances.find((c) => {
    if (c.status === 'ANNULE' || c.status === 'TERMINE') return false;

    const startOk = c.startDate <= todayStr;
    const endStr = c.returnedEarlyDate || c.endDate;
    const endOk = !endStr || endStr >= todayStr;

    return startOk && endOk;
  });

  if (activeTempCirc) {
    switch (activeTempCirc.nature) {
      case 'CONGE':
        return 'En congé';
      case 'MALADIE':
        return 'En maladie';
      case 'SUSPENSION':
        return 'Suspendu';
      case 'MISE_A_PIED':
        return 'Mis à pied';
    }
  }

  return emp.status || 'Actif';
}

/**
 * Récupérer toutes les circonstances d'un employé
 */
export async function getEmployeeCircumstances(employeeId: string): Promise<EmployeeCircumstance[]> {
  try {
    const snap = await getDocs(collection(db, 'employeeCircumstances'));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as EmployeeCircumstance))
      .filter((c) => c.employeeId === employeeId)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  } catch (err) {
    console.error('Erreur getEmployeeCircumstances:', err);
    return [];
  }
}

/**
 * Créer une circonstance datée et recalculer le statut + Solde de Tout Compte si définitive
 */
export async function createCircumstance(
  circ: Omit<EmployeeCircumstance, 'id'>,
  emp: EmployeeWithContract
): Promise<string> {
  const docData: Record<string, any> = {};
  for (const [key, value] of Object.entries(circ)) {
    if (value !== undefined) {
      docData[key] = value;
    }
  }

  const ref = await addDoc(collection(db, 'employeeCircumstances'), sanitizeData(docData));
  const circId = ref.id;

  // Calculer le nouveau statut dérivé
  const allCircs = await getEmployeeCircumstances(emp.id || '');
  const newDerivedStatus = deriveEmployeeStatus(emp, allCircs);

  // Mettre à jour l'employé
  await updateDoc(doc(db, 'employees', emp.id || ''), {
    status: newDerivedStatus,
    updatedAt: new Date().toISOString(),
  });

  // Enregistrer le log d'audit avec old/new value
  await logAuditEvent(
    'CREATE',
    'EMPLOYEES',
    `Création circonstance ${circ.nature} (${circ.startDate} au ${circ.endDate || 'indéfini'}) - Motif: ${circ.reason}`,
    circ.createdBy,
    'GESTIONNAIRE_RH',
    emp.id,
    { status: emp.status || 'Actif' },
    { status: newDerivedStatus, circumstance: circ }
  );

  // Si c'est une circonstance définitive, générer automatiquement le Solde de Tout Compte !
  const isDefinitive = [
    'RUPTURE_CONTRAT',
    'LICENCIEMENT',
    'FIN_CDD',
    'DEMISSION',
    'DECES',
  ].includes(circ.nature);

  if (isDefinitive && emp.id) {
    let terminationReason: any = 'FIN_CDD';
    if (circ.nature === 'LICENCIEMENT') terminationReason = 'LICENCIEMENT_AVEC_PREAVIS';
    if (circ.nature === 'DEMISSION') terminationReason = 'DEMISSION';

    const soldeCalculated = calculateSoldeDeToutCompte({
      employeeId: emp.id,
      employeeMatricule: emp.matricule,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      contractType: emp.currentContract?.type || 'CDI',
      terminationReason,
      terminationDate: circ.startDate,
      seniorityYears: emp.seniorityYears || 1,
      daysWorkedInMonth: 15,
      baseSalary: emp.currentContract?.baseSalary || 500000,
      currency: emp.currentContract?.currency || 'CDF',
      exchangeRate: 2850,
      unusedLeaveDays: 8,
      createdBy: circ.createdBy,
    });

    await saveSoldeDeToutCompte(soldeCalculated);
  }

  return circId;
}

/**
 * Retour anticipé d'une circonstance temporaire
 */
export async function returnEarlyFromCircumstance(
  circId: string,
  employeeId: string,
  returnedEarlyDate: string,
  userEmail: string
): Promise<void> {
  const circRef = doc(db, 'employeeCircumstances', circId);
  const snap = await getDoc(circRef);
  if (!snap.exists()) return;

  const oldData = snap.data() as EmployeeCircumstance;

  await updateDoc(circRef, {
    returnedEarlyDate,
    returnedEarlyBy: userEmail,
    status: 'TERMINE',
  });

  // Mettre à jour le statut employé
  const empRef = doc(db, 'employees', employeeId);
  const empSnap = await getDoc(empRef);
  if (empSnap.exists()) {
    const emp = empSnap.data() as Employee;
    const allCircs = await getEmployeeCircumstances(employeeId);
    const newStatus = deriveEmployeeStatus(emp, allCircs);

    await updateDoc(empRef, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
  }

  await logAuditEvent(
    'UPDATE',
    'EMPLOYEES',
    `Retour anticipé de la circonstance le ${returnedEarlyDate}`,
    userEmail,
    'GESTIONNAIRE_RH',
    employeeId,
    oldData,
    { returnedEarlyDate, status: 'TERMINE' }
  );
}

/**
 * Réintégration d'un employé archivé/inactif
 */
export async function reintegrateEmployee(
  employeeId: string,
  userEmail: string,
  reason: string
): Promise<void> {
  const empRef = doc(db, 'employees', employeeId);
  const snap = await getDoc(empRef);
  if (!snap.exists()) return;

  const oldEmp = snap.data() as Employee;

  await updateDoc(empRef, {
    status: 'Actif',
    isDeleted: false,
    updatedAt: new Date().toISOString(),
  });

  await logAuditEvent(
    'UPDATE',
    'EMPLOYEES',
    `Réintégration de l'employé dans les effectifs - Motif: ${reason}`,
    userEmail,
    'SUPER_ADMIN',
    employeeId,
    { status: oldEmp.status, isDeleted: oldEmp.isDeleted },
    { status: 'Actif', isDeleted: false, reintegratedReason: reason }
  );
}

/**
 * Enregistrer une nouvelle photo (Caméra ou Import) avec traçabilité dans l'historique
 */
export async function updateEmployeePhoto(
  employeeId: string,
  photoUrl: string,
  method: 'CAMERA' | 'UPLOAD',
  userEmail: string
): Promise<void> {
  const empRef = doc(db, 'employees', employeeId);
  const snap = await getDoc(empRef);
  if (!snap.exists()) return;

  const oldEmp = snap.data() as Employee;
  const history: PhotoRecord[] = oldEmp.photoHistory || [];

  const newPhotoRecord: PhotoRecord = {
    url: photoUrl,
    capturedAt: new Date().toISOString(),
    capturedBy: userEmail,
    method,
  };

  history.unshift(newPhotoRecord);

  await updateDoc(empRef, {
    photoUrl,
    photoHistory: history,
    updatedAt: new Date().toISOString(),
  });

  await logAuditEvent(
    'UPDATE',
    'EMPLOYEES',
    `Mise à jour de la photo de profil (Méthode: ${method})`,
    userEmail,
    'GESTIONNAIRE_RH',
    employeeId,
    { oldPhotoUrl: oldEmp.photoUrl },
    { newPhotoUrl: photoUrl }
  );
}

/**
 * Validation des champs obligatoires et formats RDC
 */
export function validateEmployeeData(emp: Partial<Employee>): string[] {
  const errors: string[] = [];

  if (!emp.matricule?.trim()) errors.push('Le matricule est obligatoire.');
  if (!emp.lastName?.trim()) errors.push('Le nom de famille est obligatoire.');
  if (!emp.firstName?.trim()) errors.push('Le prénom est obligatoire.');
  if (!emp.hireDate) errors.push('La date d\'embauche est obligatoire.');
  if (!emp.department?.trim()) errors.push('Le département est obligatoire.');

  // Validation NIF (Numéro d'Impôt RDC - 9 à 11 caractères alphanumériques)
  if (emp.nif && !/^[A-Za-z0-9]{8,12}$/.test(emp.nif.replace(/\s/g, ''))) {
    errors.push('Le NIF (Numéro d\'Impôt) doit comporter entre 8 et 12 caractères alphanumériques.');
  }

  // Validation CNSS RDC (ex: 10 chiffres ou format employeur-C)
  if (emp.cnss && emp.cnss.trim().length < 6) {
    errors.push('Le numéro CNSS est invalide.');
  }

  // Validation Téléphone RDC (+243...)
  if (emp.phone && !/^(\+243|0)[0-9]{9}$/.test(emp.phone.replace(/[\s-]/g, ''))) {
    errors.push('Le numéro de téléphone doit être au format RDC (+243... ou 081/082/099...).');
  }

  // Validation Email
  if (emp.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emp.email)) {
    errors.push('L\'adresse email est au format invalide.');
  }

  return errors;
}

/**
 * Calcul automatique de l'ancienneté en années et mois
 */
export function calculateSeniority(hireDateStr: string): { years: number; months: number } {
  if (!hireDateStr) return { years: 0, months: 0 };
  const hireDate = new Date(hireDateStr);
  const now = new Date();

  let years = now.getFullYear() - hireDate.getFullYear();
  let months = now.getMonth() - hireDate.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  return { years: Math.max(0, years), months: Math.max(0, months) };
}

/**
 * Récupérer tous les employés actifs (non supprimés physiquement)
 */
export async function getEmployees(): Promise<EmployeeWithContract[]> {
  try {
    const empSnap = await getDocs(collection(db, 'employees'));
    const contractsSnap = await getDocs(collection(db, 'contracts'));

    const allContracts = contractsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Contract))
      .filter((c) => !c.isDeleted);

    const employees: EmployeeWithContract[] = [];

    for (const d of empSnap.docs) {
      const empData = { id: d.id, ...d.data() } as Employee;
      if (empData.isDeleted) continue; // Suppression logique respectée

      const currentContract = allContracts.find(
        (c) => c.employeeId === d.id && c.isCurrent
      ) || allContracts.find((c) => c.employeeId === d.id);

      const seniority = calculateSeniority(empData.hireDate);

      employees.push({
        ...empData,
        currentContract,
        seniorityYears: seniority.years,
        seniorityMonths: seniority.months,
      });
    }

    return employees;
  } catch (err) {
    console.error('Erreur getEmployees:', err);
    return [];
  }
}

/**
 * Créer un employé avec son contrat initial
 */
export async function createEmployee(
  empData: Omit<Employee, 'id'>,
  contractData: Omit<Contract, 'id' | 'employeeId'>
): Promise<string> {
  const errors = validateEmployeeData(empData);
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }

  const newEmpRef = doc(collection(db, 'employees'));
  const empId = newEmpRef.id;

  const fullEmp: Employee = {
    ...empData,
    id: empId,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(newEmpRef, sanitizeData(fullEmp));

  // Créer le contrat
  const newContractRef = doc(collection(db, 'contracts'));
  const fullContract: Contract = {
    ...contractData,
    id: newContractRef.id,
    employeeId: empId,
    isCurrent: true,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(newContractRef, sanitizeData(fullContract));
  return empId;
}

/**
 * Mettre à jour un employé
 */
export async function updateEmployee(id: string, updates: Partial<Employee>): Promise<void> {
  await updateDoc(doc(db, 'employees', id), {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Suppression LOGIQUE d'un employé (isDeleted = true, jamais physique)
 */
export async function softDeleteEmployee(id: string): Promise<void> {
  await updateDoc(doc(db, 'employees', id), {
    isDeleted: true,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Vérifier les contrats expirant sous 30 jours
 */
export function getExpiringContracts(employees: EmployeeWithContract[]): EmployeeWithContract[] {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  return employees.filter((emp) => {
    const c = emp.currentContract;
    if (!c || c.type === 'CDI' || !c.endDate) return false;
    const end = new Date(c.endDate);
    return end >= now && end <= thirtyDaysFromNow;
  });
}
