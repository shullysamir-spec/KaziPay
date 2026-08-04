/**
 * @license
 * KaziPay - ERP RH et Paie RDC
 */

export interface AttendanceRecord {
  id?: string;
  employeeId: string;
  period: string; // YYYYMM (ex: 202607)
  daysWorked: number; // Jours effectivement travaillés
  absences: number; // Jours d'absence non payée
  overtime130: number; // Heures supp à 130%
  overtime160: number; // Heures supp à 160%
  overtime200: number; // Heures supp à 200%
  isLocked: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export type LeaveType = 'Congé annuel' | 'Maternité' | 'Circonstanciel' | 'Maladie';

export type LeaveStatus = 'En attente' | 'Approuvé' | 'Refusé' | 'Annulé';

export interface LeaveRequest {
  id?: string;
  employeeId: string;
  employeeName?: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  daysCount: number;
  status: LeaveStatus;
  reason: string;
  approvedBy?: string;
  createdAt: string;
}

export interface LeaveBalance {
  employeeId: string;
  annualLeaveRemaining: number;
  sickLeaveTaken: number;
  maternityLeaveTaken: number;
  specialLeaveTaken: number;
}
