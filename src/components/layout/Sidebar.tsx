/**
 * @license
 * NovarisPay - HR & Payroll Management System
 */

import React, { useState } from 'react';
import { Language, i18n } from '../../lib/i18n';
import { UserProfile } from '../../types/auth';
import { NovarisLogo } from '../common/NovarisLogo';
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
  ChevronLeft,
  ChevronRight,
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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const principalItems: Array<{ key: ModuleKey; label: string; icon: React.ReactNode }> = [
    { key: 'dashboard', label: t.dashboard, icon: <LayoutDashboard className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'employees', label: t.employees, icon: <Users className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'attendance', label: t.attendance, icon: <Clock className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'leave', label: t.leave, icon: <CalendarDays className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'loans', label: t.loans, icon: <HandCoins className="w-5 h-5" strokeWidth={1.75} /> },
  ];

  const hrItems: Array<{ key: ModuleKey; label: string; icon: React.ReactNode }> = [
    { key: 'recruitment', label: t.recruitment, icon: <UserCheck className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'performance', label: t.performance, icon: <Target className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'discipline', label: t.discipline, icon: <AlertTriangle className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'medical', label: t.medical, icon: <Stethoscope className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'documents', label: t.documents, icon: <FolderArchive className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'automation', label: t.automation, icon: <Zap className="w-5 h-5" strokeWidth={1.75} /> },
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
      {!isCollapsed && (
        <div className="px-5 py-2 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
          {title}
        </div>
      )}
      {items.map((item) => {
        const isActive = activeModule === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onSelectModule(item.key)}
            title={isCollapsed ? item.label : undefined}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-all font-medium text-left my-0.5 rounded-xl ${
              isActive
                ? 'bg-[#287BFF] text-white font-bold shadow-md shadow-blue-500/20'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            } ${isCollapsed ? 'justify-center px-0' : 'mx-2 w-[calc(100%-1rem)]'}`}
          >
            <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}>
              {item.icon}
            </span>
            {!isCollapsed && <span className="truncate">{item.label}</span>}
          </button>
        );
      })}
    </div>
  );

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-[#071D49] text-white flex flex-col shrink-0 min-h-screen border-r border-slate-800 transition-all duration-300 z-30 relative`}
    >
      {/* Sidebar Header with Official Logo */}
      <div className="p-4 flex items-center justify-between border-b border-white/10 h-16">
        {!isCollapsed ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <NovarisLogo variant="full" theme="white" customHeight={32} />
          </div>
        ) : (
          <div className="mx-auto">
            <NovarisLogo variant="icon" theme="white" customHeight={32} />
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          title={isCollapsed ? 'Développer le menu' : 'Réduire le menu'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Group List */}
      <nav className="flex-1 py-2 overflow-y-auto space-y-1">
        {renderNavGroup(t.groupMain, principalItems)}
        {renderNavGroup(t.groupHR, hrItems)}
        {renderNavGroup(t.groupPayroll, operationsItems)}
        {renderNavGroup(t.groupSystem, systemItems)}
      </nav>

      {/* Bottom Profile Summary Card */}
      {currentUser && (
        <div className="p-3 bg-[#051433] border-t border-white/10 mt-auto">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-xl bg-[#287BFF] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
              {currentUser.displayName ? currentUser.displayName.substring(0, 2).toUpperCase() : 'NP'}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-bold truncate text-white">{currentUser.displayName || 'Super Admin'}</p>
                <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

