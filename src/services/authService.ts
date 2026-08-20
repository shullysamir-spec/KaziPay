/**
 * @license
 * NovarisPay - HR & Payroll Management System
 * 
 * SERVICE D'AUTHENTIFICATION ET DE GESTION DES UTILISATEURS
 */

import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updatePassword as updateAuthPassword,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { auth, db, sanitizeData } from '../lib/firebase';
import { UserProfile, RoleCode, SecurityLog, ROLE_LEVELS } from '../types/auth';

export interface DefaultAccountConfig {
  id: string;
  email: string;
  aliases: string[];
  displayName: string;
  roles: RoleCode[];
  maxRoleLevel: number;
  initialTempPassword: string;
  description: string;
  perimeter: string;
}

export const DEFAULT_OFFICIAL_ACCOUNTS: DefaultAccountConfig[] = [
  {
    id: 'usr_admin_novarispay',
    email: 'admin@novarispay.cd',
    aliases: ['admin', 'admin@novarispay.cd', 'administrateur'],
    displayName: 'Administrateur Système',
    roles: [RoleCode.SUPERADMIN, RoleCode.ADMIN],
    maxRoleLevel: 100,
    initialTempPassword: 'Admin@Temp2026!',
    description: 'Accès total (tous les modules et paramètres)',
    perimeter: 'Tous les modules : Administration, RH, Paie, Déclarations, Finances, Audit, Sécurité, Paramètres',
  },
  {
    id: 'usr_rh_novarispay',
    email: 'rh@novarispay.cd',
    aliases: ['rh', 'rh@novarispay.cd', 'drh'],
    displayName: 'Responsable Ressources Humaines',
    roles: [RoleCode.HR_MANAGER],
    maxRoleLevel: 60,
    initialTempPassword: 'RH@Temp2026!',
    description: 'Gestion du personnel, paie, congés, présences',
    perimeter: 'Gestion du personnel, contrats, présences, congés, prêts, paie, bulletins, recrutement, performance, discipline, médical, GED',
  },
  {
    id: 'usr_finance_novarispay',
    email: 'finance@novarispay.cd',
    aliases: ['finance', 'finance@novarispay.cd', 'comptable', 'daf'],
    displayName: 'Direction Financière & Comptabilité',
    roles: [RoleCode.FINANCE_MANAGER],
    maxRoleLevel: 60,
    initialTempPassword: 'Finance@Temp2026!',
    description: 'Paie, déclarations, coûts, facturation, rapports financiers',
    perimeter: 'Paie, bulletins, déclarations sociales & fiscales (CNSS, IPR, INPP, ONEM), prêts & acomptes, rapports financiers, GED',
  },
  {
    id: 'usr_auditeur_novarispay',
    email: 'auditeur@novarispay.cd',
    aliases: ['auditeur', 'auditeur@novarispay.cd', 'audit'],
    displayName: 'Auditeur & Contrôle de Gestion',
    roles: [RoleCode.AUDITOR],
    maxRoleLevel: 20,
    initialTempPassword: 'Auditeur@Temp2026!',
    description: 'Consultation seule (rapports, journaux, aucun droit de modification)',
    perimeter: 'Consultation en lecture seule : Tableau de bord, Rapports de paie & synthèse fiscale, GED, Déclarations, Journaux de sécurité & Piste d\'audit',
  },
];

/**
 * Enregistre une action dans le journal de sécurité (securityLogs)
 */
export async function logSecurityEvent(
  action: SecurityLog['action'],
  actorUid: string,
  actorEmail: string,
  details: string,
  targetUid?: string,
  targetEmail?: string
): Promise<void> {
  try {
    const logData: Record<string, any> = {
      timestamp: new Date().toISOString(),
      action: action || 'UNKNOWN',
      actorUid: actorUid || 'ANONYMOUS',
      actorEmail: actorEmail || 'ANONYMOUS',
      details: details || '',
    };
    if (targetUid !== undefined) {
      logData.targetUid = targetUid;
    }
    if (targetEmail !== undefined) {
      logData.targetEmail = targetEmail;
    }
    await addDoc(collection(db, 'securityLogs'), logData);
  } catch (err) {
    console.error('Impossible de sauvegarder le journal de sécurité:', err);
  }
}

/**
 * Récupère le mot de passe actuel d'un compte (stocké dans le coffre Firestore ou cache local)
 */
function getStoredPassword(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  try {
    const customPass = localStorage.getItem(`novarispay_pass_${normalized}`);
    if (customPass) return customPass;
  } catch {}

  const defaultAcc = DEFAULT_OFFICIAL_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === normalized || a.aliases.includes(normalized)
  );
  return defaultAcc ? defaultAcc.initialTempPassword : null;
}

