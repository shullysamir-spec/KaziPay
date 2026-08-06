/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 */

import React, { useState } from 'react';
import { loginUser } from '../../services/authService';
import { UserProfile } from '../../types/auth';
import { Language, i18n } from '../../lib/i18n';
import { Lock, Mail, ShieldAlert, KeyRound, CheckCircle2 } from 'lucide-react';

interface LoginFormProps {
  onLoginSuccess: (user: UserProfile) => void;
  lang: Language;
  onOpenAdminInstructions: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLoginSuccess,
  lang,
  onOpenAdminInstructions,
}) => {
  const t = i18n[lang].auth;
  const [email, setEmail] = useState('admin@novarispay.cd');
  const [password, setPassword] = useState('Admin@2026!');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const userProfile = await loginUser(email, password);
      onLoginSuccess(userProfile);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  const quickLoginAs = async (targetEmail: string, roleName: string) => {
    setErrorMsg(null);
    setLoading(true);
    setEmail(targetEmail);
    setPassword('Admin@2026!');
    try {
      const userProfile = await loginUser(targetEmail, 'Admin@2026!');
      onLoginSuccess(userProfile);
    } catch (err: any) {
      setErrorMsg(err.message || `Impossible de se connecter en tant que ${roleName}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 bg-slate-900/90">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Top Header Banner */}
        <div className="bg-[#1F3864] text-white p-6 text-center relative">
          <div className="w-16 h-16 mx-auto bg-[#BF9000] text-[#1F3864] font-black text-3xl rounded-xl flex items-center justify-center shadow-lg mb-3">
            KP
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">NovarisPay</h1>
          <p className="text-xs text-blue-200 mt-1">{t.loginSubtitle}</p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {/* Quick 1-Click Demo Login Selector */}
          <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#BF9000]" />
              <span>Connexion en 1 Clic (Mode Express)</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => quickLoginAs('admin@novarispay.cd', 'Super Admin')}
                disabled={loading}
                className="p-2.5 bg-white border border-slate-300 hover:border-[#1F3864] hover:bg-blue-50 rounded-lg text-left transition shadow-xs group"
              >
                <div className="text-xs font-bold text-[#1F3864] group-hover:text-blue-900">Super Admin</div>
                <div className="text-[10px] text-slate-500 font-mono">admin@novarispay.cd</div>
              </button>

              <button
                type="button"
                onClick={() => quickLoginAs('rh@novarispay.cd', 'Directrice RH')}
                disabled={loading}
                className="p-2.5 bg-white border border-slate-300 hover:border-[#1F3864] hover:bg-blue-50 rounded-lg text-left transition shadow-xs group"
              >
                <div className="text-xs font-bold text-[#1F3864] group-hover:text-blue-900">Directrice RH</div>
                <div className="text-[10px] text-slate-500 font-mono">rh@novarispay.cd</div>
              </button>

              <button
                type="button"
                onClick={() => quickLoginAs('paie@novarispay.cd', 'Responsable Paie')}
                disabled={loading}
                className="p-2.5 bg-white border border-slate-300 hover:border-[#1F3864] hover:bg-blue-50 rounded-lg text-left transition shadow-xs group"
              >
                <div className="text-xs font-bold text-[#1F3864] group-hover:text-blue-900">Responsable Paie</div>
                <div className="text-[10px] text-slate-500 font-mono">paie@novarispay.cd</div>
              </button>

              <button
                type="button"
                onClick={() => quickLoginAs('manager@novarispay.cd', 'Manager')}
                disabled={loading}
                className="p-2.5 bg-white border border-slate-300 hover:border-[#1F3864] hover:bg-blue-50 rounded-lg text-left transition shadow-xs group"
              >
                <div className="text-xs font-bold text-[#1F3864] group-hover:text-blue-900">Manager / Service</div>
                <div className="text-[10px] text-slate-500 font-mono">manager@novarispay.cd</div>
              </button>

              <button
                type="button"
                onClick={() => quickLoginAs('finance@novarispay.cd', 'Directeur Financier')}
                disabled={loading}
                className="p-2.5 bg-white border border-slate-300 hover:border-[#1F3864] hover:bg-blue-50 rounded-lg text-left transition shadow-xs group"
              >
                <div className="text-xs font-bold text-[#1F3864] group-hover:text-blue-900">Directeur Financier</div>
                <div className="text-[10px] text-slate-500 font-mono">finance@novarispay.cd</div>
              </button>

              <button
                type="button"
                onClick={() => quickLoginAs('auditeur@novarispay.cd', 'Auditeur Externe')}
                disabled={loading}
                className="p-2.5 bg-white border border-slate-300 hover:border-[#1F3864] hover:bg-blue-50 rounded-lg text-left transition shadow-xs group"
              >
                <div className="text-xs font-bold text-[#1F3864] group-hover:text-blue-900">Auditeur / Inspection</div>
                <div className="text-[10px] text-slate-500 font-mono">auditeur@novarispay.cd</div>
              </button>
            </div>
          </div>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-medium">Ou saisie manuelle</span></div>
          </div>

          {errorMsg && (
            <div className="mb-4 bg-red-50 border-l-4 border-[#C00000] p-3 rounded text-xs text-red-800 flex items-start space-x-2">
              <ShieldAlert className="w-4 h-4 text-[#C00000] flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t.email}</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
                  placeholder="nom@entreprise.cd"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t.password}</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1F3864] hover:bg-[#152747] text-white font-bold py-2.5 px-4 rounded-lg text-sm shadow transition duration-200 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Connexion en cours...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-[#BF9000]" />
                  <span>{t.loginButton}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={onOpenAdminInstructions}
              className="text-xs text-blue-700 hover:underline font-semibold"
            >
              Guide & Instructions de démarrage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
