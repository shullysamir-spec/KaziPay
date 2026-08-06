/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * 
 * SERVICE DE NOTIFICATIONS RH & PAIE
 * Alerte RH: Contrats à expiration, Visites Médicales en attente, Demandes de Congés à valider.
 */

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Contract, Employee } from '../types/employee';
import { LeaveRequest } from '../types/attendance';

export type NotificationType = 'CONTRACT_EXPIRING' | 'MEDICAL_PENDING' | 'LEAVE_PENDING';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  date: string;
  targetModule: 'employees' | 'medical' | 'attendance';
  severity: 'high' | 'medium' | 'low';
  isRead: boolean;
  actionUrl?: string;
}

// Key for storing read notification IDs in localStorage so state persists across sessions
const READ_NOTIFS_STORAGE_KEY = 'novarispay_read_notifications';

export function getReadNotificationIds(): string[] {
  try {
    const raw = localStorage.getItem(READ_NOTIFS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markNotificationAsRead(id: string): void {
  const readIds = getReadNotificationIds();
  if (!readIds.includes(id)) {
    readIds.push(id);
    localStorage.setItem(READ_NOTIFS_STORAGE_KEY, JSON.stringify(readIds));
  }
}

export function markAllNotificationsAsRead(ids: string[]): void {
  const readIds = Array.from(new Set([...getReadNotificationIds(), ...ids]));
  localStorage.setItem(READ_NOTIFS_STORAGE_KEY, JSON.stringify(readIds));
}

/**
 * Charge dynamiquement toutes les alertes RH depuis la base Firestore et les modèles par défaut
 */
export async function getHRNotifications(): Promise<NotificationItem[]> {
  const notifications: NotificationItem[] = [];
  const readIds = getReadNotificationIds();
  const now = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(now.getDate() + 30);

  // 1. ALERTES CONTRATS (CDD à expiration sous 30 jours)
  try {
    const empSnap = await getDocs(collection(db, 'employees'));
    const contractsSnap = await getDocs(collection(db, 'contracts'));

    const employees = empSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Employee));
    const contracts = contractsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Contract));

    for (const c of contracts) {
      if (c.isCurrent && !c.isDeleted && c.type === 'CDD' && c.endDate) {
        const endDate = new Date(c.endDate);
        const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

        if (diffDays <= 30) {
          const emp = employees.find((e) => e.id === c.employeeId);
          const empName = emp ? `${emp.lastName} ${emp.firstName}` : `Employé ${c.employeeId}`;
          const notifId = `NOTIF-CONTRACT-${c.id}`;

          notifications.push({
            id: notifId,
            type: 'CONTRACT_EXPIRING',
            title: diffDays <= 0 ? 'Contrat CDD Expiré' : 'Contrat CDD Arrivant à Expiration',
            message: diffDays <= 0
              ? `Le contrat CDD de ${empName} a expiré le ${c.endDate}. Renouvellement ou solde de tout compte requis.`
              : `Le contrat CDD de ${empName} expire dans ${diffDays} jour(s) (${c.endDate}).`,
            date: c.endDate,
            targetModule: 'employees',
            severity: diffDays <= 7 ? 'high' : 'medium',
            isRead: readIds.includes(notifId),
          });
        }
      }
    }
  } catch (err) {
    console.error('Erreur chargement notifications contrats:', err);
  }

  // Fallback / Sample Contract Notifications if none found in db
  if (!notifications.some((n) => n.type === 'CONTRACT_EXPIRING')) {
    const sampleContracts: NotificationItem[] = [
      {
        id: 'NOTIF-CONTRACT-SAMPLE-1',
        type: 'CONTRACT_EXPIRING',
        title: 'Contrat CDD Arrivant à Expiration',
        message: 'Le contrat CDD de MBALA Grâce (RH & Admin) expire le 15 août 2026 (dans 18 jours).',
        date: '2026-08-15',
        targetModule: 'employees',
        severity: 'medium',
        isRead: readIds.includes('NOTIF-CONTRACT-SAMPLE-1'),
      },
      {
        id: 'NOTIF-CONTRACT-SAMPLE-2',
        type: 'CONTRACT_EXPIRING',
        title: 'Contrat CDD Urgent',
        message: 'Le contrat CDD de TSHILOMBO Marc (Exploitation) expire le 02 août 2026 (dans 5 jours). Action requise.',
        date: '2026-08-02',
        targetModule: 'employees',
        severity: 'high',
        isRead: readIds.includes('NOTIF-CONTRACT-SAMPLE-2'),
      },
    ];
    notifications.push(...sampleContracts);
  }

  // 2. ALERTES DEMANDES DE CONGÉS À VALIDATION
  try {
    const leaveSnap = await getDocs(collection(db, 'leave'));
    const leaveRequests = leaveSnap.docs.map((d) => ({ id: d.id, ...d.data() } as LeaveRequest));

    for (const l of leaveRequests) {
      if (l.status === 'En attente') {
        const notifId = `NOTIF-LEAVE-${l.id}`;
        notifications.push({
          id: notifId,
          type: 'LEAVE_PENDING',
          title: 'Demande de Congé à Valider',
          message: `${l.employeeName || 'Un employé'} demande ${l.daysCount} jour(s) de ${l.type.toLowerCase()} du ${l.startDate} au ${l.endDate}.`,
          date: l.createdAt || l.startDate,
          targetModule: 'attendance',
          severity: 'medium',
          isRead: readIds.includes(notifId),
        });
      }
    }
  } catch (err) {
    console.error('Erreur chargement notifications congés:', err);
  }

  // Fallback / Sample Leave Notifications if none found in db
  if (!notifications.some((n) => n.type === 'LEAVE_PENDING')) {
    const sampleLeaves: NotificationItem[] = [
      {
        id: 'NOTIF-LEAVE-SAMPLE-1',
        type: 'LEAVE_PENDING',
        title: 'Demande de Congé Annuel',
        message: 'KASONGO Patrick sollicite 14 jours de congé annuel à compter du 10 août 2026.',
        date: '2026-07-27',
        targetModule: 'attendance',
        severity: 'medium',
        isRead: readIds.includes('NOTIF-LEAVE-SAMPLE-1'),
      },
      {
        id: 'NOTIF-LEAVE-SAMPLE-2',
        type: 'LEAVE_PENDING',
        title: 'Demande de Congé Maternité',
        message: 'KAPINGA Mireille sollicite 90 jours de congé maternité à compter du 01 août 2026.',
        date: '2026-07-26',
        targetModule: 'attendance',
        severity: 'high',
        isRead: readIds.includes('NOTIF-LEAVE-SAMPLE-2'),
      },
    ];
    notifications.push(...sampleLeaves);
  }

  // 3. ALERTES VISITES MÉDICALES & BONS DE SOINS EN ATTENTE
  const sampleMedical: NotificationItem[] = [
    {
      id: 'NOTIF-MED-SAMPLE-1',
      type: 'MEDICAL_PENDING',
      title: 'Rapport Hospitalier à Réviser',
      message: 'HJ Hospitals Kinshasa a transmis le rapport pour KASONGO Patrick (3 jours de repos médical accordés).',
      date: '2026-07-25',
      targetModule: 'medical',
      severity: 'medium',
      isRead: readIds.includes('NOTIF-MED-SAMPLE-1'),
    },
    {
      id: 'NOTIF-MED-SAMPLE-2',
      type: 'MEDICAL_PENDING',
      title: 'Visite Médicale Annuelle Recommandée',
      message: '12 salariés du département Exploitation ont leur visite médicale périodique due avant le 15 août 2026.',
      date: '2026-07-28',
      targetModule: 'medical',
      severity: 'low',
      isRead: readIds.includes('NOTIF-MED-SAMPLE-2'),
    },
  ];
  notifications.push(...sampleMedical);

  // Sort by severity (high first) and date (newest first)
  return notifications.sort((a, b) => {
    if (a.severity === 'high' && b.severity !== 'high') return -1;
    if (b.severity === 'high' && a.severity !== 'high') return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}
