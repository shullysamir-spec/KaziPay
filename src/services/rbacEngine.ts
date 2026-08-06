/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * 
 * MOTEUR DE EVALUATION DES PERMISSIONS RBAC
 * Respect strict de la séquence d'évaluation et de la garde anti-élévation.
 */

import { UserProfile, RoleCode, PermissionKey, RolePermissionMapping } from '../types/auth';

/**
 * Évalue si l'utilisateur possède la permission demandée.
 * 
 * Ordre de résolution:
 * 1. Pas de session -> refusé.
 * 2. Super Administrateur -> accordé (contourne tout).
 * 3. Refus explicite (allowed=false) sur l'un des rôles détenus -> refusé (prioritaire).
 * 4. Octroi sur l'un des rôles -> accordé (union des rôles).
 * 5. Sinon -> refusé par défaut.
 */
export function checkPermission(
  user: UserProfile | null | undefined,
  permissionKey: PermissionKey,
  rolePermissionsMatrix: RolePermissionMapping[]
): { allowed: boolean; reason: string } {
  // 1. Pas de session
  if (!user || !user.isActivated || user.isLocked) {
    return { allowed: false, reason: 'Pas de session active ou compte inactif/verrouillé' };
  }

  // 2. Super Administrateur (level 100 ou rôle SUPERADMIN)
  if (user.roles.includes(RoleCode.SUPERADMIN) || user.maxRoleLevel >= 100) {
    return { allowed: true, reason: 'Privilège Super Administrateur' };
  }

  const userRoles = user.roles || [];
  if (userRoles.length === 0) {
    return { allowed: false, reason: 'Aucun rôle attribué à cet utilisateur' };
  }

  // Filtrer la matrice pour la permission demandée et les rôles de l'utilisateur
  const relevantMappings = rolePermissionsMatrix.filter(
    (m) => m.permissionKey === permissionKey && userRoles.includes(m.roleCode)
  );

  // 3. Refus explicite (allowed=false) sur l'un des rôles détenus (Prioritaire)
  const explicitDeny = relevantMappings.some((m) => m.allowed === false);
  if (explicitDeny) {
    return { allowed: false, reason: 'Refus explicite appliqué sur l\'un de vos rôles' };
  }

  // 4. Octroi sur l'un des rôles (Union des rôles)
  const explicitGrant = relevantMappings.some((m) => m.allowed === true);
  if (explicitGrant) {
    return { allowed: true, reason: 'Permission accordée par au moins un de vos rôles' };
  }

  // 5. Refus par défaut
  return { allowed: false, reason: 'Permission non attribuée par défaut' };
}

/**
 * GARDE ANTI-ÉLÉVATION
 * Vérifie si l'utilisateur appelant a le droit de modifier un compte cible.
 * - Niveau appelant doit être strictement supérieur au niveau cible.
 * - Personne ne peut modifier un SuperAdmin sauf un SuperAdmin.
 */
export function canManageUser(caller: UserProfile, target: UserProfile): { allowed: boolean; reason: string } {
  if (!caller || !caller.isActivated || caller.isLocked) {
    return { allowed: false, reason: 'Appelant non autorisé' };
  }

  // Super Admin peut tout faire
  if (caller.roles.includes(RoleCode.SUPERADMIN) || caller.maxRoleLevel >= 100) {
    return { allowed: true, reason: 'Super Administrateur' };
  }

  // Personne d'autre ne peut modifier un Super Admin
  if (target.roles.includes(RoleCode.SUPERADMIN) || target.maxRoleLevel >= 100) {
    return { allowed: false, reason: 'Interdiction: Seul un Super Administrateur peut modifier un Super Administrateur' };
  }

  // Garde de niveau strictement supérieur
  if (caller.maxRoleLevel <= target.maxRoleLevel) {
    return {
      allowed: false,
      reason: `Niveau d'habilitation insuffisant (Votre niveau: ${caller.maxRoleLevel} vs Cible: ${target.maxRoleLevel}). Un niveau strictement supérieur est requis.`,
    };
  }

  return { allowed: true, reason: 'Autorisation accordée' };
}
