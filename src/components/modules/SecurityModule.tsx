/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 */

import React, { useEffect, useState } from 'react';
import {
  getAllUsers,
  toggleUserLock,
  updateUserRoles,
  getSecurityLogs,
  logSecurityEvent,
} from '../../services/authService';
import { getAuditLogs, AuditLogEntry } from '../../services/auditService';
import { canManageUser } from '../../services/rbacEngine';
import { UserProfile, RoleCode, SecurityLog, PermissionKey, ROLE_LEVELS } from '../../types/auth';
import { ALL_ROLES, PERMISSION_LABELS } from '../../lib/constants';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  ShieldAlert,
  Users,
  KeyRound,
  Lock,
  Unlock,
  Check,
  X,
  User,
  Shield,
  FileText,
  AlertOctagon,
} from 'lucide-react';

interface SecurityModuleProps {
  currentUser: UserProfile | null;
  rolePermissions: any[];
  onRefreshPermissions: () => void;
}

export const SecurityModule: React.FC<SecurityModuleProps> = ({
  currentUser,
  rolePermissions,
  onRefreshPermissions,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'USERS' | 'ROLES' | 'MATRIX' | 'LOGS' | 'AUDIT_TRAIL' | 'PROFILE'>('USERS');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Local state for Matrix editing
  const [matrixMap, setMatrixMap] = useState<Record<string, boolean>>({});

  // Create User modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newTempPassword, setNewTempPassword] = useState('TempPass@2026!');
  const [newRoles, setNewRoles] = useState<RoleCode[]>([RoleCode.EMPLOYEE]);

  const loadSecurityData = async () => {
    setLoading(true);
    const uList = await getAllUsers();
    setUsers(uList);

    const lList = await getSecurityLogs();
    setLogs(lList);

    const aList = await getAuditLogs();
    setAuditLogs(aList);

    // Map matrix
    const map: Record<string, boolean> = {};
    rolePermissions.forEach((rp) => {
      map[`${rp.roleCode}_${rp.permissionKey}`] = rp.allowed;
    });
    setMatrixMap(map);

    setLoading(false);
  };

  useEffect(() => {
    loadSecurityData();
  }, [rolePermissions]);

  const handleToggleLock = async (target: UserProfile) => {
    if (!currentUser) return;
    const check = canManageUser(currentUser, target);
    if (!check.allowed) {
      alert(check.reason);
      return;
    }

    await toggleUserLock(currentUser, target, !target.isLocked);
    loadSecurityData();
  };

  const handleToggleMatrixCell = async (roleCode: RoleCode, permKey: PermissionKey) => {
    if (!currentUser || currentUser.maxRoleLevel < 90) {
      alert('Seul un Administrateur peut éditer la matrice des rôles.');
      return;
    }

    const key = `${roleCode}_${permKey}`;
    const newAllowed = !matrixMap[key];

    setMatrixMap((prev) => ({ ...prev, [key]: newAllowed }));

    await setDoc(doc(db, 'rolePermissions', key), {
      roleCode,
      permissionKey: permKey,
      allowed: newAllowed,
    });

    await logSecurityEvent(
      'PERMISSION_CHANGED',
      currentUser.uid,
      currentUser.email,
      `Modification permission ${permKey} pour le rôle ${roleCode}: ${newAllowed ? 'ACCORDÉ' : 'REFUSÉ'}`
    );

    onRefreshPermissions();
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const newUid = `user_${Date.now()}`;
      const maxLevel = Math.max(...newRoles.map((r) => ROLE_LEVELS[r] || 10));

      const newUser: UserProfile = {
        uid: newUid,
        email: newEmail,
        displayName: newDisplayName,
        roles: newRoles,
        maxRoleLevel: maxLevel,
        isActivated: true,
        isLocked: false,
        failedLoginAttempts: 0,
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', newUid), newUser);
      await logSecurityEvent(
        'USER_CREATED',
        currentUser.uid,
        currentUser.email,
        `Création compte ${newEmail} avec mot de passe temporaire`,
        newUid,
        newEmail
      );

      setIsUserModalOpen(false);
      loadSecurityData();
      alert(`Compte créé ! Mot de passe temporaire : ${newTempPassword}`);
    } catch (err: any) {
      alert('Erreur: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-[#1F3864]">Centre de Sécurité & Contrôle d'Accès (RBAC)</h1>
          <p className="text-xs text-slate-500">
            10 rôles délimités, garde anti-élévation, matrice dynamique et journal d'audit des connexions.
          </p>
        </div>

        {activeSubTab === 'USERS' && (
          <button
            onClick={() => setIsUserModalOpen(true)}
            className="bg-[#1F3864] hover:bg-[#152747] text-white font-bold px-4 py-2 rounded-lg text-xs shadow transition flex items-center space-x-1.5"
          >
            <span>+ Créer un Utilisateur</span>
          </button>
        )}
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 border shadow-sm text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('USERS')}
          className={`flex-1 py-2 rounded-lg transition ${
            activeSubTab === 'USERS' ? 'bg-[#1F3864] text-white shadow' : 'text-slate-600'
          }`}
        >
          Utilisateurs ({users.length})
        </button>
        <button
          onClick={() => setActiveSubTab('ROLES')}
          className={`flex-1 py-2 rounded-lg transition ${
            activeSubTab === 'ROLES' ? 'bg-[#1F3864] text-white shadow' : 'text-slate-600'
          }`}
        >
          10 Rôles NovarisPay
        </button>
        <button
          onClick={() => setActiveSubTab('MATRIX')}
          className={`flex-1 py-2 rounded-lg transition ${
            activeSubTab === 'MATRIX' ? 'bg-[#1F3864] text-white shadow' : 'text-slate-600'
          }`}
        >
          Matrice Rôles x Permissions
        </button>
        <button
          onClick={() => setActiveSubTab('LOGS')}
          className={`flex-1 py-2 rounded-lg transition ${
            activeSubTab === 'LOGS' ? 'bg-[#1F3864] text-white shadow' : 'text-slate-600'
          }`}
        >
          Journal de Sécurité ({logs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('AUDIT_TRAIL')}
          className={`flex-1 py-2 rounded-lg transition ${
            activeSubTab === 'AUDIT_TRAIL' ? 'bg-[#1F3864] text-white shadow' : 'text-slate-600'
          }`}
        >
          Historique d'Audit Traçable ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveSubTab('PROFILE')}
          className={`flex-1 py-2 rounded-lg transition ${
            activeSubTab === 'PROFILE' ? 'bg-[#1F3864] text-white shadow' : 'text-slate-600'
          }`}
        >
          Mon Profil
        </button>
      </div>

      {/* TAB 1: USERS */}
      {activeSubTab === 'USERS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#1F3864] text-white uppercase font-bold text-[11px]">
              <tr>
                <th className="py-3 px-4">Utilisateur</th>
                <th className="py-3 px-4">Rôles Attribués</th>
                <th className="py-3 px-4">Niveau max</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Échecs</th>
                <th className="py-3 px-4 text-right">Actions Garde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.uid} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div>{u.displayName || u.email}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-[#1F3864]">{u.roles?.join(', ')}</span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    Niveau {u.maxRoleLevel}
                  </td>
                  <td className="py-3 px-4">
                    {u.isLocked ? (
                      <span className="bg-red-100 text-[#C00000] font-bold px-2 py-0.5 rounded text-[10px]">
                        Verrouillé
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                        Actif
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-700">{u.failedLoginAttempts || 0}/5</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggleLock(u)}
                      className={`px-3 py-1 rounded text-[11px] font-bold shadow ${
                        u.isLocked
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-red-700 text-white hover:bg-red-800'
                      }`}
                    >
                      {u.isLocked ? 'Déverrouiller' : 'Verrouiller'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: ROLES */}
      {activeSubTab === 'ROLES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ALL_ROLES.map((role) => (
            <div key={role.code} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-sm text-[#1F3864]">{role.name}</span>
                <span className="bg-[#BF9000] text-[#1F3864] font-black text-xs px-2.5 py-0.5 rounded-full">
                  Niveau {role.level}
                </span>
              </div>
              <p className="text-xs text-slate-600">{role.description}</p>
              <div className="text-[10px] text-slate-400 font-mono">Code système: {role.code}</div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: MATRIX */}
      {activeSubTab === 'MATRIX' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto p-4 space-y-3">
          <p className="text-xs text-slate-600">
            Cliquez sur une case pour basculer la permission entre <strong>Accordé</strong> et <strong>Refusé</strong>. Le Super Admin (100) contourne tout.
          </p>

          <table className="w-full text-left text-xs border border-slate-200">
            <thead className="bg-[#1F3864] text-white uppercase text-[10px]">
              <tr>
                <th className="p-2.5 border-b">Permission</th>
                {ALL_ROLES.map((r) => (
                  <th key={r.code} className="p-2.5 border-b text-center font-bold">
                    {r.code} ({r.level})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.keys(PERMISSION_LABELS).map((permKey) => (
                <tr key={permKey}>
                  <td className="p-2.5 font-bold text-slate-800">
                    {PERMISSION_LABELS[permKey as PermissionKey].label}
                    <div className="text-[10px] text-slate-400 font-mono">{permKey}</div>
                  </td>
                  {ALL_ROLES.map((r) => {
                    const key = `${r.code}_${permKey}`;
                    const isAllowed = matrixMap[key] ?? false;

                    return (
                      <td
                        key={r.code}
                        onClick={() => handleToggleMatrixCell(r.code, permKey as PermissionKey)}
                        className={`p-2.5 text-center font-bold cursor-pointer transition select-none ${
                          isAllowed ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-red-50 text-red-800 hover:bg-red-100'
                        }`}
                      >
                        {isAllowed ? 'OUI' : 'NON'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: LOGS */}
      {activeSubTab === 'LOGS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#1F3864] text-white uppercase font-bold text-[11px]">
              <tr>
                <th className="py-3 px-4">Horodatage</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Acteur</th>
                <th className="py-3 px-4">Cible</th>
                <th className="py-3 px-4">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">{log.action}</td>
                  <td className="py-2.5 px-4 text-blue-800">{log.actorEmail}</td>
                  <td className="py-2.5 px-4 text-slate-600">{log.targetEmail || '-'}</td>
                  <td className="py-2.5 px-4 font-sans text-slate-800">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4.5: AUDIT TRAIL */}
      {activeSubTab === 'AUDIT_TRAIL' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-black text-sm text-[#1F3864]">Journal d'Audit Complet & Traçabilité (Audit Trail)</h3>
              <p className="text-xs text-slate-500">
                Historique de toutes les opérations RH & Paie : créations, signatures, sanctions, contrats et clôtures de paie.
              </p>
            </div>
            <button
              onClick={() => {
                const header = 'Horodatage,Module,Action,Utilisateur,Role,Details\n';
                const rows = auditLogs.map(l => `"${l.timestamp}","${l.module}","${l.action}","${l.userEmail}","${l.userRole}","${l.details.replace(/"/g, '""')}"`).join('\n');
                const blob = new Blob([header + rows], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Audit_Trail_NovarisPay_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
              }}
              className="bg-[#1F3864] text-white font-bold px-3 py-1.5 rounded-lg text-xs"
            >
              Export CSV
            </button>
          </div>

          <table className="w-full text-left text-xs text-slate-700 border rounded-lg">
            <thead className="bg-[#1F3864] text-white uppercase font-bold text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Date & Heure</th>
                <th className="py-2.5 px-3">Module</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Utilisateur</th>
                <th className="py-2.5 px-3">Rôle</th>
                <th className="py-2.5 px-3">Détails & Modifications (Diff)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {auditLogs.map((log, idx) => (
                <tr key={log.id || idx} className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-slate-500 font-mono text-[10px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 font-bold text-blue-900 font-mono">{log.module}</td>
                  <td className="py-2 px-3">
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                      log.action === 'RECTIFICATIF' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-700">{log.userEmail}</td>
                  <td className="py-2 px-3 text-slate-500 text-[10px]">{log.userRole}</td>
                  <td className="py-2 px-3 font-medium text-slate-900 space-y-1">
                    <div>{log.details}</div>
                    {(log.oldValue || log.newValue) && (
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-50 p-2 rounded border border-slate-200 mt-1">
                        {log.oldValue && (
                          <div>
                            <span className="text-red-700 font-bold block">Ancienne Valeur:</span>
                            <pre className="whitespace-pre-wrap text-slate-600 bg-red-50 p-1 rounded border border-red-100">{log.oldValue}</pre>
                          </div>
                        )}
                        {log.newValue && (
                          <div>
                            <span className="text-emerald-700 font-bold block">Nouvelle Valeur:</span>
                            <pre className="whitespace-pre-wrap text-slate-800 bg-emerald-50 p-1 rounded border border-emerald-100">{log.newValue}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: PROFILE */}
      {activeSubTab === 'PROFILE' && currentUser && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-xl space-y-4">
          <h2 className="text-base font-bold text-[#1F3864]">Mon Profil Utilisateur</h2>
          <div className="space-y-2 text-xs text-slate-800">
            <div><strong>Email :</strong> {currentUser.email}</div>
            <div><strong>Nom d'affichage :</strong> {currentUser.displayName}</div>
            <div><strong>Rôles rattachés :</strong> {currentUser.roles.join(', ')}</div>
            <div><strong>Niveau d'habilitation max :</strong> {currentUser.maxRoleLevel}</div>
            <div><strong>Dernière connexion :</strong> {currentUser.lastLogin}</div>
          </div>
        </div>
      )}

      {/* Modal User Create */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h2 className="text-base font-bold text-[#1F3864] mb-4">Créer un Nouvel Utilisateur</h2>
            <form onSubmit={handleCreateUserSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Nom Complet</label>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Mot de passe temporaire</label>
                <input
                  type="text"
                  value={newTempPassword}
                  onChange={(e) => setNewTempPassword(e.target.value)}
                  className="w-full p-2 border rounded font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Rôle Principal</label>
                <select
                  onChange={(e) => setNewRoles([e.target.value as RoleCode])}
                  className="w-full p-2 border rounded font-bold"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name} (Niveau {r.level})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 border rounded font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1F3864] text-white font-bold rounded shadow"
                >
                  Créer Compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
