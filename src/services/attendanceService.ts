/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * 
 * SERVICE PRÉSENCES, POINTAGES ET GESTION DES TEMPS
 */

import { collection, getDocs, setDoc, doc, updateDoc, addDoc, query, where, getDoc } from 'firebase/firestore';
import { db, sanitizeData } from '../lib/firebase';
import { AttendanceRecord, DailyAttendanceRecord, LeaveRequest, LeaveBalance, DailyAttendanceStatus } from '../types/attendance';
import { EmployeeWithContract } from '../types/employee';

/**
 * Calculateur d'heures et de retards à partir des heures d'arrivée / départ
 */
export function computeDailyTimes(
  clockIn: string | undefined,
  clockOut: string | undefined,
  scheduledIn: string = '08:00',
  scheduledOut: string = '17:00',
  status: DailyAttendanceStatus = 'PRESENT'
): {
  latenessMinutes: number;
  workedHours: number;
  overtimeHours: number;
  overtime130: number;
  overtime160: number;
  overtime200: number;
} {
  if (status !== 'PRESENT' || !clockIn || !clockOut) {
    return {
      latenessMinutes: 0,
      workedHours: 0,
      overtimeHours: 0,
      overtime130: 0,
      overtime160: 0,
      overtime200: 0,
    };
  }

  const [inH, inM] = clockIn.split(':').map(Number);
  const [outH, outM] = clockOut.split(':').map(Number);
  const [schedInH, schedInM] = scheduledIn.split(':').map(Number);
  const [schedOutH, schedOutM] = scheduledOut.split(':').map(Number);

  if (isNaN(inH) || isNaN(inM) || isNaN(outH) || isNaN(outM)) {
    return {
      latenessMinutes: 0,
      workedHours: 8,
      overtimeHours: 0,
      overtime130: 0,
      overtime160: 0,
      overtime200: 0,
    };
  }

  const inMinutes = inH * 60 + inM;
  const outMinutes = outH * 60 + outM;
  const schedInMinutes = schedInH * 60 + schedInM;
  const schedOutMinutes = schedOutH * 60 + schedOutM;

  // Calcul du retard (si arrivée après heure prévue)
  const latenessMinutes = Math.max(0, inMinutes - schedInMinutes);

  // Temps brut passé sur place
  let totalSpanMinutes = Math.max(0, outMinutes - inMinutes);
  // Déduction automatique d'1 heure de pause méridienne si plus de 5 heures de présence
  if (totalSpanMinutes > 300) {
    totalSpanMinutes -= 60;
  }

  const workedHours = Math.round((totalSpanMinutes / 60) * 10) / 10;

  // Heures supplémentaires au-delà de 8h/jour
  const standardDailyMinutes = 8 * 60;
  const otMinutes = Math.max(0, totalSpanMinutes - standardDailyMinutes);
  const overtimeHours = Math.round((otMinutes / 60) * 10) / 10;

  // En droit du travail RDC : 2 premières heures supp = 130%, suivantes de jour = 160%, nuit/férié/dimanche = 200%
  let overtime130 = 0;
  let overtime160 = 0;
  let overtime200 = 0;

  if (overtimeHours > 0) {
    overtime130 = Math.min(2, overtimeHours);
    overtime160 = Math.max(0, overtimeHours - 2);
  }

  return {
    latenessMinutes,
    workedHours,
    overtimeHours,
    overtime130,
    overtime160,
    overtime200,
  };
}

/**
 * Récupérer tous les pointages quotidiens pour une période donnée (YYYYMM)
 */
export async function getDailyAttendanceByPeriod(period: string): Promise<DailyAttendanceRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'daily_attendance'));
    const list = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as DailyAttendanceRecord))
      .filter((a) => a.period === period);
    return list;
  } catch (err) {
    console.error('Erreur getDailyAttendanceByPeriod:', err);
    return [];
  }
}

/**
 * Sauvegarder un pointage journalier
 */
export async function saveDailyAttendanceRecord(record: DailyAttendanceRecord): Promise<void> {
  const docId = `${record.employeeId}_${record.date}`;
  await setDoc(doc(db, 'daily_attendance', docId), sanitizeData({
    ...record,
    updatedAt: new Date().toISOString(),
  }));
}

/**
 * Sauvegarder un lot de pointages journaliers
 */
