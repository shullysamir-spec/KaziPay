/**
 * @license
 * NovarisPay - HR & Payroll Management System
 * 
 * SERVICE DE BOOTSTRAP, SEED INITIAL & MODE TEST DEMO
 */

import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db, sanitizeData } from '../lib/firebase';
import { RoleCode, PermissionKey, UserProfile } from '../types/auth';
import { ALL_ROLES } from '../lib/constants';
import { DEFAULT_STATUTORY_PARAMS_2026, calculatePayslip, calculateSoldeDeToutCompte } from '../payroll/engine';

export const SUPER_ADMIN_CREDENTIALS = {
  email: 'admin@novarispay.cd',
  password: 'Admin@Temp2026!',
  displayName: 'Administrateur Système NovarisPay',
};

export const TEST_ACCOUNTS = [
  {
    roleName: 'Administrateur Système',
    email: 'admin@novarispay.cd',
    password: 'Admin@Temp2026!',
    roleCode: RoleCode.SUPERADMIN,
    color: 'bg-purple-600',
    description: 'Accès total (tous les modules et paramètres)'
  },
  {
    roleName: 'Responsable RH',
    email: 'rh@novarispay.cd',
    password: 'RH@Temp2026!',
    roleCode: RoleCode.HR_MANAGER,
    color: 'bg-blue-600',
    description: 'Gestion du personnel, paie, congés, présences'
  },
  {
    roleName: 'Direction Financière',
    email: 'finance@novarispay.cd',
    password: 'Finance@Temp2026!',
    roleCode: RoleCode.FINANCE_MANAGER,
    color: 'bg-indigo-600',
    description: 'Paie, déclarations, coûts, facturation, rapports financiers'
  },
  {
    roleName: 'Auditeur & Contrôle',
    email: 'auditeur@novarispay.cd',
    password: 'Auditeur@Temp2026!',
    roleCode: RoleCode.AUDITOR,
    color: 'bg-rose-600',
    description: 'Consultation seule (rapports, journaux, aucun droit de modification)'
  },
];

export async function bootstrapSystemData(): Promise<void> {
  // 1. Initialiser les 10 Rôles
  try {
    for (const roleDef of ALL_ROLES) {
      try {
        const roleRef = doc(db, 'roles', roleDef.code);
        const snap = await getDoc(roleRef);
        if (!snap.exists()) {
          await setDoc(roleRef, roleDef);
        }
      } catch (rErr) {
        console.warn(`Rôle ${roleDef.code} non synchronisé (mode hors-ligne):`, rErr);
      }
    }
  } catch (err) {
    console.warn('Initialisation des rôles ignorée en mode hors-ligne:', err);
  }

  // 2. Initialiser la Matrice de Permissions par défaut
  try {
    const rolePermsSnap = await getDocs(collection(db, 'rolePermissions'));
    if (rolePermsSnap.empty) {
      const allPermissions = Object.values(PermissionKey);
      
      for (const permKey of allPermissions) {
        // SUPERADMIN
        await setDoc(doc(db, 'rolePermissions', `${RoleCode.SUPERADMIN}_${permKey}`), {
          roleCode: RoleCode.SUPERADMIN,
          permissionKey: permKey,
          allowed: true,
        });

        // ADMIN
        await setDoc(doc(db, 'rolePermissions', `${RoleCode.ADMIN}_${permKey}`), {
          roleCode: RoleCode.ADMIN,
          permissionKey: permKey,
          allowed: !permKey.startsWith('PAY.'),
        });

        // HR_MANAGER
        await setDoc(doc(db, 'rolePermissions', `${RoleCode.HR_MANAGER}_${permKey}`), {
          roleCode: RoleCode.HR_MANAGER,
          permissionKey: permKey,
          allowed: permKey.startsWith('EMP.') || permKey.startsWith('CONTRACT.') || permKey.startsWith('ATT.') || permKey.startsWith('LEAVE.'),
        });

        // PAYROLL_MANAGER
        await setDoc(doc(db, 'rolePermissions', `${RoleCode.PAYROLL_MANAGER}_${permKey}`), {
          roleCode: RoleCode.PAYROLL_MANAGER,
          permissionKey: permKey,
          allowed: permKey.startsWith('PAY.') || permKey.startsWith('LOAN.') || permKey === PermissionKey.REPORT_RUN,
        });

        // FINANCE_MANAGER
        await setDoc(doc(db, 'rolePermissions', `${RoleCode.FINANCE_MANAGER}_${permKey}`), {
          roleCode: RoleCode.FINANCE_MANAGER,
          permissionKey: permKey,
          allowed: permKey.startsWith('LOAN.') || permKey === PermissionKey.PAY_VIEW || permKey === PermissionKey.REPORT_RUN,
        });

        // AUDITOR / READONLY
        await setDoc(doc(db, 'rolePermissions', `${RoleCode.AUDITOR}_${permKey}`), {
          roleCode: RoleCode.AUDITOR,
          permissionKey: permKey,
          allowed: permKey.endsWith('.VIEW'),
        });
      }
    }
  } catch (err) {
    console.warn('Matrice de permissions ignorée en mode hors-ligne:', err);
  }

  // 3. Initialiser les Paramètres Légaux RDC 2026
  try {
    const statutoryRef = doc(db, 'statutoryParams', DEFAULT_STATUTORY_PARAMS_2026.version);
    const statSnap = await getDoc(statutoryRef);
    if (!statSnap.exists()) {
      await setDoc(statutoryRef, DEFAULT_STATUTORY_PARAMS_2026);
    }
  } catch (err) {
    console.warn('Paramètres légaux RDC 2026 ignorés en mode hors-ligne:', err);
  }

  // 4. Initialiser des employés et jeux complets de démonstration si vides et non purgés par l'utilisateur
  try {
    const sysConfigRef = doc(db, 'systemConfig', 'status');
    const sysConfigSnap = await getDoc(sysConfigRef);
    const isUserPurged = sysConfigSnap.exists() && sysConfigSnap.data()?.userPurged === true;

    const empSnap = await getDocs(collection(db, 'employees'));
    if (empSnap.empty && !isUserPurged) {
      await seedFullDemoDataset();
    }
  } catch (error) {
    console.warn('Chargement des données de démonstration ignoré en mode hors-ligne:', error);
  }
}

