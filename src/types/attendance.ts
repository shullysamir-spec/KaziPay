/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 */

export type DailyAttendanceStatus = 
  | 'PRESENT'              // Présent (à l'heure ou retard)
  | 'ABSENT_JUSTIFIE'      // Absent justifié (maladie, motif familial, etc.)
  | 'ABSENT_NON_JUSTIFIE'  // Absent injustifié (déductible salaire)
  | 'MISSION'              // En mission professionnelle
  | 'CONGE'                // Congé légal payé
  | 'REPOS';               // Repos hebdomadaire / Férié

export interface DailyAttendanceRecord {
  id?: string;
  employeeId: string;
  employeeName?: string;
  employeeMatricule?: string;
  department?: string;
  date: string; // Format YYYY-MM-DD
  period: string; // Format YYYYMM (ex: 202607)
  clockIn?: string; // Heure d'arrivée (ex: "07:55")
  clockOut?: string; // Heure de départ (ex: "17:15")
  scheduledIn?: string; // Heure théorique début (ex: "08:00")
  scheduledOut?: string; // Heure théorique fin (ex: "17:00")
  latenessMinutes: number; // Retard constaté en minutes
  earlyDepartureMinutes?: number; // Départ anticipé en minutes
  workedHours: number; // Heures effectivement prestées (ex: 8.5)
  overtimeHours: number; // Total heures supplémentaires du jour
  overtime130?: number; // Heures supp à 130% (2 premières heures de jour)
  overtime160?: number; // Heures supp à 160% (heures suivantes de jour)
  overtime200?: number; // Heures supp à 200% (nuit, dimanche ou jour férié)
  status: DailyAttendanceStatus;
  justificationReason?: string; // Motif si absent justifié ou retard excusé
  notes?: string;
  deviceId?: string; // e.g. "ZK-BIO-01", "RFID-02", "PORTAIL-WEB"
  timeclockStatus?: 'Pointeurs Synchronisés' | 'Saisie Manuelle' | 'Retard Constaté' | 'À l\'heure' | 'Absence Constatée' | 'Mission Autorisée';
  validatedBy?: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id?: string;
  employeeId: string;
  period: string; // YYYYMM (ex: 202607)
  daysWorked: number; // Jours effectivement travaillés (prestés)
  absences: number; // Total jours d'absence non payée / injustifiée
  absencesJustified?: number; // Jours d'absence justifiée
  absencesUnjustified?: number; // Jours d'absence non justifiée
  paidLeaveDays?: number; // Jours de congés légaux pris
  missionDays?: number; // Jours en mission professionnelle
  totalLatenessMinutes?: number; // Total minutes de retard sur la période
  totalHoursWorked?: number; // Total heures prestées
  overtime130: number; // Heures supp à 130%
  overtime160: number; // Heures supp à 160%
  overtime200: number; // Heures supp à 200%
  clockIn?: string; // Heure d'arrivée de référence / habituelle
  clockOut?: string; // Heure de départ de référence / habituelle
  latenessMinutes?: number; // Retard indicatif
  timeclockStatus?: 'Pointeurs Synchronisés' | 'Saisie Manuelle' | 'Retard Constaté' | 'À l\'heure';
  deviceId?: string; // Identifiant de la machine de pointage externe (ex: "ZK-BIO-01")
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

