/**
 * @license
 * KaziPay - ERP RH et Paie RDC
 */

export enum RoleCode {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  HR_MANAGER = 'HR_MANAGER',
  PAYROLL_MANAGER = 'PAYROLL_MANAGER',
  FINANCE_MANAGER = 'FINANCE_MANAGER',
  DEPT_MANAGER = 'DEPT_MANAGER',
  SUPERVISOR = 'SUPERVISOR',
  EMPLOYEE = 'EMPLOYEE',
  AUDITOR = 'AUDITOR',
  READONLY = 'READONLY'
}

export const ROLE_LEVELS: Record<RoleCode, number> = {
  [RoleCode.SUPERADMIN]: 100,
  [RoleCode.ADMIN]: 90,
  [RoleCode.HR_MANAGER]: 60,
  [RoleCode.PAYROLL_MANAGER]: 60,
  [RoleCode.FINANCE_MANAGER]: 60,
  [RoleCode.DEPT_MANAGER]: 40,
  [RoleCode.SUPERVISOR]: 40,
  [RoleCode.EMPLOYEE]: 20,
  [RoleCode.AUDITOR]: 20,
  [RoleCode.READONLY]: 10,
};

export enum PermissionKey {
  // Employees
  EMP_VIEW = 'EMP.VIEW',
  EMP_CREATE = 'EMP.CREATE',
  EMP_EDIT = 'EMP.EDIT',
  EMP_DELETE = 'EMP.DELETE',

  // Contracts
  CONTRACT_VIEW = 'CONTRACT.VIEW',
  CONTRACT_MANAGE = 'CONTRACT.MANAGE',

  // Attendance
  ATT_VIEW = 'ATT.VIEW',
  ATT_MANAGE = 'ATT.MANAGE',
  ATT_LOCK = 'ATT.LOCK',

  // Leave
  LEAVE_VIEW = 'LEAVE.VIEW',
  LEAVE_REQUEST = 'LEAVE.REQUEST',
  LEAVE_APPROVE = 'LEAVE.APPROVE',

  // Loans
  LOAN_VIEW = 'LOAN.VIEW',
  LOAN_MANAGE = 'LOAN.MANAGE',

  // Payroll
  PAY_VIEW = 'PAY.VIEW',
  PAY_CALCULATE = 'PAY.CALCULATE',
  PAY_VALIDATE = 'PAY.VALIDATE',
  PAY_CLOSE = 'PAY.CLOSE',

  // Security & Users
  SEC_USERS_MANAGE = 'SEC.USERS_MANAGE',
  SEC_ROLES_MANAGE = 'SEC.ROLES_MANAGE',
  SEC_LOGS_VIEW = 'SEC.LOGS_VIEW',

  // Reports & Settings
  REPORT_RUN = 'REPORT.RUN',
  SETTINGS_MANAGE = 'SETTINGS.MANAGE'
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  roles: RoleCode[];
  maxRoleLevel: number;
  isActivated: boolean;
  isLocked: boolean;
  failedLoginAttempts: number;
  mustChangePassword?: boolean;
  isDeleted?: boolean;
  lastLogin?: string;
  createdAt: string;
}

export interface RoleDefinition {
  code: RoleCode;
  name: string;
  level: number;
  description: string;
}

export interface RolePermissionMapping {
  id?: string;
  roleCode: RoleCode;
  permissionKey: PermissionKey;
  allowed: boolean;
}

export interface SecurityLog {
  id?: string;
  timestamp: string;
  action: 'LOGIN' | 'LOGIN_FAILED' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'USER_CREATED' | 'USER_UPDATED' | 'ROLE_CHANGED' | 'PERMISSION_CHANGED' | 'USER_LOCKED' | 'USER_UNLOCKED';
  actorUid: string;
  actorEmail: string;
  targetUid?: string;
  targetEmail?: string;
  details: string;
}
