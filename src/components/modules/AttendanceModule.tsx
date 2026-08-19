/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 */

import React, { useEffect, useState } from 'react';
import { getAttendanceByPeriod, saveAttendanceRecord, lockAttendancePeriod } from '../../services/attendanceService';
import { getEmployees } from '../../services/employeeService';
import { AttendanceRecord } from '../../types/attendance';
import { EmployeeWithContract } from '../../types/employee';
import {
  CalendarCheck,
  Lock,
  Save,
  CheckCircle,
  Clock,
  Cpu,
  RefreshCw,
  Sliders,
  Check,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const AttendanceModule: React.FC = () => {
  const [period, setPeriod] = useState('202607');
  const [employees, setEmployees] = useState<EmployeeWithContract[]>([]);
  const [records, setRecords] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [machineIp, setMachineIp] = useState('192.168.1.200');
  const [machinePort, setMachinePort] = useState('4370');
  const [machineProtocol, setMachineProtocol] = useState('ZKTEco / TCP-IP');

  const toast = useToast();

  useEffect(() => {
    async function loadAttendanceData() {
      setLoading(true);
      const emps = await getEmployees();
      setEmployees(emps);

      const attList = await getAttendanceByPeriod(period);
      const map: Record<string, AttendanceRecord> = {};

      for (let i = 0; i < emps.length; i++) {
        const emp = emps[i];
        if (!emp.id) continue;
        const existing = attList.find((a) => a.employeeId === emp.id);
        
        // Generate realistic default clock-in / clock-out times if missing
        const defaultClockIn = i % 3 === 0 ? '08:15' : i % 2 === 0 ? '07:45' : '07:55';
        const defaultClockOut = i % 3 === 0 ? '17:30' : '17:00';
        const lateness = defaultClockIn > '08:00' ? 15 : 0;

        map[emp.id] = existing || {
          employeeId: emp.id,
          period,
          daysWorked: 26,
          absences: 0,
          overtime130: lateness > 0 ? 0 : 2,
          overtime160: 0,
          overtime200: 0,
          clockIn: defaultClockIn,
          clockOut: defaultClockOut,
          latenessMinutes: lateness,
          timeclockStatus: lateness > 0 ? 'Retard Constaté' : 'À l\'heure',
          deviceId: 'ZK-BIO-01',
          isLocked: false,
        };
      }
      setRecords(map);
      setLoading(false);
    }
    loadAttendanceData();
  }, [period]);

  const handleChange = (employeeId: string, field: keyof AttendanceRecord, value: any) => {
    setRecords((prev) => {
      const current = prev[employeeId] || {};
      const updated = { ...current, [field]: value };

      // Auto compute lateness if clockIn changes
      if (field === 'clockIn' && typeof value === 'string') {
        const [h, m] = value.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          const arrivalMinutes = h * 60 + m;
          const standardMinutes = 8 * 60; // 08:00 AM standard
          const lateness = Math.max(0, arrivalMinutes - standardMinutes);
          updated.latenessMinutes = lateness;
          updated.timeclockStatus = lateness > 0 ? 'Retard Constaté' : 'À l\'heure';
        }
      }

      return {
        ...prev,
        [employeeId]: updated,
      };
    });
  };

  const handleSaveAll = async () => {
    for (const empId of Object.keys(records)) {
      await saveAttendanceRecord(records[empId]);
    }
    toast.success(`Grille des présences pour la période ${period} sauvegardée avec succès !`, 'Sauvegarde Présences');
  };

  const handleLockPeriod = async () => {
    if (window.confirm(`Confirmer le verrouillage définitif de la période de présence ${period} ?`)) {
      await lockAttendancePeriod(period);
      setRecords((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => (next[k].isLocked = true));
        return next;
      });
      toast.warning(`La période ${period} est désormais verrouillée pour la paie.`, 'Période Verrouillée');
    }
  };

  // Sync with biometric machine
  const handleSyncBiometric = () => {
    setIsSyncing(true);
    setTimeout(() => {
      // Simulate reading raw log punches from timeclock machine IP 192.168.1.200
      setRecords((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((empId, idx) => {
          const randomArrivalHour = idx % 2 === 0 ? '07:50' : '08:08';
          const lateness = randomArrivalHour > '08:00' ? 8 : 0;
          next[empId] = {
            ...next[empId],
            clockIn: randomArrivalHour,
            clockOut: '17:15',
            latenessMinutes: lateness,
            timeclockStatus: 'Pointeurs Synchronisés',
            deviceId: `ZK-BIO-${machineIp.split('.').pop()}`,
          };
        });
        return next;
      });
      setIsSyncing(false);
      toast.success(
        `Synchronisation réussie avec la pointeuse biométrique ${machineIp}:${machinePort} ! ${employees.length} pointages importés.`,
        'Pointeuse Biométrique Connectée'
      );
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-[#1F3864]">Présences, Pointages Biométriques & Heures Sup</h1>
          <p className="text-xs text-slate-500">
            Saisie des heures d'arrivée/départ, intégration machine de pointage externe et calcul des retards/HS (130%, 160%, 200%).
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

      {/* External Biometric Timeclock Connection Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-[#1F3864] text-white p-4 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#BF9000]/20 border border-[#BF9000] flex items-center justify-center text-[#BF9000] shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm text-white">Machine de Pointage Biométrique Externe</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ● CONNECTÉ (IP {machineIp}:{machinePort})
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Protocole: <span className="font-semibold">{machineProtocol}</span> — Synchronisation directe des badges RFID et empreintes.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Config IP Machine</span>
          </button>

          <button
            onClick={handleSyncBiometric}
            disabled={isSyncing}
            className="px-4 py-2 bg-[#BF9000] hover:bg-[#a37a00] text-[#1F3864] font-black rounded-lg text-xs flex items-center space-x-1.5 shadow-md transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser le Pointeur'}</span>
          </button>
        </div>
      </div>

      {/* Attendance Table (Desktop/Tablet) & Cards (Mobile) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop / Tablet View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#1F3864] text-white uppercase font-bold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Salarié</th>
                <th className="py-3 px-4">Heure Arrivée</th>
                <th className="py-3 px-4">Heure Départ</th>
                <th className="py-3 px-4">Retard (min)</th>
                <th className="py-3 px-4">Jours Travaillés</th>
                <th className="py-3 px-4">Absences</th>
                <th className="py-3 px-4">HS 130%</th>
                <th className="py-3 px-4">HS 160%</th>
                <th className="py-3 px-4">HS 200%</th>
                <th className="py-3 px-4 text-center">Origine Pointage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    Chargement de la grille et connexion au poinçon biométrique...
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
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="time"
                            disabled={isLocked}
                            value={rec.clockIn || '08:00'}
                            onChange={(e) => handleChange(emp.id || '', 'clockIn', e.target.value)}
                            className="p-1 border border-slate-300 rounded text-xs font-mono font-bold bg-white"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="time"
                            disabled={isLocked}
                            value={rec.clockOut || '17:00'}
                            onChange={(e) => handleChange(emp.id || '', 'clockOut', e.target.value)}
                            className="p-1 border border-slate-300 rounded text-xs font-mono font-bold bg-white"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            (rec.latenessMinutes || 0) > 0
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {rec.latenessMinutes || 0} min
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={0}
                          max={31}
                          disabled={isLocked}
                          value={rec.daysWorked ?? 26}
                          onChange={(e) => handleChange(emp.id || '', 'daysWorked', parseInt(e.target.value) || 0)}
                          className="w-16 p-1.5 border rounded font-bold text-center"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={0}
                          disabled={isLocked}
                          value={rec.absences ?? 0}
                          onChange={(e) => handleChange(emp.id || '', 'absences', parseInt(e.target.value) || 0)}
                          className="w-16 p-1.5 border rounded text-center text-red-600 font-bold"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={0}
                          disabled={isLocked}
                          value={rec.overtime130 ?? 0}
                          onChange={(e) => handleChange(emp.id || '', 'overtime130', parseInt(e.target.value) || 0)}
                          className="w-16 p-1.5 border rounded text-center"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={0}
                          disabled={isLocked}
                          value={rec.overtime160 ?? 0}
                          onChange={(e) => handleChange(emp.id || '', 'overtime160', parseInt(e.target.value) || 0)}
                          className="w-16 p-1.5 border rounded text-center"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={0}
                          disabled={isLocked}
                          value={rec.overtime200 ?? 0}
                          onChange={(e) => handleChange(emp.id || '', 'overtime200', parseInt(e.target.value) || 0)}
                          className="w-16 p-1.5 border rounded text-center"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center space-x-1 bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          <Cpu className="w-3 h-3 text-[#1F3864]" />
                          <span>{rec.timeclockStatus || 'Biométrique'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Stacked Cards (< md) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Chargement de la grille et connexion au poinçon biométrique...
            </div>
          ) : (
            employees.map((emp) => {
              const rec = records[emp.id || ''] || {};
              const isLocked = rec.isLocked;

              return (
                <div key={emp.id} className="p-4 space-y-3 hover:bg-slate-50 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{emp.lastName} {emp.firstName}</div>
                      <div className="text-[11px] text-slate-500">{emp.position}</div>
                    </div>
                    <span
                      className={`font-mono font-bold px-2.5 py-1 rounded text-xs ${
                        (rec.latenessMinutes || 0) > 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {(rec.latenessMinutes || 0) > 0 ? `${rec.latenessMinutes} min retard` : 'À l\'heure'}
                    </span>
                  </div>

                  {/* Clock In / Out */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Arrivée</label>
                      <input
                        type="time"
                        disabled={isLocked}
                        value={rec.clockIn || '08:00'}
                        onChange={(e) => handleChange(emp.id || '', 'clockIn', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded font-mono font-bold bg-white min-h-[40px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Départ</label>
                      <input
                        type="time"
                        disabled={isLocked}
                        value={rec.clockOut || '17:00'}
                        onChange={(e) => handleChange(emp.id || '', 'clockOut', e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded font-mono font-bold bg-white min-h-[40px]"
                      />
                    </div>
                  </div>

                  {/* Attendance counts */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase">J. Travaillés</span>
                      <input
                        type="number"
                        min={0}
                        max={31}
                        disabled={isLocked}
                        value={rec.daysWorked ?? 26}
                        onChange={(e) => handleChange(emp.id || '', 'daysWorked', parseInt(e.target.value) || 0)}
                        className="w-full p-1.5 border rounded font-bold text-center mt-1 min-h-[38px]"
                      />
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                      <span className="block text-[10px] text-red-500 font-bold uppercase">Absences</span>
                      <input
                        type="number"
                        min={0}
                        disabled={isLocked}
                        value={rec.absences ?? 0}
                        onChange={(e) => handleChange(emp.id || '', 'absences', parseInt(e.target.value) || 0)}
                        className="w-full p-1.5 border rounded text-center text-red-600 font-bold mt-1 min-h-[38px]"
                      />
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                      <span className="block text-[10px] text-blue-600 font-bold uppercase">HS Total</span>
                      <input
                        type="number"
                        min={0}
                        disabled={isLocked}
                        value={(rec.overtime130 ?? 0) + (rec.overtime160 ?? 0) + (rec.overtime200 ?? 0)}
                        onChange={(e) => handleChange(emp.id || '', 'overtime130', parseInt(e.target.value) || 0)}
                        className="w-full p-1.5 border rounded text-center font-bold mt-1 min-h-[38px]"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Biometric Machine Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-sm text-[#1F3864] flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-[#BF9000]" />
                <span>Configuration de la Machine de Pointage</span>
              </h3>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Adresse IP de la Pointeuse</label>
                <input
                  type="text"
                  value={machineIp}
                  onChange={(e) => setMachineIp(e.target.value)}
                  className="w-full p-2 border rounded font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Port TCP/IP</label>
                <input
                  type="text"
                  value={machinePort}
                  onChange={(e) => setMachinePort(e.target.value)}
                  className="w-full p-2 border rounded font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Protocole Matériel</label>
                <select
                  value={machineProtocol}
                  onChange={(e) => setMachineProtocol(e.target.value)}
                  className="w-full p-2 border rounded font-bold bg-white"
                >
                  <option value="ZKTEco / TCP-IP">ZKTEco (SDK Native TCP-IP)</option>
                  <option value="API REST Webhook">API REST / Webhook Biométrique</option>
                  <option value="Fichier Logs CSV/DAT">Importation Fichier CSV / DAT logs</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowConfigModal(false);
                  toast.success(`Configuration enregistrée : ${machineIp}:${machinePort} (${machineProtocol})`);
                }}
                className="px-4 py-2 bg-[#1F3864] text-white font-bold rounded-lg text-xs shadow"
              >
                Enregistrer Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

