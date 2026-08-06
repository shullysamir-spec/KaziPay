/**
 * @license
 * NovarisPay - HR & Payroll Management System
 */

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { bootstrapSystemData } from './services/seedService';
import { ensureSuperAdminExists, getUserProfile, logoutUser } from './services/authService';
import { UserProfile, RolePermissionMapping } from './types/auth';
import { Language, i18n } from './lib/i18n';
import { Header } from './components/layout/Header';
import { Sidebar, ModuleKey } from './components/layout/Sidebar';
import { LoginForm } from './components/auth/LoginForm';
import { FirstLoginModal } from './components/auth/FirstLoginModal';
import { SuperAdminInstructionsModal } from './components/auth/SuperAdminInstructionsModal';
import { TestModeBanner } from './components/common/TestModeBanner';
import { ToastProvider } from './context/ToastContext';
import { KeyboardShortcutsModal } from './components/common/KeyboardShortcutsModal';

// Modules
import { DashboardModule } from './components/modules/DashboardModule';
import { EmployeesModule } from './components/modules/EmployeesModule';
import { AttendanceModule } from './components/modules/AttendanceModule';
import { LeaveModule } from './components/modules/LeaveModule';
import { LoansModule } from './components/modules/LoansModule';
import { PayrollModule } from './components/modules/PayrollModule';
import { PayslipsModule } from './components/modules/PayslipsModule';
import { DeclarationsModule } from './components/modules/DeclarationsModule';
import { ReportsModule } from './components/modules/ReportsModule';
import { PerformanceModule } from './components/modules/PerformanceModule';
import { RecruitmentModule } from './components/modules/RecruitmentModule';
import { DisciplineModule } from './components/modules/DisciplineModule';
import { MedicalModule } from './components/modules/MedicalModule';
import { DocumentGEDModule } from './components/modules/DocumentGEDModule';
import { AutomationModule } from './components/modules/AutomationModule';
import { SecurityModule } from './components/modules/SecurityModule';
import { SettingsModule } from './components/modules/SettingsModule';

