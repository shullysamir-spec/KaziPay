/**
 * @license
 * KaziPay - ERP RH et Paie RDC
 */

import React, { useEffect, useState } from 'react';
import { getAttendanceByPeriod, saveAttendanceRecord, lockAttendancePeriod } from '../../services/attendanceService';
import { getEmployees } from '../../services/employeeService';
import { AttendanceRecord } from '../../types/attendance';
import { EmployeeWithContract } from '../../types/employee';
import { CalendarCheck, Lock, Save, CheckCircle } from 'lucide-react';

export const AttendanceModule: React.FC = () => {
  const [period, setPeriod] = useState('202607');
  const [employees, setEmployees] = useState<EmployeeWithContract[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    async function loadAttendanceData() {
      setLoading(true);
      const emps = await getEmployees();
      setEmployees(emps);

      const attList = await getAttendanceByPeriod(period);
      const map: Record<string, AttendanceRecord> = {};

      for (const emp of emps) {
        if (!emp.id) continue;
        const existing = attList.find((a) => a.employeeId === emp.id);
        map[emp.id] = existing || {
          employeeId: emp.id,
          period,
          daysWorked: 26,
          absences: 0,
          overtime130: 0,
          overtime160: 0,
          overtime200: 0,
          isLocked: false,
        };
      }
      setRecords(map);
      setLoading(false);
    }
    loadAttendanceData();
  }, [period]);

  const handleChange = (employeeId: string, field: keyof AttendanceRecord, value: number) => {
    setRecords((prev) => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: Math.max(0, value),
      },
    }));
  };

  const handleSaveAll = async () => {
    for (const empId of Object.keys(records)) {
      await saveAttendanceRecord(records[empId]);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleLockPeriod = async () => {
    if (window.confirm(`Confirmer le verrouillage définitif de la période de présence ${period} ?`)) {
      await lockAttendancePeriod(period);
      setRecords((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => (next[k].isLocked = true));
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-[#1F3864]">Grille Mensuelle des Présences & Heures Sup</h1>
          <p className="text-xs text-slate-500">
            Saisie des jours travaillés, absences et majorations légales d'heures supplémentaires (130%, 160%, 200%).
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="month"
            value={`${period.substring(0, 4)}-${period.substring(4, 6)}`}
            onChange={(e) => setPeriod(e.target.value.replace('-', ''))}
            className="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white font-bold text-slate-800"
          />

          <button
            onClick={handleSaveAll}
            className="bg-[#1F3864] hover:bg-[#152747] text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow transition"
          >
            <Save className="w-4 h-4 text-[#BF9000]" />
            <span>Enregistrer Tout</span>
          </button>

          <button
            onClick={handleLockPeriod}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center space-x-1 shadow transition"
          >
            <Lock className="w-4 h-4" />
            <span>Verrouiller</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Saisie des présences sauvegardée avec succès !</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#1F3864] text-white uppercase font-bold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Salarié</th>
                <th className="py-3 px-4">Jours Travaillés (0-26)</th>
                <th className="py-3 px-4">Absences Non Payées</th>
                <th className="py-3 px-4">HS 130%</th>
                <th className="py-3 px-4">HS 160%</th>
                <th className="py-3 px-4">HS 200%</th>
                <th className="py-3 px-4 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Chargement de la grille...
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const rec = records[emp.id || ''] || {};
                  const isLocked = rec.isLocked;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div>{emp.lastName} {emp.firstName}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{emp.position}</div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={0}
                          max={31}
                          disabled={isLocked}
                          value={rec.daysWorked ?? 26}
                          onChange={(e) => handleChange(emp.id || '', 'daysWorked', parseInt(e.target.value) || 0)}
                          className="w-20 p-1.5 border rounded font-bold text-center"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={0}
                          disabled={isLocked}
                          value={rec.absences ?? 0}
                          onChange={(e) => handleChange(emp.id || '', 'absences', parseInt(e.target.value) || 0)}
                          className="w-20 p-1.5 border rounded text-center text-red-600 font-bold"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={0}
                          disabled={isLocked}
                          value={rec.overtime130 ?? 0}
                          onChange={(e) => handleChange(emp.id || '', 'overtime130', parseInt(e.target.value) || 0)}
                          className="w-20 p-1.5 border rounded text-center"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={0}
                          disabled={isLocked}
                          value={rec.overtime160 ?? 0}
                          onChange={(e) => handleChange(emp.id || '', 'overtime160', parseInt(e.target.value) || 0)}
                          className="w-20 p-1.5 border rounded text-center"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={0}
                          disabled={isLocked}
                          value={rec.overtime200 ?? 0}
                          onChange={(e) => handleChange(emp.id || '', 'overtime200', parseInt(e.target.value) || 0)}
                          className="w-20 p-1.5 border rounded text-center"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isLocked ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            Verrouillé
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            Ouvert
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
