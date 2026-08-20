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
  X,
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

import { RoleCode } from '../../types/auth';

export const ROLE_ALLOWED_MODULES: Record<RoleCode, ModuleKey[]> = {
  [RoleCode.SUPERADMIN]: [
    'dashboard', 'employees', 'attendance', 'leave', 'loans',
    'recruitment', 'performance', 'discipline', 'medical', 'documents', 'automation',
    'payroll', 'payslips', 'declarations', 'reports',
    'security', 'settings'
  ],
  [RoleCode.ADMIN]: [
    'dashboard', 'employees', 'attendance', 'leave', 'loans',
    'recruitment', 'performance', 'discipline', 'medical', 'documents', 'automation',
    'payroll', 'payslips', 'declarations', 'reports',
    'security', 'settings'
  ],
  [RoleCode.HR_MANAGER]: [
    'dashboard', 'employees', 'attendance', 'leave', 'loans',
    'recruitment', 'performance', 'discipline', 'medical', 'documents', 'automation',
    'payroll', 'payslips'
  ],
  [RoleCode.FINANCE_MANAGER]: [
    'dashboard', 'loans', 'payroll', 'payslips', 'declarations', 'reports', 'documents'
  ],
  [RoleCode.AUDITOR]: [
    'dashboard', 'payslips', 'declarations', 'reports', 'documents'
  ],
  [RoleCode.PAYROLL_MANAGER]: [
    'dashboard', 'employees', 'payroll', 'payslips', 'declarations', 'loans', 'reports', 'documents'
  ],
  [RoleCode.DEPT_MANAGER]: [
    'dashboard', 'employees', 'attendance', 'leave', 'documents'
  ],
  [RoleCode.SUPERVISOR]: [
    'dashboard', 'attendance', 'leave'
  ],
  [RoleCode.EMPLOYEE]: [
    'dashboard', 'payslips', 'leave', 'loans', 'documents'
  ],
  [RoleCode.READONLY]: [
    'dashboard', 'payslips', 'declarations', 'reports', 'documents'
  ],
};

export function isModuleAllowedForUser(user: UserProfile | null | undefined, moduleKey: ModuleKey): boolean {
  if (!user || !user.isActivated || user.isLocked) return false;
  if (user.roles.includes(RoleCode.SUPERADMIN) || user.roles.includes(RoleCode.ADMIN) || user.maxRoleLevel >= 100) {
    return true;
  }
  const userRoles = user.roles || [];
  return userRoles.some((r) => ROLE_ALLOWED_MODULES[r]?.includes(moduleKey));
}

interface NavItemDef {
  key: ModuleKey;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  activeModule: ModuleKey;
  onSelectModule: (module: ModuleKey) => void;
  lang: Language;
  currentUser?: UserProfile | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  lang,
  currentUser,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const t = i18n[lang].nav;
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleModuleClick = (key: ModuleKey) => {
    onSelectModule(key);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const rawPrincipalItems: NavItemDef[] = [
    { key: 'dashboard', label: t.dashboard, icon: <LayoutDashboard className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'employees', label: t.employees, icon: <Users className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'attendance', label: t.attendance, icon: <Clock className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'leave', label: t.leave, icon: <CalendarDays className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'loans', label: t.loans, icon: <HandCoins className="w-5 h-5" strokeWidth={1.75} /> },
  ];
  const principalItems = rawPrincipalItems.filter((item) => isModuleAllowedForUser(currentUser, item.key));

  const rawHrItems: NavItemDef[] = [
    { key: 'recruitment', label: t.recruitment, icon: <UserCheck className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'performance', label: t.performance, icon: <Target className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'discipline', label: t.discipline, icon: <AlertTriangle className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'medical', label: t.medical, icon: <Stethoscope className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'documents', label: t.documents, icon: <FolderArchive className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'automation', label: t.automation, icon: <Zap className="w-5 h-5" strokeWidth={1.75} /> },
  ];
  const hrItems = rawHrItems.filter((item) => isModuleAllowedForUser(currentUser, item.key));

  const rawOperationsItems: NavItemDef[] = [
    { key: 'payroll', label: t.payroll, icon: <Calculator className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'payslips', label: t.payslips, icon: <Receipt className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'declarations', label: t.declarations, icon: <Landmark className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'reports', label: t.reports, icon: <BarChart3 className="w-5 h-5" strokeWidth={1.75} /> },
  ];
  const operationsItems = rawOperationsItems.filter((item) => isModuleAllowedForUser(currentUser, item.key));

  const rawSystemItems: NavItemDef[] = [
    { key: 'security', label: t.security, icon: <ShieldCheck className="w-5 h-5" strokeWidth={1.75} /> },
    { key: 'settings', label: t.settings, icon: <Settings className="w-5 h-5" strokeWidth={1.75} /> },
  ];
  const systemItems = rawSystemItems.filter((item) => isModuleAllowedForUser(currentUser, item.key));

  const renderNavGroup = (title: string, items: NavItemDef[], isMobileNav: boolean = false) => {
    if (items.length === 0) return null;
    return (
      <div className="py-2">
        {(!isCollapsed || isMobileNav) && (
          <div className="px-5 py-2 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
            {title}
          </div>
        )}
        {items.map((item) => {
          const isActive = activeModule === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleModuleClick(item.key)}
              title={isCollapsed && !isMobileNav ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs transition-all font-medium text-left my-0.5 rounded-xl min-h-[44px] ${
                isActive
                  ? 'bg-[#287BFF] text-white font-bold shadow-md shadow-blue-500/20'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              } ${isCollapsed && !isMobileNav ? 'justify-center px-0' : 'mx-2 w-[calc(100%-1rem)]'}`}
            >
              <span className={isActive ? 'text-white shrink-0' : 'text-slate-400 group-hover:text-slate-200 shrink-0'}>
                {item.icon}
              </span>
              {(!isCollapsed || isMobileNav) && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative flex flex-col w-[85%] max-w-xs bg-[#071D49] text-white h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200 border-r border-slate-800">
            {/* Mobile Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/10 h-16 shrink-0">
              <div className="flex items-center gap-2 overflow-hidden">
                <NovarisLogo variant="full" theme="white" customHeight={30} />
              </div>
              <button
                onClick={onCloseMobile}
                className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Nav List */}
            <nav className="flex-1 py-2 overflow-y-auto space-y-1">
              {renderNavGroup(t.groupMain, principalItems, true)}
              {renderNavGroup(t.groupHR, hrItems, true)}
              {renderNavGroup(t.groupPayroll, operationsItems, true)}
              {renderNavGroup(t.groupSystem, systemItems, true)}
            </nav>

            {/* Mobile Profile Footer */}
            {currentUser && (
              <div className="p-3 bg-[#051433] border-t border-white/10 mt-auto shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#287BFF] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {currentUser.displayName ? currentUser.displayName.substring(0, 2).toUpperCase() : 'NP'}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className="text-xs font-bold truncate text-white">{currentUser.displayName || 'Super Admin'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:flex ${
          isCollapsed ? 'w-20' : 'w-64'
        } bg-[#071D49] text-white flex-col shrink-0 min-h-screen border-r border-slate-800 transition-all duration-300 z-30 relative`}
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
    </>
  );
};

