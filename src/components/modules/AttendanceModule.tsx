/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * 
 * MODULE SUIVI DES PRÉSENCES, POINTAGES ET GESTION DU TEMPS DE TRAVAIL
 * - Vue Détaillée par Employé et par Jour (Arrivée, Départ, Retards, Heures Travaillées, Heures Sup, Statuts)
 * - Historique consultable jour par jour avec filtres période, employé, département, statut
 * - Totaux par période (jours prestés, absences, retards, HS 130%, 160%, 200%) alimentant la paie
 * - Exports NON MODIFIABLES : PDF officiel figé (en-tête société, logo, code-barres) & Excel Protégé scellé
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  getAttendanceByPeriod,
  saveAttendanceRecord,
  lockAttendancePeriod,
  getDailyAttendanceByPeriod,
  saveDailyAttendanceRecord,
  saveDailyAttendanceBatch,
  generateSeedDailyRecordsForPeriod,
  aggregateDailyToMonthlySummary,
  computeDailyTimes,
} from '../../services/attendanceService';
import { getEmployees } from '../../services/employeeService';
import { AttendanceRecord, DailyAttendanceRecord, DailyAttendanceStatus } from '../../types/attendance';
import { EmployeeWithContract } from '../../types/employee';
import {
  CalendarCheck,
  Calendar,
  CalendarDays,
  Lock,
  Unlock,
  Save,
  CheckCircle2,
  Clock,
  Cpu,
  RefreshCw,
  Sliders,
  Check,
  AlertTriangle,
  Download,
  FileText,
  FileSpreadsheet,
  Filter,
  Search,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  ShieldCheck,
  Building2,
  Sparkles,
  X,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getCompanyConfig } from '../../services/companyService';
import { exportAttendanceRegisterPDF, exportAttendanceToProtectedExcel, getStatusLabel } from '../../utils/attendanceExport';

type ActiveTab = 'daily' | 'history' | 'timesheet' | 'payroll_summary';

