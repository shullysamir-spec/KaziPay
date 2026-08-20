/**
 * @license
 * NovarisPay - ERP RH et Paie RDC (BILINGUAL)
 */

import React, { useState } from 'react';
import { loginUser } from '../../services/authService';
import { UserProfile } from '../../types/auth';
import { Language, i18n } from '../../lib/i18n';
import { NovarisLogo } from '../common/NovarisLogo';
import { Lock, Mail, ShieldAlert, KeyRound, CheckCircle2, ShieldCheck, Zap, Globe, Users, Eye, EyeOff } from 'lucide-react';

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
  const t = i18n[lang] || i18n.fr;
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMsg(lang === 'fr' ? 'Veuillez saisir votre identifiant ou email.' : 'Please enter your username or email.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg(lang === 'fr' ? 'Veuillez saisir votre mot de passe.' : 'Please enter your password.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const userProfile = await loginUser(identifier, password);
      onLoginSuccess(userProfile);
    } catch (err: any) {
      setErrorMsg(err.message || (lang === 'fr' ? 'Erreur lors de la connexion. Vérifiez vos identifiants.' : 'Sign in error. Check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        
        {/* Left Section: Form & Official Branding */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Header with Official Logo */}
            <div className="mb-8">
              <NovarisLogo variant="full" theme="light" customHeight={48} />
              <p className="text-xs text-slate-500 font-medium mt-3">
                {lang === 'fr' 
                  ? 'Portail sécurisé NovarisPay d\'Entreprise. Veuillez vous identifier pour accéder à votre espace.'
                  : 'NovarisPay Secure Enterprise Portal. Please authenticate to access your workspace.'}
              </p>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="mb-5 bg-red-50 border-l-4 border-red-500 p-3.5 rounded-xl text-xs text-red-800 flex items-start space-x-2.5 shadow-xs">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMsg}</div>
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>{t.auth.email}</span>
                  <span className="text-[10px] text-slate-400 font-normal">{lang === 'fr' ? 'Requis' : 'Required'}</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#287BFF] focus:bg-white transition-all font-medium placeholder:text-slate-400"
                    placeholder="nom@entreprise.cd"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>{t.auth.password}</span>
                  <span className="text-[10px] text-slate-400 font-normal">{lang === 'fr' ? 'Requis' : 'Required'}</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#287BFF] focus:bg-white transition-all font-medium placeholder:text-slate-400"
                    placeholder="••••••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition"
                    title={showPassword ? (lang === 'fr' ? 'Masquer' : 'Hide') : (lang === 'fr' ? 'Afficher' : 'Show')}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#287BFF] hover:bg-[#1A6CFA] text-white font-bold py-3.5 px-4 rounded-xl text-xs shadow-md shadow-blue-500/25 transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>{lang === 'fr' ? 'Authentification en cours...' : 'Authenticating...'}</span>
                    </span>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>{t.auth.loginButton}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">© {new Date().getFullYear()} NovarisPay ERP — {lang === 'fr' ? 'Tous droits réservés' : 'All rights reserved'}</span>
            <button
              onClick={onOpenAdminInstructions}
              className="text-slate-400 hover:text-[#287BFF] transition text-[11px] flex items-center gap-1"
              title="Documentation RBAC"
            >
              <Zap className="w-3 h-3" />
              <span>{lang === 'fr' ? 'Aide & Accès' : 'Help & Access'}</span>
            </button>
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
              <span>{lang === 'fr' ? 'Portail Sécurisé d\'Entreprise' : 'Enterprise Secure Portal'}</span>
            </div>
          </div>

          {/* Center Brand Hero Copy */}
          <div className="my-auto py-8 relative z-10 space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              {lang === 'fr' ? 'Gestion RH & Paie' : 'HR & Payroll Management'} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#119CFF] to-[#663BFF]">
                {lang === 'fr' ? '100% Conforme RDC.' : '100% DRC Compliant.'}
              </span>
            </h2>
            <p className="text-xs text-slate-200/90 leading-relaxed max-w-sm">
              {lang === 'fr'
                ? 'Plateforme unifiée pour la gestion du personnel, le traitement salarial, les déclarations fiscales et le contrôle d\'accès nominatif.'
                : 'Unified platform for employee management, payroll processing, statutory returns, and role-based access control.'}
            </p>

            {/* Feature Bullets */}
            <div className="pt-2 space-y-2.5">
              <div className="flex items-center gap-3 text-xs text-slate-200">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#119CFF]" />
                </div>
                <span>{lang === 'fr' ? 'Barèmes IPR, CNSS, INPP & ONEM' : 'IPR, CNSS, INPP & ONEM Scales'}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-200">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Globe className="w-3.5 h-3.5 text-[#119CFF]" />
                </div>
                <span>{lang === 'fr' ? 'Double devise dynamique USD / CDF' : 'Dynamic dual currency USD / CDF'}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-200">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Users className="w-3.5 h-3.5 text-[#119CFF]" />
                </div>
                <span>{lang === 'fr' ? 'Authentification & Traçabilité RBAC' : 'RBAC Authentication & Audit Trail'}</span>
              </div>
            </div>
          </div>

          {/* Bottom Security Footer */}
          <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-[11px] text-white/70">
            <span>{t.header.compliantBadge}</span>
            <span className="font-mono text-white/90">Novaris Cloud Enterprise</span>
          </div>
        </div>

      </div>
    </div>
  );
};
