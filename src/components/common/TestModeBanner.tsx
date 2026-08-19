/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * 
 * BANDEAU DU MODE TEST & DÉMONSTRATION RDC
 */

import React, { useState } from 'react';
import { TEST_ACCOUNTS, resetDemoData, clearAllDemoData } from '../../services/seedService';
import { UserProfile, RoleCode } from '../../types/auth';
import { loginUser } from '../../services/authService';
import { RefreshCw, ShieldAlert, Key, Users, Check, Trash2, Database } from 'lucide-react';

interface TestModeBannerProps {
  currentUser: UserProfile | null;
  onUserSwitched: (user: UserProfile) => void;
}

export const TestModeBanner: React.FC<TestModeBannerProps> = ({ currentUser, onUserSwitched }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [resetType, setResetType] = useState<'PURGE_EMPTY' | 'SEED_DEMO' | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  const handleSwitchAccount = async (account: typeof TEST_ACCOUNTS[0]) => {
    try {
      const newUser = await loginUser(account.email, account.password);
      onUserSwitched(newUser);
    } catch (err) {
      console.error('Erreur switch compte demo:', err);
    }
  };

  const handleCopyCredentials = (account: typeof TEST_ACCOUNTS[0]) => {
    navigator.clipboard.writeText(`Email: ${account.email} | Mot de passe: ${account.password}`);
    setCopiedAccount(account.email);
    setTimeout(() => setCopiedAccount(null), 2000);
  };

  const handleRunPurgeOrReset = async () => {
    if (!resetType) return;
    setIsResetting(true);
    try {
      if (resetType === 'PURGE_EMPTY') {
        await clearAllDemoData();
      } else {
        await resetDemoData();
      }
      window.location.reload();
    } catch (err) {
      console.error('Erreur lors de l\'opération sur les données:', err);
      alert('Erreur lors de l\'exécution.');
    } finally {
      setIsResetting(false);
      setResetType(null);
      setConfirmModalOpen(false);
    }
  };

  return (
    <div className="bg-[#0D1B2A] text-white border-b border-amber-500/30 text-xs py-2 px-3 sm:px-6 shadow-md transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Left Indicator */}
        <div className="flex items-center gap-2 text-center sm:text-left flex-wrap justify-center sm:justify-start">
          <span className="flex h-2.5 w-2.5 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <span className="font-black text-amber-400 tracking-wide uppercase text-[10px] sm:text-[11px]">MODE TEST & AUDIT DÉMO</span>
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="hidden md:inline text-slate-300">
            Gestion de Données : Purge Vierge ou Jeu de Test RDC (Barèmes 2026)
          </span>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center w-full sm:w-auto">
          {/* Toggle Accounts Drawer */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold px-2.5 sm:px-3 py-1.5 rounded-md border border-slate-700 transition flex items-center gap-1.5 shadow-xs text-[11px] sm:text-xs min-h-[36px]"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Rôles ({TEST_ACCOUNTS.length})</span>
          </button>

          {/* Reset/Purge Data Button */}
          {currentUser?.roles.includes(RoleCode.SUPERADMIN) && (
            <button
              onClick={() => setConfirmModalOpen(true)}
              disabled={isResetting}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-2.5 sm:px-3 py-1.5 rounded-md transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 text-[11px] sm:text-xs min-h-[36px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="truncate">Gestion Données</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Roles Drawer */}
      {isOpen && (
        <div className="mt-3 pt-3 border-t border-slate-800 max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 animate-fadeIn">
          {TEST_ACCOUNTS.map((acc) => {
            const isCurrent = currentUser?.email === acc.email;
            return (
              <div
                key={acc.email}
                className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition ${
                  isCurrent
                    ? 'bg-amber-500/15 border-amber-500 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className={`w-2 h-2 rounded-full ${acc.color}`}></span>
                    <span className="truncate">{acc.roleName}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{acc.email}</div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => handleCopyCredentials(acc)}
                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                    title="Copier les identifiants"
                  >
                    {copiedAccount === acc.email ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Key className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => handleSwitchAccount(acc)}
                    disabled={isCurrent}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                      isCurrent
                        ? 'bg-amber-500 text-slate-950 cursor-default'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    {isCurrent ? 'Actif' : 'Basculer'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal Purge / Reset */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 border-b pb-3">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-base font-black text-[#1F3864]">Gestion de la Base de Données</h3>
                <p className="text-xs text-slate-500 font-medium">Choisissez l'action à exécuter sur Firestore</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Choice 1: Purge Complete */}
              <div
                onClick={() => setResetType('PURGE_EMPTY')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                  resetType === 'PURGE_EMPTY'
                    ? 'border-red-600 bg-red-50 text-red-950'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                }`}
              >
                <Trash2 className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs text-red-900">Purger à zéro (Base Vierge pour simulation)</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Efface tous les salariés, contrats, paies, prêts, présences et bons médicaux. Vous démarrez avec une base entièrement vide pour créer vos propres données.
                  </div>
                </div>
              </div>

              {/* Choice 2: Seed Demo */}
              <div
                onClick={() => setResetType('SEED_DEMO')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                  resetType === 'SEED_DEMO'
                    ? 'border-amber-500 bg-amber-50 text-amber-950'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                }`}
              >
                <Database className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs text-amber-900">Régénérer le Jeu de Démo RDC</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    Efface les données actuelles et ré-injecte le jeu de test complet (20 salariés de démonstration, contrats 2026, bulletins de paie et historiques).
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => {
                  setConfirmModalOpen(false);
                  setResetType(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Annuler
              </button>
              <button
                onClick={handleRunPurgeOrReset}
                disabled={!resetType || isResetting}
                className="px-5 py-2 text-xs font-bold bg-[#1F3864] hover:bg-[#152747] text-white rounded-lg transition flex items-center gap-2 shadow-md disabled:opacity-40"
              >
                {isResetting && <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />}
                <span>{resetType === 'PURGE_EMPTY' ? 'Confirmer la Purge Vierge' : resetType === 'SEED_DEMO' ? 'Confirmer la Réinitialisation Démo' : 'Sélectionner une option'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
