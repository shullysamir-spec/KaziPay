/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 */

import React, { useState } from 'react';
import { loginUser } from '../../services/authService';
import { UserProfile } from '../../types/auth';
import { Language, i18n } from '../../lib/i18n';
import { NovarisLogo } from '../common/NovarisLogo';
import { Lock, Mail, ShieldAlert, KeyRound, CheckCircle2, ShieldCheck, Zap, Globe, Users, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F6F8FC] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 grid grid-cols-1 lg:grid-cols-12 min-h-[680px]">
        
        {/* Left Section: Form & Official Branding */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Header with Official Logo */}
            <div className="mb-8">
              <NovarisLogo variant="full" theme="light" customHeight={48} />
              <p className="text-xs text-slate-500 font-medium mt-3">
                Accédez à la plateforme unifiée de gestion RH et paie d'entreprise.
              </p>
            </div>

            {/* Quick 1-Click Demo Login Selector */}
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#287BFF]" />
                  <span>Connexion Express Demo</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">1 Clic</span>
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => quickLoginAs('admin@novarispay.cd', 'Super Admin')}
                  disabled={loading}
                  className="p-2.5 bg-white border border-slate-200 hover:border-[#287BFF] hover:bg-blue-50/50 rounded-xl text-left transition shadow-xs group"
                >
                  <div className="text-xs font-bold text-[#071D49] group-hover:text-[#287BFF] truncate">Super Admin</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">admin@novarispay.cd</div>
                </button>

                <button
                  type="button"
                  onClick={() => quickLoginAs('rh@novarispay.cd', 'Directrice RH')}
                  disabled={loading}
                  className="p-2.5 bg-white border border-slate-200 hover:border-[#287BFF] hover:bg-blue-50/50 rounded-xl text-left transition shadow-xs group"
                >
                  <div className="text-xs font-bold text-[#071D49] group-hover:text-[#287BFF] truncate">Directrice RH</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">rh@novarispay.cd</div>
                </button>

                <button
                  type="button"
                  onClick={() => quickLoginAs('paie@novarispay.cd', 'Responsable Paie')}
                  disabled={loading}
                  className="p-2.5 bg-white border border-slate-200 hover:border-[#287BFF] hover:bg-blue-50/50 rounded-xl text-left transition shadow-xs group"
                >
                  <div className="text-xs font-bold text-[#071D49] group-hover:text-[#287BFF] truncate">Responsable Paie</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">paie@novarispay.cd</div>
                </button>

                <button
                  type="button"
                  onClick={() => quickLoginAs('manager@novarispay.cd', 'Manager')}
                  disabled={loading}
                  className="p-2.5 bg-white border border-slate-200 hover:border-[#287BFF] hover:bg-blue-50/50 rounded-xl text-left transition shadow-xs group"
                >
                  <div className="text-xs font-bold text-[#071D49] group-hover:text-[#287BFF] truncate">Manager</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">manager@novarispay.cd</div>
                </button>

                <button
                  type="button"
                  onClick={() => quickLoginAs('finance@novarispay.cd', 'Directeur Financier')}
                  disabled={loading}
                  className="p-2.5 bg-white border border-slate-200 hover:border-[#287BFF] hover:bg-blue-50/50 rounded-xl text-left transition shadow-xs group"
                >
                  <div className="text-xs font-bold text-[#071D49] group-hover:text-[#287BFF] truncate">Finances</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">finance@novarispay.cd</div>
                </button>

                <button
                  type="button"
                  onClick={() => quickLoginAs('auditeur@novarispay.cd', 'Auditeur Externe')}
                  disabled={loading}
                  className="p-2.5 bg-white border border-slate-200 hover:border-[#287BFF] hover:bg-blue-50/50 rounded-xl text-left transition shadow-xs group"
                >
                  <div className="text-xs font-bold text-[#071D49] group-hover:text-[#287BFF] truncate">Auditeur</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">auditeur@novarispay.cd</div>
                </button>
              </div>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded-xl text-xs text-red-800 flex items-start space-x-2">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.email}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#287BFF] focus:bg-white transition-all font-medium"
                    placeholder="nom@entreprise.cd"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.password}</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#287BFF] focus:bg-white transition-all font-medium"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#287BFF] hover:bg-[#1A6CFA] text-white font-semibold py-3 px-4 rounded-xl text-xs shadow-md shadow-blue-500/20 transition duration-200 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>Connexion en cours...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{t.loginButton}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              onClick={onOpenAdminInstructions}
              className="text-[#287BFF] hover:underline font-semibold flex items-center gap-1"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Guide de démarrage rapide</span>
            </button>
            <span className="text-slate-400 text-[11px]">NovarisPay v3.2 — RDC Conforme</span>
          </div>
        </div>

        {/* Right Section: Brand Visual Hero Card with Novaris Gradient */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#071D49] via-[#0D3882] to-[#287BFF] p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Background Glow Circles */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#119CFF]/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#663BFF]/20 rounded-full blur-3xl pointer-events-none"></div>

          {/* Top Logo Badge */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white/90 font-medium">
              <ShieldCheck className="w-4 h-4 text-[#119CFF]" />
              <span>Système Certifié RH & Paie</span>
            </div>
          </div>

          {/* Center Brand Hero Copy */}
          <div className="my-auto py-8 relative z-10 space-y-4">
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
              Gestion RH moderne. <br />
              Paie d'entreprise <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#119CFF] to-[#663BFF]">100% sécurisée.</span>
            </h2>
            <p className="text-xs text-slate-200/90 leading-relaxed max-w-sm">
              Automatisez vos bulletins, calculs d'impôts IPR, cotisations CNSS & INPP, déclarations légales et gestion des talents avec la précision NovarisPay.
            </p>

            {/* Feature Bullets */}
            <div className="pt-4 space-y-2.5">
              <div className="flex items-center gap-3 text-xs text-slate-200">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#119CFF]" />
                </div>
                <span>Calculs déterministes IPR / CNSS / INPP / ONEM</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-200">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Globe className="w-3.5 h-3.5 text-[#119CFF]" />
                </div>
                <span>Double devise dynamique USD / CDF</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-200">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Users className="w-3.5 h-3.5 text-[#119CFF]" />
                </div>
                <span>Portail Salariés & Certifications par Code-Barres NVP</span>
              </div>
            </div>
          </div>

          {/* Bottom Security Footer */}
          <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-[11px] text-white/70">
            <span>Code du Travail RDC Conforme</span>
            <span className="font-mono text-white/90">Novaris Cloud Enterprise</span>
          </div>
        </div>

      </div>
    </div>
  );
};

