/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 */

import React, { useEffect, useState } from 'react';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  softDeleteEmployee,
  validateEmployeeData,
  getExpiringContracts,
  getEmployeeCircumstances,
  deriveEmployeeStatus,
} from '../../services/employeeService';
import { getPayslipsForEmployee } from '../../services/payrollService';
import { Employee, Contract, EmployeeWithContract, Dependent } from '../../types/employee';
import { UserProfile, PermissionKey } from '../../types/auth';
import { Payslip } from '../../types/payroll';
import { checkPermission } from '../../services/rbacEngine';
import { Employee360Modal } from './Employee360Modal';
import { ServiceCertificateModal } from '../common/ServiceCertificateModal';
import { EmployeePhotoModal } from '../common/EmployeePhotoModal';
import { formatCDF, formatUSD } from '../../utils/documentFormatter';
import {
  Users,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  AlertTriangle,
  Calendar,
  CreditCard,
  Edit,
  Trash2,
  CheckCircle,
  X,
  Upload,
  Eye,
  Download,
  Award,
  Check,
  FileText,
  Camera,
  Loader2,
} from 'lucide-react';

interface EmployeesModuleProps {
  currentUser: UserProfile | null;
  rolePermissions: any[];
}

export const EmployeesModule: React.FC<EmployeesModuleProps> = ({ currentUser, rolePermissions }) => {
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
      matricule: `KP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
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
      errors.push('Le salaire de base du contrat doit être supérieur à zéro.');
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
      setFormErrors([err.message || 'Erreur d\'enregistrement']);
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Confirmer la suppression logique de cet employé ?')) {
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
          errors.push(`Ligne ${i + 1}: Nombre de colonnes insuffisant.`);
        } else {
          valid++;
        }
      }

      setCsvReport({ total: lines.length - 1, valid, invalid, errors });
    };
    reader.readAsText(file);
  };

  const departments = Array.from(new Set(employees.map((e) => e.department))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-[#1F3864]">Gestion des Employés & Contrats</h1>
          <p className="text-xs text-slate-500">
            Base centrale du personnel avec personnes à charge pour le calcul IRPP et allocations familiales.
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
            <span>Attestation Fin de Service (Art. 168)</span>
          </button>
          {canCreate && (
            <>
              <button
                onClick={() => setIsCSVModalOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 border border-slate-300 transition"
              >
                <Upload className="w-4 h-4 text-slate-600" />
                <span>Import CSV</span>
              </button>
              <button
                onClick={handleOpenCreate}
                className="bg-[#1F3864] hover:bg-[#152747] text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow transition"
              >
                <Plus className="w-4 h-4 text-[#BF9000]" />
                <span>Nouvel Employé</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, matricule..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1F3864]"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white text-slate-800 font-medium"
          >
            <option value="ALL">Tous les départements</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={expatFilter}
            onChange={(e) => setExpatFilter(e.target.value as any)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white text-slate-800 font-medium"
          >
            <option value="ALL">Tous les statuts (Locaux & Expats)</option>
            <option value="NATIONAL_ONLY">Employés Nationaux RDC</option>
            <option value="EXPAT_ONLY">Expatriés uniquement</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#1F3864] text-white uppercase font-bold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Matricule & Nom</th>
                <th className="py-3 px-4">Poste & Dépt</th>
                <th className="py-3 px-4">Contrat & Salaire</th>
                <th className="py-3 px-4">Charges Famille</th>
                <th className="py-3 px-4">Ancienneté</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Chargement des employés...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Aucun employé trouvé.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">
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
                          <div className="text-[11px] font-mono text-[#1F3864]">{emp.matricule}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{emp.position}</div>
                      <div className="text-slate-500 text-[11px]">{emp.department} • {emp.site}</div>
                    </td>
                    <td className="py-3 px-4">
                      {emp.currentContract ? (
                        <div>
                          <span className="font-bold text-slate-900">
                            {emp.currentContract.baseSalary.toLocaleString()} {emp.currentContract.currency}
                          </span>
                          <span className="ml-2 text-[10px] bg-blue-100 text-[#1F3864] font-bold px-1.5 py-0.5 rounded">
                            {emp.currentContract.type}
                          </span>
                        </div>
                      ) : (
                        <span className="text-red-500 font-semibold">Aucun contrat</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {emp.dependents ? emp.dependents.length : 0} charge(s)
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {emp.seniorityYears} an(s) {emp.seniorityMonths} mois
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 flex items-center justify-end">
                      <button
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setIs360ModalOpen(true);
                        }}
                        className="bg-[#1F3864] text-white hover:bg-[#152747] px-2.5 py-1 rounded-lg flex items-center space-x-1 font-bold text-[11px] shadow-sm"
                        title="Ouvrir la Fiche Employé 360° Complète"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Fiche 360°</span>
                      </button>
                      <button
                        onClick={() => {
                          setCertEmployeeId(emp.id || '');
                          setIsCertModalOpen(true);
                        }}
                        className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                        title="Attestation de Fin de Service (Art. 168)"
                      >
                        <Award className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1 text-blue-700 hover:bg-blue-50 rounded"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => emp.id && handleDelete(emp.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Suppression logique"
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
      </div>

      {/* Employee Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="bg-[#1F3864] text-white p-4 flex items-center justify-between sticky top-0 z-10">
              <h2 className="font-bold text-base">
                {selectedEmployee ? 'Fiche Employé — Modification' : 'Création d\'un Nouvel Employé'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab selection */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-4">
              <button
                onClick={() => setActiveTab('IDENTITY')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition ${
                  activeTab === 'IDENTITY'
                    ? 'border-[#1F3864] text-[#1F3864]'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Identité & Contact
              </button>
              <button
                onClick={() => setActiveTab('CONTRACT')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition ${
                  activeTab === 'CONTRACT'
                    ? 'border-[#1F3864] text-[#1F3864]'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Contrat & Salaire
              </button>
              <button
                onClick={() => setActiveTab('DEPENDENTS')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition ${
                  activeTab === 'DEPENDENTS'
                    ? 'border-[#1F3864] text-[#1F3864]'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Personnes à Charge ({formData.dependents?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('DOCUMENTS')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 transition ${
                  activeTab === 'DOCUMENTS'
                    ? 'border-[#1F3864] text-[#1F3864]'
                    : 'border-transparent text-slate-500'
                }`}
              >
                Checklist Documents RDC ({Object.values(docStatuses).filter(Boolean).length}/9)
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formErrors.length > 0 && (
                <div className="bg-red-50 border-l-4 border-[#C00000] p-3 rounded text-xs text-red-800 space-y-1">
                  {formErrors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}

              {activeTab === 'IDENTITY' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Photo Profile Card */}
                  <div className="col-span-1 sm:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      {formData.photoUrl ? (
                        <img
                          src={formData.photoUrl}
                          alt="Photo Employé"
                          className="w-14 h-14 rounded-full object-cover border-2 border-[#1F3864] shadow-sm"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-[#1F3864] text-white flex items-center justify-center font-bold text-base shadow-sm">
                          {((formData.firstName?.[0] || 'E') + (formData.lastName?.[0] || '')).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-xs text-slate-800">Photo de Profil Salarié</div>
                        <div className="text-[11px] text-slate-500">
                          {formData.photoUrl ? 'Photo enregistrée pour la fiche 360°' : 'Aucune photo enregistrée (Avatar par défaut)'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsPhotoModalOpen(true)}
                        className="bg-[#1F3864] hover:bg-[#152747] text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 shadow transition"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#BF9000]" />
                        <span>Prendre / Importer Photo</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold mb-1">Matricule *</label>
                    <input
                      type="text"
                      value={formData.matricule || ''}
                      onChange={(e) => setFormData({ ...formData, matricule: e.target.value })}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Nom de famille *</label>
                    <input
                      type="text"
                      value={formData.lastName || ''}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Prénom *</label>
                    <input
                      type="text"
                      value={formData.firstName || ''}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Sexe</label>
                    <select
                      value={formData.gender || 'M'}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'M' | 'F' })}
                      className="w-full p-2 border rounded"
                    >
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">NIF (Numéro Impôt RDC) <span className="text-slate-400 font-normal">(Optionnel)</span></label>
                    <input
                      type="text"
                      value={formData.nif || ''}
                      onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                      placeholder="Ex: A2210892X"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Numéro CNSS RDC <span className="text-slate-400 font-normal">(Optionnel)</span></label>
                    <input
                      type="text"
                      value={formData.cnss || ''}
                      onChange={(e) => setFormData({ ...formData, cnss: e.target.value })}
                      placeholder="Ex: 1004812001-C"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Téléphone RDC (+243...)</label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+243 810 000 000"
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Email <span className="text-slate-400 font-normal">(Optionnel)</span></label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Département *</label>
                    <input
                      type="text"
                      value={formData.department || ''}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Poste *</label>
                    <input
                      type="text"
                      value={formData.position || ''}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                </div>
              )}

              {activeTab === 'CONTRACT' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold mb-1">Type de Contrat</label>
                    <select
                      value={contractData.type || 'CDI'}
                      onChange={(e) => setContractData({ ...contractData, type: e.target.value as any })}
                      className="w-full p-2 border rounded font-semibold bg-slate-50"
                    >
                      <option value="CDI">CDI - Durée Indéterminée</option>
                      <option value="CDD">CDD - Durée Déterminée</option>
                      <option value="Journalier">Journalier (Paiement à la tâche)</option>
                      <option value="STAGE">Stagiaire (Convention Académique / Gratification)</option>
                      <option value="CONSULTANCE">Consultant Indépendant (Honoraires / Retenue 15%)</option>
                    </select>
                  </div>

                  {contractData.type === 'STAGE' && (
                    <div className="col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                      <label className="block font-bold text-amber-900">Université / École de Provenance (Stage RDC)</label>
                      <input
                        type="text"
                        placeholder="Ex: Université de Kinshasa (UNIKIN) - Fac Droit"
                        value={contractData.academicInstitution || ''}
                        onChange={(e) => setContractData({ ...contractData, academicInstitution: e.target.value })}
                        className="w-full p-2 bg-white border rounded text-xs"
                      />
                      <p className="text-[10px] text-amber-800">
                        * Les stagiaires sous convention sont exonérés des cotisations CNSS patronales/salariales.
                      </p>
                    </div>
                  )}

                  {contractData.type === 'CONSULTANCE' && (
                    <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-blue-900">NIF / N° Registre Commerce Consultant</label>
                          <input
                            type="text"
                            placeholder="Ex: RCCM/KIN/2026-B-00192"
                            value={contractData.consultantNif || ''}
                            onChange={(e) => setContractData({ ...contractData, consultantNif: e.target.value })}
                            className="w-full p-2 bg-white border rounded text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-blue-900">Domaine de Prestation</label>
                          <input
                            type="text"
                            placeholder="Ex: Audit Système & Conseils Fiscalité"
                            value={contractData.consultancyType || ''}
                            onChange={(e) => setContractData({ ...contractData, consultancyType: e.target.value })}
                            className="w-full p-2 bg-white border rounded text-xs"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-blue-800">
                        * Prélèvement à la source obligatoire de 15% pour retenue d'impôt sur prestations de services (Code fiscal RDC).
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block font-bold mb-1">Devise du Salaire</label>
                    <select
                      value={contractData.currency || 'CDF'}
                      onChange={(e) => setContractData({ ...contractData, currency: e.target.value as any })}
                      className="w-full p-2 border rounded font-bold"
                    >
                      <option value="CDF">Franc Congolais (CDF)</option>
                      <option value="USD">Dollar Américain (USD)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Salaire de Base Mensuel *</label>
                    <input
                      type="number"
                      value={contractData.baseSalary || 0}
                      onChange={(e) => setContractData({ ...contractData, baseSalary: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 border rounded font-bold text-sm"
                      required
                    />
                    <div className="mt-1 text-xs font-mono font-bold text-[#1F3864]">
                      Aperçu formaté ({contractData.currency || 'CDF'}) :{' '}
                      <span className="text-emerald-700 font-extrabold">
                        {contractData.currency === 'USD'
                          ? formatUSD(contractData.baseSalary || 0)
                          : formatCDF(contractData.baseSalary || 0)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">Date de début *</label>
                    <input
                      type="date"
                      value={contractData.startDate || ''}
                      onChange={(e) => setContractData({ ...contractData, startDate: e.target.value })}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>
                </div>
              )}

              {activeTab === 'DEPENDENTS' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-600">
                      Les personnes à charge accordent une réduction directe de 2% sur l'IRPP par enfant (max 18%).
                    </p>
                    <button
                      type="button"
                      onClick={handleAddDependent}
                      className="bg-[#1F3864] text-white px-3 py-1 rounded text-xs font-bold"
                    >
                      + Ajouter
                    </button>
                  </div>

                  {formData.dependents?.map((dep) => (
                    <div key={dep.id} className="p-3 bg-slate-50 border rounded flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nom complet"
                        value={dep.fullName}
                        onChange={(e) => {
                          const updated = formData.dependents?.map((d) =>
                            d.id === dep.id ? { ...d, fullName: e.target.value } : d
                          );
                          setFormData({ ...formData, dependents: updated });
                        }}
                        className="p-1.5 border rounded text-xs flex-1"
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
                        className="p-1.5 border rounded text-xs"
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
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded text-[#1F3864] flex items-center justify-between">
                    <div>
                      <strong>Conformité du Dossier Individuel (Code RDC)</strong>
                      <p className="text-[11px] text-slate-600">
                        {Object.values(docStatuses).filter(Boolean).length} / 9 pièces obligatoires fournies et validées.
                      </p>
                    </div>
                    <span className="text-lg font-black text-[#BF9000]">
                      {Math.round((Object.values(docStatuses).filter(Boolean).length / 9) * 100)} %
                    </span>
                  </div>

                  <div className="space-y-2">
                    {[
                      { key: 'cni', label: '1. Pièce d\'Identité / Carte d\'Électeur / Passeport' },
                      { key: 'cv', label: '2. CV Certifié Conforme & Copie des Diplômes' },
                      { key: 'cnss_nif', label: '3. Numéro Impôt (NIF) & Attestation CNSS' },
                      { key: 'domicile', label: '4. Certificat de Domicile / Résidence' },
                      { key: 'medical', label: '5. Certificat Médical d\'Aptitude Physique (Obligatoire RDC)' },
                      { key: 'casier', label: '6. Extrait de Casier Judiciaire (< 3 mois)' },
                      { key: 'etat_civil', label: '7. Acte de Mariage & Actes de Naissance Enfants à charge' },
                      { key: 'services_anterieurs', label: '8. Attestation des Services Antérieurs / Certificat de Fin de Travail' },
                      { key: 'photos', label: '9. Photos d\'Identité Récentes (x4)' },
                    ].map((doc) => (
                      <div
                        key={doc.key}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border rounded hover:bg-slate-100"
                      >
                        <span className="font-semibold text-slate-800">{doc.label}</span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() =>
                              setDocStatuses((prev) => ({ ...prev, [doc.key]: !prev[doc.key] }))
                            }
                            className={`px-3 py-1 rounded text-[10px] font-bold flex items-center space-x-1 ${
                              docStatuses[doc.key]
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-red-100 text-red-800 border border-red-300'
                            }`}
                          >
                            {docStatuses[doc.key] ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600 stroke-[1.75]" />
                                <span>Validé RH</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3 h-3 text-red-600 stroke-[1.75]" />
                                <span>Manquant</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={savingEmployee}
                  className="px-4 py-2 border rounded text-xs font-bold disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingEmployee}
                  className="px-5 py-2 bg-[#1F3864] hover:bg-[#152747] text-white rounded text-xs font-bold shadow flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {savingEmployee ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <span>Enregistrer Salarié</span>
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
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200">
            <h2 className="text-base font-bold text-[#1F3864] mb-3">Import Massif d'Employés (CSV)</h2>
            <p className="text-xs text-slate-600 mb-4">
              Téléchargez un fichier CSV contenant les colonnes : Matricule, Nom, Prénom, Département, Poste, SalaireBase, Devise.
            </p>

            <input type="file" accept=".csv" onChange={handleCSVFile} className="text-xs mb-4" />

            {csvReport && (
              <div className="p-3 bg-slate-50 rounded border text-xs space-y-1 mb-4">
                <div>Lignes détectées: <strong>{csvReport.total}</strong></div>
                <div className="text-emerald-700">Lignes valides: <strong>{csvReport.valid}</strong></div>
                <div className="text-red-700">Lignes invalides: <strong>{csvReport.invalid}</strong></div>
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsCSVModalOpen(false)}
                className="px-4 py-2 border rounded text-xs font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Espace & Suivi Individuel Employé Modal */}
      {isSelfServiceOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            {/* Modal Header */}
            <div className="bg-[#1F3864] text-white p-6 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-[#BF9000] text-[#1F3864] font-black rounded-full flex items-center justify-center text-lg shadow">
                  {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                </div>
                <div>
                  <h2 className="font-bold text-lg">{selectedEmployee.lastName} {selectedEmployee.firstName}</h2>
                  <p className="text-xs text-slate-300 font-mono">
                    Matricule: {selectedEmployee.matricule} • {selectedEmployee.position} ({selectedEmployee.department})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSelfServiceOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs text-slate-800">
              {/* Stat Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-1">
                  <div className="text-[11px] font-bold text-blue-900 uppercase">Congés Acquis (2026)</div>
                  <div className="text-2xl font-black text-[#1F3864]">
                    {Math.round((selectedEmployee.seniorityMonths || 12) * 1.833)} <span className="text-xs font-bold">jours</span>
                  </div>
                  <div className="text-[10px] text-slate-500">Code du travail RDC (1.83j/mois)</div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-1">
                  <div className="text-[11px] font-bold text-amber-900 uppercase">Congés Pris / Consommés</div>
                  <div className="text-2xl font-black text-amber-800">
                    4 <span className="text-xs font-bold">jours</span>
                  </div>
                  <div className="text-[10px] text-slate-500">Dernier congé: Mai 2026</div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-1">
                  <div className="text-[11px] font-bold text-emerald-900 uppercase">Solde Congés Restants</div>
                  <div className="text-2xl font-black text-emerald-700">
                    {Math.max(0, Math.round((selectedEmployee.seniorityMonths || 12) * 1.833) - 4)} <span className="text-xs font-bold">jours</span>
                  </div>
                  <div className="text-[10px] text-emerald-600 font-bold">Disponible pour demande</div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl space-y-1">
                  <div className="text-[11px] font-bold text-indigo-900 uppercase">Prochain Congé Prévu</div>
                  <div className="text-sm font-bold text-indigo-950">
                    15/08/2026 au 30/08/2026
                  </div>
                  <div className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    Statut : Approuvé RH
                  </div>
                </div>
              </div>

              {/* Suivi des Paies et Bulletins */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-bold text-sm text-[#1F3864]">Historique des Paies & Bulletins Individuels</h3>
                  <span className="text-slate-500 text-[11px]">
                    {employeePayslips.length} bulletin(s) disponible(s)
                  </span>
                </div>

                {employeePayslips.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 italic">
                    Aucun bulletin de paie archivé pour cet employé dans la période actuelle.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#1F3864] text-white uppercase text-[10px] font-bold">
                        <tr>
                          <th className="p-2.5">Période</th>
                          <th className="p-2.5">Salaire Brut (CDF)</th>
                          <th className="p-2.5">Retenues IRPP & CNSS</th>
                          <th className="p-2.5">Prêt / Avance</th>
                          <th className="p-2.5">Net à Payer (CDF)</th>
                          <th className="p-2.5">Net (USD)</th>
                          <th className="p-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {employeePayslips.map((ps) => (
                          <tr key={ps.id || ps.period} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-900 font-mono">{ps.period}</td>
                            <td className="p-2.5 font-bold text-slate-800">{ps.grossSalaryCDF.toLocaleString()} FC</td>
                            <td className="p-2.5 text-red-700">{(ps.irppFinalCDF + ps.cnssEmployeeCDF).toLocaleString()} FC</td>
                            <td className="p-2.5 text-amber-800">{ps.loanDeductionCDF > 0 ? `${ps.loanDeductionCDF.toLocaleString()} FC` : '-'}</td>
                            <td className="p-2.5 font-black text-emerald-800">{ps.netSalaryCDF.toLocaleString()} FC</td>
                            <td className="p-2.5 font-bold text-slate-700">${ps.netSalaryUSD}</td>
                            <td className="p-2.5 text-right">
                              <button
                                onClick={() => {
                                  const win = window.open('', '_blank');
                                  if (win) {
                                    win.document.write(`
                                      <html>
                                        <head>
                                          <title>Bulletin de Paie - ${ps.employeeName} (${ps.period})</title>
                                          <style>
                                            body { font-family: sans-serif; padding: 20px; font-size: 12px; }
                                            .header { border-bottom: 2px solid #1F3864; padding-bottom: 10px; margin-bottom: 20px; }
                                            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                                            th { background: #1F3864; color: white; }
                                            .total { font-weight: bold; background: #e2e8f0; }
                                          </style>
                                        </head>
                                        <body>
                                          <div class="header">
                                            <h2>NOVARISPAY RDC — BULLETIN DE PAIE OFFICEL</h2>
                                            <p><strong>Employé:</strong> ${ps.employeeName} (${ps.employeeMatricule}) | <strong>Période:</strong> ${ps.period}</p>
                                            <p><strong>Poste:</strong> ${ps.position} | <strong>Département:</strong> ${ps.department}</p>
                                          </div>
                                          <table>
                                            <thead>
                                              <tr><th>Code</th><th>Libellé</th><th>Base (CDF)</th><th>Gains (CDF)</th><th>Retenues (CDF)</th></tr>
                                            </thead>
                                            <tbody>
                                              ${ps.lines.map(l => `<tr><td>${l.code}</td><td>${l.label}</td><td>${l.baseCDF.toLocaleString()}</td><td>${l.gainCDF ? l.gainCDF.toLocaleString() : '-'}</td><td>${l.deductionCDF ? l.deductionCDF.toLocaleString() : '-'}</td></tr>`).join('')}
                                              <tr class="total"><td colspan="3">TOTAL NET À PAYER</td><td colspan="2" style="color: green; font-size: 14px;">${ps.netSalaryCDF.toLocaleString()} CDF ($${ps.netSalaryUSD} USD)</td></tr>
                                            </tbody>
                                          </table>
                                          <br/><button onclick="window.print()">Imprimer Bulletin</button>
                                        </body>
                                      </html>
                                    `);
                                  }
                                }}
                                className="bg-[#1F3864] text-white px-2.5 py-1 rounded font-bold hover:bg-[#152747] text-[10px] inline-flex items-center space-x-1"
                              >
                                <Download className="w-3 h-3" />
                                <span>Bulletin</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Information Contractuelle & Prêts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-[#1F3864]">Détails du Contrat Actuel</h4>
                  <div className="space-y-1 text-slate-700 text-[11px]">
                    <div><strong>Type de Contrat :</strong> {selectedEmployee.currentContract?.type || 'CDI'}</div>
                    <div><strong>Salaire Contractuel :</strong> {selectedEmployee.currentContract?.baseSalary.toLocaleString()} {selectedEmployee.currentContract?.currency}</div>
                    <div><strong>Ancienneté Légale :</strong> {selectedEmployee.seniorityYears} an(s) {selectedEmployee.seniorityMonths} mois</div>
                    <div><strong>Régime RDC :</strong> 45h / semaine (26 jours ouvrables)</div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-[#1F3864]">Statut Prêts & Avances Sociale</h4>
                  <div className="space-y-1 text-slate-700 text-[11px]">
                    <div><strong>Plafond Légal (Quotité Cessible) :</strong> 30% du salaire net imposable</div>
                    <div><strong>Dernière Retenue Effectuée :</strong> {employeePayslips[0]?.loanDeductionCDF ? `${employeePayslips[0].loanDeductionCDF.toLocaleString()} CDF` : '0 CDF'}</div>
                    {employeePayslips[0]?.loanDeductionWarning && (
                      <div className="p-2 bg-amber-100 text-amber-900 font-bold rounded text-[10px] border border-amber-300 flex items-center space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0 stroke-[1.75]" />
                        <span>{employeePayslips[0].loanDeductionWarning}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsSelfServiceOpen(false)}
                className="bg-[#1F3864] text-white font-bold px-5 py-2 rounded-lg text-xs hover:bg-[#152747]"
              >
                Fermer l'Espace Employé
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
