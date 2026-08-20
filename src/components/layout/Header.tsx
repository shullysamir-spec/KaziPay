/**
 * @license
 * NovarisPay - HR & Payroll Management System
 */

import React, { useState } from 'react';
import { UserProfile } from '../../types/auth';
import { Language, i18n } from '../../lib/i18n';
import { Globe, LogOut, ShieldCheck, HelpCircle, Sun, Moon, Keyboard, Search, QrCode, Layers, ArrowRight, Menu } from 'lucide-react';
import { NotificationCenter } from '../common/NotificationCenter';
import { getRegisteredDocuments, DocumentMetadata } from '../../services/barcodeService';
import { ModuleKey } from './Sidebar';

interface HeaderProps {
  currentUser: UserProfile | null;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onLogout: () => void;
  onOpenAdminInfo: () => void;
  onOpenShortcuts?: () => void;
  title?: string;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onNavigateToModule?: (moduleKey: ModuleKey) => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  lang,
  onLanguageChange,
  onLogout,
  onOpenAdminInfo,
  onOpenShortcuts,
  title = "Tableau de Bord RH & Paie",
  theme = 'light',
  onToggleTheme,
  onNavigateToModule,
  onToggleMobileMenu,
}) => {
  const t = i18n[lang] || i18n.fr;
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const allRegisteredDocs = getRegisteredDocuments();

  const MODULE_SEARCH_ITEMS: { key: ModuleKey; label: string; desc: string; iconName: string }[] = [
    { key: 'dashboard', label: t.nav.dashboard, desc: t.dashboard.kpiPayrollMassDesc, iconName: 'Layers' },
    { key: 'employees', label: t.nav.employees, desc: t.employees.subtitle, iconName: 'Users' },
    { key: 'attendance', label: t.nav.attendance, desc: t.attendance.subtitle, iconName: 'Clock' },
    { key: 'leave', label: t.nav.leave, desc: t.leave.subtitle, iconName: 'Calendar' },
    { key: 'loans', label: t.nav.loans, desc: t.loans.subtitle, iconName: 'CreditCard' },
    { key: 'payroll', label: t.nav.payroll, desc: t.payroll.subtitle, iconName: 'Calculator' },
    { key: 'payslips', label: t.nav.payslips, desc: t.payslips.subtitle, iconName: 'FileText' },
    { key: 'declarations', label: t.nav.declarations, desc: t.declarations.subtitle, iconName: 'ShieldCheck' },
    { key: 'reports', label: t.nav.reports, desc: t.reports.subtitle, iconName: 'BarChart' },
    { key: 'recruitment', label: t.nav.recruitment, desc: t.recruitment.subtitle, iconName: 'UserCheck' },
    { key: 'performance', label: t.nav.performance, desc: t.performance.subtitle, iconName: 'Target' },
    { key: 'discipline', label: t.nav.discipline, desc: t.discipline.subtitle, iconName: 'AlertTriangle' },
    { key: 'medical', label: t.nav.medical, desc: t.medical.subtitle, iconName: 'Stethoscope' },
    { key: 'documents', label: t.nav.documents, desc: t.documents.subtitle, iconName: 'FileText' },
    { key: 'automation', label: t.nav.automation, desc: t.automation.subtitle, iconName: 'Zap' },
    { key: 'security', label: t.nav.security, desc: t.security.subtitle, iconName: 'Lock' },
    { key: 'settings', label: t.nav.settings, desc: t.settings.subtitle, iconName: 'Settings' },
  ];

  const matchedModules = searchQuery.trim()
    ? MODULE_SEARCH_ITEMS.filter(
        (m) =>
          m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.key.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredDocs = searchQuery.trim()
    ? allRegisteredDocs.filter(
        (doc) =>
          doc.barcodeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          doc.documentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (doc.employeeName && doc.employeeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (doc.employeeMatricule && doc.employeeMatricule.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim();
    window.dispatchEvent(
      new CustomEvent('novarispay_open_barcode_verify', { detail: { barcodeId: query } })
    );

    setIsSearchFocused(false);
    setIsMobileSearchOpen(false);
  };

  const handleSelectDocument = (doc: DocumentMetadata) => {
    window.dispatchEvent(
      new CustomEvent('novarispay_open_barcode_verify', { detail: { barcodeId: doc.barcodeId } })
    );
    setIsSearchFocused(false);
    setIsMobileSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-6 shrink-0 z-40 sticky top-0 shadow-xs transition-colors">
      {/* Left Area: Mobile Hamburger + Current Module Title */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden flex items-center justify-center p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-w-[44px] min-h-[44px]"
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <h1 className="text-sm sm:text-base md:text-lg font-bold text-[#071D49] dark:text-blue-300 tracking-tight truncate max-w-[130px] sm:max-w-[200px] md:max-w-none">
          {title}
        </h1>
        <span className="hidden lg:inline-block text-[11px] bg-[#287BFF]/10 dark:bg-[#287BFF]/20 text-[#287BFF] dark:text-blue-300 border border-[#287BFF]/20 font-bold px-2.5 py-0.5 rounded-full">
          {t.header.compliantBadge}
        </span>
      </div>

      {/* Global Search Input (Desktop & Tablets) */}
      <div className="relative flex-1 max-w-md mx-2 sm:mx-4 hidden sm:block">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            placeholder={t.header.searchPlaceholder}
            className="w-full pl-9 pr-9 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#287BFF] dark:focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold p-0.5"
            >
              ✕
            </button>
          )}
        </form>

        {/* Global Search Dropdown Results */}
        {isSearchFocused && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 text-xs space-y-2 max-h-96 overflow-y-auto">
            {/* Matched Modules Section */}
            {matchedModules.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 py-0.5 text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                  <span>{t.header.modulesSection} ({matchedModules.length})</span>
                </div>
                {matchedModules.map((mod) => (
                  <div
                    key={mod.key}
                    onMouseDown={() => {
                      if (onNavigateToModule) onNavigateToModule(mod.key);
                      setIsSearchFocused(false);
                      setSearchQuery('');
                    }}
                    className="p-2 hover:bg-blue-50/70 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition flex items-center justify-between gap-2 border border-transparent hover:border-blue-200 dark:hover:border-slate-700"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-1.5 bg-[#071D49] text-white rounded-lg">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{mod.label}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{mod.desc}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>
            )}

            {/* Matched Documents & Barcodes Section */}
            <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="px-2 py-0.5 text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                <span>{t.header.documentsSection} ({filteredDocs.length})</span>
              </div>

              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => (
                  <div
                    key={doc.barcodeId}
                    onMouseDown={() => handleSelectDocument(doc)}
                    className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition flex items-center justify-between gap-2 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-1.5 bg-blue-50 text-[#287BFF] dark:text-blue-400 rounded-lg">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{doc.title}</div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                          <span className="font-bold text-[#287BFF] dark:text-blue-300">{doc.barcodeId}</span>
                          <span>•</span>
                          <span>{doc.employeeName || doc.documentType}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                ))
              ) : (
                <div
                  onMouseDown={() => {
                    window.dispatchEvent(
                      new CustomEvent('novarispay_open_barcode_verify', { detail: { barcodeId: searchQuery.trim() } })
                    );
                    setIsSearchFocused(false);
                  }}
                  className="p-3 text-center text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition"
                >
                  <QrCode className="w-5 h-5 text-[#287BFF] dark:text-blue-400 mx-auto mb-1" />
                  <p className="font-bold text-slate-800 dark:text-slate-200">{t.header.verifySearchPrompt} "{searchQuery}"</p>
                  <span className="text-[10px] text-slate-400">{t.header.verifySearchDesc}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Actions Header Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Mobile Search Toggle Icon */}
        <button
          onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
          className="sm:hidden flex items-center justify-center p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 min-w-[40px] min-h-[40px]"
          aria-label={t.common.search}
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Notifications & Alertes RH */}
        <NotificationCenter onNavigateToModule={onNavigateToModule} />

        {/* Theme Switcher Toggle (Clair / Sombre) */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className={`flex items-center justify-center gap-1.5 text-xs font-semibold p-2 sm:px-3 sm:py-1.5 rounded-lg border transition shadow-xs min-h-[40px] min-w-[40px] sm:min-w-0 ${
              theme === 'dark'
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                : 'bg-slate-50 hover:bg-slate-100 text-[#1F3864] border-slate-200'
            }`}
            title={theme === 'dark' ? t.header.lightModeTitle : t.header.darkModeTitle}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="hidden lg:inline">{t.header.lightMode}</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-[#1F3864] shrink-0" />
                <span className="hidden lg:inline">{t.header.darkMode}</span>
              </>
            )}
          </button>
        )}

        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="hidden sm:flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[#1F3864] dark:text-slate-200 font-semibold px-2.5 py-1.5 rounded-lg transition shadow-xs min-h-[40px]"
            title={t.header.shortcuts}
          >
            <Keyboard className="w-4 h-4 text-[#BF9000]" />
            <span className="hidden lg:inline">{t.header.shortcuts}</span>
          </button>
        )}

        <button
          onClick={onOpenAdminInfo}
          className="hidden sm:flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[#1F3864] dark:text-slate-200 font-semibold px-2.5 py-1.5 rounded-lg transition shadow-xs min-h-[40px]"
          title={t.header.superAdminGuide}
        >
          <HelpCircle className="w-4 h-4 text-[#BF9000]" />
          <span className="hidden lg:inline">{t.header.superAdminGuide}</span>
        </button>

        {/* FR / EN Language Switcher */}
        <div className="bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5 sm:p-1 flex items-center gap-0.5 sm:gap-1 border border-gray-200 dark:border-slate-700">
          <Globe className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400 ml-1 mr-0.5 hidden xs:inline" />
          <button
            onClick={() => onLanguageChange('fr')}
            className={`px-1.5 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-md transition ${
              lang === 'fr'
                ? 'bg-white dark:bg-slate-900 shadow-xs text-[#1F3864] dark:text-blue-300'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
            }`}
          >
            FR
          </button>
          <button
            onClick={() => onLanguageChange('en')}
            className={`px-1.5 sm:px-2.5 py-1 text-[11px] sm:text-xs font-bold rounded-md transition ${
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
          <div className="flex items-center gap-2 sm:gap-3 pl-1.5 sm:pl-3 border-l border-gray-200 dark:border-slate-800">
            <div className="text-right hidden xl:block">
              <div className="text-xs font-bold text-gray-900 dark:text-slate-100 flex items-center justify-end gap-1">
                <span>{currentUser.displayName || currentUser.email}</span>
                {currentUser.roles.includes('SUPERADMIN' as any) && (
                  <ShieldCheck className="w-3.5 h-3.5 text-[#BF9000]" />
                )}
              </div>
              <div className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">
                {currentUser.roles.join(', ') || t.header.user}
              </div>
            </div>

            <button
              onClick={onLogout}
              className="flex items-center justify-center gap-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 text-xs font-semibold p-2 sm:px-3 sm:py-1.5 rounded-lg border border-red-200 dark:border-red-800 transition min-w-[40px] min-h-[40px]"
              title={t.auth.logout}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline">{t.auth.logout}</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Search Overlay Bar */}
      {isMobileSearchOpen && (
        <div className="absolute inset-x-0 top-16 bg-white dark:bg-slate-900 p-3 border-b border-slate-200 dark:border-slate-800 z-50 shadow-lg sm:hidden">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.header.searchPlaceholder}
              className="w-full pl-9 pr-16 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
            />
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(false)}
              className="absolute right-2 text-xs text-slate-500 font-bold px-2 py-1"
            >
              {t.header.closeSearch}
            </button>
          </form>
        </div>
      )}
    </header>
  );
};