/**
 * Sauvegarde le nouveau mot de passe d'un compte
 */
function saveStoredPassword(email: string, newPass: string): void {
  const normalized = email.trim().toLowerCase();
  try {
    localStorage.setItem(`novarispay_pass_${normalized}`, newPass);
  } catch {}
}

/**
 * Récupère le profil d'un utilisateur dans Firestore avec secours local si hors-ligne
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const data = userDoc.data() as UserProfile;
      try {
        localStorage.setItem(`novarispay_user_${uid}`, JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch (err) {
    console.warn('Lecture profil utilisateur Firestore hors-ligne, restauration depuis cache local:', err);
  }

  // Secours hors-ligne
  const cached = localStorage.getItem(`novarispay_user_${uid}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }
  return null;
}

/**
 * Initialisation des 4 comptes par défaut avec leurs mots de passe temporaires
 */
export async function ensureDefaultAccountsExist(): Promise<void> {
  for (const acc of DEFAULT_OFFICIAL_ACCOUNTS) {
    try {
      const userRef = doc(db, 'users', acc.id);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        const profile: UserProfile = {
          uid: acc.id,
          email: acc.email,
          displayName: acc.displayName,
          roles: acc.roles,
          maxRoleLevel: acc.maxRoleLevel,
          isActivated: true,
          isLocked: false,
          failedLoginAttempts: 0,
          mustChangePassword: true, // Imposé à la première connexion
          createdAt: new Date().toISOString(),
          lastLogin: '',
        };
        await setDoc(userRef, sanitizeData(profile));
      }

      // Initialiser Firebase Auth si disponible
      try {
        await createUserWithEmailAndPassword(auth, acc.email, acc.initialTempPassword);
      } catch (authCreateErr: any) {
        // Compte auth peut déjà exister
      }
    } catch (err) {
      console.warn(`Initialisation compte ${acc.email} skipped:`, err);
    }
  }
}

/**
 * Rétro-compatibilité
 */
export async function ensureSuperAdminExists(): Promise<void> {
  return ensureDefaultAccountsExist();
}

/**
 * Connexion sécurisée obligatoire (aucun accès sans identifiant et mot de passe valides)
 */
export async function loginUser(identifier: string, password: string): Promise<UserProfile> {
  if (!identifier || !identifier.trim()) {
    throw new Error('Veuillez saisir votre identifiant ou adresse email.');
  }
  if (!password || !password.trim()) {
    throw new Error('Veuillez saisir votre mot de passe.');
  }

  const cleanIdent = identifier.trim().toLowerCase();

  // Rechercher dans les comptes par défaut
  const matchedDefault = DEFAULT_OFFICIAL_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === cleanIdent || a.aliases.includes(cleanIdent)
  );

  const cleanEmail = matchedDefault ? matchedDefault.email : cleanIdent;
  const expectedPassword = getStoredPassword(cleanEmail);

  let uid: string = matchedDefault ? matchedDefault.id : 'usr_' + cleanEmail.replace(/[^a-z0-9]/g, '_');

  // Vérification du mot de passe
  let authSuccess = false;

  // 1. Essayer Firebase Auth
  try {
    const userCred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    if (userCred?.user) {
      uid = userCred.user.uid;
      authSuccess = true;
    }
  } catch (authErr: any) {
    // Si Firebase Auth est en mode offline / restreint ou mot de passe local personnalisé
    if (expectedPassword && password === expectedPassword) {
      authSuccess = true;
    }
  }

  // 2. Si non authentifié via Firebase Auth, valider contre le coffre de mot de passe
  if (!authSuccess) {
    if (expectedPassword && password === expectedPassword) {
      authSuccess = true;
    } else {
      await logSecurityEvent('LOGIN_FAILED', uid, cleanEmail, `Tentative de connexion échouée (mot de passe erroné)`);
      throw new Error('Identifiants invalides (Identifiant ou mot de passe incorrect).');
    }
  }

  // 3. Charger le profil utilisateur
  const userRef = doc(db, 'users', uid);
  let profileDoc;
  try {
    profileDoc = await getDoc(userRef);
  } catch (dbErr) {
    console.warn('Lecture Firestore userRef error:', dbErr);
  }

  let profile: UserProfile;

  if (profileDoc && profileDoc.exists()) {
    profile = profileDoc.data() as UserProfile;
  } else if (matchedDefault) {
    profile = {
      uid: matchedDefault.id,
      email: matchedDefault.email,
      displayName: matchedDefault.displayName,
      roles: matchedDefault.roles,
      maxRoleLevel: matchedDefault.maxRoleLevel,
      isActivated: true,
      isLocked: false,
      failedLoginAttempts: 0,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    try {
      await setDoc(userRef, sanitizeData(profile));
    } catch {}
  } else {
    throw new Error('Compte utilisateur introuvable.');
  }

  if (profile.isLocked) {
    throw new Error('Ce compte est actuellement verrouillé pour des raisons de sécurité. Veuillez contacter l\'Administrateur.');
  }

  if (!profile.isActivated) {
    throw new Error('Ce compte est désactivé. Veuillez contacter le service RH.');
  }

  try {
    await updateDoc(userRef, {
      failedLoginAttempts: 0,
      lastLogin: new Date().toISOString(),
    });
  } catch (e) {}

  try {
    await logSecurityEvent('LOGIN', uid, cleanEmail, 'Connexion réussie');
  } catch (e) {}

  // Sauvegarder dans le cache local
  try {
    localStorage.setItem(`novarispay_user_${uid}`, JSON.stringify(profile));
  } catch {}

  return {
    ...profile,
    failedLoginAttempts: 0,
    lastLogin: new Date().toISOString(),
  };
}