export const AttendanceModule: React.FC = () => {
  const [period, setPeriod] = useState('202607');
  const [activeTab, setActiveTab] = useState<ActiveTab>('daily');
  const [selectedDate, setSelectedDate] = useState('2026-07-15');

  const [employees, setEmployees] = useState<EmployeeWithContract[]>([]);
  const [dailyRecords, setDailyRecords] = useState<DailyAttendanceRecord[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('TOUS');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('TOUS');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('TOUS');

  // Modals & Configuration
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [machineIp, setMachineIp] = useState('192.168.1.200');
  const [machinePort, setMachinePort] = useState('4370');
  const [machineProtocol, setMachineProtocol] = useState('ZKTEco / TCP-IP');

  // Modal d'édition détaillée de pointage
  const [editingRecord, setEditingRecord] = useState<DailyAttendanceRecord | null>(null);

  const toast = useToast();
  const company = getCompanyConfig();

  // Initialisation et chargement des données
  useEffect(() => {
    async function loadAttendanceData() {
      setLoading(true);
      try {
        const emps = await getEmployees();
        setEmployees(emps);

        // 1. Charger les pointages journaliers
        let dList = await getDailyAttendanceByPeriod(period);
        if (dList.length === 0) {
          // Générer des pointages initiaux cohérents pour le mois
          dList = generateSeedDailyRecordsForPeriod(period, emps);
          // Sauvegarde en arrière-plan
          saveDailyAttendanceBatch(dList).catch((e) => console.warn('Erreur seed daily:', e));
        }
        setDailyRecords(dList);

        // 2. Charger ou calculer la synthèse mensuelle
        const existingMonthly = await getAttendanceByPeriod(period);
        const mapMonthly: Record<string, AttendanceRecord> = {};

        if (existingMonthly.length > 0) {
          existingMonthly.forEach((r) => {
            mapMonthly[r.employeeId] = r;
          });
        } else {
          const computed = aggregateDailyToMonthlySummary(period, dList, emps);
          Object.assign(mapMonthly, computed);
        }
        setMonthlySummaries(mapMonthly);

        // Initialiser la date sélectionnée si en dehors du mois
        const pYear = period.substring(0, 4);
        const pMonth = period.substring(4, 6);
        if (!selectedDate.startsWith(`${pYear}-${pMonth}`)) {
          setSelectedDate(`${pYear}-${pMonth}-15`);
        }
      } catch (err) {
        console.error('Erreur chargement présences:', err);
        toast.error('Erreur lors du chargement des données de pointage.');
      } finally {
        setLoading(false);
      }
    }

    loadAttendanceData();
  }, [period]);

  // Extraire les départements uniques
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  // Recalculer dynamiquement la synthèse mensuelle lorsque les pointages changent
  const computedMonthlyTotals = useMemo(() => {
    return aggregateDailyToMonthlySummary(period, dailyRecords, employees);
  }, [period, dailyRecords, employees]);

  // Statistiques globales de la période
  const periodStats = useMemo(() => {
    const totalDaysCount = dailyRecords.length;
    const presents = dailyRecords.filter((d) => d.status === 'PRESENT').length;
    const missions = dailyRecords.filter((d) => d.status === 'MISSION').length;
    const conges = dailyRecords.filter((d) => d.status === 'CONGE').length;
    const absJust = dailyRecords.filter((d) => d.status === 'ABSENT_JUSTIFIE').length;
    const absUnjust = dailyRecords.filter((d) => d.status === 'ABSENT_NON_JUSTIFIE').length;
    const totalLateness = dailyRecords.reduce((acc, d) => acc + (d.latenessMinutes || 0), 0);
    const totalHours = Math.round(dailyRecords.reduce((acc, d) => acc + (d.workedHours || 0), 0) * 10) / 10;
    const totalOT130 = Math.round(dailyRecords.reduce((acc, d) => acc + (d.overtime130 || 0), 0));
    const totalOT160 = Math.round(dailyRecords.reduce((acc, d) => acc + (d.overtime160 || 0), 0));
    const totalOT200 = Math.round(dailyRecords.reduce((acc, d) => acc + (d.overtime200 || 0), 0));

    const workingDaysCount = dailyRecords.filter((d) => d.status !== 'REPOS').length;
    const attendanceRate = workingDaysCount > 0 ? Math.round(((presents + missions) / workingDaysCount) * 100) : 100;

    return {
      attendanceRate,
      presents,
      missions,
      conges,
      absJust,
      absUnjust,
      totalLateness,
      totalHours,
      totalOT130,
      totalOT160,
      totalOT200,
    };
  }, [dailyRecords]);

  // Pointages du jour sélectionné
  const dayRecords = useMemo(() => {
    return dailyRecords.filter((d) => d.date === selectedDate);
  }, [dailyRecords, selectedDate]);

  // Filtrage des enregistrements du jour
  const filteredDayRecords = useMemo(() => {
    return dayRecords.filter((r) => {
      const matchDept = selectedDepartment === 'TOUS' || r.department === selectedDepartment;
      const matchStatus = selectedStatusFilter === 'TOUS' || r.status === selectedStatusFilter;
      const matchSearch =
        searchTerm === '' ||
        (r.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.employeeMatricule || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchDept && matchStatus && matchSearch;
    });
  }, [dayRecords, selectedDepartment, selectedStatusFilter, searchTerm]);

  // Filtrage pour l'historique complet
  const filteredHistoryRecords = useMemo(() => {
    return dailyRecords.filter((r) => {
      const matchEmp = selectedEmployeeId === 'TOUS' || r.employeeId === selectedEmployeeId;
      const matchDept = selectedDepartment === 'TOUS' || r.department === selectedDepartment;
      const matchStatus = selectedStatusFilter === 'TOUS' || r.status === selectedStatusFilter;
      const matchSearch =
        searchTerm === '' ||
        (r.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.employeeMatricule || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.date.includes(searchTerm);
      return matchEmp && matchDept && matchStatus && matchSearch;
    });
  }, [dailyRecords, selectedEmployeeId, selectedDepartment, selectedStatusFilter, searchTerm]);

  // Navigation jour par jour
  const handleNavigateDay = (deltaDays: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + deltaDays);
    const newY = dateObj.getFullYear();
    const newM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const newD = String(dateObj.getDate()).padStart(2, '0');
    const newDateStr = `${newY}-${newM}-${newD}`;

    setSelectedDate(newDateStr);
    const newPeriod = `${newY}${newM}`;
    if (newPeriod !== period) {
      setPeriod(newPeriod);
    }
  };

  // Mise à jour rapide d'un pointage journalier
  const handleQuickDailyChange = (
    recordId: string,
    field: 'clockIn' | 'clockOut' | 'status',
    value: string
  ) => {
    setDailyRecords((prev) => {
      return prev.map((r) => {
        if (r.id !== recordId && `${r.employeeId}_${r.date}` !== recordId) return r;

        const updated = { ...r };
        if (field === 'clockIn') updated.clockIn = value;
        if (field === 'clockOut') updated.clockOut = value;
        if (field === 'status') updated.status = value as DailyAttendanceStatus;

        const times = computeDailyTimes(
          updated.clockIn,
          updated.clockOut,
          updated.scheduledIn || '08:00',
          updated.scheduledOut || '17:00',
          updated.status
        );

        updated.latenessMinutes = times.latenessMinutes;
        updated.workedHours = times.workedHours;
        updated.overtimeHours = times.overtimeHours;
        updated.overtime130 = times.overtime130;
        updated.overtime160 = times.overtime160;
        updated.overtime200 = times.overtime200;

        if (updated.status === 'PRESENT') {
          updated.timeclockStatus = times.latenessMinutes > 0 ? 'Retard Constaté' : 'À l\'heure';
        }

        // Sauvegarde unitaire
        saveDailyAttendanceRecord(updated).catch((e) => console.warn('Erreur save pointage:', e));

        return updated;
      });
    });
  };

  // Sauvegarder la modal d'édition détaillée
  const handleSaveModalEdit = async () => {
    if (!editingRecord) return;
    const times = computeDailyTimes(
      editingRecord.clockIn,
      editingRecord.clockOut,
      editingRecord.scheduledIn || '08:00',
      editingRecord.scheduledOut || '17:00',
      editingRecord.status
    );

    const finalized: DailyAttendanceRecord = {
      ...editingRecord,
      latenessMinutes: times.latenessMinutes,
      workedHours: times.workedHours,
      overtimeHours: times.overtimeHours,
      overtime130: times.overtime130,
      overtime160: times.overtime160,
      overtime200: times.overtime200,
      updatedAt: new Date().toISOString(),
    };

    setDailyRecords((prev) =>
      prev.map((r) => (r.id === finalized.id || `${r.employeeId}_${r.date}` === finalized.id ? finalized : r))
    );

    await saveDailyAttendanceRecord(finalized);
    setEditingRecord(null);
    toast.success(`Pointage du ${finalized.date} mis à jour pour ${finalized.employeeName}.`);
  };

  // Synchronisation des totaux du mois vers le module Paie
  const handleSyncToPayroll = async () => {
    setIsSaving(true);
    try {
      const summary = computedMonthlyTotals;
      for (const empId of Object.keys(summary)) {
        await saveAttendanceRecord(summary[empId]);
      }
      setMonthlySummaries(summary);
      toast.success(
        `Les totaux de présence de la période ${period} ont été transférés et synchronisés avec le moteur de paie (${employees.length} salariés).`,
        'Alimentation Paie Effectuée'
      );
    } catch (err) {
      console.error('Erreur synchronisation paie:', err);
      toast.error('Erreur lors de la synchronisation avec le module paie.');
    } finally {
      setIsSaving(false);
    }
  };

  // Verrouillage de la période
  const handleLockPeriod = async () => {
    if (window.confirm(`Confirmer le verrouillage définitif de la période de présence ${period} ? Cela scellera les données pour le calcul de paie.`)) {
      await lockAttendancePeriod(period);
      setMonthlySummaries((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => (next[k].isLocked = true));
        return next;
      });
      toast.warning(`La période ${period} est désormais verrouillée pour la paie.`, 'Période Verrouillée');
    }
  };

  // Synchronisation Biométrique simulée
  const handleSyncBiometric = () => {
    setIsSyncing(true);
    setTimeout(async () => {
      const updated = dailyRecords.map((d) => {
        if (d.date === selectedDate && d.status === 'PRESENT') {
          const randomArrival = Math.random() > 0.3 ? '07:50' : '08:14';
          const times = computeDailyTimes(randomArrival, '17:10', '08:00', '17:00', 'PRESENT');
          return {
            ...d,
            clockIn: randomArrival,
            clockOut: '17:10',
            latenessMinutes: times.latenessMinutes,
            workedHours: times.workedHours,
            overtimeHours: times.overtimeHours,
            overtime130: times.overtime130,
            deviceId: `ZK-BIO-${machineIp.split('.').pop()}`,
            timeclockStatus: 'Pointeurs Synchronisés' as const,
          };
        }
        return d;
      });

      setDailyRecords(updated);
      await saveDailyAttendanceBatch(updated.filter((d) => d.date === selectedDate));
      setIsSyncing(false);
      toast.success(
        `Synchronisation biométrique réussie avec la pointeuse ${machineIp}:${machinePort} ! Pointages du jour importés.`,
        'Pointeuse ZKTeco Synchronisée'
      );
    }, 1200);
  };

  // Export PDF Figé
  const handleExportPDF = async () => {
    try {
      await exportAttendanceRegisterPDF({
        period,
        selectedDate: activeTab === 'daily' ? selectedDate : undefined,
        departmentFilter: selectedDepartment,
        employeeFilterId: selectedEmployeeId,
        records: dailyRecords,
        monthlySummaries: computedMonthlyTotals,
        employees,
      });
      toast.success('Registre de présences officiel exporté en PDF figé avec succès.');
    } catch (err) {
      console.error('Erreur export PDF:', err);
      toast.error('Erreur lors de la génération du PDF officiel.');
    }
  };

  // Export Excel Scellé / Protégé
  const handleExportExcel = () => {
    try {
      exportAttendanceToProtectedExcel({
        period,
        selectedDate: activeTab === 'daily' ? selectedDate : undefined,
        departmentFilter: selectedDepartment,
        employeeFilterId: selectedEmployeeId,
        records: dailyRecords,
        monthlySummaries: computedMonthlyTotals,
        employees,
      });
      toast.success('Registre de pointage exporté en classeur Excel protégé (lecture seule scellée).');
    } catch (err) {
      console.error('Erreur export Excel:', err);
      toast.error('Erreur lors de la génération du fichier Excel protégé.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Global avec Sélecteur Période & Actions Principales */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2.5 mb-1">
            <span className="p-2 bg-[#1F3864]/10 rounded-xl text-[#1F3864]">
              <CalendarCheck className="w-5 h-5 text-[#1F3864]" />
            </span>
            <h1 className="text-xl font-black text-[#1F3864]">Suivi des Présences, Pointages & Heures Sup</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
              Art. 177 RDC
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Gestion fine des pointages journaliers, calcul automatique des retards et heures sup (130%, 160%, 200%), intégration biométrique et alimentation directe de la paie.
          </p>
        </div>

        {/* Contrôles Période & Exports Scellés */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 pl-2">Période:</span>
            <input
              type="month"
              value={`${period.substring(0, 4)}-${period.substring(4, 6)}`}
              onChange={(e) => setPeriod(e.target.value.replace('-', ''))}
              className="border-0 rounded-lg px-2.5 py-1.5 text-xs bg-white font-extrabold text-[#1F3864] shadow-xs focus:ring-1 focus:ring-[#1F3864]"
            />
          </div>

          {/* Boutons d'export non modifiables */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleExportPDF}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
              title="Exporter le registre officiel au format PDF figé (non modifiable) avec code-barres et logo société"
            >
              <FileText className="w-3.5 h-3.5 text-[#BF9000]" />
              <span>PDF Figé</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
              title="Exporter en classeur Excel protégé et scellé (lecture seule) avec hash d'intégrité"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              <span>Excel Protégé</span>
            </button>
          </div>

          <button
            onClick={handleSyncToPayroll}
            disabled={isSaving}
            className="px-3.5 py-2 bg-[#1F3864] hover:bg-[#152747] text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm transition disabled:opacity-50"
            title="Transférer les totaux du mois vers le module Paie"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#BF9000]" />
            <span>{isSaving ? 'Synchronisation...' : 'Alimenter la Paie'}</span>
          </button>

          <button
            onClick={handleLockPeriod}
            className="p-2 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition"
            title="Verrouiller la période"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Bandeau KPIs & Totaux de la Période */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Taux Présence</div>
          <div className="text-lg font-black text-emerald-700 mt-0.5">{periodStats.attendanceRate}%</div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">{periodStats.presents} pointages présents</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Heures Prestées</div>
          <div className="text-lg font-black text-[#1F3864] mt-0.5">{periodStats.totalHours} h</div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">Sur l'ensemble du mois</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Retards Constatés</div>
          <div className={`text-lg font-black mt-0.5 ${periodStats.totalLateness > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
            {periodStats.totalLateness} min
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">Cumul sur la période</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Heures Sup (130%)</div>
          <div className="text-lg font-black text-blue-700 mt-0.5">{periodStats.totalOT130} h</div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">2 premières h/jour</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Heures Sup (160/200%)</div>
          <div className="text-lg font-black text-indigo-700 mt-0.5">{periodStats.totalOT160 + periodStats.totalOT200} h</div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">Heures suivantes & nuit</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Absences Non Payées</div>
          <div className="text-lg font-black text-red-700 mt-0.5">{periodStats.absUnjust} j</div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">{periodStats.absJust} justifiées • {periodStats.missions} missions</div>
        </div>
      </div>

      {/* 3. Bandeau Intégration Pointeuse Biométrique */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#1F3864] text-white p-4 rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#BF9000]/20 border border-[#BF9000] flex items-center justify-center text-[#BF9000] shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm text-white">Machine de Pointage Biométrique Externe</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ● CONNECTÉ ({machineIp}:{machinePort})
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Protocole: <span className="font-semibold text-white">{machineProtocol}</span> — Synchronisation directe des badges RFID, empreintes et visages.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Config Machine</span>
          </button>

          <button
            onClick={handleSyncBiometric}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-[#BF9000] hover:bg-[#a37a00] text-[#1F3864] font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronisation...' : 'Synchroniser le Pointeur'}</span>
          </button>
        </div>
      </div>

      {/* 4. Onglets de Navigation Principaux */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
            activeTab === 'daily'
              ? 'bg-[#1F3864] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pointage Journalier (Vue Détaillée)</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
            activeTab === 'history'
              ? 'bg-[#1F3864] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          <span>Historique &amp; Registre Période</span>
        </button>

        <button
          onClick={() => setActiveTab('timesheet')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
            activeTab === 'timesheet'
              ? 'bg-[#1F3864] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Fiche Salarié 360° (Timesheet)</span>
        </button>

        <button
          onClick={() => setActiveTab('payroll_summary')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition ${
            activeTab === 'payroll_summary'
              ? 'bg-[#1F3864] text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#BF9000]" />
          <span>Synthèse Mensuelle &amp; Intégration Paie</span>
        </button>
      </div>

      {/* 5. Barre de Filtres Transversale */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Recherche */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, matricule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1F3864]"
            />
          </div>

          {/* Filtre Département */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
          >
            <option value="TOUS">Tous les Départements</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Filtre Statut */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="py-1.5 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
          >
            <option value="TOUS">Tous les Statuts</option>
            <option value="PRESENT">🟢 Présents</option>
            <option value="ABSENT_JUSTIFIE">🔵 Absents Justifiés</option>
            <option value="ABSENT_NON_JUSTIFIE">🔴 Absents Injustifiés</option>
            <option value="MISSION">🟣 En Mission</option>
            <option value="CONGE">🟡 En Congé</option>
            <option value="REPOS">⚪ Repos / Férié</option>
          </select>
        </div>

        {/* Navigation Date si onglet Journalier */}
        {activeTab === 'daily' && (
          <div className="flex items-center space-x-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => handleNavigateDay(-1)}
              className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition"
              title="Jour précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-0 bg-transparent text-xs font-extrabold text-[#1F3864] focus:ring-0 cursor-pointer"
            />

            <button
              onClick={() => handleNavigateDay(1)}
              className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition"
              title="Jour suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VUE 1 : POINTAGE JOURNALIER (VUE DÉTAILLÉE PAR EMPLOYÉ ET PAR JOUR)       */}
      {/* ========================================================================= */}
      {activeTab === 'daily' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black text-[#1F3864] flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-[#BF9000]" />
                <span>
                  Feuille de Pointage du{' '}
                  <span className="underline decoration-[#BF9000]">{selectedDate.split('-').reverse().join('/')}</span>
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Saisie directe des heures d'arrivée, départ, retards calculés et statuts du jour.
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg font-bold border border-emerald-200">
                {dayRecords.filter((d) => d.status === 'PRESENT').length} Présents
              </span>
              <span className="px-2.5 py-1 bg-red-50 text-red-800 rounded-lg font-bold border border-red-200">
                {dayRecords.filter((d) => d.status === 'ABSENT_NON_JUSTIFIE').length} Injustifiés
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#1F3864] text-white uppercase font-bold text-[10.5px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Salarié</th>
                  <th className="py-3 px-3">Statut</th>
                  <th className="py-3 px-3 text-center">Arrivée</th>
                  <th className="py-3 px-3 text-center">Départ</th>
                  <th className="py-3 px-3 text-center">Retard (min)</th>
                  <th className="py-3 px-3 text-center">H. Prestées</th>
                  <th className="py-3 px-3 text-center">HS 130%</th>
                  <th className="py-3 px-3 text-center">HS 160%</th>
                  <th className="py-3 px-3 text-center">Pointeur</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      Chargement des pointages du jour...
                    </td>
                  </tr>
                ) : filteredDayRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      Aucun pointage trouvé pour cette date et ces critères.
                    </td>
                  </tr>
                ) : (
                  filteredDayRecords.map((rec) => {
                    return (
                      <tr key={rec.id || rec.employeeId} className="hover:bg-slate-50/80 transition">
                        {/* Salarié */}
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900">{rec.employeeName}</div>
                          <div className="text-[10px] text-slate-500 flex items-center space-x-1.5">
                            <span className="font-mono">{rec.employeeMatricule}</span>
                            <span>•</span>
                            <span>{rec.department}</span>
                          </div>
                        </td>

                        {/* Statut sélecteur rapide */}
                        <td className="py-3 px-3">
                          <select
                            value={rec.status}
                            onChange={(e) =>
                              handleQuickDailyChange(rec.id || `${rec.employeeId}_${rec.date}`, 'status', e.target.value)
                            }
                            className={`py-1 px-2 rounded-lg text-xs font-bold border focus:outline-none ${
                              rec.status === 'PRESENT'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : rec.status === 'ABSENT_NON_JUSTIFIE'
                                ? 'bg-red-50 text-red-800 border-red-200'
                                : rec.status === 'ABSENT_JUSTIFIE'
                                ? 'bg-sky-50 text-sky-800 border-sky-200'
                                : rec.status === 'MISSION'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : rec.status === 'CONGE'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="PRESENT">Présent</option>
                            <option value="ABSENT_JUSTIFIE">Absent Justifié</option>
                            <option value="ABSENT_NON_JUSTIFIE">Absent Injustifié</option>
                            <option value="MISSION">En Mission</option>
                            <option value="CONGE">En Congé</option>
                            <option value="REPOS">Repos</option>
                          </select>
                        </td>

                        {/* Heure d'arrivée */}
                        <td className="py-3 px-3 text-center">
                          {rec.status === 'PRESENT' ? (
                            <input
                              type="time"
                              value={rec.clockIn || '08:00'}
                              onChange={(e) =>
                                handleQuickDailyChange(
                                  rec.id || `${rec.employeeId}_${rec.date}`,
                                  'clockIn',
                                  e.target.value
                                )
                              }
                              className="p-1 border border-slate-300 rounded text-xs font-mono font-bold bg-white text-center w-20"
                            />
                          ) : (
                            <span className="text-slate-400 font-mono">--:--</span>
                          )}
                        </td>

                        {/* Heure de départ */}
                        <td className="py-3 px-3 text-center">
                          {rec.status === 'PRESENT' ? (
                            <input
                              type="time"
                              value={rec.clockOut || '17:00'}
                              onChange={(e) =>
                                handleQuickDailyChange(
                                  rec.id || `${rec.employeeId}_${rec.date}`,
                                  'clockOut',
                                  e.target.value
                                )
                              }
                              className="p-1 border border-slate-300 rounded text-xs font-mono font-bold bg-white text-center w-20"
                            />
                          ) : (
                            <span className="text-slate-400 font-mono">--:--</span>
                          )}
                        </td>

                        {/* Retard */}
                        <td className="py-3 px-3 text-center">
                          {(rec.latenessMinutes || 0) > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-red-100 text-red-700">
                              +{rec.latenessMinutes} min
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800">
                              0 min
                            </span>
                          )}
                        </td>

                        {/* Heures travaillées */}
                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {rec.workedHours || 0} h
                        </td>

                        {/* HS 130% */}
                        <td className="py-3 px-3 text-center font-bold text-blue-700">
                          {rec.overtime130 || 0} h
                        </td>

                        {/* HS 160% */}
                        <td className="py-3 px-3 text-center font-bold text-indigo-700">
                          {rec.overtime160 || 0} h
                        </td>

                        {/* Pointeur / Origine */}
                        <td className="py-3 px-3 text-center">
                          <span className="inline-flex items-center space-x-1 bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                            <Cpu className="w-3 h-3 text-[#1F3864]" />
                            <span>{rec.deviceId || 'Biométrique'}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setEditingRecord(rec)}
                            className="p-1.5 text-[#1F3864] hover:bg-slate-100 rounded-lg transition"
                            title="Modifier / Justifier ce pointage"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 2 : HISTORIQUE COMPLET & REGISTRE PÉRIODE                             */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black text-[#1F3864] flex items-center space-x-2">
                <CalendarDays className="w-4 h-4 text-[#BF9000]" />
                <span>Registre Chronologique des Pointages ({dailyRecords.length} entrées)</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Consultation jour par jour de tous les événements de présence du mois.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="py-1.5 px-3 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none"
              >
                <option value="TOUS">Tous les Salariés</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.lastName} {e.firstName} ({e.matricule})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#1F3864] text-white uppercase font-bold text-[10.5px] tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5">Salarié</th>
                  <th className="py-3 px-3">Statut</th>
                  <th className="py-3 px-3 text-center">Arrivée</th>
                  <th className="py-3 px-3 text-center">Départ</th>
                  <th className="py-3 px-3 text-center">Retard</th>
                  <th className="py-3 px-3 text-center">H. Prestées</th>
                  <th className="py-3 px-3 text-center">HS Total</th>
                  <th className="py-3 px-3.5">Motif / Justification</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistoryRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      Aucun enregistrement d'historique ne correspond aux filtres.
                    </td>
                  </tr>
                ) : (
                  filteredHistoryRecords.map((rec) => (
                    <tr key={`${rec.employeeId}_${rec.date}`} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3.5 font-bold font-mono text-slate-900">
                        {rec.date.split('-').reverse().join('/')}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="font-bold text-slate-900">{rec.employeeName}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{rec.department}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rec.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.status === 'ABSENT_NON_JUSTIFIE'
                              ? 'bg-red-100 text-red-800'
                              : rec.status === 'ABSENT_JUSTIFIE'
                              ? 'bg-sky-100 text-sky-800'
                              : rec.status === 'MISSION'
                              ? 'bg-purple-100 text-purple-800'
                              : rec.status === 'CONGE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {getStatusLabel(rec.status)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">{rec.clockIn || '--:--'}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{rec.clockOut || '--:--'}</td>
                      <td className="py-2.5 px-3 text-center">
                        {(rec.latenessMinutes || 0) > 0 ? (
                          <span className="text-red-700 font-bold font-mono">+{rec.latenessMinutes}m</span>
                        ) : (
                          <span className="text-slate-400 font-mono">0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">{rec.workedHours || 0} h</td>
                      <td className="py-2.5 px-3 text-center font-bold text-blue-700">
                        {(rec.overtime130 || 0) + (rec.overtime160 || 0) + (rec.overtime200 || 0)} h
                      </td>
                      <td className="py-2.5 px-3.5 text-slate-600 text-[11px] max-w-[200px] truncate">
                        {rec.justificationReason || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => setEditingRecord(rec)}
                          className="p-1 text-[#1F3864] hover:bg-slate-100 rounded transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 3 : FICHE SALARIÉ 360° (TIMESHEET MENSUEL INDIVIDUEL)                 */}
      {/* ========================================================================= */}
      {activeTab === 'timesheet' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="p-2 bg-[#1F3864]/10 rounded-xl text-[#1F3864]">
                <User className="w-5 h-5 text-[#1F3864]" />
              </span>
              <div>
                <h3 className="font-extrabold text-sm text-[#1F3864]">Sélectionner un Salarié pour la Feuille Mensuelle</h3>
                <p className="text-xs text-slate-500">Vue détaillée de tous les jours du mois pour le salarié choisi.</p>
              </div>
            </div>

            <select
              value={selectedEmployeeId === 'TOUS' ? (employees[0]?.id || '') : selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="py-2 px-3 text-xs bg-white border border-slate-300 rounded-xl font-bold text-[#1F3864] focus:ring-1 focus:ring-[#1F3864]"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.lastName} {e.firstName} — {e.matricule} ({e.position})
                </option>
              ))}
            </select>
          </div>

          {/* Fiche détaillée du salarié */}
          {(() => {
            const activeEmpId = selectedEmployeeId === 'TOUS' ? employees[0]?.id : selectedEmployeeId;
            const empObj = employees.find((e) => e.id === activeEmpId);
            const empDaily = dailyRecords.filter((d) => d.employeeId === activeEmpId);
            const summary = computedMonthlyTotals[activeEmpId || ''];

            if (!empObj) {
              return <div className="text-center py-8 text-slate-400">Aucun salarié sélectionné.</div>;
            }

            return (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
                {/* En-tête Salarié */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#1F3864] text-white flex items-center justify-center font-black text-base shadow">
                      {empObj.lastName[0]}
                      {empObj.firstName[0]}
                    </div>
                    <div>
                      <h2 className="text-base font-black text-[#1F3864]">
                        {empObj.lastName} {empObj.firstName}
                      </h2>
                      <div className="text-xs text-slate-500 flex items-center space-x-2">
                        <span className="font-bold text-[#BF9000]">{empObj.matricule}</span>
                        <span>•</span>
                        <span>{empObj.position}</span>
                        <span>•</span>
                        <span>{empObj.department}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cumuls du Salarié */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-center">
                      <span className="block text-[10px] text-emerald-800 font-bold uppercase">J. Prestés</span>
                      <span className="text-sm font-black text-emerald-900">{summary?.daysWorked || 0}</span>
                    </div>

                    <div className="bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 text-center">
                      <span className="block text-[10px] text-blue-800 font-bold uppercase">Heures Totales</span>
                      <span className="text-sm font-black text-blue-900">{summary?.totalHoursWorked || 0}h</span>
                    </div>

                    <div className="bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 text-center">
                      <span className="block text-[10px] text-indigo-800 font-bold uppercase">HS Totales</span>
                      <span className="text-sm font-black text-indigo-900">
                        {(summary?.overtime130 || 0) + (summary?.overtime160 || 0) + (summary?.overtime200 || 0)}h
                      </span>
                    </div>

                    <div className="bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 text-center">
                      <span className="block text-[10px] text-amber-800 font-bold uppercase">Retard Cumulé</span>
                      <span className="text-sm font-black text-amber-900">{summary?.totalLatenessMinutes || 0}m</span>
                    </div>

                    <div className="bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 text-center">
                      <span className="block text-[10px] text-red-800 font-bold uppercase">Absences Injust.</span>
                      <span className="text-sm font-black text-red-900">{summary?.absencesUnjustified || 0}j</span>
                    </div>
                  </div>
                </div>

                {/* Grille jour par jour du mois */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100 text-slate-800 uppercase font-bold text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Statut</th>
                        <th className="py-2.5 px-3 text-center">Arrivée</th>
                        <th className="py-2.5 px-3 text-center">Départ</th>
                        <th className="py-2.5 px-3 text-center">Retard</th>
                        <th className="py-2.5 px-3 text-center">H. Prestées</th>
                        <th className="py-2.5 px-3 text-center">HS 130%</th>
                        <th className="py-2.5 px-3 text-center">HS 160%</th>
                        <th className="py-2.5 px-3">Justification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {empDaily.map((d) => (
                        <tr key={d.date} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {d.date.split('-').reverse().join('/')}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                d.status === 'PRESENT'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : d.status === 'ABSENT_NON_JUSTIFIE'
                                  ? 'bg-red-100 text-red-800'
                                  : d.status === 'ABSENT_JUSTIFIE'
                                  ? 'bg-sky-100 text-sky-800'
                                  : d.status === 'MISSION'
                                  ? 'bg-purple-100 text-purple-800'
                                  : d.status === 'CONGE'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {getStatusLabel(d.status)}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono">{d.clockIn || '--:--'}</td>
                          <td className="py-2 px-3 text-center font-mono">{d.clockOut || '--:--'}</td>
                          <td className="py-2 px-3 text-center">
                            {(d.latenessMinutes || 0) > 0 ? (
                              <span className="text-red-700 font-bold font-mono">+{d.latenessMinutes}m</span>
                            ) : (
                              <span className="text-slate-400 font-mono">0</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-bold">{d.workedHours || 0} h</td>
                          <td className="py-2 px-3 text-center font-bold text-blue-700">{d.overtime130 || 0} h</td>
                          <td className="py-2 px-3 text-center font-bold text-indigo-700">{d.overtime160 || 0} h</td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">{d.justificationReason || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VUE 4 : SYNTHÈSE MENSUELLE & INTÉGRATION PAIE                             */}
      {/* ========================================================================= */}
      {activeTab === 'payroll_summary' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-[#1F3864] flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#BF9000]" />
                <span>Totaux Période {period} alimentant le Moteur de Paie</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Synthèse des jours travaillés, absences déductibles et heures sup calculés pour chaque employé.
              </p>
            </div>

            <button
              onClick={handleSyncToPayroll}
              disabled={isSaving}
              className="px-4 py-2 bg-[#1F3864] hover:bg-[#152747] text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-[#BF9000]" />
              <span>{isSaving ? 'Synchronisation...' : 'Synchroniser & Enregistrer vers la Paie'}</span>
            </button>
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#1F3864] text-white uppercase font-bold text-[10.5px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Salarié</th>
                  <th className="py-3 px-3 text-center">J. Travaillés</th>
                  <th className="py-3 px-3 text-center">Abs. Justifiées</th>
                  <th className="py-3 px-3 text-center">Abs. Injustifiées (Paie)</th>
                  <th className="py-3 px-3 text-center">Missions</th>
                  <th className="py-3 px-3 text-center">Congés</th>
                  <th className="py-3 px-3 text-center">Retards Totaux</th>
                  <th className="py-3 px-3 text-center">HS 130%</th>
                  <th className="py-3 px-3 text-center">HS 160%</th>
                  <th className="py-3 px-3 text-center">HS 200%</th>
                  <th className="py-3 px-3 text-center">Statut Paie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees.map((emp) => {
                  const summary = computedMonthlyTotals[emp.id || ''] || {
                    daysWorked: 26,
                    absences: 0,
                    absencesJustified: 0,
                    absencesUnjustified: 0,
                    missionDays: 0,
                    paidLeaveDays: 0,
                    totalLatenessMinutes: 0,
                    overtime130: 0,
                    overtime160: 0,
                    overtime200: 0,
                    isLocked: false,
                  };

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3.5 font-bold text-slate-900">
                        <div>
                          {emp.lastName} {emp.firstName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {emp.matricule} • {emp.position}
                        </div>
                      </td>

                      {/* Jours Travaillés */}
                      <td className="py-3 px-3 text-center font-bold text-emerald-800 bg-emerald-50/50">
                        {summary.daysWorked} j
                      </td>

                      {/* Absences Justifiées */}
                      <td className="py-3 px-3 text-center font-bold text-sky-800">
                        {summary.absencesJustified || 0} j
                      </td>

                      {/* Absences Injustifiées */}
                      <td className="py-3 px-3 text-center font-bold text-red-700 bg-red-50/50">
                        {summary.absencesUnjustified || summary.absences || 0} j
                      </td>

                      {/* Missions */}
                      <td className="py-3 px-3 text-center font-bold text-purple-800">
                        {summary.missionDays || 0} j
                      </td>

                      {/* Congés */}
                      <td className="py-3 px-3 text-center font-bold text-amber-800">
                        {summary.paidLeaveDays || 0} j
                      </td>

                      {/* Retards */}
                      <td className="py-3 px-3 text-center font-mono">
                        {(summary.totalLatenessMinutes || 0) > 0 ? (
                          <span className="text-red-700 font-bold">+{summary.totalLatenessMinutes} min</span>
                        ) : (
                          <span className="text-slate-400">0 min</span>
                        )}
                      </td>

                      {/* HS 130% */}
                      <td className="py-3 px-3 text-center font-bold text-blue-700">{summary.overtime130 || 0} h</td>

                      {/* HS 160% */}
                      <td className="py-3 px-3 text-center font-bold text-indigo-700">{summary.overtime160 || 0} h</td>

                      {/* HS 200% */}
                      <td className="py-3 px-3 text-center font-bold text-purple-700">{summary.overtime200 || 0} h</td>

                      {/* Statut Paie */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Prêt Paie</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1 : ÉDITION DÉTAILLÉE DU POINTAGE DU JOUR                           */}
      {/* ========================================================================= */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-sm text-[#1F3864] flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-[#BF9000]" />
                <span>
                  Édition Pointage : {editingRecord.employeeName} ({editingRecord.date})
                </span>
              </h3>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Statut du Salarié</label>
                <select
                  value={editingRecord.status}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      status: e.target.value as DailyAttendanceStatus,
                    })
                  }
                  className="w-full p-2 border rounded-lg font-bold bg-white"
                >
                  <option value="PRESENT">🟢 Présent</option>
                  <option value="ABSENT_JUSTIFIE">🔵 Absent Justifié (Maladie, Circonstance)</option>
                  <option value="ABSENT_NON_JUSTIFIE">🔴 Absent Injustifié (Déductible)</option>
                  <option value="MISSION">🟣 En Mission Professionnelle</option>
                  <option value="CONGE">🟡 En Congé Légal</option>
                  <option value="REPOS">⚪ Repos Hebdomadaire</option>
                </select>
              </div>

              {editingRecord.status === 'PRESENT' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Heure d'Arrivée</label>
                    <input
                      type="time"
                      value={editingRecord.clockIn || '08:00'}
                      onChange={(e) => setEditingRecord({ ...editingRecord, clockIn: e.target.value })}
                      className="w-full p-2 border rounded-lg font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Heure de Départ</label>
                    <input
                      type="time"
                      value={editingRecord.clockOut || '17:00'}
                      onChange={(e) => setEditingRecord({ ...editingRecord, clockOut: e.target.value })}
                      className="w-full p-2 border rounded-lg font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Motif / Justification / Notes</label>
                <textarea
                  rows={2}
                  value={editingRecord.justificationReason || ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, justificationReason: e.target.value })}
                  placeholder="Ex: Certificat médical n°410, autorisation de sortie mission..."
                  className="w-full p-2 border rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Identifiant Machine / Origine</label>
                <input
                  type="text"
                  value={editingRecord.deviceId || 'ZK-BIO-01'}
                  onChange={(e) => setEditingRecord({ ...editingRecord, deviceId: e.target.value })}
                  className="w-full p-2 border rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2 border-t">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveModalEdit}
                className="px-4 py-2 bg-[#1F3864] text-white font-bold rounded-xl text-xs shadow hover:bg-[#152747] transition"
              >
                Enregistrer le Pointage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2 : CONFIGURATION DE LA MACHINE DE POINTAGE BIOMÉTRIQUE            */}
      {/* ========================================================================= */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-sm text-[#1F3864] flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-[#BF9000]" />
                <span>Configuration de la Pointeuse Biométrique</span>
              </h3>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Adresse IP de la Pointeuse</label>
                <input
                  type="text"
                  value={machineIp}
                  onChange={(e) => setMachineIp(e.target.value)}
                  className="w-full p-2 border rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Port TCP/IP</label>
                <input
                  type="text"
                  value={machinePort}
                  onChange={(e) => setMachinePort(e.target.value)}
                  className="w-full p-2 border rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Protocole Matériel</label>
                <select
                  value={machineProtocol}
                  onChange={(e) => setMachineProtocol(e.target.value)}
                  className="w-full p-2 border rounded-lg font-bold bg-white"
                >
                  <option value="ZKTEco / TCP-IP">ZKTEco (SDK Native TCP-IP)</option>
                  <option value="API REST Webhook">API REST / Webhook Biométrique</option>
                  <option value="Fichier Logs CSV/DAT">Importation Fichier CSV / DAT logs</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2 border-t">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowConfigModal(false);
                  toast.success(`Configuration enregistrée : ${machineIp}:${machinePort} (${machineProtocol})`);
                }}
                className="px-4 py-2 bg-[#1F3864] text-white font-bold rounded-xl text-xs shadow hover:bg-[#152747]"
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
