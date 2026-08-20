/**
 * @license
 * NovarisPay - ERP RH et Paie RDC (BILINGUAL)
 */

import React, { useEffect, useState } from 'react';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  softDeleteEmployee,
  validateEmployeeData,
} from '../../services/employeeService';
import { getPayslipsForEmployee } from '../../services/payrollService';
import { Employee, Contract, EmployeeWithContract, Dependent } from '../../types/employee';
import { UserProfile, PermissionKey } from '../../types/auth';
import { Payslip } from '../../types/payroll';
import { checkPermission } from '../../services/rbacEngine';
import { useLanguage } from '../../context/LanguageContext';
import { Employee360Modal } from './Employee360Modal';
import { ServiceCertificateModal } from '../common/ServiceCertificateModal';
import { EmployeePhotoModal } from '../common/EmployeePhotoModal';
import { formatCDF, formatUSD } from '../../utils/documentFormatter';
import {
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Edit,
  Trash2,
  X,
  Upload,
  Eye,
  Download,
  Award,
  Check,
  Camera,
  Loader2,
} from 'lucide-react';

interface EmployeesModuleProps {
  currentUser: UserProfile | null;
  rolePermissions: any[];
}

export const EmployeesModule: React.FC<EmployeesModuleProps> = ({ currentUser, rolePermissions }) => {
  const { lang, t, formatDate, formatNumber } = useLanguage();
  const [employees, setEmployees] = useState<EmployeeWithContract[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeWithContract[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [expatFilter, setExpatFilter] = useState<'ALL' | 'EXPAT_ONLY' | 'NATIONAL_ONLY'>('ALL');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [is360ModalOpen, setIs360ModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certEmployeeId, setCertEmployeeId] = useState<string>('');
  const [isSelfServiceOpen, setIsSelfServiceOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [employeePayslips, setEmployeePayslips] = useState<Payslip[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithContract | null>(null);
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'CONTRACT' | 'DEPENDENTS' | 'DOCUMENTS'>('IDENTITY');
  const [docStatuses, setDocStatuses] = useState<Record<string, boolean>>({
    cni: true,
    cv: true,
    cnss_nif: true,
    domicile: true,
    medical: false,
    casier: true,
    etat_civil: false,
    services_anterieurs: true,
    photos: true,
  });
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Employee>>({
    matricule: '',
    lastName: '',
    firstName: '',
    gender: 'M',
    birthDate: '',
    nif: '',
    cnss: '',
    phone: '+243',
    email: '',
    address: '',
    bankName: '',
    bankAccount: '',
    site: 'Kinshasa Siège',
    department: 'Exploitation',
    position: '',
    hireDate: '',
    dependents: [],
  });

  const [contractData, setContractData] = useState<Partial<Contract>>({
    type: 'CDI',
    startDate: '',
    endDate: '',
    baseSalary: 559000,
    currency: 'CDF',
    isCurrent: true,
  });

  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [csvFileContent, setCsvFileContent] = useState<string | null>(null);
  const [csvReport, setCsvReport] = useState<{ total: number; valid: number; invalid: number; errors: string[] } | null>(null);

  const canCreate = checkPermission(currentUser, PermissionKey.EMP_CREATE, rolePermissions).allowed;
  const canEdit = checkPermission(currentUser, PermissionKey.EMP_EDIT, rolePermissions).allowed;
  const canDelete = checkPermission(currentUser, PermissionKey.EMP_DELETE, rolePermissions).allowed;

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getEmployees();
      setEmployees(data);
      setFilteredEmployees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtering
  useEffect(() => {
    let result = employees;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.lastName.toLowerCase().includes(q) ||
          e.firstName.toLowerCase().includes(q) ||
          e.matricule.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q)
      );
    }
    if (departmentFilter !== 'ALL') {
      result = result.filter((e) => e.department === departmentFilter);
    }
    if (expatFilter === 'EXPAT_ONLY') {
      result = result.filter((e) => e.isExpatriate);
    } else if (expatFilter === 'NATIONAL_ONLY') {
      result = result.filter((e) => !e.isExpatriate);
    }
    setFilteredEmployees(result);
  }, [searchQuery, departmentFilter, expatFilter, employees]);

  const handleOpenCreate = () => {
    setSelectedEmployee(null);
    setFormData({
      matricule: `NP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      lastName: '',
      firstName: '',
      gender: 'M',
      birthDate: '1992-01-01',
      nif: '',
      cnss: '',
      phone: '+243',
      email: '',
      address: '',
      bankName: 'Equity BCDC',
      bankAccount: '',
      site: 'Kinshasa Siège',
      department: 'Exploitation',
      position: 'Agent',
      hireDate: new Date().toISOString().split('T')[0],
      dependents: [],
    });
    setContractData({
      type: 'CDI',
      startDate: new Date().toISOString().split('T')[0],
      baseSalary: 559000,
      currency: 'CDF',
      isCurrent: true,
    });
    setFormErrors([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: EmployeeWithContract) => {
    setSelectedEmployee(emp);
    setFormData(emp);
    if (emp.currentContract) {
      setContractData(emp.currentContract);
    }
    setFormErrors([]);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateEmployeeData(formData);
    if (!contractData.baseSalary || contractData.baseSalary <= 0) {
      errors.push(lang === 'fr' ? 'Le salaire de base du contrat doit être supérieur à zéro.' : 'Contract base salary must be greater than zero.');
    }
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setSavingEmployee(true);
    try {
      if (selectedEmployee && selectedEmployee.id) {
        await updateEmployee(selectedEmployee.id, formData);
      } else {
        await createEmployee(
          formData as Omit<Employee, 'id'>,
          contractData as Omit<Contract, 'id' | 'employeeId'>
        );
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormErrors([err.message || (lang === 'fr' ? 'Erreur d\'enregistrement' : 'Save error')]);
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t.employees.deleteConfirm)) {
      await softDeleteEmployee(id);
      loadData();
    }
  };

  // Dependents Management
  const handleAddDependent = () => {
    const newDep: Dependent = {
      id: Date.now().toString(),
      fullName: '',
      birthDate: '',
      relationship: 'Enfant',
    };
    setFormData((prev) => ({
      ...prev,
      dependents: [...(prev.dependents || []), newDep],
    }));
  };

  const handleRemoveDependent = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      dependents: (prev.dependents || []).filter((d) => d.id !== id),
    }));
  };

  // CSV Import Parser
  const handleCSVFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      setCsvFileContent(text);

      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      let valid = 0;
      let invalid = 0;
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length < 5) {
          invalid++;
          errors.push(lang === 'fr' ? `Ligne ${i + 1}: Nombre de colonnes insuffisant.` : `Line ${i + 1}: Insufficient number of columns.`);
        } else {
          valid++;
        }
      }

      setCsvReport({ total: lines.length - 1, valid, invalid, errors });
    };
    reader.readAsText(file);
  };

  const departments = Array.from(new Set(employees.map((e) => e.department))).filter(Boolean);

  const getDocItems = () => [
    { key: 'cni', label: lang === 'fr' ? '1. Pièce d\'Identité / Carte d\'Électeur / Passeport' : '1. National ID / Voter Card / Passport' },
    { key: 'cv', label: lang === 'fr' ? '2. CV Certifié Conforme & Copie des Diplômes' : '2. Certified CV & Copy of Degrees' },
    { key: 'cnss_nif', label: lang === 'fr' ? '3. Numéro Impôt (NIF) & Attestation CNSS' : '3. Tax ID (NIF) & CNSS Certificate' },
    { key: 'domicile', label: lang === 'fr' ? '4. Certificat de Domicile / Résidence' : '4. Certificate of Residence / Domicile' },
    { key: 'medical', label: lang === 'fr' ? '5. Certificat Médical d\'Aptitude Physique (Obligatoire RDC)' : '5. Medical Fitness Certificate (DRC Mandatory)' },
    { key: 'casier', label: lang === 'fr' ? '6. Extrait de Casier Judiciaire (< 3 mois)' : '6. Police Clearance / Criminal Record (< 3 months)' },
    { key: 'etat_civil', label: lang === 'fr' ? '7. Acte de Mariage & Actes de Naissance Enfants à charge' : '7. Marriage Certificate & Children Birth Certificates' },
    { key: 'services_anterieurs', label: lang === 'fr' ? '8. Attestation des Services Antérieurs / Certificat de Fin de Travail' : '8. Prior Service Certificate / Work Certificate' },
    { key: 'photos', label: lang === 'fr' ? '9. Photos d\'Identité Récentes (x4)' : '9. Recent Passport Photos (x4)' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-[#1F3864] dark:text-blue-300">{t.employees.title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.employees.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setCertEmployeeId('');
              setIsCertModalOpen(true);
            }}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-3.5 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow transition"
          >
            <Award className="w-4 h-4 text-slate-950 stroke-[1.75]" />
            <span>{lang === 'fr' ? 'Attestation Fin de Service (Art. 168)' : 'End of Service Certificate (Art. 168)'}</span>
          </button>
          {canCreate && (
            <>
              <button
                onClick={() => setIsCSVModalOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 border border-slate-300 dark:border-slate-700 transition"
              >
                <Upload className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <span>{lang === 'fr' ? 'Import CSV' : 'CSV Import'}</span>
              </button>
              <button
                onClick={handleOpenCreate}
                className="bg-[#1F3864] hover:bg-[#152747] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow transition"
              >
                <Plus className="w-4 h-4 text-[#BF9000] dark:text-amber-300" />
                <span>{t.employees.addEmployee}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.employees.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1F3864] dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full sm:w-auto border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium min-h-[40px]"
            >
              <option value="ALL">{t.employees.allDepartments}</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <select
            value={expatFilter}
            onChange={(e) => setExpatFilter(e.target.value as any)}
            className="w-full sm:w-auto border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium min-h-[40px]"
          >
            <option value="ALL">{lang === 'fr' ? 'Tous les statuts (Locaux & Expats)' : 'All Statuses (Locals & Expats)'}</option>
            <option value="NATIONAL_ONLY">{lang === 'fr' ? 'Employés Nationaux RDC' : 'DRC National Employees'}</option>
            <option value="EXPAT_ONLY">{lang === 'fr' ? 'Expatriés uniquement' : 'Expatriates Only'}</option>
          </select>
        </div>
      </div>

      {/* Employees Table (Desktop/Tablet) & Cards (Mobile) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Desktop / Tablet View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
            <thead className="bg-[#1F3864] text-white uppercase font-bold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">{t.employees.colMatricule} & {t.employees.colName}</th>
                <th className="py-3 px-4">{t.employees.colPosition}</th>
                <th className="py-3 px-4">{t.employees.colContract} & {t.employees.colBaseSalary}</th>
                <th className="py-3 px-4">{lang === 'fr' ? 'Charges Famille' : 'Dependents'}</th>
                <th className="py-3 px-4">{t.payslips.seniorityLabel}</th>
                <th className="py-3 px-4 text-right">{t.employees.colActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {t.common.loading}
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {t.employees.emptyList}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                      <div className="flex items-center space-x-3">
                        {emp.photoUrl ? (
                          <img
                            src={emp.photoUrl}
                            alt={emp.lastName}
                            className="w-9 h-9 rounded-xl object-cover border border-amber-400 shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-[#BF9000] text-[#1F3864] font-black flex items-center justify-center text-xs shrink-0 shadow-sm border border-amber-300">
                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                          </div>
                        )}
                        <div>
                          <div className="text-sm flex items-center space-x-1">
                            <span>{emp.lastName} {emp.firstName}</span>
                            {emp.isExpatriate && (
                              <span className="bg-blue-900 text-white text-[9px] font-bold px-1.5 py-0.2 rounded ml-1">
                                EXPAT
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-[#1F3864] dark:text-blue-300">{emp.matricule}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{emp.position}</div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px]">{emp.department} • {emp.site}</div>
                    </td>
                    <td className="py-3 px-4">
                      {emp.currentContract ? (
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                            {formatNumber(emp.currentContract.baseSalary)} {emp.currentContract.currency}
                          </span>
                          <span className="ml-2 text-[10px] bg-blue-100 dark:bg-blue-950 text-[#1F3864] dark:text-blue-300 font-bold px-1.5 py-0.5 rounded">
                            {emp.currentContract.type}
                          </span>
                        </div>
                      ) : (
                        <span className="text-red-500 font-semibold">{lang === 'fr' ? 'Aucun contrat' : 'No contract'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                      {emp.dependents ? emp.dependents.length : 0} {lang === 'fr' ? 'charge(s)' : 'dependent(s)'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {emp.seniorityYears} {lang === 'fr' ? 'an(s)' : 'yr(s)'} {emp.seniorityMonths} {lang === 'fr' ? 'mois' : 'mo(s)'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 flex items-center justify-end">
                      <button
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setIs360ModalOpen(true);
                        }}
                        className="bg-[#1F3864] text-white hover:bg-[#152747] dark:bg-blue-600 dark:hover:bg-blue-700 px-2.5 py-1.5 rounded-lg flex items-center space-x-1 font-bold text-[11px] shadow-sm min-h-[36px]"
                        title={t.employee360.modalTitle}
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t.employees.viewProfile360}</span>
                      </button>
                      <button
                        onClick={() => {
                          setCertEmployeeId(emp.id || '');
                          setIsCertModalOpen(true);
                        }}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title={lang === 'fr' ? 'Attestation de Fin de Service (Art. 168)' : 'End of Service Certificate (Art. 168)'}
                      >
                        <Award className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1.5 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title={t.employees.editEmployee}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => emp.id && handleDelete(emp.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title={t.employees.deleteEmployee}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Cards View (< md) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              {t.common.loading}
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              {t.employees.emptyList}
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <div key={emp.id} className="p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {emp.photoUrl ? (
                      <img
                        src={emp.photoUrl}
                        alt={emp.lastName}
                        className="w-11 h-11 rounded-xl object-cover border border-amber-400 shrink-0 shadow-sm"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-[#BF9000] text-[#1F3864] font-black flex items-center justify-center text-sm shrink-0 shadow-sm border border-amber-300">
                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center flex-wrap gap-1">
                        <span>{emp.lastName} {emp.firstName}</span>
                        {emp.isExpatriate && (
                          <span className="bg-blue-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                            EXPAT
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-[#1F3864] dark:text-blue-300 font-semibold">{emp.matricule}</div>
                    </div>
                  </div>
                  {emp.currentContract && (
                    <span className="text-[11px] bg-blue-100 dark:bg-blue-950 text-[#1F3864] dark:text-blue-300 font-bold px-2 py-0.5 rounded">
                      {emp.currentContract.type}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{t.employees.colPosition}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{emp.position}</span>
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{emp.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{t.employees.colBaseSalary}</span>
                    {emp.currentContract ? (
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {formatNumber(emp.currentContract.baseSalary)} {emp.currentContract.currency}
                      </span>
                    ) : (
                      <span className="text-red-500 text-[11px]">{lang === 'fr' ? 'Sans contrat' : 'No contract'}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{lang === 'fr' ? 'Charges Famille' : 'Dependents'}</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{emp.dependents?.length || 0} {lang === 'fr' ? 'personne(s)' : 'person(s)'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">{t.payslips.seniorityLabel}</span>
                    <span className="text-slate-700 dark:text-slate-300">{emp.seniorityYears}y {emp.seniorityMonths}m</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setIs360ModalOpen(true);
                    }}
                    className="flex-1 bg-[#1F3864] text-white hover:bg-[#152747] dark:bg-blue-600 dark:hover:bg-blue-700 py-2.5 px-3 rounded-lg flex items-center justify-center space-x-1.5 font-bold text-xs shadow-sm min-h-[44px]"
                  >
                    <Eye className="w-4 h-4 text-amber-400" />
                    <span>{t.employees.viewProfile360}</span>
                  </button>

                  <button
                    onClick={() => {
                      setCertEmployeeId(emp.id || '');
                      setIsCertModalOpen(true);
                    }}
                    className="p-2.5 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 rounded-lg border border-amber-200 dark:border-amber-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    title={lang === 'fr' ? 'Attestation Fin de Service' : 'End of Service Certificate'}
                  >
                    <Award className="w-4 h-4" />
                  </button>

                  {canEdit && (
                    <button
                      onClick={() => handleOpenEdit(emp)}
                      className="p-2.5 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 rounded-lg border border-blue-200 dark:border-blue-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title={t.employees.editEmployee}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => emp.id && handleDelete(emp.id)}
                      className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 rounded-lg border border-red-200 dark:border-red-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title={t.employees.deleteEmployee}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Employee Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="bg-[#1F3864] text-white p-4 flex items-center justify-between sticky top-0 z-10">
              <h2 className="font-bold text-base">
                {selectedEmployee ? t.employees.modalEditTitle : t.employees.modalAddTitle}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab selection */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 overflow-x-auto scrollbar-none whitespace-nowrap">
              <button
                onClick={() => setActiveTab('IDENTITY')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition shrink-0 min-h-[44px] flex items-center ${
                  activeTab === 'IDENTITY'
                    ? 'border-[#1F3864] dark:border-blue-400 text-[#1F3864] dark:text-blue-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400'
                }`}
              >
                {t.employees.tabIdentity}
              </button>
              <button
                onClick={() => setActiveTab('CONTRACT')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition shrink-0 min-h-[44px] flex items-center ${
                  activeTab === 'CONTRACT'
                    ? 'border-[#1F3864] dark:border-blue-400 text-[#1F3864] dark:text-blue-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400'
                }`}
              >
                {t.employees.tabContract}
              </button>
              <button
                onClick={() => setActiveTab('DEPENDENTS')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition shrink-0 min-h-[44px] flex items-center ${
                  activeTab === 'DEPENDENTS'
                    ? 'border-[#1F3864] dark:border-blue-400 text-[#1F3864] dark:text-blue-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400'
                }`}
              >
                {t.employees.tabDependents} ({formData.dependents?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('DOCUMENTS')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition shrink-0 min-h-[44px] flex items-center ${
                  activeTab === 'DOCUMENTS'
                    ? 'border-[#1F3864] dark:border-blue-400 text-[#1F3864] dark:text-blue-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400'
                }`}
              >
                {t.employees.tabDocuments} ({Object.values(docStatuses).filter(Boolean).length}/9)
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formErrors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/40 border-l-4 border-[#C00000] p-3 rounded text-xs text-red-800 dark:text-red-300 space-y-1">
                  {formErrors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}

              {activeTab === 'IDENTITY' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Photo Profile Card */}
                  <div className="col-span-1 sm:col-span-2 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      {formData.photoUrl ? (
                        <img
                          src={formData.photoUrl}
                          alt="Photo Employé"
                          className="w-14 h-14 rounded-full object-cover border-2 border-[#1F3864] dark:border-blue-400 shadow-sm"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-[#1F3864] dark:bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                          {((formData.firstName?.[0] || 'E') + (formData.lastName?.[0] || '')).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          {lang === 'fr' ? 'Photo de Profil Salarié' : 'Employee Profile Photo'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formData.photoUrl ? (lang === 'fr' ? 'Photo enregistrée pour la fiche 360°' : 'Photo saved for 360° file') : (lang === 'fr' ? 'Aucune photo enregistrée (Avatar par défaut)' : 'No photo uploaded (Default avatar)')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsPhotoModalOpen(true)}
                        className="bg-[#1F3864] hover:bg-[#152747] dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 shadow transition"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#BF9000] dark:text-amber-300" />
                        <span>{lang === 'fr' ? 'Prendre / Importer Photo' : 'Take / Upload Photo'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 dark:text-slate-200">{t.employees.matricule} *</label>
                    <input
                      type="text"
                      value={formData.matricule || ''}
                      onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                      className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 dark:text-slate-200">{t.employees.lastName} *</label>
                    <input
                      type="text"
                      value={formData.lastName || ''}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 dark:text-slate-200">{t.employees.firstName} *</label>
                    <input
                      type="text"
                      value={formData.firstName || ''}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 dark:text-slate-200">{t.employees.gender}</label>
                    <select
                      value={formData.gender || 'M'}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'M' | 'F' })}
                      className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    >
                      <option value="M">{t.employees.male}</option>
                      <option value="F">{t.employees.female}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1 dark:text-slate-200">
                      {lang === 'fr' ? 'NIF (Numéro Impôt RDC)' : 'NIF (DRC Tax ID)'} <span className="text-slate-400 font-normal">({lang === 'fr' ? 'Optionnel' : 'Optional'})</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nif || ''}
                      onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                      placeholder="Ex: A2210892X"
                      className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 dark:text-slate-200">
                      {lang === 'fr' ? 'Numéro CNSS RDC' : 'DRC CNSS Number'} <span className="text-slate-400 font-normal">({lang === 'fr' ? 'Optionnel' : 'Optional'})</span>
                    </label>
                    <input
                      type="text"
                      value={formData.cnss || ''}
                      onChange={(e) => setFormData({ ...formData, cnss: e.target.value })}
                      placeholder="Ex: 1004812001-C"
                      className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 dark:text-slate-200">{t.employees.phone}</label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+243 810 000 000"
                      className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 dark:text-slate-200">
                      {t.employees.email} <span className="text-slate-400 font-normal">({lang === 'fr' ? 'Optionnel' : 'Optional'})</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 dark:text-slate-200">{t.employees.department} *</label>
                    <input
                      type="text"
                      value={formData.department || ''}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1 dark:text-slate-200">{t.employees.position} *</label>
                    <input
                      type="text"
                      value={formData.position || ''}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      required
                    />
                  </div>
                </div>
              )}

              {activeTab === 'CONTRACT' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold mb-1 dark:text-slate-200">{t.employees.contractType}</label>
                    <select
                      value={contractData.type || 'CDI'}
                      onChange={(e) => setContractData({ ...contractData, type: e.target.value as any })}
                      className="w-full p-2 border rounded font-semibold bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    >
                      <option value="CDI">{t.employees.contractCDI}</option>
                      <option value="CDD">{t.employees.contractCDD}</option>
                      <option value="Journalier">{t.employees.contractJournalier}</option>
                      <option value="STAGE">{t.employees.contractStage}</option>
                      <option value="CONSULTANCE">{lang === 'fr' ? 'Consultant Indépendant (Retenue 15%)' : 'Independent Consultant (15% Withholding)'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold mb-1 dark:text-slate-200">{t.employees.currency}</label>
                    <select
                      value={contractData.currency || 'CDF'}
                      onChange={(e) => setContractData({ ...contractData, currency: e.target.value as any })}
                      className="w-full p-2 border rounded font-bold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    >
                      <option value="CDF">Franc Congolais (CDF)</option>
                      <option value="USD">US Dollar (USD)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1 dark:text-slate-200">{t.employees.baseSalary} *</label>
                    <input
                      type="number"
                      value={contractData.baseSalary || 0}
                      onChange={(e) => setContractData({ ...contractData, baseSalary: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 border rounded font-bold text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      required
                    />
                    <div className="mt-1 text-xs font-mono font-bold text-[#1F3864] dark:text-blue-300">
                      {lang === 'fr' ? 'Aperçu formaté' : 'Formatted preview'} ({contractData.currency || 'CDF'}) :{' '}
                      <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">
                        {contractData.currency === 'USD'
                          ? formatUSD(contractData.baseSalary || 0)
                          : formatCDF(contractData.baseSalary || 0)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold mb-1 dark:text-slate-200">{lang === 'fr' ? 'Date de début *' : 'Start Date *'}</label>
                    <input
                      type="date"
                      value={contractData.startDate || ''}
                      onChange={(e) => setContractData({ ...contractData, startDate: e.target.value })}
                      className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      required
                    />
                  </div>
                </div>
              )}

              {activeTab === 'DEPENDENTS' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {lang === 'fr'
                        ? 'Les personnes à charge accordent une réduction directe de 2% sur l\'IRPP par enfant (max 18%).'
                        : 'Dependents grant a direct 2% reduction on IRPP tax per child (max 18%).'}
                    </p>
                    <button
                      type="button"
                      onClick={handleAddDependent}
                      className="bg-[#1F3864] dark:bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold"
                    >
                      + {lang === 'fr' ? 'Ajouter' : 'Add'}
                    </button>
                  </div>

                  {formData.dependents?.map((dep) => (
                    <div key={dep.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-700 rounded flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={t.employees.colName}
                        value={dep.fullName}
                        onChange={(e) => {
                          const updated = formData.dependents?.map((d) =>
                            d.id === dep.id ? { ...d, fullName: e.target.value } : d
                          );
                          setFormData({ ...formData, dependents: updated });
                        }}
                        className="p-1.5 border rounded text-xs flex-1 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      />
                      <input
                        type="date"
                        value={dep.birthDate}
                        onChange={(e) => {
                          const updated = formData.dependents?.map((d) =>
                            d.id === dep.id ? { ...d, birthDate: e.target.value } : d
                          );
                          setFormData({ ...formData, dependents: updated });
                        }}
                        className="p-1.5 border rounded text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveDependent(dep.id)}
                        className="text-red-600 font-bold p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'DOCUMENTS' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded text-[#1F3864] dark:text-blue-300 flex items-center justify-between">
                    <div>
                      <strong>{lang === 'fr' ? 'Conformité du Dossier Individuel (Code RDC)' : 'Individual File Compliance (DRC Code)'}</strong>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        {Object.values(docStatuses).filter(Boolean).length} / 9 {lang === 'fr' ? 'pièces obligatoires validées.' : 'mandatory documents validated.'}
                      </p>
                    </div>
                    <span className="text-lg font-black text-[#BF9000] dark:text-amber-300">
                      {Math.round((Object.values(docStatuses).filter(Boolean).length / 9) * 100)} %
                    </span>
                  </div>

                  <div className="space-y-2">
                    {getDocItems().map((doc) => (
                      <div
                        key={doc.key}
                        className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 border dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{doc.label}</span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() =>
                              setDocStatuses((prev) => ({ ...prev, [doc.key]: !prev[doc.key] }))
                            }
                            className={`px-3 py-1 rounded text-[10px] font-bold flex items-center space-x-1 ${
                              docStatuses[doc.key]
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800'
                            }`}
                          >
                            {docStatuses[doc.key] ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600 stroke-[1.75]" />
                                <span>{lang === 'fr' ? 'Validé RH' : 'HR Validated'}</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3 text-red-600 stroke-[1.75]" />
                                <span>{lang === 'fr' ? 'Manquant' : 'Missing'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={savingEmployee}
                  className="px-4 py-2 border dark:border-slate-700 dark:text-slate-300 rounded text-xs font-bold disabled:opacity-50"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={savingEmployee}
                  className="px-5 py-2 bg-[#1F3864] hover:bg-[#152747] dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded text-xs font-bold shadow flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {savingEmployee ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{lang === 'fr' ? 'Enregistrement...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <span>{t.employees.saveEmployee}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Photo Capture / Upload Modal */}
      <EmployeePhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        employeeName={`${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'Employé'}
        currentPhotoUrl={formData.photoUrl}
        onPhotoSelected={(photoUrl) => {
          setFormData((prev) => ({ ...prev, photoUrl }));
          setIsPhotoModalOpen(false);
        }}
      />

      {/* CSV Import Modal */}
      {isCSVModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800">
            <h2 className="text-base font-bold text-[#1F3864] dark:text-blue-300 mb-3">{lang === 'fr' ? 'Import Massif d\'Employés (CSV)' : 'Mass Employee Import (CSV)'}</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              {lang === 'fr'
                ? 'Téléchargez un fichier CSV contenant les colonnes : Matricule, Nom, Prénom, Département, Poste, SalaireBase, Devise.'
                : 'Upload a CSV file containing columns: Matricule, LastName, FirstName, Department, Position, BaseSalary, Currency.'}
            </p>

            <input type="file" accept=".csv" onChange={handleCSVFile} className="text-xs mb-4 dark:text-slate-300" />

            {csvReport && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border dark:border-slate-700 text-xs space-y-1 mb-4">
                <div>{lang === 'fr' ? 'Lignes détectées' : 'Detected rows'}: <strong>{csvReport.total}</strong></div>
                <div className="text-emerald-700 dark:text-emerald-400">{lang === 'fr' ? 'Lignes valides' : 'Valid rows'}: <strong>{csvReport.valid}</strong></div>
                <div className="text-red-700 dark:text-red-400">{lang === 'fr' ? 'Lignes invalides' : 'Invalid rows'}: <strong>{csvReport.invalid}</strong></div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsCSVModalOpen(false)}
                className="px-4 py-2 border dark:border-slate-700 dark:text-slate-300 rounded text-xs font-bold"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fiche Employé 360° Modal */}
      {is360ModalOpen && selectedEmployee && (
        <Employee360Modal
          employee={selectedEmployee}
          currentUser={currentUser}
          rolePermissions={rolePermissions}
          onClose={() => setIs360ModalOpen(false)}
          onRefresh={() => {
            getEmployees().then((data) => {
              setEmployees(data);
              setFilteredEmployees(data);
            });
          }}
        />
      )}

      {/* Modal Attestation de Fin de Service */}
      <ServiceCertificateModal
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
        initialEmployeeId={certEmployeeId}
      />
    </div>
  );
};
