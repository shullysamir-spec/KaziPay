/**
 * @license
 * KaziPay - ERP RH et Paie RDC
 */

import React, { useEffect, useState } from 'react';
import { getLeaveRequests, createLeaveRequest, updateLeaveStatus } from '../../services/attendanceService';
import { getEmployees } from '../../services/employeeService';
import { LeaveRequest, LeaveType } from '../../types/attendance';
import { EmployeeWithContract } from '../../types/employee';
import { Palmtree, Plus, Check, X, Calendar as CalendarIcon } from 'lucide-react';

export const LeaveModule: React.FC = () => {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<EmployeeWithContract[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    employeeId: '',
    type: 'Congé annuel' as LeaveType,
    startDate: '',
    endDate: '',
    daysCount: 1,
    reason: '',
  });

  const loadData = async () => {
    setLoading(true);
    const emps = await getEmployees();
    setEmployees(emps);
    if (emps.length > 0) setForm((prev) => ({ ...prev, employeeId: emps[0].id || '' }));

    const reqs = await getLeaveRequests();
    setRequests(reqs);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find((e) => e.id === form.employeeId);
    await createLeaveRequest({
      ...form,
      employeeName: emp ? `${emp.lastName} ${emp.firstName}` : '',
      status: 'En attente',
    });
    setIsModalOpen(false);
    loadData();
  };

  const handleApprove = async (id: string, status: 'Approuvé' | 'Refusé') => {
    await updateLeaveStatus(id, status, 'Superviseur RH');
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-[#1F3864]">Gestion des Congés & Absences Legales</h1>
          <p className="text-xs text-slate-500">
            Workflow de demande, approbation hiérarchique et suivi du solde de congés (Annuel, Maternité, Maladie).
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#1F3864] hover:bg-[#152747] text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow transition"
        >
          <Plus className="w-4 h-4 text-[#BF9000]" />
          <span>Nouvelle Demande</span>
        </button>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#1F3864] text-white uppercase font-bold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Salarié</th>
                <th className="py-3 px-4">Type de Congé</th>
                <th className="py-3 px-4">Période</th>
                <th className="py-3 px-4">Durée</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Approbation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Chargement des congés...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Aucune demande de congé enregistrée.
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{r.employeeName || r.employeeId}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{r.type}</td>
                    <td className="py-3 px-4 text-slate-600">
                      Du {r.startDate} au {r.endDate}
                    </td>
                    <td className="py-3 px-4 font-bold">{r.daysCount} jour(s)</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.status === 'Approuvé'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'Refusé'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {r.status === 'En attente' && (
                        <>
                          <button
                            onClick={() => r.id && handleApprove(r.id, 'Approuvé')}
                            className="p-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded"
                            title="Approuver"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => r.id && handleApprove(r.id, 'Refusé')}
                            className="p-1 bg-red-600 text-white hover:bg-red-700 rounded"
                            title="Refuser"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h2 className="text-base font-bold text-[#1F3864] mb-4">Nouvelle Demande de Congé</h2>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Salarié</label>
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
                <label className="block font-bold mb-1">Type de Congé</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as LeaveType })}
                  className="w-full p-2 border rounded font-semibold"
                >
                  <option value="Congé annuel">Congé annuel</option>
                  <option value="Maternité">Maternité (14 semaines)</option>
                  <option value="Circonstanciel">Circonstanciel</option>
                  <option value="Maladie">Maladie</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Date début</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Date fin</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Nombre de jours</label>
                <input
                  type="number"
                  value={form.daysCount}
                  onChange={(e) => setForm({ ...form, daysCount: parseInt(e.target.value) || 1 })}
                  className="w-full p-2 border rounded font-bold"
                  required
                />
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
                  Soumettre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
