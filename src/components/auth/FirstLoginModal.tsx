/**
 * @license
 * NovarisPay - ERP RH et Paie RDC (BILINGUAL)
 */

import React, { useState } from 'react';
import { changeUserPassword } from '../../services/authService';
import { UserProfile } from '../../types/auth';
import { useLanguage } from '../../context/LanguageContext';
import { KeyRound, ShieldAlert, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';

interface FirstLoginModalProps {
  user: UserProfile;
  onPasswordChanged: (updated: UserProfile) => void;
}

export const FirstLoginModal: React.FC<FirstLoginModalProps> = ({ user, onPasswordChanged }) => {
  const { lang, t } = useLanguage();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setErrorMsg(lang === 'fr' 
        ? 'Le nouveau mot de passe doit contenir au moins 8 caractères.' 
        : 'New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg(lang === 'fr' ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const updated = await changeUserPassword(user, newPassword);
      onPasswordChanged(updated);
    } catch (err: any) {
      setErrorMsg(err.message || (lang === 'fr' ? 'Erreur lors du changement de mot de passe.' : 'Password change error.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-200">
        <div className="flex items-center space-x-3 mb-4 text-[#071D49]">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
            <KeyRound className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#071D49]">
              {lang === 'fr' ? 'Changement Obligatoire' : 'Mandatory Password Change'}
            </h2>
            <p className="text-xs text-amber-700 font-semibold">
              {lang === 'fr' ? `Première connexion détectée pour ${user.displayName}` : `First login detected for ${user.displayName}`}
            </p>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 mb-5 text-xs text-amber-900 leading-relaxed">
          <p className="font-semibold mb-1 flex items-center gap-1.5 text-amber-800">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{lang === 'fr' ? 'Politique de sécurité renforcée' : 'Reinforced Security Policy'}</span>
          </p>
          {lang === 'fr'
            ? 'Vous utilisez actuellement un mot de passe temporaire. Vous devez obligatoirement définir votre mot de passe personnel pour accéder à votre espace de travail.'
            : 'You are currently using a temporary password. You must set a personal password before accessing your workspace.'}
        </div>

        {errorMsg && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded-xl text-xs text-red-800 flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'fr' ? 'Nouveau mot de passe personnel' : 'New personal password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#287BFF] focus:bg-white transition-all font-medium"
                placeholder={lang === 'fr' ? 'Minimum 8 caractères' : 'Minimum 8 characters'}
                required
                minLength={8}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'fr' ? 'Confirmer le nouveau mot de passe' : 'Confirm new password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#287BFF] focus:bg-white transition-all font-medium"
                placeholder={lang === 'fr' ? 'Répétez exactement le mot de passe' : 'Repeat the exact password'}
                required
                minLength={8}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#287BFF] hover:bg-[#1A6CFA] text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>{lang === 'fr' ? 'Mise à jour sécurisée...' : 'Secure update in progress...'}</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === 'fr' ? 'Valider et Accéder à mon Espace' : 'Confirm & Access Workspace'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
