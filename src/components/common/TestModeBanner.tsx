/**
 * @license
 * KaziPay - ERP RH et Paie RDC
 * 
 * BANDEAU DU MODE TEST & DÉMONSTRATION RDC
 */

import React, { useState } from 'react';
import { TEST_ACCOUNTS, resetDemoData } from '../../services/seedService';
import { UserProfile, RoleCode } from '../../types/auth';
import { loginUser } from '../../services/authService';
import { RefreshCw, ShieldAlert, Key, Users, Check, Sparkles } from 'lucide-react';

interface TestModeBannerProps {
  currentUser: UserProfile | null;
  onUserSwitched: (user: UserProfile) => void;
}

export const TestModeBanner: React.FC<TestModeBannerProps> = ({ currentUser, onUserSwitched }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
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

  const handleRunReset = async () => {
    setIsResetting(true);
    try {
      await resetDemoData();
      window.location.reload();
    } catch (err) {
      console.error('Erreur reset demo data:', err);
      alert('Erreur lors de la réinitialisation des données.');
    } finally {
      setIsResetting(false);
      setConfirmResetOpen(false);
    }
  };

  return (
    <div className="bg-[#0D1B2A] text-white border-b border-amber-500/30 text-xs py-2 px-6 shadow-md transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Left Indicator */}
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <span className="font-black text-amber-400 tracking-wide uppercase text-[11px]">MODE TEST & AUDIT DÉMO</span>
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="hidden md:inline text-slate-300">
            Jeu de test RH RDC complet : 20 Salariés, 3 Paies, Barèmes 2026, Quotas & Multi-Rôles
          </span>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Accounts Drawer */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold px-3 py-1 rounded-md border border-slate-700 transition flex items-center gap-1.5 shadow-xs"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Changer de Rôle ({TEST_ACCOUNTS.length})</span>
          </button>

          {/* Reset Demo Data Button */}
          {currentUser?.roles.includes(RoleCode.SUPERADMIN) && (
            <button
              onClick={() => setConfirmResetOpen(true)}
              disabled={isResetting}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-3 py-1 rounded-md transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>Réinitialiser les Données</span>
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

      {/* Confirmation Modal Reset */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center gap-3 text-amber-600">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold">Réinitialiser le Jeu de Données RH</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Cette action va régénérer la base Firestore avec les <strong>20 salariés de démonstration</strong>, leurs contrats RDC 2026, 3 traitements de paie, les présences et les prêts.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              >
                Annuler
              </button>
              <button
                onClick={handleRunReset}
                disabled={isResetting}
                className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg transition flex items-center gap-2 shadow-sm"
              >
                {isResetting && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Confirmer la réinitialisation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