export function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionMapping[]>([]);
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [selectedPayslipRunId, setSelectedPayslipRunId] = useState<string | undefined>(undefined);
  const [lang, setLang] = useState<Language>('fr');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('novarispay_theme') as 'light' | 'dark') || (localStorage.getItem('novarispay_theme') as 'light' | 'dark') || 'light';
  });
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState<boolean>(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing shortcuts when typing in inputs or textareas
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      if (isCmdOrCtrl) {
        switch (e.key.toLowerCase()) {
          case 'd':
            e.preventDefault();
            setActiveModule('dashboard');
            break;
          case 'p':
            e.preventDefault();
            setActiveModule('payroll');
            break;
          case 'e':
            e.preventDefault();
            setActiveModule('employees');
            break;
          case 'a':
            e.preventDefault();
            setActiveModule('attendance');
            break;
          case 'r':
            e.preventDefault();
            setActiveModule('reports');
            break;
          case 's':
            e.preventDefault();
            setActiveModule('settings');
            break;
          case 'l':
            e.preventDefault();
            setActiveModule('leave');
            break;
          case 'm':
            e.preventDefault();
            setActiveModule('medical');
            break;
          case 'g':
            e.preventDefault();
            setActiveModule('documents');
            break;
          case 'k':
            e.preventDefault();
            setIsKeyboardShortcutsOpen((prev) => !prev);
            break;
        }
      } else if (e.key === '?') {
        e.preventDefault();
        setIsKeyboardShortcutsOpen(true);
      } else if (e.key === 'Escape') {
        setIsKeyboardShortcutsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    localStorage.setItem('novarispay_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const loadRolePermissions = async () => {
    try {
      const snap = await getDocs(collection(db, 'rolePermissions'));
      const list = snap.docs.map((d) => d.data() as RolePermissionMapping);
      setRolePermissions(list);
    } catch (err) {
      console.error('Erreur chargement rolePermissions:', err);
    }
  };

  useEffect(() => {
    async function initSystem() {
      try {
        await ensureSuperAdminExists();
      } catch (err) {
        console.warn('Super Admin init step:', err);
      }
      try {
        await bootstrapSystemData();
      } catch (err) {
        console.warn('Bootstrap step:', err);
      }
      try {
        await loadRolePermissions();
      } catch (err) {
        console.warn('Role perms step:', err);
      }

      onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const profile = await getUserProfile(firebaseUser.uid);
          setCurrentUser(profile);
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      });
    }
    initSystem();
  }, []);

  const handleLogout = async () => {
    await logoutUser(currentUser);
    setCurrentUser(null);
  };

  const handleNavigateToPayslips = (runId: string) => {
    setSelectedPayslipRunId(runId);
    setActiveModule('payslips');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1F3864] flex flex-col items-center justify-center text-white p-4">
        <div className="w-16 h-16 bg-[#BF9000] text-[#1F3864] font-black text-3xl rounded-2xl flex items-center justify-center shadow-2xl animate-pulse mb-4">
          NP
        </div>
        <div className="text-xl font-bold tracking-tight">NovarisPay - HR & Payroll Management System</div>
        <div className="text-xs text-blue-200 mt-2">Initialisation du système et des paramètres légaux 2026...</div>
      </div>
    );
  }

  const getModuleTitle = (mod: ModuleKey): string => {
    return i18n[lang]?.moduleTitles?.[mod] || 'NovarisPay ERP';
  };

  return (
    <ToastProvider>
      <div className={`min-h-screen flex flex-col font-sans antialiased transition-colors ${
        theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-[#F3F4F6] text-slate-900'
      }`}>
      {!currentUser ? (
        <LoginForm
          onLoginSuccess={(user) => setCurrentUser(user)}
          lang={lang}
          onOpenAdminInstructions={() => setIsSuperAdminModalOpen(true)}
        />
      ) : (
        <div className="flex flex-1 overflow-hidden h-screen">
          {/* Left Navigation Sidebar */}
          <Sidebar
            activeModule={activeModule}
            onSelectModule={setActiveModule}
            lang={lang}
            currentUser={currentUser}
          />

          {/* Main Area Wrapper */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mode Test Banner */}
            <TestModeBanner currentUser={currentUser} onUserSwitched={setCurrentUser} />

            {/* Top Bar Header */}
            <Header
              currentUser={currentUser}
              lang={lang}
              onLanguageChange={setLang}
              onLogout={handleLogout}
              onOpenAdminInfo={() => setIsSuperAdminModalOpen(true)}
              onOpenShortcuts={() => setIsKeyboardShortcutsOpen(true)}
              title={getModuleTitle(activeModule)}
              theme={theme}
              onToggleTheme={handleToggleTheme}
              onNavigateToModule={setActiveModule}
            />

            {/* Main Work Area */}
            <main className="flex-1 p-8 overflow-y-auto">
              <div className="max-w-7xl mx-auto space-y-6">
                {activeModule === 'dashboard' && (
                  <DashboardModule
                    onNavigate={setActiveModule}
                    currentUser={currentUser}
                  />
                )}
                {activeModule === 'employees' && (
                  <EmployeesModule
                    currentUser={currentUser}
                    rolePermissions={rolePermissions}
                  />
                )}
                {activeModule === 'attendance' && <AttendanceModule />}
                {activeModule === 'leave' && <LeaveModule />}
                {activeModule === 'loans' && <LoansModule />}
                {activeModule === 'payroll' && (
                  <PayrollModule
                    currentUser={currentUser}
                    rolePermissions={rolePermissions}
                    onViewPayslips={handleNavigateToPayslips}
                  />
                )}
                {activeModule === 'payslips' && (
                  <PayslipsModule initialRunId={selectedPayslipRunId} />
                )}
                {activeModule === 'declarations' && <DeclarationsModule />}
                {activeModule === 'reports' && <ReportsModule />}
                {activeModule === 'recruitment' && <RecruitmentModule />}
                {activeModule === 'performance' && <PerformanceModule />}
                {activeModule === 'discipline' && <DisciplineModule />}
                {activeModule === 'medical' && <MedicalModule />}
                {activeModule === 'documents' && <DocumentGEDModule />}
                {activeModule === 'automation' && <AutomationModule />}
                {activeModule === 'security' && (
                  <SecurityModule
                    currentUser={currentUser}
                    rolePermissions={rolePermissions}
                    onRefreshPermissions={loadRolePermissions}
                  />
                )}
                {activeModule === 'settings' && <SettingsModule />}
              </div>
            </main>

            {/* Editorial Aesthetic Status Footer */}
            <footer className="h-8 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between px-8 text-[10px] text-gray-500 dark:text-slate-400 font-medium shrink-0 transition-colors">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse"></span>
                <span>SYSTÈME CONFORME RDC 2026 - BASE DE DONNÉES FIRESTORE SYNCHRONISÉE</span>
              </div>
              <div className="flex items-center gap-4">
                <span>TAUX DE CHANGE DU JOUR: 1 USD = 2850 CDF</span>
                <span>VERSION 2.4.0-RDC</span>
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* Super Admin Info Modal */}
      {isSuperAdminModalOpen && (
        <SuperAdminInstructionsModal onClose={() => setIsSuperAdminModalOpen(false)} />
      )}

      {/* First Login Change Password Modal */}
      {currentUser && currentUser.mustChangePassword && (
        <FirstLoginModal
          user={currentUser}
          onPasswordChanged={(updated) => setCurrentUser(updated)}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isKeyboardShortcutsOpen}
        onClose={() => setIsKeyboardShortcutsOpen(false)}
        lang={lang}
      />
    </div>
    </ToastProvider>
  );
}

export default App;

