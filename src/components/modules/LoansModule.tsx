/**
 * @license
 * KaziPay - ERP RH et Paie RDC
 */

import React, { useEffect, useState } from 'react';
import { getLoans, createLoan } from '../../services/loanService';
import { getEmployees } from '../../services/employeeService';
import { Loan } from '../../types/loan';
import { EmployeeWithContract } from '../../types/employee';
import { CreditCard, Plus, DollarSign, CheckCircle2 } from 'lucide-react';

export const LoansModule: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [employees, setEmployees] = useState<EmployeeWithContract[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    employeeId: '',
    label: 'Avance sur salaire',
    totalAmount: 500000,
    currency: 'CDF' as 'CDF' | 'USD',
    monthlyDeduction: 100000,
    startDate: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    setLoading(true);
    const emps = await getEmployees();
    setEmployees(emps);
    if (emps.length > 0) setForm((prev) => ({ ...prev, employeeId: emps[0].id || '' }));

    const list = await getLoans();
    setLoans(list);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === form.employeeId);
    await createLoan({
      ...form,
      employeeName: emp ? `${emp.lastName} ${emp.firstName}` : '',
      remainingBalance: form.totalAmount,
      status: 'EN_COURS',
    });
    setIsModalOpen(false);
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-[#1F3864]">Prêts & Avances sur Salaire</h1>
          <p className="text-xs text-slate-500">
            Gestion des échéanciers avec retenue automatique sur la paie dans le respect de la quotité cessible (Max 1/3 du Net).
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#1F3864] hover:bg-[#152747] text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow transition"
        >
          <Plus className="w-4 h-4 text-[#BF9000]" />
          <span>Octroyer un Prêt</span>
        </button>
      </div>

      {/* Loans Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#1F3864] text-white uppercase font-bold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Salarié</th>
                <th className="py-3 px-4">Objet du Prêt</th>
                <th className="py-3 px-4">Montant Total</th>
                <th className="py-3 px-4">Mensualité Déduite</th>
                <th className="py-3 px-4">Solde Restant</th>
                <th className="py-3 px-4 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Chargement du portefeuille de prêts...
                  </td>
                </tr>
              ) : loans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Aucun prêt ou avance en cours.
                  </td>
                </tr>
              ) : (
                loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{loan.employeeName || loan.employeeId}</td>
                    <td className="py-3 px-4 text-slate-800 font-semibold">{loan.label}</td>
                    <td className="py-3 px-4 font-bold">
                      {loan.totalAmount.toLocaleString()} {loan.currency}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#1F3864]">
                      {loan.monthlyDeduction.toLocaleString()} {loan.currency} / mois
                    </td>
                    <td className="py-3 px-4 font-bold text-red-600">
                      {loan.remainingBalance.toLocaleString()} {loan.currency}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        loan.status === 'SOLDE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {loan.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grant Loan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h2 className="text-base font-bold text-[#1F3864] mb-4">Nouveau Prêt / Avance sur Salaire</h2>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Salarié Bénéficiaire</label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full p-2 border rounded font-semibold"
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.lastName} {e.firstName} ({e.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Libellé / Motif</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Devise</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value as any })}
                    className="w-full p-2 border rounded font-bold"
                  >
                    <option value="CDF">CDF (FC)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Montant Total</label>
                  <input
                    type="number"
                    value={form.totalAmount}
                    onChange={(e) => setForm({ ...form, totalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 border rounded font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Mensualité à Déduire de la Paie</label>
                <input
                  type="number"
                  value={form.monthlyDeduction}
                  onChange={(e) => setForm({ ...form, monthlyDeduction: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border rounded font-bold text-[#1F3864]"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Sera retenue automatiquement sur le bulletin dans la limite de 33.3% du Net.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1F3864] text-white font-bold rounded shadow"
                >
                  Octroyer le Prêt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
