/**
 * @license
 * KaziPay - ERP RH et Paie RDC
 */

import React from 'react';
import { UserProfile } from '../../types/auth';
import { Language, i18n } from '../../lib/i18n';
import { Globe, LogOut, ShieldCheck, HelpCircle, Sun, Moon } from 'lucide-react';
import { NotificationCenter } from '../common/NotificationCenter';

interface HeaderProps {
  currentUser: UserProfile | null;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onLogout: () => void;
  onOpenAdminInfo: () => void;
  title?: string;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onNavigateToModule?: (moduleKey: any) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  lang,
  onLanguageChange,
  onLogout,
  onOpenAdminInfo,
  title = "Tableau de Bord RH & Paie",
  theme = 'light',
  onToggleTheme,
  onNavigateToModule,
}) => {
  const t = i18n[lang];

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 z-40 sticky top-0 shadow-xs transition-colors">
      {/* Current Module Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-[#1F3864] dark:text-blue-300 tracking-tight">{title}</h1>
        <span className="text-xs bg-[#BF9000]/15 dark:bg-[#BF9000]/30 text-[#856404] dark:text-amber-200 border border-[#BF9000]/30 font-bold px-2 py-0.5 rounded-full">
          RDC Conforme 2026
        </span>
      </div>

      {/* Right Actions Header Controls */}
      <div className="flex items-center gap-3">
        {/* Notifications & Alertes RH */}
        <NotificationCenter onNavigateToModule={onNavigateToModule} />

        {/* Theme Switcher Toggle (Clair / Sombre) */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition shadow-xs ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                : 'bg-slate-50 hover:bg-slate-100 text-[#1F3864] border-slate-200'
            }`}
            title={theme === 'dark' ? "Passer en mode clair" : "Passer en mode sombre (repos visuel)"}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Mode Clair</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-[#1F3864]" />
                <span className="hidden sm:inline">Mode Sombre</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={onOpenAdminInfo}
          className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[#1F3864] dark:text-slate-200 font-semibold px-3 py-1.5 rounded-lg transition shadow-xs"
          title="Guide Super Admin"
        >
          <HelpCircle className="w-4 h-4 text-[#BF9000]" />
          <span className="hidden sm:inline">Guide Super Admin</span>
        </button>

        {/* FR / EN Language Switcher */}
        <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-1 flex items-center gap-1 border border-gray-200 dark:border-slate-700">
          <Globe className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400 ml-1 mr-0.5" />
          <button
            onClick={() => onLanguageChange('fr')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition ${
              lang === 'fr'
                ? 'bg-white dark:bg-slate-900 shadow-xs text-[#1F3864] dark:text-blue-300'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
            }`}
          >
            FR
          </button>
          <button
            onClick={() => onLanguageChange('en')}
            className={`px-3 py-1 text-xs font-bold rounded-md transition ${
              lang === 'en'
                ? 'bg-white dark:bg-slate-900 shadow-xs text-[#1F3864] dark:text-blue-300'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
            }`}
          >
            EN
          </button>
        </div>

        {/* User Badge & Logout */}
        {currentUser && (
          <div className="flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-slate-800">
            <div className="text-right hidden md:block">
              <div className="text-xs font-bold text-gray-900 dark:text-slate-100 flex items-center justify-end gap-1">
                <span>{currentUser.displayName || currentUser.email}</span>
                {currentUser.roles.includes('SUPERADMIN' as any) && (
                  <ShieldCheck className="w-3.5 h-3.5 text-[#BF9000]" />
                )}
              </div>
              <div className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">
                {currentUser.roles.join(', ') || 'Utilisateur'}
              </div>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 transition"
              title={t.auth.logout}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{t.auth.logout}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

