/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  Firestore,
  getFirestore,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

/**
 * Initialisation de Firestore avec la base de données configurée
 */
export const db: Firestore = firebaseConfigJson.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(app);

/**
 * Configuration de la persistance locale IndexedDB avec enableIndexedDbPersistence
 * Permet la consultation et la modification des données RH (salariés, paies, congés, présences)
 * même en cas de réseau instable ou de déconnexion temporaire.
 */
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err: { code?: string; message?: string }) => {
    if (err.code === 'failed-precondition') {
      // Plusieurs onglets ouverts simultanément, la persistance fonctionne sur l'onglet principal
      console.warn('Firestore persistence: Plusieurs onglets ouverts simultanément');
    } else if (err.code === 'unimplemented') {
      // Le navigateur ne supporte pas toutes les fonctionnalités d'IndexedDB nécessaires
      console.warn('Firestore persistence: Navigateur incompatible avec la persistance IndexedDB');
    } else {
      console.warn('Firestore persistence notice:', err.message || err);
    }
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error Details:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively cleans an object by stripping any undefined fields or converting undefined to null,
 * preventing Firestore setDoc/updateDoc/addDoc errors ("Unsupported field value: undefined").
 */
export function sanitizeData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Date) {
    return obj as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeData(item)) as unknown as T;
  }
  const cleanObj: Record<string, any> = {};
  for (const key of Object.keys(obj as Record<string, any>)) {
    const value = (obj as Record<string, any>)[key];
    if (value !== undefined) {
      cleanObj[key] = typeof value === 'object' && value !== null ? sanitizeData(value) : value;
    }
  }
  return cleanObj as T;
}

export default app;
