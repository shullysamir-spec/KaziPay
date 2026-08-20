/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * Service de Journal d'Audit & Traçabilité (Audit Trail)
 */

import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface AuditLogEntry {
  id?: string;
  timestamp: string; // ISO String
  userEmail: string;
  userRole: string;
  module: string; // 'EMPLOYEES' | 'DISCIPLINE' | 'PAYROLL' | 'SECURITY' | 'SETTINGS' | etc.
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RECTIFICATIF' | 'SANCTION' | 'SIGN_LETTER' | 'PAYROLL_RUN' | 'LOGIN' | 'EXPORT' | string;
  details: string;
  targetEntityId?: string;
  oldValue?: string; // Formatted JSON or text of previous state
  newValue?: string; // Formatted JSON or text of new state
  ipAddress?: string;
}

const LOCAL_AUDIT_KEY = 'novarispay_audit_trail_logs';

export const logAuditEvent = async (
  action: AuditLogEntry['action'],
  module: string,
  details: string,
  userEmail: string = 'admin@novarispay.cd',
  userRole: string = 'SUPER_ADMIN',
  targetEntityId?: string,
  oldValue?: any,
  newValue?: any
): Promise<void> => {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    userEmail,
    userRole,
    module,
    action,
    details,
    targetEntityId,
    oldValue: oldValue ? (typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue, null, 2)) : undefined,
    newValue: newValue ? (typeof newValue === 'string' ? newValue : JSON.stringify(newValue, null, 2)) : undefined,
    ipAddress: '127.0.0.1 (Cloud Run RDC)',
  };

  // 1. Save to Local Storage Fallback
  try {
    const existing = localStorage.getItem(LOCAL_AUDIT_KEY);
    const logs: AuditLogEntry[] = existing ? JSON.parse(existing) : [];
    logs.unshift(entry);
    // Keep last 300 logs locally
    localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(logs.slice(0, 300)));
  } catch (err) {
    console.warn('Could not save audit log locally:', err);
  }

  // 2. Save to Firestore
  try {
    const docData: Record<string, any> = {};
    for (const [key, value] of Object.entries(entry)) {
      if (value !== undefined) {
        docData[key] = value;
      }
    }
    await addDoc(collection(db, 'audit_logs'), docData);
  } catch (err) {
    console.warn('Firestore audit log save fallback:', err);
  }
};

export const getAuditLogs = async (): Promise<AuditLogEntry[]> => {
  try {
    const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(200));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as AuditLogEntry),
      }));
    }
  } catch (err) {
    console.warn('Firestore fetch audit logs failed, fallback to local:', err);
  }

  const existing = localStorage.getItem(LOCAL_AUDIT_KEY);
  if (existing) {
    try {
      return JSON.parse(existing);
    } catch {
      return [];
    }
  }

  // Initial seed logs
  const initialLogs: AuditLogEntry[] = [
    {
      id: 'AUD-001',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      userEmail: 'admin@novarispay.cd',
      userRole: 'SUPER_ADMIN',
      module: 'DISCIPLINE',
      action: 'SANCTION',
      details: 'Émission demande d\'explication pour NP-2026-089 (KASONGO Patrick) - Absences Maluku.',
    },
    {
      id: 'AUD-002',
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
      userEmail: 'rh@novarispay.cd',
      userRole: 'GESTIONNAIRE_RH',
      module: 'EMPLOYEES',
      action: 'CREATE',
      details: 'Création contrat Stagiaire pour MBUYI Chantal (Stage Académique UNIKIN).',
    },
    {
      id: 'AUD-003',
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
      userEmail: 'paie@novarispay.cd',
      userRole: 'GESTIONNAIRE_PAIE',
      module: 'PAYROLL',
      action: 'PAYROLL_RUN',
      details: 'Validation du calcul de paie Mensuelle Juillet 2026 (48 salariés).',
    },
  ];
  localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(initialLogs));
  return initialLogs;
};