/**
 * Purge complète de toutes les données opérationnelles (pour simulation vierge)
 */
export async function clearAllDemoData(): Promise<void> {
  const collectionsToClear = [
    'employees',
    'contracts',
    'employeeCircumstances',
    'attendance',
    'leaves',
    'loans',
    'payrollRuns',
    'payslips',
    'soldesDeToutCompte',
    'auditLogs',
    'payrollRectificatifs',
    'medicalVouchers',
    'hospitalReports',
    'barcodes',
  ];

  for (const colName of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, colName));
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (err) {
      console.warn(`Purge collection ${colName}:`, err);
    }
  }

  // Activer le flag de purge utilisateur pour éviter le ré-ensemencement automatique
  await setDoc(doc(db, 'systemConfig', 'status'), { userPurged: true, updatedAt: new Date().toISOString() });
}

export async function resetDemoData(): Promise<void> {
  await clearAllDemoData();
  // Réinitialiser le flag userPurged et générer le jeu de démo
  await setDoc(doc(db, 'systemConfig', 'status'), { userPurged: false, updatedAt: new Date().toISOString() });
  await seedFullDemoDataset();
}

export async function seedFullDemoDataset(): Promise<void> {
  // 20 Employés et Contrats couvrants tous les cas d'essai RH RDC
  const demoEmployees = [
    {
      id: 'emp-001',
      matricule: 'NP-2026-001',
      lastName: 'KASONGO',
      firstName: 'Jean-Paul',
      gender: 'M',
      birthDate: '1988-04-12',
      nif: 'A221089201',
      cnss: '1004812001-C',
      phone: '+243810123456',
      email: 'jp.kasongo@novarispay.cd',
      address: '12, Av. Kasavubu, Bandalungwa, Kinshasa',
      bankName: 'Equity BCDC',
      bankAccount: '00012-0941289102-44',
      site: 'Kinshasa Siège',
      department: 'Exploitation',
      position: 'Manœuvre Spécialisé (SMIG)',
      hireDate: '2023-01-15',
      status: 'Actif',
      dependents: [
        { id: 'dep-1', fullName: 'Kasongo Marie', birthDate: '2015-06-10', relationship: 'Enfant' },
        { id: 'dep-2', fullName: 'Kasongo Pierre', birthDate: '2018-09-20', relationship: 'Enfant' },
      ],
      isDeleted: false,
      contract: {
        id: 'ctr-001',
        employeeId: 'emp-001',
        type: 'CDD',
        startDate: '2025-08-01',
        endDate: '2026-08-31',
        baseSalary: 741000, // SMIG CDF ~ 260 USD
        currency: 'CDF',
        isCurrent: true,
        isDeleted: false,
      }
    },
    {
      id: 'emp-002',
      matricule: 'NP-2026-002',
      lastName: 'TSHIMANGA',
      firstName: 'Joseph',
      gender: 'M',
      birthDate: '1985-11-03',
      nif: 'A221089202',
      cnss: '1004812002-C',
      phone: '+243820987654',
      email: 'j.tshimanga@novarispay.cd',
      address: '45, Av. des Huileries, Lingwala, Kinshasa',
      bankName: 'Rawbank',
      bankAccount: '05101-0029310291-88',
      site: 'Kinshasa Siège',
      department: 'Finance',
      position: 'Comptable Principal',
      hireDate: '2022-06-01',
      status: 'Actif',
      dependents: [
        { id: 'dep-3', fullName: 'Tshimanga Sarah', birthDate: '2012-03-01', relationship: 'Enfant' },
        { id: 'dep-4', fullName: 'Tshimanga David', birthDate: '2014-05-15', relationship: 'Enfant' },
        { id: 'dep-5', fullName: 'Tshimanga Ruth', birthDate: '2016-08-22', relationship: 'Enfant' },
        { id: 'dep-6', fullName: 'Tshimanga Paul', birthDate: '2018-12-10', relationship: 'Enfant' },
        { id: 'dep-7', fullName: 'Tshimanga Grace', birthDate: '2020-02-18', relationship: 'Enfant' },
        { id: 'dep-8', fullName: 'Tshimanga Samuel', birthDate: '2022-04-30', relationship: 'Enfant' },
      ],
      isDeleted: false,
      contract: {
        id: 'ctr-002',
        employeeId: 'emp-002',
        type: 'CDI',
        startDate: '2022-06-01',
        baseSalary: 3000000, // Contrat CDF
        currency: 'CDF',
        isCurrent: true,
        isDeleted: false,
      }
    },
    {
      id: 'emp-003',
      matricule: 'NP-2026-003',
      lastName: 'KABILA',
      firstName: 'Sarah',
      gender: 'F',
      birthDate: '1990-07-19',
      nif: 'A221089203',
      cnss: '1004812003-C',
      phone: '+243990555444',
      email: 's.kabila@novarispay.cd',
      address: '88, Bd du 30 Juin, Gombe, Kinshasa',
      bankName: 'Standard Bank',
      bankAccount: '00100-3392019283-01',
      site: 'Kinshasa Siège',
      department: 'Ressources Humaines',
      position: 'Directrice RH',
      hireDate: '2021-03-10',
      status: 'Actif',
      dependents: [
        { id: 'dep-9', fullName: 'Kabila Prince', birthDate: '2019-10-05', relationship: 'Enfant' },
      ],
      isDeleted: false,
      contract: {
        id: 'ctr-003',
        employeeId: 'emp-003',
        type: 'CDI',
        startDate: '2021-03-10',
        baseSalary: 2500, // Contrat USD
        currency: 'USD',
        isCurrent: true,
        isDeleted: false,
      }
    },
    {
      id: 'emp-004',
      matricule: 'NP-2026-004',
      lastName: 'MBOYO',
      firstName: 'Marie-Claire',
      gender: 'F',
      birthDate: '1982-01-25',
      nif: 'A221089204',
      cnss: '1004812004-C',
      phone: '+243815000111',
      email: 'mc.mboyo@novarispay.cd',
      address: '15, Av. Roi Baudouin, Gombe, Kinshasa',
      bankName: 'Equity BCDC',
      bankAccount: '00012-7771239901-12',
      site: 'Kinshasa Siège',
      department: 'Direction Générale',
      position: 'Directrice Générale (Plafond IRPP 30%)',
      hireDate: '2020-01-01',
      status: 'Actif',
      dependents: [
        { id: 'dep-10', fullName: 'Mboyo Junior', birthDate: '2010-02-14', relationship: 'Enfant' },
        { id: 'dep-11', fullName: 'Mboyo Claire', birthDate: '2013-05-18', relationship: 'Enfant' },
        { id: 'dep-12', fullName: 'Mboyo Eric', birthDate: '2016-09-02', relationship: 'Enfant' },
        { id: 'dep-13', fullName: 'Mboyo Sophie', birthDate: '2019-11-20', relationship: 'Enfant' },
      ],
      isDeleted: false,
      contract: {
        id: 'ctr-004',
        employeeId: 'emp-004',
        type: 'CDI',
        startDate: '2020-01-01',
        baseSalary: 6000, // Plafond IRPP 30% atteint
        currency: 'USD',
        isCurrent: true,
        isDeleted: false,
      }
    },
    {
      id: 'emp-005',
      matricule: 'NP-2026-005',
      lastName: 'MBALA',
      firstName: 'Marc',
      gender: 'M',
      birthDate: '1995-09-14',
      nif: 'A221089205',
      cnss: '1004812005-C',
      phone: '+243823334455',
      email: 'm.mbala@novarispay.cd',
      address: '7, Av. Université, Lemba, Kinshasa',
      bankName: 'Illico Cash',
      bankAccount: '09912-3849201928-33',
      site: 'Kinshasa Siège',
      department: 'Informatique',
      position: 'Ingénieur Système & Cloud (0 Enfant)',
      hireDate: '2024-02-01',
      status: 'Actif',
      dependents: [], // 0 Enfant
      isDeleted: false,
      contract: {
        id: 'ctr-005',
        employeeId: 'emp-005',
        type: 'CDI',
        startDate: '2024-02-01',
        baseSalary: 1800,
        currency: 'USD',
        isCurrent: true,
        isDeleted: false,
      }
    },
    {
      id: 'emp-006',
      matricule: 'NP-2026-006',
      lastName: 'LUKUSA',
      firstName: 'Antoine',
      gender: 'M',
      birthDate: '1979-12-05',
      nif: 'A221089206',
      cnss: '1004812006-C',
      phone: '+243970112233',
      email: 'a.lukusa@novarispay.cd',
      address: '102, Av. By-Pass, Ngaba, Kinshasa',
      bankName: 'Rawbank',
      bankAccount: '05101-9988112233-44',
      site: 'Lubumbashi Site',
      department: 'Exploitation',
      position: 'Chef de Chantier (Max 9 Enfants)',
      hireDate: '2019-05-10',
      status: 'Actif',
      dependents: Array.from({ length: 9 }).map((_, i) => ({
        id: `dep-lukusa-${i + 1}`,
        fullName: `Lukusa Enfant ${i + 1}`,
        birthDate: `2010-0${(i % 9) + 1}-10`,
        relationship: 'Enfant',
      })),
      isDeleted: false,
      contract: {
        id: 'ctr-006',
        employeeId: 'emp-006',
        type: 'CDI',
        startDate: '2019-05-10',
        baseSalary: 2200000,
        currency: 'CDF',
        isCurrent: true,
        isDeleted: false,
      }
    },
    {
      id: 'emp-007',
      matricule: 'NP-2026-007',
      lastName: 'MWAMBA',
      firstName: 'Christian',
      gender: 'M',
      birthDate: '1993-03-30',
      nif: 'A221089207',
      cnss: '1004812007-C',
      phone: '+243818889900',
      email: 'c.mwamba@novarispay.cd',
      address: '22, Av. Victorie, Kalamu, Kinshasa',
      bankName: 'Equity BCDC',
      bankAccount: '00012-4455667788-99',
      site: 'Kinshasa Siège',
      department: 'Maintenance',
      position: 'Électromécanicien (Embauche le 15)',
      hireDate: '2026-07-15', // Hired mid-month
      status: 'Actif',
      dependents: [{ id: 'dep-mw-1', fullName: 'Mwamba Junior', birthDate: '2021-01-01', relationship: 'Enfant' }],
      isDeleted: false,
      contract: {
        id: 'ctr-007',
        employeeId: 'emp-007',
        type: 'CDD',
        startDate: '2026-07-15',
        endDate: '2027-01-14',
        baseSalary: 1200000,
        currency: 'CDF',
        isCurrent: true,
        isDeleted: false,
      }
    },
    {
      id: 'emp-008',
      matricule: 'NP-2026-008',
      lastName: 'ILUNGA',
      firstName: 'Patrick',
      gender: 'M',
      birthDate: '1991-08-14',
      nif: 'A221089208',
      cnss: '1004812008-C',
      phone: '+243825556677',
      email: 'p.ilunga@novarispay.cd',
      address: '54, Av. Kianza, Ngaba, Kinshasa',
      bankName: 'Standard Bank',
      bankAccount: '00100-8877665544-22',
      site: 'Kinshasa Siège',
      department: 'Informatique',
      position: 'Technicien Réseau (Départ le 10 + STC)',
      hireDate: '2022-09-01',
      status: 'Inactif', // Contract Terminated
      dependents: [{ id: 'dep-ilu-1', fullName: 'Ilunga Kevin', birthDate: '2018-04-12', relationship: 'Enfant' }],
      isDeleted: false,
      contract: {
        id: 'ctr-008',
        employeeId: 'emp-008',
        type: 'CDI',
        startDate: '2022-09-01',
        endDate: '2026-07-10',
        baseSalary: 1500000,
        currency: 'CDF',
        isCurrent: false,
        isDeleted: false,
      }
    },
    {
      id: 'emp-009',
      matricule: 'NP-2026-009',
      lastName: 'KALANGA',
      firstName: 'Beatrice',
      gender: 'F',
      birthDate: '1992-06-22',
      nif: 'A221089209',
      cnss: '1004812009-C',
      phone: '+243991112233',
      email: 'b.kalanga@novarispay.cd',
      address: '14, Av. Nyangwe, Lingwala, Kinshasa',
      bankName: 'Rawbank',
      bankAccount: '05101-3322110099-11',
      site: 'Kinshasa Siège',
      department: 'Administration',
      position: 'Secrétaire de Direction (Congé Maternité)',
      hireDate: '2023-04-01',
      status: 'En congé',
      dependents: [{ id: 'dep-[#1]', fullName: 'Kalanga Baby', birthDate: '2026-06-05', relationship: 'Enfant' }],
      isDeleted: false,
      contract: {
        id: 'ctr-009',
        employeeId: 'emp-009',
        type: 'CDI',
        startDate: '2023-04-01',
        baseSalary: 1100000,
        currency: 'CDF',
        isCurrent: true,
        isDeleted: false,
      }
    },
    {
      id: 'emp-010',
      matricule: 'NP-2026-010',
      lastName: 'BAKAMPA',
      firstName: 'Dieudonné',
      gender: 'M',
      birthDate: '1987-10-10',
      nif: 'A221089210',
      cnss: '1004812010-C',
      phone: '+243812223344',
      email: 'd.bakampa@novarispay.cd',
      address: '8, Av. Univers, Kintambo, Kinshasa',
      bankName: 'Equity BCDC',
      bankAccount: '00012-9988776655-11',
      site: 'Kinshasa Siège',
      department: 'Logistique',
      position: 'Spécialiste Transit (Suspension / Congé Sans Solde)',
      hireDate: '2021-11-15',
      status: 'Suspendu',
      dependents: [{ id: 'dep-bak-1', fullName: 'Bakampa Lea', birthDate: '2016-07-07', relationship: 'Enfant' }],
      isDeleted: false,
      contract: {
        id: 'ctr-010',
        employeeId: 'emp-010',
        type: 'CDI',
        startDate: '2021-11-15',
        baseSalary: 1600000,
        currency: 'CDF',
        isCurrent: true,
        isDeleted: false,
      }
    },
    {
      id: 'emp-011',
      matricule: 'NP-2026-011',
      lastName: 'NSAKA',
      firstName: 'Mireille',
      gender: 'F',
      birthDate: '1989-05-15',
      nif: 'A221089211',
      cnss: '1004812011-C',
      phone: '+243827778899',
      email: 'm.nsaka@novarispay.cd',
      address: '33, Av. Commerce, Gombe, Kinshasa',
      bankName: 'Rawbank',
      bankAccount: '05101-7788990011-22',
      site: 'Kinshasa Siège',
      department: 'Santé & Sécurité',
      position: 'Infirmière d\'Entreprise (Congé Maladie Art. 177)',
      hireDate: '2022-02-01',
      status: 'En maladie',
      dependents: [{ id: 'dep-nsa-1', fullName: 'Nsaka Joel', birthDate: '2017-12-01', relationship: 'Enfant' }],
      isDeleted: false,
      contract: {
        id: 'ctr-011',
        employeeId: 'emp-011',
        type: 'CDI',
        startDate: '2022-02-01',
        baseSalary: 1300000,
        currency: 'CDF',
        isCurrent: true,
        isDeleted: false,
      }
    },
    {
      id: 'emp-012',
      matricule: 'NP-2026-012',
      lastName: 'KIBAMBE',
      firstName: 'Alain',
      gender: 'M',
      birthDate: '1986-07-04',
      nif: 'A221089212',
      cnss: '1004812012-C',
      phone: '+243993334455',
      email: 'a.kibambe@novarispay.cd',
      address: '77, Av. Matadi, Ngaliema, Kinshasa',
      bankName: 'Equity BCDC',
      bankAccount: '00012-1122334455-66',
      site: 'Kinshasa Siège',
      department: 'Transport',
      position: 'Chauffeur Poids Lourds (Mise à Pied 3j Art. 72)',
      hireDate: '2023-08-10',
      status: 'Mis à pied',
      dependents: [{ id: 'dep-kib-1', fullName: 'Kibambe Marc', birthDate: '2019-01-20', relationship: 'Enfant' }],
      isDeleted: false,
      contract: {
        id: 'ctr-012',
        employeeId: 'emp-012',
        type: 'CDI',
        startDate: '2023-08-10',
        baseSalary: 950000,
        currency: 'CDF',
        isCurrent: true,
        isDeleted: false,
      }
    },
    {
      id: 'emp-013',
      matricule: 'NP-2026-013',
      lastName: 'NGALULA',
      firstName: 'Justin',
      gender: 'M',
      birthDate: '1994-11-28',
      nif: 'A221089213',
      cnss: '1004812013-C',
      phone: '+243814445566',
      email: 'j.ngalula@novarispay.cd',
      address: '9, Av. Bokassa, Barumbu, Kinshasa',
      bankName: 'Rawbank',
      bankAccount: '05101-4455667788-33',
      site: 'Kinshasa Siège',
      department: 'Logistique',
      position: 'Magasinier (CDD Rompu + STC)',
      hireDate: '2025-01-01',
      status: 'Inactif',
      dependents: [],
      isDeleted: false,
      contract: {
        id: 'ctr-013',
        employeeId: 'emp-013',
        type: 'CDD',
        startDate: '2025-01-01',
        endDate: '2026-06-30',
        baseSalary: 850000,
        currency: 'CDF',
        isCurrent: false,
        isDeleted: false,
      }
    },
    {
      id: 'emp-014',
      matricule: 'NP-2026-014',
      lastName: 'KALOMBO',
      firstName: 'François',
      gender: 'M',
      birthDate: '1980-02-14',
      nif: 'A221089214',
      cnss: '1004812014-C',
      phone: '+243821112233',
      email: 'f.kalombo@novarispay.cd',
      address: '10, Av. Haut-Congo, Gombe, Kinshasa',
      bankName: 'Standard Bank',
      bankAccount: '00100-1122334455-00',
      site: 'Kinshasa Siège',
      department: 'Direction Financière',
      position: 'Directeur Financier (CFO)',
      hireDate: '2020-06-01',
      status: 'Actif',
      dependents: [
        { id: 'dep-kal-1', fullName: 'Kalombo Paul', birthDate: '2011-03-03', relationship: 'Enfant' },
        { id: 'dep-kal-2', fullName: 'Kalombo Anne', birthDate: '2014-06-06', relationship: 'Enfant' },
        { id: 'dep-kal-3', fullName: 'Kalombo Jean', birthDate: '2017-09-09', relationship: 'Enfant' },
      ],
      isDeleted: false,
      contract: {
        id: 'ctr-014',
        employeeId: 'emp-014',
        type: 'CDI',
        startDate: '2020-06-01',
        baseSalary: 4500,
        currency: 'USD',
        isCurrent: true,
        isDeleted: false,
      }
    },
    {
      id: 'emp-015',
      matricule: 'NP-2026-015',
      lastName: 'MUTOMBO',
      firstName: 'Chantal',
      gender: 'F',
      birthDate: '1991-04-18',
      nif: 'A221089215',
      cnss: '1004812015-C',
      phone: '+243998887766',
      email: 'c.mutombo@novarispay.cd',
      address: '28, Av. Flamboyant, Limete, Kinshasa',
      bankName: 'Equity BCDC',
      bankAccount: '00012-5566778899-00',
      site: 'Kinshasa Siège',
      department: 'Ventes & Marketing',
      position: 'Responsable Commerciale',
      hireDate: '2023-09-01',
      status: 'Actif',
      dependents: [
        { id: 'dep-mut-1', fullName: 'Mutombo Ruth', birthDate: '2018-02-12', relationship: 'Enfant' },
        { id: 'dep-mut-2', fullName: 'Mutombo Caleb', birthDate: '2021-08-20', relationship: 'Enfant' },
      ],
      isDeleted: false,
      contract: {
        id: 'ctr-015',
        employeeId: 'emp-015',
        type: 'CDI',
        startDate: '2023-09-01',
        baseSalary: 1800,
        currency: 'USD',
        isCurrent: true,
        isDeleted: false,
      }
    },
    {
      id: 'emp-016',
      matricule: 'NP-2026-016',
      lastName: 'NSEKA',
      firstName: 'Jacques',
      gender: 'M',
      birthDate: '1984-08-08',
      nif: 'A221089216',
      cnss: '1004812016-C',
      phone: '+243819990011',
      email: 'j.nseka@novarispay.cd',
      address: '12, Av. Likasi, Lubumbashi',
      bankName: 'Rawbank',
      bankAccount: '05101-8899001122-55',
      site: 'Lubumbashi Site',
      department: 'Exploitation',
      position: 'Superviseur de Carrière (Mines Katanga)',
      hireDate: '2021-01-10',
      status: 'Actif',
      dependents: Array.from({ length: 5 }).map((_, i) => ({
        id: `dep-nseka-${i + 1}`,
        fullName: `Nseka Enfant ${i + 1}`,
        birthDate: `2015-0${(i % 5) + 1}-15`,
        relationship: 'Enfant',
      })),
      isDeleted: false,
      contract: {
        id: 'ctr-016',
        employeeId: 'emp-016',
        type: 'CDI',
        startDate: '2021-01-10',
        baseSalary: 2800000,
        currency: 'CDF',
        isCurrent: true,
        isDeleted: false,
      }
    },
    {
      id: 'emp-017',
      matricule: 'NP-2026-017',
      lastName: 'BANZA',
      firstName: 'Syntyche',
      gender: 'F',
      birthDate: '1993-12-12',
      nif: 'A221089217',
      cnss: '1004812017-C',
      phone: '+243824445566',
      email: 's.banza@novarispay.cd',
      address: '4, Av. Batetela, Gombe, Kinshasa',
      bankName: 'Standard Bank',
      bankAccount: '00100-4433221100-99',
      site: 'Kinshasa Siège',
      department: 'Juridique & Contentieux',
      position: 'Juriste d\'Entreprise',
      hireDate: '2022-10-15',
      status: 'Actif',
      dependents: [{ id: 'dep-ban-1', fullName: 'Banza Nathan', birthDate: '2020-05-05', relationship: 'Enfant' }],
      isDeleted: false,
      contract: {
        id: 'ctr-017',
        employeeId: 'emp-017',
        type: 'CDI',
        startDate: '2022-10-15',
        baseSalary: 2200,
        currency: 'USD',
        isCurrent: true,
        isDeleted: false,
      }
    },
    {
      id: 'emp-018',
      matricule: 'NP-2026-018',
      lastName: 'MBUYI',
      firstName: 'Yves',
      gender: 'M',
      birthDate: '1990-01-20',
      nif: 'A221089218',
      cnss: '1004812018-C',
      phone: '+243997776655',
      email: 'y.mbuyi@novarispay.cd',
      address: '66, Av. Sendwe, Kalamu, Kinshasa',
      bankName: 'Equity BCDC',
      bankAccount: '00012-3344556677-88',
      site: 'Kinshasa Siège',
      department: 'R&D',
      position: 'Chargé de Projets RH',
      hireDate: '2023-05-01',
      status: 'Actif',
      dependents: [
        { id: 'dep-mbu-1', fullName: 'Mbuyi Chloe', birthDate: '2019-09-09', relationship: 'Enfant' },
        { id: 'dep-mbu-2', fullName: 'Mbuyi Noah', birthDate: '2022-11-11', relationship: 'Enfant' },
      ],
      isDeleted: false,
      contract: {
        id: 'ctr-018',
        employeeId: 'emp-018',
        type: 'CDI',
        startDate: '2023-05-01',
        baseSalary: 2400000,
        currency: 'CDF',
        isCurrent: true,
        isDeleted: false,
      }
    },
    {
      id: 'emp-019',
      matricule: 'NP-2026-019',
      lastName: 'MPIANA',
      firstName: 'Deborah',
      gender: 'F',
      birthDate: '1996-07-07',
      nif: 'A221089219',
      cnss: '1004812019-C',
      phone: '+243816667788',
      email: 'd.mpiana@novarispay.cd',
      address: '19, Av. Mont-Amba, Lemba, Kinshasa',
      bankName: 'Rawbank',
      bankAccount: '05101-2233445566-77',
      site: 'Kinshasa Siège',
      department: 'Ressources Humaines',
      position: 'Formatrice RH & Onboarding',
      hireDate: '2024-03-01',
      status: 'Actif',
      dependents: [],
      isDeleted: false,
      contract: {
        id: 'ctr-019',
        employeeId: 'emp-019',
        type: 'CDI',
        startDate: '2024-03-01',
        baseSalary: 1400000,
        currency: 'CDF',
        isCurrent: true,
        isDeleted: false,
      }
    },
    {
      id: 'emp-020',
      matricule: 'NP-2026-020',
      lastName: 'KANKU',
      firstName: 'Gédéon',
      gender: 'M',
      birthDate: '1989-10-25',
      nif: 'A221089220',
      cnss: '1004812020-C',
      phone: '+243829990011',
      email: 'g.kanku@novarispay.cd',
      address: '40, Av. Ndjili, Kinshasa',
      bankName: 'Equity BCDC',
      bankAccount: '00012-6677889900-11',
      site: 'Kinshasa Siège',
      department: 'Sécurité & Guarding',
      position: 'Agent de Sécurité & Compliance',
      hireDate: '2025-06-01',
      status: 'Actif',
      dependents: [
        { id: 'dep-kan-1', fullName: 'Kanku Esther', birthDate: '2016-01-01', relationship: 'Enfant' },
        { id: 'dep-kan-2', fullName: 'Kanku Daniel', birthDate: '2018-05-05', relationship: 'Enfant' },
        { id: 'dep-kan-3', fullName: 'Kanku Miriam', birthDate: '2021-09-09', relationship: 'Enfant' },
      ],
      isDeleted: false,
      contract: {
        id: 'ctr-020',
        employeeId: 'emp-020',
        type: 'CDD',
        startDate: '2025-06-01',
        endDate: '2026-11-30',
        baseSalary: 800000,
        currency: 'CDF',
        isCurrent: true,
        isDeleted: false,
      }
    }
  ];

  // Sauvegarder employés et contrats dans Firestore
  for (const emp of demoEmployees) {
    const { contract, ...empData } = emp;
    await setDoc(doc(db, 'employees', emp.id), empData);
    await setDoc(doc(doc(db, 'employees', emp.id), 'contracts', contract.id), contract);
    await setDoc(doc(db, 'contracts', contract.id), contract);
  }

  // 2. Circonstances Datées
  const demoCircumstances = [
    {
      id: 'circ-001',
      employeeId: 'emp-008', // Patrick ILUNGA
      nature: 'RUPTURE_CONTRAT',
      startDate: '2026-07-10',
      reason: 'Rupture conventionnelle d\'un commun accord avec indemnités légales.',
      createdBy: 'rh@novarispay.cd',
      status: 'VALIDE',
    },
    {
      id: 'circ-002',
      employeeId: 'emp-009', // Beatrice KALANGA
      nature: 'CONGE',
      startDate: '2026-06-01',
      endDate: '2026-09-08',
      reason: 'Congé Maternité obligatoire (14 semaines - Code du Travail Art. 130)',
      createdBy: 'rh@novarispay.cd',
      status: 'EN_COURS',
    },
    {
      id: 'circ-003',
      employeeId: 'emp-010', // Dieudonné BAKAMPA
      nature: 'SUSPENSION',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      reason: 'Suspension temporaire de contrat / Congé sans solde pour raisons personnelles.',
      createdBy: 'rh@novarispay.cd',
      status: 'EN_COURS',
    },
    {
      id: 'circ-004',
      employeeId: 'emp-011', // Mireille NSAKA
      nature: 'MALADIE',
      startDate: '2026-07-05',
      endDate: '2026-07-20',
      reason: 'Congé maladie sous certificat médical du Médecin d\'entreprise (Art. 177).',
      createdBy: 'rh@novarispay.cd',
      status: 'EN_COURS',
    },
    {
      id: 'circ-005',
      employeeId: 'emp-012', // Alain KIBAMBE
      nature: 'MISE_A_PIED',
      startDate: '2026-07-12',
      endDate: '2026-07-15',
      reason: 'Sanction disciplinaire mise à pied 3 jours suite absence injustifiée (Art. 72).',
      createdBy: 'rh@novarispay.cd',
      status: 'TERMINE',
    },
    {
      id: 'circ-006',
      employeeId: 'emp-013', // Justin NGALULA
      nature: 'FIN_CDD',
      startDate: '2026-06-30',
      reason: 'Arrivée du CDD à son terme légal sans renouvellement.',
      createdBy: 'rh@novarispay.cd',
      status: 'VALIDE',
    }
  ];

  for (const c of demoCircumstances) {
    await setDoc(doc(db, 'employeeCircumstances', c.id), c);
  }

  // 3. Présences & Heures Sup (Periods: 202605, 202606, 202607)
  const periods = ['202605', '202606', '202607'];
  for (const period of periods) {
    for (const emp of demoEmployees) {
      let daysWorked = 26;
      let overtime130 = 0;
      let overtime160 = 0;
      let overtime200 = 0;

      // Special cases
      if (emp.id === 'emp-001') { overtime130 = 8; overtime160 = 4; } // SMIG Overtime
      if (emp.id === 'emp-005') { overtime130 = 10; overtime200 = 6; } // IT Overtime Sunday
      if (emp.id === 'emp-016') { overtime130 = 12; overtime160 = 8; overtime200 = 4; } // Mines Katanga
      if (period === '202607') {
        if (emp.id === 'emp-007') daysWorked = 13; // Hired 15th
        if (emp.id === 'emp-008') daysWorked = 8; // Left 10th
        if (emp.id === 'emp-010') daysWorked = 0; // Suspended
        if (emp.id === 'emp-012') daysWorked = 23; // Laid off 3 days
      }

      const attId = `att_${period}_${emp.id}`;
      await setDoc(doc(db, 'attendance', attId), {
        id: attId,
        employeeId: emp.id,
        period,
        daysWorked,
        overtime130,
        overtime160,
        overtime200,
        unexcusedAbsences: emp.id === 'emp-012' && period === '202607' ? 3 : 0,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // 4. Congés Payés & Absences
  const demoLeaves = [
    {
      id: 'lv-001',
      employeeId: 'emp-003',
      type: 'CONGE_PAYE',
      startDate: '2026-05-10',
      endDate: '2026-05-24',
      daysCount: 12,
      reason: 'Congé annuel de détente',
      status: 'APPROUVE',
      approvedBy: 'admin@novarispay.cd',
      createdAt: '2026-05-01',
    },
    {
      id: 'lv-002',
      employeeId: 'emp-005',
      type: 'CIRCONSTANCE',
      startDate: '2026-06-15',
      endDate: '2026-06-17',
      daysCount: 2,
      reason: 'Mariage de l\'employé (Art. 146 Code du Travail RDC)',
      status: 'APPROUVE',
      approvedBy: 'rh@novarispay.cd',
      createdAt: '2026-06-10',
    },
    {
      id: 'lv-003',
      employeeId: 'emp-015',
      type: 'CONGE_PAYE',
      startDate: '2026-08-01',
      endDate: '2026-08-15',
      daysCount: 10,
      reason: 'Congé de vacances familiales',
      status: 'EN_ATTENTE',
      createdAt: '2026-07-25',
    },
    {
      id: 'lv-004',
      employeeId: 'emp-018',
      type: 'CONGE_PAYE',
      startDate: '2026-07-01',
      endDate: '2026-07-05',
      daysCount: 4,
      reason: 'Demande tardive non couverte',
      status: 'REJETE',
      rejectionReason: 'Période de clôture projet RH prioritaire.',
      createdAt: '2026-06-28',
    }
  ];

  for (const l of demoLeaves) {
    await setDoc(doc(db, 'leaves', l.id), l);
  }

  // 5. Avances et Prêts (Loans)
  const demoLoans = [
    {
      id: 'loan-001',
      employeeId: 'emp-001',
      label: 'Avance médicale familiale',
      reason: 'Avance médicale familiale',
      totalAmount: 500000,
      amount: 500000,
      currency: 'CDF',
      monthlyDeduction: 100000, // 100 000 CDF / mois
      remainingBalance: 300000,
      startDate: '2026-04-10',
      requestDate: '2026-04-10',
      status: 'EN_COURS',
      approvedBy: 'rh@novarispay.cd',
    },
    {
      id: 'loan-002',
      employeeId: 'emp-006',
      label: 'Prêt équipement maison (Dépassement Quotité Cessible Test)',
      reason: 'Prêt équipement maison (Dépassement Quotité Cessible Test)',
      totalAmount: 2000000,
      amount: 2000000,
      currency: 'CDF',
      monthlyDeduction: 800000, // DÉPASSE la quotité cessible de 30% (~600 000 FC max)!
      remainingBalance: 1600000,
      startDate: '2026-05-01',
      requestDate: '2026-05-01',
      status: 'EN_COURS',
      approvedBy: 'finance@novarispay.cd',
    },
    {
      id: 'loan-003',
      employeeId: 'emp-014',
      label: 'Avance sur salaire scolarité',
      reason: 'Avance sur salaire scolarité',
      totalAmount: 1500,
      amount: 1500,
      currency: 'USD',
      monthlyDeduction: 300,
      remainingBalance: 900,
      startDate: '2026-03-15',
      requestDate: '2026-03-15',
      status: 'EN_COURS',
      approvedBy: 'admin@novarispay.cd',
    }
  ];

  for (const ln of demoLoans) {
    await setDoc(doc(db, 'loans', ln.id), ln);
  }

  // 6. Traitements de Paie (3 Runs: Mai 2026 CLOSED, Juin 2026 CLOSED, Juillet 2026 DRAFT)
  const runsConfig = [
    { id: 'run-202605', period: '202605', label: 'Paie Mai 2026', status: 'CLOSED', closedAt: '2026-05-31T17:00:00Z' },
    { id: 'run-202606', period: '202606', label: 'Paie Juin 2026', status: 'CLOSED', closedAt: '2026-06-30T17:00:00Z' },
    { id: 'run-202607', period: '202607', label: 'Paie Juillet 2026', status: 'DRAFT' },
  ];

  for (const r of runsConfig) {
    let runGrossCDF = 0;
    let runNetCDF = 0;
    let runNetUSD = 0;
    let runIRPPCDF = 0;
    let runCNSSCDF = 0;
    let runEmployerCDF = 0;

    for (const emp of demoEmployees) {
      const contract = emp.contract;
      const baseSalaryCDF = contract.currency === 'USD' ? contract.baseSalary * 2850 : contract.baseSalary;
      const daysWorked = r.period === '202607' && emp.id === 'emp-007' ? 13 : r.period === '202607' && emp.id === 'emp-008' ? 8 : 26;
      const loan = demoLoans.find(l => l.employeeId === emp.id && l.status === 'EN_COURS');
      const loanDeduction = loan ? (loan.currency === 'USD' ? loan.monthlyDeduction * 2850 : loan.monthlyDeduction) : 0;

      const payslip = calculatePayslip({
        employeeId: emp.id,
        employeeMatricule: emp.matricule,
        employeeName: `${emp.lastName} ${emp.firstName}`,
        department: emp.department,
        position: emp.position,
        period: r.period,
        contractType: contract.type as any,
        baseSalary: contract.baseSalary,
        currency: contract.currency as any,
        exchangeRate: 2850,
        daysWorked,
        overtime130Hours: emp.id === 'emp-001' ? 8 : 0,
        overtime160Hours: emp.id === 'emp-016' ? 8 : 0,
        overtime200Hours: emp.id === 'emp-005' ? 6 : 0,
        dependentsCount: emp.dependents ? emp.dependents.length : 0,
        activeLoanMonthlyDeduction: loanDeduction,
        companyEmployeeCount: demoEmployees.length,
        statutoryParams: DEFAULT_STATUTORY_PARAMS_2026,
      });

      payslip.runId = r.id;
      const payslipId = `${r.id}_${emp.id}`;
      await setDoc(doc(db, 'payslips', payslipId), sanitizeData(payslip));

      runGrossCDF += payslip.grossSalaryCDF;
      runNetCDF += payslip.netSalaryCDF;
      runNetUSD += payslip.netSalaryUSD;
      runIRPPCDF += payslip.irppFinalCDF;
      runCNSSCDF += payslip.cnssEmployeeCDF;
      runEmployerCDF += payslip.totalEmployerChargesCDF;
    }

    const runData = {
      id: r.id,
      period: r.period,
      label: r.label,
      exchangeRate: 2850,
      status: r.status,
      closedAt: r.closedAt || null,
      createdAt: '2026-05-01T08:00:00Z',
      createdBy: 'paie@novarispay.cd',
      statutoryVersion: DEFAULT_STATUTORY_PARAMS_2026.version,
      totalGrossCDF: runGrossCDF,
      totalNetCDF: runNetCDF,
      totalNetUSD: runNetUSD,
      totalIRPPCDF: runIRPPCDF,
      totalCNSSEmployeeCDF: runCNSSCDF,
      totalEmployerChargesCDF: runEmployerCDF,
      employeeCount: demoEmployees.length,
    };

    await setDoc(doc(db, 'payrollRuns', r.id), sanitizeData(runData));
  }

  // 7. Soldes de Tout Compte (STC) pour les 2 employés inactifs (emp-008 et emp-013)
  const stc1 = calculateSoldeDeToutCompte({
    employeeId: 'emp-008',
    employeeMatricule: 'NP-2026-008',
    employeeName: 'Patrick ILUNGA',
    contractType: 'CDI',
    terminationReason: 'LICENCIEMENT_AVEC_PREAVIS',
    terminationDate: '2026-07-10',
    seniorityYears: 3.8,
    daysWorkedInMonth: 8,
    baseSalary: 1500000,
    currency: 'CDF',
    exchangeRate: 2850,
    unusedLeaveDays: 14,
    createdBy: 'rh@novarispay.cd',
  });
  await setDoc(doc(db, 'soldesDeToutCompte', 'stc-emp-008'), sanitizeData(stc1));

  const stc2 = calculateSoldeDeToutCompte({
    employeeId: 'emp-013',
    employeeMatricule: 'NP-2026-013',
    employeeName: 'Justin NGALULA',
    contractType: 'CDD',
    terminationReason: 'FIN_CDD',
    terminationDate: '2026-06-30',
    seniorityYears: 1.5,
    daysWorkedInMonth: 26,
    baseSalary: 850000,
    currency: 'CDF',
    exchangeRate: 2850,
    unusedLeaveDays: 6,
    createdBy: 'rh@novarispay.cd',
  });
  await setDoc(doc(db, 'soldesDeToutCompte', 'stc-emp-013'), sanitizeData(stc2));

  // 8. Journaux d'Audit Initialisés
  const demoAuditLogs = [
    {
      id: 'audit-001',
      timestamp: '2026-07-01T08:30:00Z',
      action: 'BOOTSTRAP',
      module: 'SYSTEME',
      description: 'Initialisation globale du système NovarisPay ERP RDC 2026',
      userEmail: 'admin@novarispay.cd',
      role: 'Super Administrateur',
    },
    {
      id: 'audit-002',
      timestamp: '2026-07-10T09:15:00Z',
      action: 'CREATE',
      module: 'EMPLOYEES',
      description: 'Création circonstance RUPTURE_CONTRAT pour Patrick ILUNGA (Fin le 10/07/2026)',
      userEmail: 'rh@novarispay.cd',
      role: 'Gestionnaire RH',
      targetId: 'emp-008',
    },
    {
      id: 'audit-003',
      timestamp: '2026-07-10T09:16:00Z',
      action: 'CREATE',
      module: 'PAYROLL',
      description: 'Génération automatique Solde de Tout Compte (STC) - Net: 2 145 000 CDF',
      userEmail: 'rh@novarispay.cd',
      role: 'Gestionnaire RH',
      targetId: 'stc-emp-008',
    },
    {
      id: 'audit-004',
      timestamp: '2026-07-15T14:20:00Z',
      action: 'CLOSE',
      module: 'PAYROLL',
      description: 'Clôture définitive du traitement de paie Juin 2026',
      userEmail: 'paie@novarispay.cd',
      role: 'Gestionnaire Paie',
      targetId: 'run-202606',
    }
  ];

  for (const log of demoAuditLogs) {
    await setDoc(doc(db, 'auditLogs', log.id), log);
  }
}