export async function saveDailyAttendanceBatch(records: DailyAttendanceRecord[]): Promise<void> {
  for (const r of records) {
    const docId = `${r.employeeId}_${r.date}`;
    await setDoc(doc(db, 'daily_attendance', docId), sanitizeData({
      ...r,
      updatedAt: new Date().toISOString(),
    }));
  }
}

/**
 * Génère des données initiales cohérentes de pointage pour un mois donné si la base est vide
 */
export function generateSeedDailyRecordsForPeriod(
  period: string,
  employees: EmployeeWithContract[]
): DailyAttendanceRecord[] {
  const year = parseInt(period.substring(0, 4), 10);
  const month = parseInt(period.substring(4, 6), 10); // 1-12
  const daysInMonth = new Date(year, month, 0).getDate();

  const results: DailyAttendanceRecord[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay(); // 0 = Dimanche, 6 = Samedi

    employees.forEach((emp, empIdx) => {
      if (!emp.id) return;

      let status: DailyAttendanceStatus = 'PRESENT';
      let clockIn = '07:55';
      let clockOut = '17:05';
      let justification = '';
      let deviceId = 'ZK-BIO-01';

      if (dayOfWeek === 0) {
        // Dimanche = Repos
        status = 'REPOS';
        clockIn = '';
        clockOut = '';
      } else if (dayOfWeek === 6) {
        // Samedi = Demi-journée ou repos selon employé
        if (empIdx % 2 === 0) {
          status = 'PRESENT';
          clockIn = '08:00';
          clockOut = '13:00';
        } else {
          status = 'REPOS';
          clockIn = '';
          clockOut = '';
        }
      } else {
        // En semaine
        // Simuler quelques événements réalistes
        const seedVal = (day * 7 + empIdx * 13) % 40;

        if (seedVal === 3 && empIdx === 1) {
          status = 'ABSENT_JUSTIFIE';
          justification = 'Consultation médicale & repos prescrit (Certificat Médical)';
          clockIn = '';
          clockOut = '';
        } else if (seedVal === 7 && empIdx === 3) {
          status = 'MISSION';
          justification = 'Mission d\'audit de site provincial (Lubumbashi/Kolwezi)';
          clockIn = '08:00';
          clockOut = '17:00';
        } else if (seedVal === 11 && empIdx === 0) {
          status = 'CONGE';
          justification = 'Congé annuel légal approuvé';
          clockIn = '';
          clockOut = '';
        } else if (seedVal === 19 && empIdx === 2) {
          status = 'ABSENT_NON_JUSTIFIE';
          justification = 'Absence sans notification préalable';
          clockIn = '';
          clockOut = '';
        } else if (seedVal === 2) {
          // Retard constaté
          clockIn = '08:22';
          clockOut = '17:15';
        } else if (seedVal === 5) {
          // Heures sup
          clockIn = '07:45';
          clockOut = '19:30';
        } else {
          // Normal
          const minutes = (empIdx * 3 + day) % 15;
          clockIn = `07:${String(45 + (minutes % 15)).padStart(2, '0')}`;
          clockOut = `17:${String(5 + (minutes % 25)).padStart(2, '0')}`;
        }
      }

      const times = computeDailyTimes(clockIn, clockOut, '08:00', '17:00', status);

      results.push({
        id: `${emp.id}_${dateStr}`,
        employeeId: emp.id,
        employeeName: `${emp.lastName} ${emp.firstName}`,
        employeeMatricule: emp.matricule,
        department: emp.department,
        date: dateStr,
        period,
        clockIn: clockIn || undefined,
        clockOut: clockOut || undefined,
        scheduledIn: '08:00',
        scheduledOut: '17:00',
        latenessMinutes: times.latenessMinutes,
        workedHours: times.workedHours,
        overtimeHours: times.overtimeHours,
        overtime130: times.overtime130,
        overtime160: times.overtime160,
        overtime200: times.overtime200,
        status,
        justificationReason: justification || undefined,
        deviceId: status === 'PRESENT' ? deviceId : undefined,
        timeclockStatus: status === 'PRESENT' 
          ? (times.latenessMinutes > 0 ? 'Retard Constaté' : 'Pointeurs Synchronisés')
          : (status === 'ABSENT_JUSTIFIE' ? 'Absence Constatée' : status === 'MISSION' ? 'Mission Autorisée' : undefined),
      });
    });
  }

  return results;
}

