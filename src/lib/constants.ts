/**
 * @license
 * KaziPay - ERP RH et Paie RDC
 */

import { RoleCode, RoleDefinition, PermissionKey, ROLE_LEVELS } from '../types/auth';

export const ALL_ROLES: RoleDefinition[] = [
  {
    code: RoleCode.SUPERADMIN,
    name: 'Super Administrateur',
    level: ROLE_LEVELS[RoleCode.SUPERADMIN],
    description: 'Accès total sans restriction. Seul habilité à modifier d\'autres Super Administrateurs.',
  },
  {
    code: RoleCode.ADMIN,
    name: 'Administrateur',
    level: ROLE_LEVELS[RoleCode.ADMIN],
    description: 'Gestion de l\'organisation, de la sécurité des comptes et de la configuration système.',
  },
  {
    code: RoleCode.HR_MANAGER,
    name: 'Responsable RH',
    level: ROLE_LEVELS[RoleCode.HR_MANAGER],
    description: 'Gestion complète du personnel, des contrats, des présences et des congés.',
  },
  {
    code: RoleCode.PAYROLL_MANAGER,
    name: 'Gestionnaire de Paie',
    level: ROLE_LEVELS[RoleCode.PAYROLL_MANAGER],
    description: 'Calcul, validation, clôture des traitements de paie et émission des bulletins.',
  },
  {
    code: RoleCode.FINANCE_MANAGER,
    name: 'Responsable Financier',
    level: ROLE_LEVELS[RoleCode.FINANCE_MANAGER],
    description: 'Approbation financière des prêts, paiements bancaires et déclarations fiscales.',
  },
  {
    code: RoleCode.DEPT_MANAGER,
    name: 'Chef de Département',
    level: ROLE_LEVELS[RoleCode.DEPT_MANAGER],
    description: 'Aperçu de l\'effectif de son département, suivi des présences et validation des congés.',
  },
  {
    code: RoleCode.SUPERVISOR,
    name: 'Superviseur de Terrain',
    level: ROLE_LEVELS[RoleCode.SUPERVISOR],
    description: 'Saisie des grilles de présences quotidiennes et premier niveau d\'approbation.',
  },
  {
    code: RoleCode.EMPLOYEE,
    name: 'Employé / Salarié',
    level: ROLE_LEVELS[RoleCode.EMPLOYEE],
    description: 'Espace libre-service: consultation des bulletins de paie personnels et demandes de congés.',
  },
  {
    code: RoleCode.AUDITOR,
    name: 'Auditeur / Inspecteur',
    level: ROLE_LEVELS[RoleCode.AUDITOR],
    description: 'Consultation complète en lecture seule des calculs de paie, déclarations et journaux d\'audit.',
  },
  {
    code: RoleCode.READONLY,
    name: 'Lecture seule',
    level: ROLE_LEVELS[RoleCode.READONLY],
    description: 'Accès de consultation minimal aux données publiques de l\'entreprise.',
  },
];

export const PERMISSION_LABELS: Record<PermissionKey, { label: string; module: string }> = {
  [PermissionKey.EMP_VIEW]: { label: 'Consulter les employés', module: 'Employés' },
  [PermissionKey.EMP_CREATE]: { label: 'Créer un employé', module: 'Employés' },
  [PermissionKey.EMP_EDIT]: { label: 'Modifier / Supprimer un employé', module: 'Employés' },
  [PermissionKey.EMP_DELETE]: { label: 'Suppression logique employé', module: 'Employés' },

  [PermissionKey.CONTRACT_VIEW]: { label: 'Consulter les contrats', module: 'Contrats' },
  [PermissionKey.CONTRACT_MANAGE]: { label: 'Créer / Modifier les contrats', module: 'Contrats' },

  [PermissionKey.ATT_VIEW]: { label: 'Consulter les présences', module: 'Présences' },
  [PermissionKey.ATT_MANAGE]: { label: 'Saisir les heures et absences', module: 'Présences' },
  [PermissionKey.ATT_LOCK]: { label: 'Verrouiller les périodes de présence', module: 'Présences' },

  [PermissionKey.LEAVE_VIEW]: { label: 'Consulter les congés', module: 'Congés' },
  [PermissionKey.LEAVE_REQUEST]: { label: 'Soumettre une demande de congé', module: 'Congés' },
  [PermissionKey.LEAVE_APPROVE]: { label: 'Approuver / Refuser les congés', module: 'Congés' },

  [PermissionKey.LOAN_VIEW]: { label: 'Consulter les prêts', module: 'Prêts' },
  [PermissionKey.LOAN_MANAGE]: { label: 'Octroyer et gérer les prêts', module: 'Prêts' },

  [PermissionKey.PAY_VIEW]: { label: 'Consulter les traitements de paie', module: 'Paie' },
  [PermissionKey.PAY_CALCULATE]: { label: 'Lancer le calcul de la paie', module: 'Paie' },
  [PermissionKey.PAY_VALIDATE]: { label: 'Valider une paie calculée', module: 'Paie' },
  [PermissionKey.PAY_CLOSE]: { label: 'Clôturer et verrouiller la paie', module: 'Paie' },

  [PermissionKey.SEC_USERS_MANAGE]: { label: 'Gérer les comptes utilisateurs', module: 'Sécurité' },
  [PermissionKey.SEC_ROLES_MANAGE]: { label: 'Gérer la matrice de rôles', module: 'Sécurité' },
  [PermissionKey.SEC_LOGS_VIEW]: { label: 'Consulter le journal de sécurité', module: 'Sécurité' },

  [PermissionKey.REPORT_RUN]: { label: 'Générer les rapports et déclarations', module: 'Rapports' },
  [PermissionKey.SETTINGS_MANAGE]: { label: 'Gérer les paramètres légaux RDC', module: 'Paramètres' },
};

import { DEFAULT_COMPANY_CONFIG, ALL_RDC_JOB_POSITIONS, RDC_JOB_POSITIONS_BY_SECTOR } from '../services/companyService';

export const DEFAULT_COMPANY_DETAILS = DEFAULT_COMPANY_CONFIG;
export { ALL_RDC_JOB_POSITIONS, RDC_JOB_POSITIONS_BY_SECTOR };
