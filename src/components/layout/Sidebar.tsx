/**
 * @license
 * KaziPay - ERP RH et Paie RDC
 */

import React from 'react';
import { Language, i18n } from '../../lib/i18n';
import { UserProfile } from '../../types/auth';
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  HandCoins,
  Calculator,
  Receipt,
  Landmark,
  BarChart3,
  ShieldCheck,
  Settings,
  UserCheck,
  Target,
  AlertTriangle,
  Zap,
  Stethoscope,
  FolderArchive,
} from 'lucide-react';

export type ModuleKey =
  | 'dashboard'
  | 'employees'
  | 'attendance'
  | 'leave'
  | 'loans'
  | 'payroll'
  | 'payslips'
  | 'declarations'
  | 'reports'
  | 'recruitment'
  | 'performance'
  | 'discipline'
  | 'medical'
  | 'documents'
  | 'automation'
  | 'security'
  | 'settings';

interface SidebarProps {
  activeModule: ModuleKey;
  onSelectModule: (module: ModuleKey) => void;
  lang: Language;
  currentUser?: UserProfile | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeModule, onSelectModule, lang, currentUser }) => {
  const t = i18n[lang].nav;

  const principalItems: Array<{ key: ModuleKey; label: string; icon: React.ReactNode }> = [
    { key: 'dashboard', label: t.dashboard, icon: <LayoutDashboard className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'employees', label: t.employees, icon: <Users className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'attendance', label: t.attendance, icon: <Clock className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'leave', label: t.leave, icon: <CalendarDays className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'loans', label: t.loans, icon: <HandCoins className="w-5 h-5" strokeWidth={1.75} /> },
  ];

  const hrItems: Array<{ key: ModuleKey; label: string; icon: React.ReactNode }> = [
    { key: 'recruitment', label: 'Recrutement & Interviews', icon: <UserCheck className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'performance', label: 'Performance & Formations', icon: <Target className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'discipline', label: 'Procédures & Sanctions', icon: <AlertTriangle className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'medical', label: 'Suivi Médical & Bons', icon: <Stethoscope className="w-5 h-5 text-emerald-400" strokeWidth={1.75} /> },
    { key: 'documents', label: 'Documents & GED RH', icon: <FolderArchive className="w-5 h-5 text-amber-400" strokeWidth={1.75} /> },
    { key: 'automation', label: 'Workflows & Alertes', icon: <Zap className="w-5 h-5" strokeWidth={1.75} /> },
  ];

  const operationsItems: Array<{ key: ModuleKey; label: string; icon: React.ReactNode }> = [
    { key: 'payroll', label: t.payroll, icon: <Calculator className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'payslips', label: t.payslips, icon: <Receipt className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'declarations', label: t.declarations, icon: <Landmark className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'reports', label: t.reports, icon: <BarChart3 className="w-5 h-5" strokeWidth={1.75} /> },
  ];

  const systemItems: Array<{ key: ModuleKey; label: string; icon: React.ReactNode }> = [
    { key: 'security', label: t.security, icon: <ShieldCheck className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'settings', label: t.settings, icon: <Settings className="w-5 h-5" strokeWidth={1.75} /> },
  ];

  const renderNavGroup = (title: string, items: typeof principalItems) => (
    <div className="py-2">
      <div className="px-6 py-2 text-[10px] uppercase tracking-widest text-white/40 font-bold">
        {title}
      </div>
      {items.map((item) => {
        const isActive = activeModule === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onSelectModule(item.key)}
            className={`w-full flex items-center gap-3 px-6 py-2.5 text-xs transition font-medium text-left ${
              isActive
                ? 'bg-white/10 border-l-4 border-[#BF9000] text-white font-bold'
                : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className={isActive ? 'text-[#BF9000]' : 'text-white/60'}>{item.icon}</span>
            <span className={item.key === 'payroll' ? 'text-[#BF9000] font-bold' : ''}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <aside className="w-64 bg-[#1F3864] text-white flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-blue-900/50">
      {/* Sidebar Branding Header */}
      <div className="p-5 flex items-center gap-3 border-b border-blue-900/50">
        <div className="w-10 h-10 bg-[#BF9000] text-[#1F3864] rounded-lg flex items-center justify-center font-black text-xl shadow-md">
          K
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black tracking-tight text-white">KaziPay</span>
            <span className="text-[10px] bg-white/10 text-white/90 px-1.5 py-0.5 rounded font-bold uppercase">RDC</span>
          </div>
          <p className="text-[10px] text-white/60 truncate font-mono">ERP RH & Paie 2026</p>
        </div>
      </div>

      {/* Navigation Group List */}
      <nav className="flex-1 py-2 overflow-y-auto divide-y divide-blue-900/30">
        {renderNavGroup('Principal', principalItems)}
        {renderNavGroup('RH & Procédures', hrItems)}
        {renderNavGroup('Paie & Déclarations', operationsItems)}
        {renderNavGroup('Système', systemItems)}
      </nav>

      {/* Bottom Profile Summary Card */}
      {currentUser && (
        <div className="p-4 bg-black/20 border-t border-blue-900/50 mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-400 border-2 border-[#BF9000] flex items-center justify-center text-[#1F3864] font-bold text-xs uppercase">
              {currentUser.displayName ? currentUser.displayName.substring(0, 2) : 'SA'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-white">{currentUser.displayName || 'Super Admin'}</p>
              <p className="text-[10px] text-white/60 truncate">{currentUser.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
