/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * 
 * SERVICE PRÉSENCES ET CONGÉS
 */

import { collection, getDocs, setDoc, doc, updateDoc, addDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AttendanceRecord, LeaveRequest, LeaveBalance } from '../types/attendance';

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
  await setDoc(doc(db, 'attendance', docId), {
    ...record,
    updatedAt: new Date().toISOString(),
  });
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
  await addDoc(collection(db, 'leave'), {
    ...request,
    createdAt: new Date().toISOString(),
  });
}

export async function updateLeaveStatus(id: string, status: LeaveRequest['status'], approvedBy: string): Promise<void> {
  await updateDoc(doc(db, 'leave', id), {
    status,
    approvedBy,
  });
}
