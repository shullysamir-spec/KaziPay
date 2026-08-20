/**
 * @license
 * NovarisPay - ERP RH et Paie RDC (BILINGUAL)
 */

import React, { useEffect, useState } from 'react';
import { getLeaveRequests, createLeaveRequest, updateLeaveStatus } from '../../services/attendanceService';
import { getEmployees } from '../../services/employeeService';
import { LeaveRequest, LeaveType } from '../../types/attendance';
import { EmployeeWithContract } from '../../types/employee';
import { useLanguage } from '../../context/LanguageContext';
import { Plus, Check, X, Calendar as CalendarIcon } from 'lucide-react';

export const LeaveModule: React.FC = () => {
  const { lang, t, formatDate } = useLanguage();
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
    await updateLeaveStatus(id, status, lang === 'fr' ? 'Superviseur RH' : 'HR Supervisor');
    loadData();
  };

  const getStatusLabel = (status: string) => {
    if (status === 'Approuvé') return t.leave.statusApproved;
    if (status === 'Refusé') return t.leave.statusRejected;
    return t.leave.statusPending;
  };

  const getTypeLabel = (type: string) => {
    if (type === 'Congé annuel') return t.leave.typeAnnual;
    if (type === 'Maternité') return t.leave.typeMaternity;
    if (type === 'Circonstanciel') return t.leave.typeCircumstance;
    if (type === 'Maladie') return t.leave.typeSick;
    return type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-[#1F3864] dark:text-blue-300">{t.leave.title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.leave.subtitle}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#1F3864] hover:bg-[#152747] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow transition"
        >
          <Plus className="w-4 h-4 text-[#BF9000] dark:text-amber-300" />
          <span>{t.leave.requestLeave}</span>
        </button>
      </div>

      {/* Requests Table (Desktop/Tablet) & Cards (Mobile) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Desktop / Tablet View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
            <thead className="bg-[#1F3864] text-white uppercase font-bold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">{t.leave.colEmployee}</th>
                <th className="py-3 px-4">{t.leave.colLeaveType}</th>
                <th className="py-3 px-4">{t.leave.colStartDate} / {t.leave.colEndDate}</th>
                <th className="py-3 px-4">{t.leave.colDays}</th>
                <th className="py-3 px-4">{t.leave.colStatus}</th>
                <th className="py-3 px-4 text-right">{t.leave.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {t.common.loading}
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {lang === 'fr' ? 'Aucune demande de congé enregistrée.' : 'No leave requests recorded.'}
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{r.employeeName || r.employeeId}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{getTypeLabel(r.type)}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {lang === 'fr' ? `Du ${formatDate(r.startDate)} au ${formatDate(r.endDate)}` : `From ${formatDate(r.startDate)} to ${formatDate(r.endDate)}`}
                    </td>
                    <td className="py-3 px-4 font-bold">{r.daysCount} {lang === 'fr' ? 'jour(s)' : 'day(s)'}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        r.status === 'Approuvé'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : r.status === 'Refusé'
                          ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                          : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      }`}>
                        {getStatusLabel(r.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {r.status === 'En attente' && (
                        <>
                          <button
                            onClick={() => r.id && handleApprove(r.id, 'Approuvé')}
                            className="p-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded min-h-[32px] min-w-[32px] inline-flex items-center justify-center"
                            title={t.leave.approve}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => r.id && handleApprove(r.id, 'Refusé')}
                            className="p-1.5 bg-red-600 text-white hover:bg-red-700 rounded min-h-[32px] min-w-[32px] inline-flex items-center justify-center"
                            title={t.leave.reject}
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

        {/* Mobile View: Stacked Cards (< md) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              {t.common.loading}
            </div>
          ) : requests.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              {lang === 'fr' ? 'Aucune demande de congé enregistrée.' : 'No leave requests recorded.'}
            </div>
          ) : (
            requests.map((r) => (
              <div key={r.id} className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{r.employeeName || r.employeeId}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{getTypeLabel(r.type)}</div>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    r.status === 'Approuvé'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      : r.status === 'Refusé'
                      ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                  }`}>
                    {getStatusLabel(r.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{t.leave.colStartDate}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{formatDate(r.startDate)}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 block">→ {formatDate(r.endDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{t.leave.colDays}</span>
                    <span className="font-bold text-[#1F3864] dark:text-blue-300 text-sm">{r.daysCount} {lang === 'fr' ? 'jour(s)' : 'day(s)'}</span>
                  </div>
                </div>

                {r.status === 'En attente' && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => r.id && handleApprove(r.id, 'Approuvé')}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-lg text-xs flex items-center justify-center space-x-1.5 shadow min-h-[44px]"
                    >
                      <Check className="w-4 h-4" />
                      <span>{t.leave.approve}</span>
                    </button>
                    <button
                      onClick={() => r.id && handleApprove(r.id, 'Refusé')}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-3 rounded-lg text-xs flex items-center justify-center space-x-1.5 shadow min-h-[44px]"
                    >
                      <X className="w-4 h-4" />
                      <span>{t.leave.reject}</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-bold text-[#1F3864] dark:text-blue-300 mb-4">{t.leave.modalRequestTitle}</h2>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1 dark:text-slate-200">{t.leave.employeeLabel}</label>
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
                <label className="block font-bold mb-1 dark:text-slate-200">{t.leave.leaveTypeLabel}</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as LeaveType })}
                  className="w-full p-2 border rounded font-semibold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                >
                  <option value="Congé annuel">{t.leave.typeAnnual}</option>
                  <option value="Maternité">{t.leave.typeMaternity}</option>
                  <option value="Circonstanciel">{t.leave.typeCircumstance}</option>
                  <option value="Maladie">{t.leave.typeSick}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1 dark:text-slate-200">{t.leave.startDateLabel}</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 dark:text-slate-200">{t.leave.endDateLabel}</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1 dark:text-slate-200">{t.leave.colDays}</label>
                <input
                  type="number"
                  value={form.daysCount}
                  onChange={(e) => setForm({ ...form, daysCount: parseInt(e.target.value) || 1 })}
                  className="w-full p-2 border rounded font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  required
                />
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
                  {t.leave.submitRequest}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
