/**
 * @license
 * NovarisPay - HR & Payroll Management System
 */

import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { bootstrapSystemData } from './services/seedService';
import { ensureDefaultAccountsExist, getUserProfile, logoutUser } from './services/authService';
import { UserProfile, RolePermissionMapping } from './types/auth';
import { NovarisLogo } from './components/common/NovarisLogo';
import { Header } from './components/layout/Header';
import { Sidebar, ModuleKey, isModuleAllowedForUser } from './components/layout/Sidebar';
import { LoginForm } from './components/auth/LoginForm';
import { FirstLoginModal } from './components/auth/FirstLoginModal';
import { SuperAdminInstructionsModal } from './components/auth/SuperAdminInstructionsModal';
import { TestModeBanner } from './components/common/TestModeBanner';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { KeyboardShortcutsModal } from './components/common/KeyboardShortcutsModal';
import { BarcodeScannerModal } from './components/common/BarcodeScannerModal';

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

function AppContent() {
  const { lang, setLang, t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionMapping[]>([]);
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [selectedPayslipRunId, setSelectedPayslipRunId] = useState<string | undefined>(undefined);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('novarispay_theme') as 'light' | 'dark') || 'light';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState<boolean>(false);
  const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState<boolean>(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState<boolean>(false);
  const [barcodeVerifyId, setBarcodeVerifyId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const handleOpenBarcodeVerify = (e: CustomEvent<{ barcodeId: string }>) => {
      if (e.detail?.barcodeId !== undefined) {
        setBarcodeVerifyId(e.detail.barcodeId);
        setIsBarcodeModalOpen(true);
      }
    };

    window.addEventListener('novarispay_open_barcode_verify', handleOpenBarcodeVerify as EventListener);
    return () => {
      window.removeEventListener('novarispay_open_barcode_verify', handleOpenBarcodeVerify as EventListener);
    };
  }, []);

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
        await ensureDefaultAccountsExist();
      } catch (err) {
        console.warn('Default accounts init step:', err);
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

  // Enforce RBAC on active module selection
  useEffect(() => {
    if (currentUser && !isModuleAllowedForUser(currentUser, activeModule)) {
      setActiveModule('dashboard');
    }
  }, [currentUser, activeModule]);

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
      <div className="min-h-screen bg-[#071D49] flex flex-col items-center justify-center text-white p-6">
        <div className="animate-pulse mb-6">
          <NovarisLogo variant="full" theme="white" customHeight={64} />
        </div>
        <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden mb-4">
          <div className="w-2/3 h-full bg-[#287BFF] rounded-full animate-pulse"></div>
        </div>
        <div className="text-xs text-slate-300 font-medium">
          {lang === 'fr' ? 'Initialisation du système NovarisPay...' : 'Initializing NovarisPay system...'}
        </div>
      </div>
    );
  }

  const getModuleTitle = (mod: ModuleKey): string => {
    return t.moduleTitles?.[mod] || 'NovarisPay ERP';
  };

  return (
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
        <div className="flex flex-1 overflow-hidden h-screen w-full relative">
          {/* Left Navigation Sidebar (Desktop + Mobile Drawer) */}
          <Sidebar
            activeModule={activeModule}
            onSelectModule={setActiveModule}
            lang={lang}
            currentUser={currentUser}
            isOpenMobile={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />

          {/* Main Area Wrapper */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden w-full">
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
              onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
            />

            {/* Main Work Area */}
            <main className="flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto w-full max-w-full overflow-x-hidden">
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
            <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between py-2 sm:py-0 sm:h-8 px-3 sm:px-8 text-[10px] text-gray-500 dark:text-slate-400 font-medium shrink-0 transition-colors gap-1 text-center sm:text-left">
              <div className="flex items-center gap-1.5 justify-center sm:justify-start flex-wrap">
                <span className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse shrink-0"></span>
                <span>{t.footer.systemCompliant}</span>
              </div>
              <div className="flex items-center gap-3 justify-center sm:justify-end flex-wrap text-[9px] sm:text-[10px]">
                <span>{t.footer.dailyRate}</span>
                <span>{t.footer.version}</span>
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

      {/* Global Universal Barcode Verification & Audit Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        initialBarcodeId={barcodeVerifyId}
        onNavigateToDocument={(route) => {
          if (route) {
            setActiveModule(route as ModuleKey);
          }
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </LanguageProvider>
  );
}

export default App;
