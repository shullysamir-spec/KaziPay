/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 */

import React, { useEffect, useState } from 'react';
import { getEmployees, getExpiringContracts } from '../../services/employeeService';
import { getPayrollRuns } from '../../services/payrollService';
import { getSecurityLogs } from '../../services/authService';
import { EmployeeWithContract } from '../../types/employee';
import { PayrollRun } from '../../types/payroll';
import { SecurityLog, UserProfile } from '../../types/auth';
import {
  Users,
  DollarSign,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
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
            <span>Vue d'ensemble RH & Paie</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Tableau de Bord NovarisPay</h1>
          <p className="text-xs text-slate-200 max-w-xl">
            Plateforme de gestion globale conforme au Code du travail et dispositions fiscales 2026 de la République Démocratique du Congo.
          </p>
        </div>
        <div className="mt-5 md:mt-0 flex items-center space-x-3 relative z-10">
          <button
            onClick={() => onNavigate('payroll')}
            className="bg-[#287BFF] hover:bg-[#1A6CFA] text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-blue-500/20 transition flex items-center space-x-2 border border-white/20"
          >
            <span>Lancer la Paie</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Effectif Actif */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition flex items-center justify-between group">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Effectif Actif</span>
            <div className="text-2xl font-black text-[#071D49] mt-1">{loading ? '...' : employees.length}</div>
            <span className="text-[11px] text-emerald-600 font-semibold">Salariés enregistrés</span>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-[#287BFF] rounded-xl flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6 stroke-[1.75]" />
          </div>
        </div>

        {/* KPI 2: Coût Paie du Dernier Mois */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition flex items-center justify-between group">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Masse Salariable</span>
            <div className="text-xl font-black text-slate-900 mt-1">
              {latestRun
                ? `${(latestRun.totalGrossCDF / 1000000).toFixed(2)}M FC`
                : '0 FC'}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">
              {latestRun ? `$${latestRun.totalNetUSD.toLocaleString()} USD` : 'Aucun traitement'}
            </span>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-[#287BFF] rounded-xl flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6 stroke-[1.75]" />
          </div>
        </div>

        {/* KPI 3: Contrats Expirant (<30j) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition flex items-center justify-between group">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contrats Expirants</span>
            <div className={`text-2xl font-black mt-1 ${expiringContracts.length > 0 ? 'text-red-600' : 'text-slate-800'}`}>
              {loading ? '...' : expiringContracts.length}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Fin sous 30 jours</span>
          </div>
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-6 h-6 stroke-[1.75]" />
          </div>
        </div>

        {/* KPI 4: Sécurité & Connexions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-md transition flex items-center justify-between group">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alertes Sécurité</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{failedLoginsCount}</div>
            <span className="text-[11px] text-slate-500 font-medium">Échecs récents</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-6 h-6 stroke-[1.75]" />
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Expiring Contracts & Quick Modules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Expiring Contracts Alert Panel */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#071D49] flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600 stroke-[1.75]" />
                <span>Contrats Expirant dans les 30 Prochains Jours</span>
              </h2>
              <button
                onClick={() => onNavigate('employees')}
                className="text-xs text-[#287BFF] hover:underline font-bold"
              >
                Gérer les employés →
              </button>
            </div>

            {expiringContracts.length === 0 ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[1.75]" />
                <span>Aucun contrat CDD ou temporaire n'arrive à échéance sous 30 jours.</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {expiringContracts.map((emp) => (
                  <div key={emp.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {emp.lastName} {emp.firstName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {emp.position} — {emp.department} ({emp.currentContract?.type})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-red-600">
                        Fin le : {emp.currentContract?.endDate}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {emp.currentContract?.baseSalary.toLocaleString()} {emp.currentContract?.currency}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payroll Run History Quick View */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-[#071D49] flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-[#287BFF] stroke-[1.75]" />
                <span>Derniers Traitements de Paie</span>
              </h2>
              <button
                onClick={() => onNavigate('payroll')}
                className="text-xs text-[#287BFF] hover:underline font-bold"
              >
                Voir la paie →
              </button>
            </div>

            {payrollRuns.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Aucun traitement de paie lancé. Allez dans le module Paie pour débuter.
              </div>
            ) : (
              <div className="space-y-3">
                {payrollRuns.slice(0, 3).map((run) => (
                  <div key={run.id} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{run.label} ({run.period})</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Taux: 1 USD = {run.exchangeRate} FC | {run.employeeCount} salariés
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        run.status === 'CLOSED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : run.status === 'VALIDATED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {run.status}
                      </span>
                      <div className="text-xs font-bold text-slate-800 mt-1 font-mono">
                        {run.totalGrossCDF.toLocaleString()} FC
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
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6">
            <h2 className="text-sm font-bold text-[#071D49] mb-3">Accès Rapide ERP RH</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigate('employees')}
                className="p-3 bg-slate-50 hover:bg-blue-50/50 hover:border-[#287BFF] border border-slate-200/80 rounded-xl text-left text-xs font-bold text-slate-800 transition flex items-center space-x-2 group"
              >
                <Users className="w-4 h-4 text-[#287BFF] stroke-[1.75] group-hover:scale-110 transition-transform" />
                <span>Employés</span>
              </button>
              <button
                onClick={() => onNavigate('attendance')}
                className="p-3 bg-slate-50 hover:bg-blue-50/50 hover:border-[#287BFF] border border-slate-200/80 rounded-xl text-left text-xs font-bold text-slate-800 transition flex items-center space-x-2 group"
              >
                <Clock className="w-4 h-4 text-[#287BFF] stroke-[1.75] group-hover:scale-110 transition-transform" />
                <span>Présences</span>
              </button>
              <button
                onClick={() => onNavigate('leave')}
                className="p-3 bg-slate-50 hover:bg-blue-50/50 hover:border-[#287BFF] border border-slate-200/80 rounded-xl text-left text-xs font-bold text-slate-800 transition flex items-center space-x-2 group"
              >
                <CalendarDays className="w-4 h-4 text-[#287BFF] stroke-[1.75] group-hover:scale-110 transition-transform" />
                <span>Congés</span>
              </button>
              <button
                onClick={() => onNavigate('loans')}
                className="p-3 bg-slate-50 hover:bg-blue-50/50 hover:border-[#287BFF] border border-slate-200/80 rounded-xl text-left text-xs font-bold text-slate-800 transition flex items-center space-x-2 group"
              >
                <HandCoins className="w-4 h-4 text-[#287BFF] stroke-[1.75] group-hover:scale-110 transition-transform" />
                <span>Prêts</span>
              </button>
              <button
                onClick={() => onNavigate('declarations')}
                className="p-3 bg-slate-50 hover:bg-blue-50/50 hover:border-[#287BFF] border border-slate-200/80 rounded-xl text-left text-xs font-bold text-slate-800 transition flex items-center space-x-2 group"
              >
                <Landmark className="w-4 h-4 text-[#287BFF] stroke-[1.75] group-hover:scale-110 transition-transform" />
                <span>Déclarations</span>
              </button>
              <button
                onClick={() => onNavigate('security')}
                className="p-3 bg-slate-50 hover:bg-blue-50/50 hover:border-[#287BFF] border border-slate-200/80 rounded-xl text-left text-xs font-bold text-slate-800 transition flex items-center space-x-2 group"
              >
                <ShieldCheck className="w-4 h-4 text-[#287BFF] stroke-[1.75] group-hover:scale-110 transition-transform" />
                <span>Sécurité RBAC</span>
              </button>
            </div>
          </div>

          <div className="bg-[#071D49]/5 border border-[#071D49]/15 p-5 rounded-2xl text-xs space-y-2 text-[#071D49]">
            <div className="font-bold text-sm">Normes Légales RDC 2026 :</div>
            <div className="space-y-1 text-[11px] text-slate-700">
              <div>• Barème IRPP progressif (3% à 40%)</div>
              <div>• Plafond IRPP : Max 30% du salaire imposable</div>
              <div>• CNSS Salarié 5% | Patronale 9%</div>
              <div>• INPP 3%/2% | ONEM 0.2%</div>
              <div>• SMIG : 21 500 FC / jour</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