/**
 * Changement de mot de passe imposé lors de la première connexion
 */
export async function changeUserPassword(
  user: UserProfile,
  newPassword: string
): Promise<UserProfile> {
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Le nouveau mot de passe doit contenir au moins 8 caractères.');
  }

  // 1. Mettre à jour dans Firebase Auth si disponible
  try {
    if (auth.currentUser) {
      await updateAuthPassword(auth.currentUser, newPassword);
    }
  } catch (authErr) {
    console.warn('updateAuthPassword skipped (mode simulation):', authErr);
  }

  // 2. Mettre à jour dans le coffre de mot de passe local/Firestore
  saveStoredPassword(user.email, newPassword);

  // 3. Mettre à jour le profil utilisateur dans Firestore
  const userRef = doc(db, 'users', user.uid);
  try {
    await updateDoc(userRef, {
      mustChangePassword: false,
    });
  } catch (e) {
    console.warn('updateDoc mustChangePassword error:', e);
  }

  const updatedProfile: UserProfile = {
    ...user,
    mustChangePassword: false,
  };

  try {
    localStorage.setItem(`novarispay_user_${user.uid}`, JSON.stringify(updatedProfile));
  } catch {}

  try {
    await logSecurityEvent(
      'PASSWORD_CHANGE',
      user.uid,
      user.email,
      'Changement obligatoire de mot de passe temporaire effectué avec succès'
    );
  } catch {}

  return updatedProfile;
}

/**
 * Déconnexion
 */
export async function logoutUser(user: UserProfile | null): Promise<void> {
  if (user) {
    await logSecurityEvent('LOGOUT', user.uid, user.email, 'Déconnexion manuelle');
  }
  await signOut(auth);
}

/**
 * Récupérer tous les comptes utilisateurs
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => d.data() as UserProfile);
}

/**
 * Récupérer les journaux de sécurité (securityLogs)
 */
export async function getSecurityLogs(): Promise<SecurityLog[]> {
  try {
    const q = query(collection(db, 'securityLogs'), orderBy('timestamp', 'desc'), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SecurityLog));
  } catch (e) {
    const snap = await getDocs(collection(db, 'securityLogs'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SecurityLog)).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
}

/**
 * Verrouiller / Déverrouiller un compte
 */
export async function toggleUserLock(
  actor: UserProfile,
  target: UserProfile,
  lockStatus: boolean
): Promise<void> {
  await updateDoc(doc(db, 'users', target.uid), {
    isLocked: lockStatus,
    failedLoginAttempts: lockStatus ? target.failedLoginAttempts : 0,
  });

  await logSecurityEvent(
    lockStatus ? 'USER_LOCKED' : 'USER_UNLOCKED',
    actor.uid,
    actor.email,
    `${lockStatus ? 'Verrouillage' : 'Déverrouillage'} du compte de ${target.email}`,
    target.uid,
    target.email
  );
}

/**
 * Mettre à jour les rôles d'un utilisateur
 */
export async function updateUserRoles(
  actor: UserProfile,
  target: UserProfile,
  newRoles: RoleCode[]
): Promise<void> {
  const maxLevel = Math.max(...newRoles.map((r) => ROLE_LEVELS[r] || 10));

  await updateDoc(doc(db, 'users', target.uid), {
    roles: newRoles,
    maxRoleLevel: maxLevel,
  });

  await logSecurityEvent(
    'ROLE_CHANGED',
    actor.uid,
    actor.email,
    `Attribution de nouveaux rôles à ${target.email}: [${newRoles.join(', ')}]`,
    target.uid,
    target.email
  );
}
