/**
 * @license
 * NovarisPay - ERP RH et Paie RDC (BILINGUAL)
 */

import React, { useEffect, useState } from 'react';
import { getEmployees, getExpiringContracts } from '../../services/employeeService';
import { getPayrollRuns } from '../../services/payrollService';
import { getSecurityLogs } from '../../services/authService';
import { EmployeeWithContract } from '../../types/employee';
import { PayrollRun } from '../../types/payroll';
import { SecurityLog, UserProfile } from '../../types/auth';
import { useLanguage } from '../../context/LanguageContext';
import {
  Users,
  DollarSign,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Clock,
  CalendarDays,
  HandCoins,
  Landmark,
} from 'lucide-react';
import { ModuleKey } from '../layout/Sidebar';

interface DashboardModuleProps {
  onNavigate: (module: ModuleKey) => void;
  currentUser: UserProfile | null;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({ onNavigate, currentUser }) => {
  const { lang, t, formatNumber, formatDate } = useLanguage();
  const [employees, setEmployees] = useState<EmployeeWithContract[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<EmployeeWithContract[]>([]);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const empData = await getEmployees();
        setEmployees(empData);
        setExpiringContracts(getExpiringContracts(empData));

        const runsData = await getPayrollRuns();
        setPayrollRuns(runsData);

        const logsData = await getSecurityLogs();
        setLogs(logsData);
      } catch (err) {
        console.error('Erreur chargement tableau de bord:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const latestRun = payrollRuns[0];
  const failedLoginsCount = logs.filter((l) => l.action === 'LOGIN_FAILED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner with Novaris Gradient */}
      <div className="bg-gradient-to-r from-[#071D49] via-[#0D3882] to-[#287BFF] text-white p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] text-white/90 font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#119CFF]" />
            <span>{t.dashboard.title}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{t.dashboard.title}</h1>
          <p className="text-xs text-slate-200 max-w-xl">
            {t.dashboard.subtitle}
          </p>
        </div>
        <div className="mt-5 md:mt-0 flex items-center space-x-3 relative z-10">
          <button
            onClick={() => onNavigate('payroll')}
            className="bg-[#287BFF] hover:bg-[#1A6CFA] text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-blue-500/20 transition flex items-center space-x-2 border border-white/20"
          >
            <span>{t.dashboard.quickActions.launchPayroll}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Effectif Actif */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition flex items-center justify-between group">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t.dashboard.activeEmployees}
            </span>
            <div className="text-2xl font-black text-[#071D49] dark:text-blue-300 mt-1">
              {loading ? '...' : employees.length}
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              {t.dashboard.registeredEmployees}
            </span>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-slate-800 text-[#287BFF] dark:text-blue-400 rounded-xl flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6 stroke-[1.75]" />
          </div>
        </div>

        {/* KPI 2: Coût Paie du Dernier Mois */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition flex items-center justify-between group">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t.dashboard.payrollCost}
            </span>
            <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
              {latestRun
                ? `${(latestRun.totalGrossCDF / 1000000).toFixed(2)}M FC`
                : '0 FC'}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {latestRun ? `$${formatNumber(latestRun.totalNetUSD, 0)} USD` : t.dashboard.noProcessing}
            </span>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-slate-800 text-[#287BFF] dark:text-blue-400 rounded-xl flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6 stroke-[1.75]" />
          </div>
        </div>

        {/* KPI 3: Contrats Expirant (<30j) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition flex items-center justify-between group">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t.dashboard.expiringContracts}
            </span>
            <div className={`text-2xl font-black mt-1 ${expiringContracts.length > 0 ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}`}>
              {loading ? '...' : expiringContracts.length}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {t.dashboard.endIn30Days}
            </span>
          </div>
          <div className="w-12 h-12 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-6 h-6 stroke-[1.75]" />
          </div>
        </div>

        {/* KPI 4: Sécurité & Connexions */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition flex items-center justify-between group">
          <div>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t.dashboard.securityAlerts}
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{failedLoginsCount}</div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {t.dashboard.recentFailures}
            </span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-6 h-6 stroke-[1.75]" />
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Expiring Contracts & Quick Modules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Expiring Contracts Alert Panel */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#071D49] dark:text-blue-300 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 stroke-[1.75]" />
                <span>{t.dashboard.expiringContractsAlert}</span>
              </h2>
              <button
                onClick={() => onNavigate('employees')}
                className="text-xs text-[#287BFF] dark:text-blue-400 hover:underline font-bold"
              >
                {t.dashboard.manageEmployees} →
              </button>
            </div>

            {expiringContracts.length === 0 ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[1.75]" />
                <span>{t.dashboard.noExpiringContracts}</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {expiringContracts.map((emp) => (
                  <div key={emp.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {emp.lastName} {emp.firstName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {emp.position} — {emp.department} ({emp.currentContract?.type})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-red-600 dark:text-red-400">
                        {t.dashboard.endsOn}: {emp.currentContract?.endDate ? formatDate(emp.currentContract.endDate) : '-'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {emp.currentContract?.baseSalary ? formatNumber(emp.currentContract.baseSalary, 0) : '0'} {emp.currentContract?.currency}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payroll Run History Quick View */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#071D49] dark:text-blue-300 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-[#287BFF] stroke-[1.75]" />
                <span>{t.dashboard.recentPayrollRuns}</span>
              </h2>
              <button
                onClick={() => onNavigate('payroll')}
                className="text-xs text-[#287BFF] dark:text-blue-400 hover:underline font-bold"
              >
                {t.dashboard.viewPayroll} →
              </button>
            </div>

            {payrollRuns.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                {t.dashboard.noPayrollRuns}
              </div>
            ) : (
              <div className="space-y-3">
                {payrollRuns.slice(0, 3).map((run) => (
                  <div key={run.id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">{run.label} ({run.period})</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {t.payroll.rate}: 1 USD = {run.exchangeRate} FC | {run.employeeCount} {t.dashboard.activeEmployees.toLowerCase()}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        run.status === 'CLOSED'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : run.status === 'VALIDATED'
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      }`}>
                        {run.status}
                      </span>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 font-mono">
                        {formatNumber(run.totalGrossCDF, 0)} FC
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Quick Access & System Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs p-6">
            <h2 className="text-sm font-bold text-[#071D49] dark:text-blue-300 mb-3">{t.dashboard.quickAccess}</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigate('employees')}
                className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-700 hover:border-[#287BFF] border border-slate-200/80 dark:border-slate-700 rounded-xl text-left text-xs font-bold text-slate-800 dark:text-slate-200 transition flex items-center space-x-2 group"
              >
                <Users className="w-4 h-4 text-[#287BFF] stroke-[1.75] group-hover:scale-110 transition-transform" />
                <span>{t.dashboard.quickActions.employees}</span>
              </button>
              <button
                onClick={() => onNavigate('attendance')}
                className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-700 hover:border-[#287BFF] border border-slate-200/80 dark:border-slate-700 rounded-xl text-left text-xs font-bold text-slate-800 dark:text-slate-200 transition flex items-center space-x-2 group"
              >
                <Clock className="w-4 h-4 text-[#287BFF] stroke-[1.75] group-hover:scale-110 transition-transform" />
                <span>{t.dashboard.quickActions.attendance}</span>
              </button>
              <button
                onClick={() => onNavigate('leave')}
                className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-700 hover:border-[#287BFF] border border-slate-200/80 dark:border-slate-700 rounded-xl text-left text-xs font-bold text-slate-800 dark:text-slate-200 transition flex items-center space-x-2 group"
              >
                <CalendarDays className="w-4 h-4 text-[#287BFF] stroke-[1.75] group-hover:scale-110 transition-transform" />
                <span>{t.dashboard.quickActions.leave}</span>
              </button>
              <button
                onClick={() => onNavigate('loans')}
                className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-700 hover:border-[#287BFF] border border-slate-200/80 dark:border-slate-700 rounded-xl text-left text-xs font-bold text-slate-800 dark:text-slate-200 transition flex items-center space-x-2 group"
              >
                <HandCoins className="w-4 h-4 text-[#287BFF] stroke-[1.75] group-hover:scale-110 transition-transform" />
                <span>{t.dashboard.quickActions.loans}</span>
              </button>
              <button
                onClick={() => onNavigate('declarations')}
                className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-700 hover:border-[#287BFF] border border-slate-200/80 dark:border-slate-700 rounded-xl text-left text-xs font-bold text-slate-800 dark:text-slate-200 transition flex items-center space-x-2 group"
              >
                <Landmark className="w-4 h-4 text-[#287BFF] stroke-[1.75] group-hover:scale-110 transition-transform" />
                <span>{t.dashboard.quickActions.declarations}</span>
              </button>
              <button
                onClick={() => onNavigate('security')}
                className="p-3 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50/50 dark:hover:bg-slate-700 hover:border-[#287BFF] border border-slate-200/80 dark:border-slate-700 rounded-xl text-left text-xs font-bold text-slate-800 dark:text-slate-200 transition flex items-center space-x-2 group"
              >
                <ShieldCheck className="w-4 h-4 text-[#287BFF] stroke-[1.75] group-hover:scale-110 transition-transform" />
                <span>{t.dashboard.quickActions.security}</span>
              </button>
            </div>
          </div>

          <div className="bg-[#071D49]/5 dark:bg-slate-800/60 border border-[#071D49]/15 dark:border-slate-700 p-5 rounded-2xl text-xs space-y-2 text-[#071D49] dark:text-blue-200">
            <div className="font-bold text-sm">{t.dashboard.legalNoticeTitle}</div>
            <div className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
              <div>• {t.dashboard.legalNoticeItems.ipr}</div>
              <div>• {t.dashboard.legalNoticeItems.iprCap}</div>
              <div>• {t.dashboard.legalNoticeItems.cnss}</div>
              <div>• {t.dashboard.legalNoticeItems.inpp}</div>
              <div>• {t.dashboard.legalNoticeItems.smig}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
