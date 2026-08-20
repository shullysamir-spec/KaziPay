/**
 * @license
 * NovarisPay - ERP RH et Paie RDC (BILINGUAL)
 */

import React from 'react';
import { ShieldCheck, Database, Key, CheckCircle, X, ShieldAlert } from 'lucide-react';
import { DEFAULT_OFFICIAL_ACCOUNTS } from '../../services/authService';
import { useLanguage } from '../../context/LanguageContext';

interface SuperAdminInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuperAdminInstructionsModal: React.FC<SuperAdminInstructionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { lang, t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="bg-[#071D49] text-white p-5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-6 h-6 text-[#119CFF]" />
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                {lang === 'fr' ? 'Matrice RBAC & Comptes par Défaut NovarisPay' : 'NovarisPay RBAC Matrix & Default Accounts'}
              </h2>
              <p className="text-[11px] text-slate-300">
                {lang === 'fr' ? 'Politique de sécurité et contrôle d\'accès d\'entreprise' : 'Security policy & enterprise access control'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-slate-800 text-sm">
          {/* Section 1: Security policy banner */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{lang === 'fr' ? 'Authentification Nominative & Mot de Passe Temporaire' : 'Named Authentication & Temporary Password'}</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              {lang === 'fr'
                ? 'Toute connexion automatique est désactivée. Chaque utilisateur doit saisir son identifiant et son mot de passe temporaire pour entrer. Le changement de mot de passe est obligatoirement exigé à la première connexion (minimum 8 caractères).'
                : 'Automatic login is disabled. Each user must enter their username and temporary password to sign in. Mandatory password change is required upon first login (minimum 8 characters).'}
            </p>
          </div>

          {/* Section 2: 4 Default Accounts */}
          <div>
            <h3 className="font-bold text-[#071D49] text-base mb-3 flex items-center space-x-2">
              <Key className="w-5 h-5 text-[#287BFF]" />
              <span>{lang === 'fr' ? 'Les 4 Comptes par Défaut & Périmètres d\'Habilitation' : '4 Default Accounts & Authorization Scopes'}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans">
              {DEFAULT_OFFICIAL_ACCOUNTS.map((acc) => (
                <div key={acc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#071D49] text-sm">{acc.displayName}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                      {acc.roles.join(' + ')}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs font-mono bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <div>
                      <span className="text-slate-500">{lang === 'fr' ? 'Identifiant :' : 'Login ID:'} </span>
                      <strong className="text-slate-900">{acc.email}</strong> 
                      <span className="text-slate-400 font-sans text-[10px]"> (alias: {acc.aliases[0]})</span>
                    </div>
                    <div>
                      <span className="text-slate-500">{lang === 'fr' ? 'Pass Temp :' : 'Temp Pass:'} </span>
                      <strong className="text-amber-700 bg-amber-50 px-1 rounded">{acc.initialTempPassword}</strong>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600">
                    <strong className="text-slate-800">{lang === 'fr' ? 'Fonction :' : 'Role:'} </strong>
                    {lang === 'en' && acc.id === 'user-superadmin' ? 'CEO & Global Administrator' : acc.description}
                  </div>
                  <div className="text-[11px] text-slate-500 italic bg-slate-100/70 p-2 rounded">
                    <strong>{lang === 'fr' ? 'Périmètre :' : 'Scope:'} </strong>
                    {acc.perimeter}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Architecture & Firebase Firestore Details */}
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-2 flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>{lang === 'fr' ? 'Sécurité & Piste d\'Audit Firestore' : 'Security & Firestore Audit Trail'}</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>{lang === 'fr' ? 'Journalisation intégrale :' : 'Complete audit logging:'}</strong>{' '}
                  {lang === 'fr'
                    ? 'Chaque tentative de connexion, connexion réussie, déconnexion et changement de mot de passe est enregistrée de façon immuable dans securityLogs.'
                    : 'Every login attempt, success, logout, and password change is immutably recorded in securityLogs.'}
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>{lang === 'fr' ? 'Filtrage de navigation dynamique :' : 'Dynamic navigation filtering:'}</strong>{' '}
                  {lang === 'fr'
                    ? 'Le menu latéral adapte ses rubriques selon le rôle actif de la session connectée.'
                    : 'The sidebar dynamically adapts modules based on the active role of the connected session.'}
                </span>
              </li>
            </ul>
          </div>

          <div className="text-right pt-3 border-t border-slate-200">
            <button
              onClick={onClose}
              className="bg-[#287BFF] hover:bg-[#1A6CFA] text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-md transition"
            >
              {lang === 'fr' ? 'Fermer le guide' : 'Close guide'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