/**
 * Calculer la synthèse mensuelle (AttendanceRecord) pour chaque employé à partir de ses pointages journaliers
 */
export function aggregateDailyToMonthlySummary(
  period: string,
  dailyRecords: DailyAttendanceRecord[],
  employees: EmployeeWithContract[]
): Record<string, AttendanceRecord> {
  const summary: Record<string, AttendanceRecord> = {};

  employees.forEach((emp) => {
    if (!emp.id) return;
    const empDaily = dailyRecords.filter((d) => d.employeeId === emp.id && d.period === period);

    let daysWorked = 0;
    let absencesJustified = 0;
    let absencesUnjustified = 0;
    let paidLeaveDays = 0;
    let missionDays = 0;
    let totalLatenessMinutes = 0;
    let totalHoursWorked = 0;
    let overtime130 = 0;
    let overtime160 = 0;
    let overtime200 = 0;

    empDaily.forEach((d) => {
      if (d.status === 'PRESENT') {
        daysWorked += 1;
        totalHoursWorked += d.workedHours || 0;
        totalLatenessMinutes += d.latenessMinutes || 0;
        overtime130 += d.overtime130 || 0;
        overtime160 += d.overtime160 || 0;
        overtime200 += d.overtime200 || 0;
      } else if (d.status === 'MISSION') {
        daysWorked += 1; // Les missions sont des jours prestés et payés
        missionDays += 1;
        totalHoursWorked += d.workedHours || 8;
      } else if (d.status === 'CONGE') {
        paidLeaveDays += 1;
      } else if (d.status === 'ABSENT_JUSTIFIE') {
        absencesJustified += 1;
      } else if (d.status === 'ABSENT_NON_JUSTIFIE') {
        absencesUnjustified += 1;
      }
    });

    // Si aucune donnée journalière n'existe encore pour cet employé, valeurs par défaut de base
    if (empDaily.length === 0) {
      daysWorked = 26;
    }

    summary[emp.id] = {
      employeeId: emp.id,
      period,
      daysWorked: Math.min(31, Math.max(0, daysWorked)),
      absences: absencesUnjustified, // Les absences déductibles pour le salaire
      absencesJustified,
      absencesUnjustified,
      paidLeaveDays,
      missionDays,
      totalLatenessMinutes,
      totalHoursWorked: Math.round(totalHoursWorked * 10) / 10,
      overtime130: Math.round(overtime130),
      overtime160: Math.round(overtime160),
      overtime200: Math.round(overtime200),
      clockIn: '08:00',
      clockOut: '17:00',
      latenessMinutes: totalLatenessMinutes,
      timeclockStatus: totalLatenessMinutes > 0 ? 'Retard Constaté' : 'À l\'heure',
      deviceId: 'ZK-BIO-01',
      isLocked: false,
    };
  });

  return summary;
}

export async function getAttendanceByPeriod(period: string): Promise<AttendanceRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'attendance'));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as AttendanceRecord))
      .filter((a) => a.period === period);
  } catch (err) {
    console.error('Erreur getAttendanceByPeriod:', err);
    return [];
  }
}

export async function saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
  const docId = `${record.employeeId}_${record.period}`;
  await setDoc(doc(db, 'attendance', docId), sanitizeData({
    ...record,
    updatedAt: new Date().toISOString(),
  }));
}

export async function lockAttendancePeriod(period: string): Promise<void> {
  const records = await getAttendanceByPeriod(period);
  for (const r of records) {
    if (r.id) {
      await updateDoc(doc(db, 'attendance', r.id), { isLocked: true });
    }
  }
}

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  try {
    const snap = await getDocs(collection(db, 'leave'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LeaveRequest));
  } catch (err) {
    console.error('Erreur getLeaveRequests:', err);
    return [];
  }
}

export async function createLeaveRequest(request: Omit<LeaveRequest, 'id' | 'createdAt'>): Promise<void> {
  await addDoc(collection(db, 'leave'), sanitizeData({
    ...request,
    createdAt: new Date().toISOString(),
  }));
}

export async function updateLeaveStatus(id: string, status: LeaveRequest['status'], approvedBy: string): Promise<void> {
  await updateDoc(doc(db, 'leave', id), {
    status,
    approvedBy,
  });
}

