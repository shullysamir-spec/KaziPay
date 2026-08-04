/**
 * @license
 * KaziPay - ERP RH et Paie RDC
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
      {/* Top Banner */}
      <div className="bg-[#1F3864] text-white p-6 rounded-xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Tableau de Bord KaziPay</h1>
          <p className="text-xs text-blue-200 mt-1">
            Gestion RH & Paie conforme au Code du travail de la République Démocratique du Congo.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <button
            onClick={() => onNavigate('payroll')}
            className="bg-[#BF9000] hover:bg-yellow-600 text-[#1F3864] font-bold px-4 py-2 rounded-lg text-xs transition flex items-center space-x-2"
          >
            <span>Lancer la Paie</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Effectif Actif */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Effectif Actif</span>
            <div className="text-2xl font-black text-[#1F3864] mt-1">{loading ? '...' : employees.length}</div>
            <span className="text-[11px] text-emerald-600 font-medium">Salariés enregistrés</span>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-[#1F3864] rounded-lg flex items-center justify-center font-bold">
            <Users className="w-6 h-6 stroke-[1.75]" />
          </div>
        </div>

        {/* KPI 2: Coût Paie du Dernier Mois */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Masse Salariable</span>
            <div className="text-xl font-black text-slate-900 mt-1">
              {latestRun
                ? `${(latestRun.totalGrossCDF / 1000000).toFixed(2)}M FC`
                : '0 FC'}
            </div>
            <span className="text-[11px] text-slate-500">
              {latestRun ? `$${latestRun.totalNetUSD.toLocaleString()} USD` : 'Aucun traitement'}
            </span>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-[#BF9000] rounded-lg flex items-center justify-center font-bold">
            <DollarSign className="w-6 h-6 stroke-[1.75]" />
          </div>
        </div>

        {/* KPI 3: Contrats Expirant (<30j) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contrats Expirants</span>
            <div className={`text-2xl font-black mt-1 ${expiringContracts.length > 0 ? 'text-[#C00000]' : 'text-slate-800'}`}>
              {loading ? '...' : expiringContracts.length}
            </div>
            <span className="text-[11px] text-slate-500">Fin sous 30 jours</span>
          </div>
          <div className="w-12 h-12 bg-red-50 text-[#C00000] rounded-lg flex items-center justify-center font-bold">
            <AlertTriangle className="w-6 h-6 stroke-[1.75]" />
          </div>
        </div>

        {/* KPI 4: Sécurité & Connexions */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alertes Sécurité</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{failedLoginsCount}</div>
            <span className="text-[11px] text-slate-500">Échecs de connexion récents</span>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-700 rounded-lg flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6 stroke-[1.75]" />
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Expiring Contracts & Quick Modules */}
        <div className="lg:col-span-2 space-y-6">
          {/* Expiring Contracts Alert Panel */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-[#C00000] stroke-[1.75]" />
                <span>Contrats Expirant dans les 30 Prochains Jours</span>
              </h2>
              <button
                onClick={() => onNavigate('employees')}
                className="text-xs text-[#1F3864] hover:underline font-bold"
              >
                Gérer les employés →
              </button>
            </div>

            {expiringContracts.length === 0 ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center space-x-2">
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
                      <div className="text-xs font-bold text-[#C00000]">
                        Fin le : {emp.currentContract?.endDate}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {emp.currentContract?.baseSalary.toLocaleString()} {emp.currentContract?.currency}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payroll Run History Quick View */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-[#1F3864] stroke-[1.75]" />
                <span>Derniers Traitements de Paie</span>
              </h2>
              <button
                onClick={() => onNavigate('payroll')}
                className="text-xs text-[#1F3864] hover:underline font-bold"
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
                  <div key={run.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{run.label} ({run.period})</div>
                      <div className="text-[11px] text-slate-500">
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
                      <div className="text-xs font-bold text-slate-800 mt-1">
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-3">Accès Rapide ERP RH</h2>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onNavigate('employees')}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs font-bold text-slate-800 transition flex items-center space-x-2"
              >
                <Users className="w-4 h-4 text-[#1F3864] stroke-[1.75]" />
                <span>Employés</span>
              </button>
              <button
                onClick={() => onNavigate('attendance')}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs font-bold text-slate-800 transition flex items-center space-x-2"
              >
                <Clock className="w-4 h-4 text-[#1F3864] stroke-[1.75]" />
                <span>Présences</span>
              </button>
              <button
                onClick={() => onNavigate('leave')}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs font-bold text-slate-800 transition flex items-center space-x-2"
              >
                <CalendarDays className="w-4 h-4 text-[#1F3864] stroke-[1.75]" />
                <span>Congés</span>
              </button>
              <button
                onClick={() => onNavigate('loans')}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs font-bold text-slate-800 transition flex items-center space-x-2"
              >
                <HandCoins className="w-4 h-4 text-[#1F3864] stroke-[1.75]" />
                <span>Prêts</span>
              </button>
              <button
                onClick={() => onNavigate('declarations')}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs font-bold text-slate-800 transition flex items-center space-x-2"
              >
                <Landmark className="w-4 h-4 text-[#1F3864] stroke-[1.75]" />
                <span>Déclarations</span>
              </button>
              <button
                onClick={() => onNavigate('security')}
                className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs font-bold text-slate-800 transition flex items-center space-x-2"
              >
                <ShieldCheck className="w-4 h-4 text-[#1F3864] stroke-[1.75]" />
                <span>Sécurité RBAC</span>
              </button>
            </div>
          </div>

          <div className="bg-[#1F3864]/5 border border-[#1F3864]/20 p-4 rounded-xl text-xs space-y-2 text-[#1F3864]">
            <div className="font-bold text-sm">Normes Légales RDC 2026 :</div>
            <div>• Barème IRPP progressif (3% à 40%)</div>
            <div>• Plafond IRPP : Max 30% du salaire imposable</div>
            <div>• CNSS Salarié 5% | Patronale 9%</div>
            <div>• INPP 3%/2% | ONEM 0.2%</div>
            <div>• SMIG : 21 500 FC / jour</div>
          </div>
        </div>
      </div>
    </div>
  );
};
