/**
 * @license
 * NovarisPay - ERP RH et Paie RDC (BILINGUAL)
 */

import React, { useEffect, useState } from 'react';
import { getLoans, createLoan } from '../../services/loanService';
import { getEmployees } from '../../services/employeeService';
import { Loan } from '../../types/loan';
import { EmployeeWithContract } from '../../types/employee';
import { useLanguage } from '../../context/LanguageContext';
import { Plus } from 'lucide-react';

export const LoansModule: React.FC = () => {
  const { lang, t, formatNumber } = useLanguage();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [employees, setEmployees] = useState<EmployeeWithContract[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    employeeId: '',
    type: 'Prêt',
    amount: 1000,
    currency: 'USD' as 'USD' | 'CDF',
    monthlyDeduction: 100,
    installmentsCount: 10,
    startDate: new Date().toISOString().slice(0, 7),
    reason: '',
  });

  const loadData = async () => {
    setLoading(true);
    const emps = await getEmployees();
    setEmployees(emps);
    if (emps.length > 0) setForm((prev) => ({ ...prev, employeeId: emps[0].id || '' }));

    const lns = await getLoans();
    setLoans(lns);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === form.employeeId);
    await createLoan({
      employeeId: form.employeeId,
      employeeName: emp ? `${emp.lastName} ${emp.firstName}` : '',
      label: form.type === 'Avance' ? 'Avance sur salaire' : 'Prêt personnel d\'urgence',
      reason: form.reason || (form.type === 'Avance' ? 'Avance sur salaire' : 'Prêt personnel'),
      totalAmount: form.amount,
      amount: form.amount,
      currency: form.currency,
      monthlyDeduction: form.monthlyDeduction,
      remainingBalance: form.amount,
      startDate: form.startDate,
      status: 'EN_COURS',
    });
    setIsModalOpen(false);
    loadData();
  };

  const getLoanTypeLabel = (labelOrType?: string) => {
    if (!labelOrType) return t.loans.typeEmergencyLoan;
    if (labelOrType.toLowerCase().includes('avance') || labelOrType === 'Avance') return t.loans.typeSalaryAdvance;
    return t.loans.typeEmergencyLoan;
  };

  const getLoanStatusLabel = (status: string) => {
    if (status === 'SOLDE' || status === 'Soldé') return t.loans.statusCompleted;
    return t.loans.statusActive;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-[#1F3864] dark:text-blue-300">{t.loans.title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.loans.subtitle}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#1F3864] hover:bg-[#152747] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow transition"
        >
          <Plus className="w-4 h-4 text-[#BF9000] dark:text-amber-300" />
          <span>{t.loans.newLoan}</span>
        </button>
      </div>

      {/* Loans Table (Desktop/Tablet) & Cards (Mobile) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Desktop / Tablet View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
            <thead className="bg-[#1F3864] text-white uppercase font-bold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">{t.loans.colEmployee}</th>
                <th className="py-3 px-4">{t.loans.colLoanType}</th>
                <th className="py-3 px-4">{t.loans.colAmount}</th>
                <th className="py-3 px-4">{t.loans.colMonthlyDeduction}</th>
                <th className="py-3 px-4">{t.loans.colRemaining}</th>
                <th className="py-3 px-4 text-right">{t.loans.colStatus}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {t.common.loading}
                  </td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {lang === 'fr' ? 'Aucun prêt ou avance en cours.' : 'No active loans or advances.'}
                  </td>
                </tr>
              ) : (
                loans.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{l.employeeName || l.employeeId}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{getLoanTypeLabel(l.label || l.reason)}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {formatNumber(l.totalAmount || l.amount || 0)} {l.currency}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#1F3864] dark:text-blue-300 font-bold">
                      {formatNumber(l.monthlyDeduction)} {l.currency} / {lang === 'fr' ? 'mois' : 'mo'}
                    </td>
                    <td className="py-3 px-4 font-bold text-red-600 dark:text-red-400">
                      {formatNumber(l.remainingBalance)} {l.currency}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        l.status === 'SOLDE' || l.status === 'Soldé'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      }`}>
                        {getLoanStatusLabel(l.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Stacked Cards (< md) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              {t.common.loading}
            </div>
          ) : loans.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              {lang === 'fr' ? 'Aucun prêt ou avance en cours.' : 'No active loans or advances.'}
            </div>
          ) : (
            loans.map((l) => (
              <div key={l.id} className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{l.employeeName || l.employeeId}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{getLoanTypeLabel(l.label || l.reason)}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    l.status === 'SOLDE' || l.status === 'Soldé'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                  }`}>
                    {getLoanStatusLabel(l.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{t.loans.colAmount}</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 font-mono text-sm">
                      {formatNumber(l.totalAmount || l.amount || 0)} {l.currency}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{t.loans.colMonthlyDeduction}</span>
                    <span className="font-bold text-[#1F3864] dark:text-blue-300 font-mono">
                      {formatNumber(l.monthlyDeduction)} {l.currency}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{t.loans.colRemaining}</span>
                    <span className="font-black text-red-600 dark:text-red-400 font-mono">
                      {formatNumber(l.remainingBalance)} {l.currency}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-bold text-[#1F3864] dark:text-blue-300 mb-4">{t.loans.modalTitle}</h2>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1 dark:text-slate-200">{t.loans.colEmployee}</label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full p-2 border rounded font-semibold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.lastName} {e.firstName} ({e.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 dark:text-slate-200">{t.loans.colLoanType}</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full p-2 border rounded font-semibold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                >
                  <option value="Avance">{t.loans.typeSalaryAdvance}</option>
                  <option value="Prêt">{t.loans.typeEmergencyLoan}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1 dark:text-slate-200">{t.employees.currency}</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value as 'USD' | 'CDF' })}
                    className="w-full p-2 border rounded font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CDF">CDF (FC)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1 dark:text-slate-200">{t.loans.amountLabel}</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border rounded font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1 dark:text-slate-200">{t.loans.deductionLabel}</label>
                  <input
                    type="number"
                    value={form.monthlyDeduction}
                    onChange={(e) => setForm({ ...form, monthlyDeduction: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border rounded font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 dark:text-slate-200">{t.loans.installmentsLabel}</label>
                  <input
                    type="number"
                    value={form.installmentsCount}
                    onChange={(e) => setForm({ ...form, installmentsCount: parseInt(e.target.value) || 1 })}
                    className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded text-[11px] text-blue-900 dark:text-blue-200">
                {lang === 'fr' ? 'La retenue maximale légale autorisée est de 30% de la quotité cessible sur salaire net imposable (Art. 114 Code du Travail RDC).' : 'The maximum legal allowable deduction is 30% of the attachable portion of net taxable salary (Art. 114 DRC Labor Code).'}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded font-bold dark:border-slate-700 dark:text-slate-300"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1F3864] dark:bg-blue-600 text-white font-bold rounded shadow"
                >
                  {t.loans.saveLoan}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
