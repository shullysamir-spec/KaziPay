/**
 * @license
 * KaziPay - ERP RH et Paie RDC
 * Composant Fiche Employé 360° & Gestion du Cycle de Vie
 */

import React, { useState, useEffect, useRef } from 'react';
import { EmployeeWithContract, EmployeeCircumstance, PhotoRecord, CircumstanceNature } from '../../types/employee';
import { UserProfile, PermissionKey } from '../../types/auth';
import { Payslip, SoldeDeToutCompte } from '../../types/payroll';
import { checkPermission } from '../../services/rbacEngine';
import {
  getEmployeeCircumstances,
  createCircumstance,
  returnEarlyFromCircumstance,
  reintegrateEmployee,
  updateEmployeePhoto,
  deriveEmployeeStatus,
  updateEmployee,
} from '../../services/employeeService';
import { getPayslipsForEmployee, getSoldeDeToutCompteHistory, saveSoldeDeToutCompte } from '../../services/payrollService';
import { calculateSoldeDeToutCompte } from '../../payroll/engine';
import { getAuditLogs, AuditLogEntry, logAuditEvent } from '../../services/auditService';
import { ServiceCertificateModal } from '../common/ServiceCertificateModal';
import {
  User,
  X,
  Camera,
  Upload,
  Calendar,
  FileText,
  CreditCard,
  Briefcase,
  Clock,
  ShieldAlert,
  Stethoscope,
  Award,
  Folder,
  History,
  CheckCircle,
  AlertTriangle,
  Download,
  RotateCcw,
  Plus,
  Lock,
  Eye,
  Check,
  Building2,
  DollarSign,
  ChevronRight,
  Image as ImageIcon
} from 'lucide-react';

interface Employee360ModalProps {
  employee: EmployeeWithContract;
  currentUser: UserProfile | null;
  rolePermissions: any[];
  onClose: () => void;
  onRefresh: () => void;
}

export const Employee360Modal: React.FC<Employee360ModalProps> = ({
  employee,
  currentUser,
  rolePermissions,
  onClose,
  onRefresh,
}) => {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<
    | 'IDENTITY'
    | 'CONTRACTS'
    | 'ATTENDANCE'
    | 'LEAVE'
    | 'LOANS'
    | 'PAYSLIPS'
    | 'DISCIPLINE'
    | 'MEDICAL'
    | 'PERFORMANCE'
    | 'DOCUMENTS'
    | 'CIRCUMSTANCES'
    | 'SOLDE_COMPTE'
    | 'AUDIT_LOGS'
  >('IDENTITY');

  // Data States
  const [circumstances, setCircumstances] = useState<EmployeeCircumstance[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [soldeDeToutCompteList, setSoldeDeToutCompteList] = useState<SoldeDeToutCompte[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isServiceCertOpen, setIsServiceCertOpen] = useState(false);

  // Camera & Photo Modal States
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhotoData, setCapturedPhotoData] = useState<string | null>(null);
  const [isPhotoHistoryOpen, setIsPhotoHistoryOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Circumstance Form Modal
  const [isCircumstanceFormOpen, setIsCircumstanceFormOpen] = useState(false);
  const [circNature, setCircNature] = useState<CircumstanceNature>('CONGE');
  const [circStartDate, setCircStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [circEndDate, setCircEndDate] = useState('');
  const [circReason, setCircReason] = useState('');
  const [circPaymentRate, setCircPaymentRate] = useState(1.0);

  // Early Return Modal
  const [isEarlyReturnOpen, setIsEarlyReturnOpen] = useState(false);
  const [selectedCircForEarlyReturn, setSelectedCircForEarlyReturn] = useState<EmployeeCircumstance | null>(null);
  const [earlyReturnDate, setEarlyReturnDate] = useState(new Date().toISOString().split('T')[0]);

  // Reintegration Modal
  const [isReintegrateModalOpen, setIsReintegrateModalOpen] = useState(false);
  const [reintegrateReason, setReintegrateReason] = useState('');

  // RBAC Checks
  const userRole = currentUser?.role || 'GESTIONNAIRE_RH';
  const canViewPayroll = checkPermission(userRole, PermissionKey.PAY_VIEW, rolePermissions) || userRole === 'SUPER_ADMIN' || userRole === 'GESTIONNAIRE_RH' || userRole === 'SUPERADMIN' || userRole === 'PAYROLL_MANAGER';
  const canViewMedical = userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN' || userRole === 'GESTIONNAIRE_RH' || userRole === 'HR_MANAGER';
  const canEditEmployee = checkPermission(userRole, PermissionKey.EMP_EDIT, rolePermissions) || userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN' || userRole === 'GESTIONNAIRE_RH' || userRole === 'HR_MANAGER';

  // Current derived status
  const currentStatus = deriveEmployeeStatus(employee, circumstances);

  // Load Data
  useEffect(() => {
    loadAllEmployeeData();
  }, [employee.id]);

  const loadAllEmployeeData = async () => {
    if (!employee.id) return;
    setLoading(true);
    try {
      const circs = await getEmployeeCircumstances(employee.id);
      setCircumstances(circs);

      const ps = await getPayslipsForEmployee(employee.id);
      setPayslips(ps);

      const soldes = await getSoldeDeToutCompteHistory();
      setSoldeDeToutCompteList(soldes.filter((s) => s.employeeId === employee.id));

      const logs = await getAuditLogs();
      setAuditLogs(logs.filter((l) => l.targetEntityId === employee.id || l.details.includes(employee.lastName) || l.details.includes(employee.matricule)));
    } catch (err) {
      console.error('Error loading 360 data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- CAMERA LOGIC ----------------
  const openCameraModal = async () => {
    setIsCameraModalOpen(true);
    setCapturedPhotoData(null);
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setCameraDevices(videoInputs);
      if (videoInputs.length > 0) {
        setSelectedDeviceId(videoInputs[0].deviceId);
        startCameraStream(videoInputs[0].deviceId);
      } else {
        startCameraStream();
      }
    } catch (err) {
      console.error('Erreur accès caméra:', err);
      alert('Impossible d\'accéder à la caméra. Vérifiez les autorisations de votre navigateur.');
    }
  };

  const startCameraStream = async (deviceId?: string) => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
    }
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'user' },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Erreur démarrage flux vidéo:', err);
    }
  };

  const stopCameraStream = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  };

  const capturePhotoFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Make canvas square 400x400
    canvas.width = 400;
    canvas.height = 400;

    const minDim = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - minDim) / 2;
    const startY = (video.videoHeight - minDim) / 2;

    context.drawImage(video, startX, startY, minDim, minDim, 0, 0, 400, 400);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhotoData(dataUrl);
    stopCameraStream();
  };

  const saveCapturedPhoto = async () => {
    if (!capturedPhotoData || !employee.id) return;
    try {
      await updateEmployeePhoto(employee.id, capturedPhotoData, 'CAMERA', currentUser?.email || 'admin@kazipay.cd');
      setIsCameraModalOpen(false);
      onRefresh();
      loadAllEmployeeData();
    } catch (err) {
      console.error('Erreur sauvegarde photo:', err);
      alert('Erreur lors de l\'enregistrement de la photo.');
    }
  };

  // File Upload Handler
  const handleFileUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      if (result && employee.id) {
        await updateEmployeePhoto(employee.id, result, 'UPLOAD', currentUser?.email || 'admin@kazipay.cd');
        onRefresh();
        loadAllEmployeeData();
      }
    };
    reader.readAsDataURL(file);
  };

  // ---------------- CIRCUMSTANCE CREATION ----------------
  const handleCreateCircumstance = async () => {
    if (!circReason.trim()) {
      alert('Veuillez saisir le motif de la circonstance.');
      return;
    }
    if (!employee.id) return;

    try {
      await createCircumstance(
        {
          employeeId: employee.id,
          nature: circNature,
          startDate: circStartDate,
          endDate: circEndDate.trim() ? circEndDate.trim() : '',
          reason: circReason,
          paymentRate: circPaymentRate,
          status: 'EN_COURS',
          createdAt: new Date().toISOString(),
          createdBy: currentUser?.email || 'rh@kazipay.cd',
        },
        employee
      );

      setIsCircumstanceFormOpen(false);
      setCircReason('');
      onRefresh();
      loadAllEmployeeData();
    } catch (err) {
      console.error('Erreur création circonstance:', err);
      alert('Erreur lors de la création de la circonstance.');
    }
  };

  // ---------------- EARLY RETURN ----------------
  const handleEarlyReturn = async () => {
    if (!selectedCircForEarlyReturn?.id || !employee.id) return;
    try {
      await returnEarlyFromCircumstance(
        selectedCircForEarlyReturn.id,
        employee.id,
        earlyReturnDate,
        currentUser?.email || 'rh@kazipay.cd'
      );
      setIsEarlyReturnOpen(false);
      onRefresh();
      loadAllEmployeeData();
    } catch (err) {
      console.error('Erreur retour anticipé:', err);
      alert('Erreur lors de l\'enregistrement du retour anticipé.');
    }
  };

  // ---------------- REINTEGRATION ----------------
  const handleReintegrate = async () => {
    if (!reintegrateReason.trim() || !employee.id) {
      alert('Veuillez spécifier le motif de la réintégration.');
      return;
    }
    try {
      await reintegrateEmployee(employee.id, currentUser?.email || 'admin@kazipay.cd', reintegrateReason);
      setIsReintegrateModalOpen(false);
      setReintegrateReason('');
      onRefresh();
      loadAllEmployeeData();
    } catch (err) {
      console.error('Erreur réintégration:', err);
      alert('Erreur lors de la réintégration.');
    }
  };

  // Status Badge Colors
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Actif':
        return <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-3 py-1 rounded-full text-xs">● Actif</span>;
      case 'En congé':
        return <span className="bg-blue-100 text-blue-900 border border-blue-300 font-bold px-3 py-1 rounded-full text-xs">● En congé</span>;
      case 'En maladie':
        return <span className="bg-purple-100 text-purple-900 border border-purple-300 font-bold px-3 py-1 rounded-full text-xs">● En maladie</span>;
      case 'Suspendu':
        return <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-3 py-1 rounded-full text-xs">● Suspendu</span>;
      case 'Mis à pied':
        return <span className="bg-orange-100 text-orange-900 border border-orange-300 font-bold px-3 py-1 rounded-full text-xs">● Mis à pied</span>;
      case 'Inactif':
      default:
        return <span className="bg-slate-200 text-slate-800 border border-slate-300 font-bold px-3 py-1 rounded-full text-xs">● Inactif (Archivé)</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* ================= HEADER 360° ================= */}
        <div className="bg-[#1F3864] text-white p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-blue-900 shrink-0">
          <div className="flex items-center space-x-4">
            {/* Photo Avatar with Hover overlay */}
            <div className="relative group">
              {employee.photoUrl ? (
                <img
                  src={employee.photoUrl}
                  alt={employee.lastName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#BF9000] shadow-md"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#BF9000] text-[#1F3864] font-black rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-md border-2 border-amber-300">
                  {employee.firstName[0]}{employee.lastName[0]}
                </div>
              )}

              {/* Photo Actions Overlay */}
              <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1.5 p-1">
                <button
                  onClick={openCameraModal}
                  className="p-1.5 bg-white text-[#1F3864] rounded-lg hover:bg-amber-100 text-[10px] font-bold"
                  title="Prendre photo par caméra"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <label
                  className="p-1.5 bg-white text-[#1F3864] rounded-lg hover:bg-amber-100 text-[10px] font-bold cursor-pointer"
                  title="Importer fichier image"
                >
                  <Upload className="w-4 h-4" />
                  <input type="file" accept="image/*" onChange={handleFileUploadPhoto} className="hidden" />
                </label>
                {employee.photoHistory && employee.photoHistory.length > 0 && (
                  <button
                    onClick={() => setIsPhotoHistoryOpen(true)}
                    className="p-1.5 bg-amber-400 text-[#1F3864] rounded-lg hover:bg-amber-300 text-[10px] font-bold"
                    title="Voir l'historique des photos"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black">{employee.lastName.toUpperCase()} {employee.firstName}</h1>
                {getStatusBadge(currentStatus)}
              </div>
              <p className="text-xs text-slate-300 font-mono mt-1">
                Matricule: <span className="font-bold text-amber-300">{employee.matricule}</span> • {employee.position} ({employee.department})
              </p>
              <div className="flex items-center space-x-3 text-[11px] text-slate-300 mt-1">
                <span>Site: <strong>{employee.site || 'Kinshasa HQ'}</strong></span>
                <span>• Embauche: <strong>{employee.hireDate}</strong> ({employee.seniorityYears}a {employee.seniorityMonths}m)</span>
                <span>• Rôle: <strong className="uppercase bg-blue-900/80 px-1.5 py-0.5 rounded text-[10px] text-amber-300">{employee.userRole || 'Employé'}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
            {canEditEmployee && (
              <>
                <button
                  onClick={() => setIsCircumstanceFormOpen(true)}
                  className="bg-[#BF9000] text-[#1F3864] hover:bg-amber-300 font-black px-3.5 py-2 rounded-xl text-xs shadow flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Circonstance Datée</span>
                </button>

                {currentStatus === 'Inactif' ? (
                  <button
                    onClick={() => setIsReintegrateModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow flex items-center space-x-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Réintégrer l'Employé</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setCircNature('RUPTURE_CONTRAT');
                      setIsCircumstanceFormOpen(true);
                    }}
                    className="bg-red-700 hover:bg-red-800 text-white font-bold px-3 py-2 rounded-xl text-xs shadow flex items-center space-x-1"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Archiver / Sortie</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={onClose}
              className="text-slate-300 hover:text-white p-2 rounded-xl hover:bg-white/10"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ================= TABS BAR ================= */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 pt-2 flex items-center space-x-1 overflow-x-auto scrollbar-none shrink-0 text-xs">
          {[
            { id: 'IDENTITY', label: '1. Identité & État Civil', icon: User },
            { id: 'CONTRACTS', label: '2. Contrats & Avenants', icon: Briefcase },
            { id: 'ATTENDANCE', label: '3. Présences & Heures Supp', icon: Clock },
            { id: 'LEAVE', label: '4. Congés & Absences', icon: Calendar },
            { id: 'LOANS', label: '5. Prêts & Avances', icon: CreditCard },
            { id: 'PAYSLIPS', label: '6. Bulletins de Paie', icon: FileText, restricted: !canViewPayroll },
            { id: 'DISCIPLINE', label: '7. Disciplinaire', icon: ShieldAlert },
            { id: 'MEDICAL', label: '8. Médical & Aptitude', icon: Stethoscope, restricted: !canViewMedical },
            { id: 'PERFORMANCE', label: '9. Évaluations', icon: Award },
            { id: 'DOCUMENTS', label: '10. GED & Pièces', icon: Folder },
            { id: 'CIRCUMSTANCES', label: '11. Statut & Circonstances', icon: RotateCcw, count: circumstances.length },
            { id: 'SOLDE_COMPTE', label: '12. Solde de Tout Compte', icon: DollarSign, count: soldeDeToutCompteList.length },
            { id: 'AUDIT_LOGS', label: '13. Historique & Traçabilité', icon: History, count: auditLogs.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2.5 px-3.5 font-bold border-b-2 transition flex items-center space-x-1.5 whitespace-nowrap ${
                  isActive
                    ? 'border-[#1F3864] text-[#1F3864] bg-white rounded-t-lg shadow-sm'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#1F3864]' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.restricted && <Lock className="w-3 h-3 text-amber-600 inline ml-1" title="Accès Restreint RBAC" />}
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isActive ? 'bg-[#1F3864] text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ================= TAB CONTENTS ================= */}
        <div className="p-6 overflow-y-auto grow space-y-6 text-xs text-slate-800">

          {/* TAB 1: IDENTITY */}
          {activeTab === 'IDENTITY' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                  <h3 className="font-bold text-sm text-[#1F3864] border-b pb-2">État Civil & Identité RDC</h3>
                  <div className="space-y-2">
                    <div><span className="text-slate-500">Nom Complet:</span> <strong className="text-slate-900">{employee.lastName} {employee.firstName}</strong></div>
                    <div><span className="text-slate-500">Genre:</span> <strong>{employee.gender === 'M' ? 'Masculin (M)' : 'Féminin (F)'}</strong></div>
                    <div><span className="text-slate-500">Date de Naissance:</span> <strong>{employee.birthDate || 'Non renseignée'}</strong></div>
                    <div><span className="text-slate-500">État Civil:</span> <strong>{employee.civilStatus || 'Célibataire'}</strong></div>
                    <div><span className="text-slate-500">Matricule Interne:</span> <strong className="font-mono text-amber-800">{employee.matricule}</strong></div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                  <h3 className="font-bold text-sm text-[#1F3864] border-b pb-2">Fiscalité & Organismes Sociaux</h3>
                  <div className="space-y-2">
                    <div><span className="text-slate-500">NIF (Impôt RDC):</span> <strong className="font-mono text-slate-900">{employee.nif || 'En cours'}</strong></div>
                    <div><span className="text-slate-500">N° Affiliation CNSS:</span> <strong className="font-mono text-[#1F3864]">{employee.cnss || 'Non affilié'}</strong></div>
                    <div><span className="text-slate-500">Régime Fiscal:</span> <strong>IRPP Standard RDC (Art 84)</strong></div>
                    <div><span className="text-slate-500">Personnes à Charge:</span> <strong>{employee.dependents?.length || 0} enfant(s)/dépendants (Max 9)</strong></div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                  <h3 className="font-bold text-sm text-[#1F3864] border-b pb-2">Coordonnées & Coordonnées Bancaires</h3>
                  <div className="space-y-2">
                    <div><span className="text-slate-500">Téléphone:</span> <strong className="font-mono text-slate-900">{employee.phone || 'Non renseigné'}</strong></div>
                    <div><span className="text-slate-500">Email Professionnel:</span> <strong>{employee.email || 'Non renseigné'}</strong></div>
                    <div><span className="text-slate-500">Adresse Physique:</span> <strong>{employee.address || 'Kinshasa, RDC'}</strong></div>
                    <div><span className="text-slate-500">Banque de Paie:</span> <strong>{employee.bankName || 'Equity BCDC'}</strong></div>
                    <div><span className="text-slate-500">Compte Bancaire / RRIB:</span> <strong className="font-mono text-emerald-800">{employee.bankAccount || 'En attente'}</strong></div>
                  </div>
                </div>

              </div>

              {/* Dependents list */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-sm text-[#1F3864]">Liste des Personnes à Charge (Déductions d'impôt IRPP 2%/enfant)</h3>
                {(!employee.dependents || employee.dependents.length === 0) ? (
                  <p className="text-slate-500 italic">Aucune personne à charge déclarée.</p>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2">Nom & Prénom</th>
                        <th className="p-2">Lien de Parenté</th>
                        <th className="p-2">Date de Naissance</th>
                        <th className="p-2">Impact Fiscal IRPP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employee.dependents.map((dep, i) => (
                        <tr key={i}>
                          <td className="p-2 font-bold">{dep.fullName}</td>
                          <td className="p-2">{dep.relationship}</td>
                          <td className="p-2">{dep.birthDate}</td>
                          <td className="p-2 text-emerald-700 font-bold">-2% d'IRPP (Max 18%)</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CONTRACTS */}
          {activeTab === 'CONTRACTS' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <h3 className="font-bold text-sm text-[#1F3864]">Historique des Contrats & Salaires Contractuels</h3>
                <button
                  onClick={() => setIsServiceCertOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 shadow transition"
                >
                  <Award className="w-4 h-4 text-slate-950 stroke-[1.75]" />
                  <span>Attestation de Fin de Service (Art. 168)</span>
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1F3864] text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3">Type Contrat</th>
                      <th className="p-3">Date Début</th>
                      <th className="p-3">Date Fin</th>
                      <th className="p-3">Salaire de Base Contractuel</th>
                      <th className="p-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {employee.currentContract ? (
                      <tr className="bg-emerald-50/50">
                        <td className="p-3 font-bold text-[#1F3864]">{employee.currentContract.type}</td>
                        <td className="p-3 font-mono">{employee.currentContract.startDate}</td>
                        <td className="p-3 font-mono">{employee.currentContract.endDate || 'Indéterminé (CDI)'}</td>
                        <td className="p-3 font-bold">
                          {canViewPayroll ? (
                            <span className="text-emerald-800 font-black">
                              {employee.currentContract.baseSalary?.toLocaleString()} {employee.currentContract.currency}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">●●●●● (Restreint)</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Contrat Actuel</span>
                        </td>
                      </tr>
                    ) : (
                      <tr><td colSpan={5} className="p-4 text-center italic text-slate-500">Aucun contrat enregistré.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ATTENDANCE */}
          {activeTab === 'ATTENDANCE' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                  <div className="text-[11px] font-bold text-blue-900 uppercase">Jours Présents Mois En Cours</div>
                  <div className="text-2xl font-black text-[#1F3864]">22 / 26 jours</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                  <div className="text-[11px] font-bold text-amber-900 uppercase">Heures Supplémentaires Cumulées</div>
                  <div className="text-2xl font-black text-amber-800">8h (Majoration +30%)</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                  <div className="text-[11px] font-bold text-emerald-900 uppercase">Taux de Ponctualité</div>
                  <div className="text-2xl font-black text-emerald-700">98%</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LEAVE */}
          {activeTab === 'LEAVE' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                  <div className="text-[11px] font-bold text-blue-900 uppercase">Congés Acquis (2026)</div>
                  <div className="text-2xl font-black text-[#1F3864]">{Math.round((employee.seniorityMonths || 12) * 1.833)} jours</div>
                  <div className="text-[10px] text-slate-500">1.833 jours/mois selon Art. 141 RDC</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                  <div className="text-[11px] font-bold text-amber-900 uppercase">Congés Pris</div>
                  <div className="text-2xl font-black text-amber-800">4 jours</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                  <div className="text-[11px] font-bold text-emerald-900 uppercase">Solde Restant Disponible</div>
                  <div className="text-2xl font-black text-emerald-700">{Math.max(0, Math.round((employee.seniorityMonths || 12) * 1.833) - 4)} jours</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LOANS */}
          {activeTab === 'LOANS' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                <h3 className="font-bold text-[#1F3864]">Information sur les Prêts & Plafond de Quotité Cessible</h3>
                <p className="text-slate-600">
                  En vertu de la législation RDC, la retenue mensuelle pour prêt ne peut excéder <strong>30% du salaire net imposable</strong>.
                  En cas de dépassement, le reliquat est automatiquement reporté sans pénalité.
                </p>
              </div>
            </div>
          )}

          {/* TAB 6: PAYSLIPS */}
          {activeTab === 'PAYSLIPS' && (
            <div className="space-y-4">
              {!canViewPayroll ? (
                <div className="p-8 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-center space-y-2">
                  <Lock className="w-8 h-8 text-amber-700 mx-auto" />
                  <h3 className="font-bold text-base">Accès Restreint aux Données de Paie</h3>
                  <p className="text-xs text-amber-800">Votre rôle utilisateur ne possède pas la permission <code className="font-mono bg-amber-100 px-1 rounded">payroll.view</code> pour consulter les bulletins de paie.</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1F3864] text-white uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-3">Période</th>
                        <th className="p-3">Brut (CDF)</th>
                        <th className="p-3">IRPP & CNSS (CDF)</th>
                        <th className="p-3">Net à Payer (CDF)</th>
                        <th className="p-3">Net (USD)</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payslips.map((ps) => (
                        <tr key={ps.id || ps.period} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900 font-mono">{ps.period}</td>
                          <td className="p-3 font-bold text-slate-800">{ps.grossSalaryCDF.toLocaleString()} FC</td>
                          <td className="p-3 text-red-700">{(ps.irppFinalCDF + ps.cnssEmployeeCDF).toLocaleString()} FC</td>
                          <td className="p-3 font-black text-emerald-800">{ps.netSalaryCDF.toLocaleString()} FC</td>
                          <td className="p-3 font-bold text-slate-700">${ps.netSalaryUSD}</td>
                          <td className="p-3 text-right">
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
                                          <h2>KAZIPAY RDC — BULLETIN DE PAIE OFFICIEL</h2>
                                          <p><strong>Employé:</strong> ${ps.employeeName} (${ps.employeeMatricule}) | <strong>Période:</strong> ${ps.period}</p>
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
                              <span>Imprimer</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {payslips.length === 0 && (
                        <tr><td colSpan={6} className="p-4 text-center italic text-slate-500">Aucun bulletin de paie généré.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: DISCIPLINE */}
          {activeTab === 'DISCIPLINE' && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-[#1F3864]">Dossier Disciplinaire & Demandes d'Explications</h3>
              <p className="text-slate-600">Aucune sanction ou blâme n'est actif sur le dossier de cet employé.</p>
            </div>
          )}

          {/* TAB 8: MEDICAL */}
          {activeTab === 'MEDICAL' && (
            <div className="space-y-4">
              {!canViewMedical ? (
                <div className="p-8 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-center space-y-2">
                  <Lock className="w-8 h-8 text-amber-700 mx-auto" />
                  <h3 className="font-bold text-base">Accès Restreint aux Données Médicales</h3>
                  <p className="text-xs text-amber-800">Seuls les médecins du travail et la direction RH habilitée peuvent consulter les fiches d'aptitude médicale.</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3">
                  <h3 className="font-bold text-sm text-[#1F3864]">Dernière Visite Médicale d'Aptitude</h3>
                  <div className="space-y-1">
                    <div><strong>Date de la Visite :</strong> 14/01/2026</div>
                    <div><strong>Médecin / Centre :</strong> Centre Médical de la Gombe (CMG)</div>
                    <div><strong>Aptitude Physionomique :</strong> <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">Apte Sans Réserve</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 9: PERFORMANCE */}
          {activeTab === 'PERFORMANCE' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3">
                <h3 className="font-bold text-sm text-[#1F3864]">Évaluation Annuelle 2025/2026</h3>
                <div className="space-y-1">
                  <div><strong>Note Globale de Performance :</strong> 4.2 / 5 (Très Satisfaisant)</div>
                  <div><strong>Potentiel de Promotion :</strong> Élevé (Futur Leader / Star)</div>
                  <div><strong>Position Matrice 9-Box :</strong> Box 3 - Talent Majeur</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: DOCUMENTS */}
          {activeTab === 'DOCUMENTS' && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-[#1F3864]">Documents Joints GED Employé</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {['Carte d\'Identité (CNI/Passeport)', 'CV Mis à Jour', 'Attestation de Domicile', 'Numéro CNSS/NIF', 'Certificat Médical'].map((doc, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border rounded-lg flex items-center justify-between">
                    <span className="font-bold text-[#1F3864] text-[11px]">{doc}</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded">Présent</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 11: CIRCUMSTANCES */}
          {activeTab === 'CIRCUMSTANCES' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-sm text-[#1F3864]">Gestion du Statut & Circonstances Datées</h3>
                  <p className="text-slate-500">
                    Les statuts sont automatiquement dérivés des circonstances datées en cours. À l'échéance d'une période temporaire, le statut redevient automatiquement <strong>Actif</strong>.
                  </p>
                </div>
                {canEditEmployee && (
                  <button
                    onClick={() => setIsCircumstanceFormOpen(true)}
                    className="bg-[#1F3864] text-white font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-[#152747]"
                  >
                    + Nouvelle Circonstance
                  </button>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1F3864] text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3">Nature</th>
                      <th className="p-3">Période (Début → Fin)</th>
                      <th className="p-3">Motif & Détails</th>
                      <th className="p-3">Maintien Salaire</th>
                      <th className="p-3">Statut Circonstance</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {circumstances.map((c) => (
                      <tr key={c.id || c.startDate} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-[#1F3864]">{c.nature}</td>
                        <td className="p-3 font-mono">
                          {c.startDate} {c.endDate ? `au ${c.endDate}` : '(indéfini)'}
                          {c.returnedEarlyDate && <span className="text-emerald-700 font-bold block text-[10px]">Retour anticipé le {c.returnedEarlyDate}</span>}
                        </td>
                        <td className="p-3">{c.reason}</td>
                        <td className="p-3 font-bold text-slate-700">{Math.round(c.paymentRate * 100)}%</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'EN_COURS' ? 'bg-blue-100 text-blue-900 border border-blue-300' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {c.status === 'EN_COURS' && !['RUPTURE_CONTRAT', 'LICENCIEMENT', 'FIN_CDD', 'DEMISSION', 'DECES'].includes(c.nature) && canEditEmployee && (
                            <button
                              onClick={() => {
                                setSelectedCircForEarlyReturn(c);
                                setIsEarlyReturnOpen(true);
                              }}
                              className="bg-amber-500 text-white font-bold px-2 py-1 rounded text-[10px] hover:bg-amber-600"
                            >
                              Retour Anticipé
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {circumstances.length === 0 && (
                      <tr><td colSpan={6} className="p-4 text-center italic text-slate-500">Aucune circonstance enregistrée. L'employé est en service actif normal.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 12: SOLDE DE TOUT COMPTE */}
          {activeTab === 'SOLDE_COMPTE' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-sm text-[#1F3864]">Décompte Final & Solde de Tout Compte (Code du Travail RDC)</h3>
                  <p className="text-slate-500">
                    Généré automatiquement lors de l'enregistrement d'une circonstance définitive (Rupture, Licenciement, Fin CDD, Démission).
                  </p>
                </div>
              </div>

              {soldeDeToutCompteList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
                  <p className="italic font-bold">Aucun décompte final généré pour cet employé.</p>
                  <p className="text-[11px]">Le solde de tout compte sera automatiquement établi dès qu'une fin de contrat sera enregistrée dans les circonstances.</p>
                </div>
              ) : (
                soldeDeToutCompteList.map((stc, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <span className="font-bold text-sm text-[#1F3864]">Solde de Tout Compte — {stc.terminationReason}</span>
                        <div className="text-[11px] text-slate-500 font-mono">Date d'effet: {stc.terminationDate} | Établi le: {stc.createdAt.split('T')[0]}</div>
                      </div>
                      <button
                        onClick={() => {
                          const win = window.open('', '_blank');
                          if (win) {
                            win.document.write(`
                              <html>
                                <head>
                                  <title>Solde de Tout Compte - ${stc.employeeName}</title>
                                  <style>
                                    body { font-family: sans-serif; padding: 25px; font-size: 12px; }
                                    .header { border-bottom: 2px solid #1F3864; padding-bottom: 10px; margin-bottom: 20px; }
                                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                                    th { background: #1F3864; color: white; }
                                    .total { font-size: 14px; font-weight: bold; background: #fef08a; }
                                  </style>
                                </head>
                                <body>
                                  <div class="header">
                                    <h2>REPUBLIQUE DEMOCRATIQUE DU CONGO</h2>
                                    <h3>KAZIPAY — RECU DE SOLDE DE TOUT COMPTE</h3>
                                    <p><strong>Salarié:</strong> ${stc.employeeName} (${stc.employeeMatricule}) | <strong>Motif:</strong> ${stc.terminationReason}</p>
                                    <p><strong>Ancienneté:</strong> ${stc.seniorityYears} an(s) | <strong>Date de fin:</strong> ${stc.terminationDate}</p>
                                  </div>
                                  <table>
                                    <thead><tr><th>Rubrique / Composante Légale RDC</th><th>Montant (CDF)</th></tr></thead>
                                    <tbody>
                                      <tr><td>Salaire au prorata des jours travaillés (${stc.daysWorkedInMonth} jours)</td><td>${stc.proratedSalaryCDF.toLocaleString()} FC</td></tr>
                                      <tr><td>Indemnité compensatrice de congé payé non pris (${stc.unusedLeaveDays} jours)</td><td>${stc.unusedLeaveIndemnityCDF.toLocaleString()} FC</td></tr>
                                      <tr><td>Indemnité de préavis de licenciement (${stc.noticePeriodDays} jours)</td><td>${stc.noticeIndemnityCDF.toLocaleString()} FC</td></tr>
                                      <tr><td>Indemnité de licenciement / Gratification de fin de contrat</td><td>${stc.severanceIndemnityCDF.toLocaleString()} FC</td></tr>
                                      <tr><td>Primes & Rappels dus</td><td>${stc.pendingPrimesCDF.toLocaleString()} FC</td></tr>
                                      <tr><td><strong>TOTAL BRUT DU SOLDE</strong></td><td><strong>${stc.totalGrossCDF.toLocaleString()} FC</strong></td></tr>
                                      <tr><td>Déduction : Solde restant des prêts / Avances</td><td>-${stc.remainingLoanBalanceCDF.toLocaleString()} FC</td></tr>
                                      <tr class="total"><td><strong>NET A PAYER EN DECOMPTE FINAL</strong></td><td style="color: green;"><strong>${stc.netPayableCDF.toLocaleString()} CDF ($${stc.netPayableUSD} USD)</strong></td></tr>
                                    </tbody>
                                  </table>
                                  <br/>
                                  <p><em>${stc.remarks}</em></p>
                                  <br/><br/>
                                  <p>Signature du Salarié pour Solde de Tout Compte : _______________________</p>
                                  <br/><button onclick="window.print()">Imprimer Reçu PDF</button>
                                </body>
                              </html>
                            `);
                          }
                        }}
                        className="bg-[#1F3864] text-white px-3 py-1.5 rounded-lg font-bold hover:bg-[#152747] text-xs flex items-center space-x-1"
                      >
                        <Download className="w-4 h-4" />
                        <span>Imprimer Reçu STC PDF</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-lg">
                        <span className="text-slate-500 block">Salaire Prorata:</span>
                        <strong className="text-slate-900 font-mono">{stc.proratedSalaryCDF.toLocaleString()} FC</strong>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg">
                        <span className="text-slate-500 block">Congés Payés Non Pris:</span>
                        <strong className="text-slate-900 font-mono">{stc.unusedLeaveIndemnityCDF.toLocaleString()} FC ({stc.unusedLeaveDays}j)</strong>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-lg">
                        <span className="text-slate-500 block">Indemnité Préavis:</span>
                        <strong className="text-slate-900 font-mono">{stc.noticeIndemnityCDF.toLocaleString()} FC ({stc.noticePeriodDays}j)</strong>
                      </div>
                      <div className="bg-[#1F3864]/10 p-2.5 rounded-lg border border-[#1F3864]/30">
                        <span className="text-[#1F3864] block font-bold">NET TOTAL À PAYER:</span>
                        <strong className="text-emerald-800 text-sm font-black font-mono">{stc.netPayableCDF.toLocaleString()} CDF (${stc.netPayableUSD})</strong>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 13: AUDIT LOGS */}
          {activeTab === 'AUDIT_LOGS' && (
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-[#1F3864]">Journal de Traçabilité 360° pour {employee.lastName} {employee.firstName}</h3>
              <p className="text-slate-500">Chaque modification (révision salariale, changement de poste, circonstance, photo) crée une entrée d'historique immuable avec diff (ancienne vs nouvelle valeur).</p>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1F3864] text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="p-3">Horodatage</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Auteur</th>
                      <th className="p-3">Détails & Modifications (Diff)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {auditLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-500 text-[10px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-700">{log.userEmail}</td>
                        <td className="p-3 space-y-1">
                          <div className="font-medium text-slate-900">{log.details}</div>
                          {(log.oldValue || log.newValue) && (
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-50 p-2 rounded border border-slate-200 mt-1">
                              {log.oldValue && (
                                <div>
                                  <span className="text-red-700 font-bold block">Ancienne Valeur:</span>
                                  <pre className="whitespace-pre-wrap text-slate-600 bg-red-50 p-1 rounded border border-red-100">{log.oldValue}</pre>
                                </div>
                              )}
                              {log.newValue && (
                                <div>
                                  <span className="text-emerald-700 font-bold block">Nouvelle Valeur:</span>
                                  <pre className="whitespace-pre-wrap text-slate-800 bg-emerald-50 p-1 rounded border border-emerald-100">{log.newValue}</pre>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr><td colSpan={4} className="p-4 text-center italic text-slate-500">Aucun historique enregistré.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="bg-[#1F3864] text-white font-bold px-6 py-2 rounded-xl text-xs hover:bg-[#152747]"
          >
            Fermer la Fiche 360°
          </button>
        </div>

      </div>

      {/* ================= CAMERA CAPTURE MODAL ================= */}
      {isCameraModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-[#1F3864] flex items-center space-x-2">
                <Camera className="w-5 h-5 text-amber-600" />
                <span>Prise de Photo de Profil via Caméra</span>
              </h3>
              <button onClick={() => { stopCameraStream(); setIsCameraModalOpen(false); }}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Camera Select Dropdown */}
            {cameraDevices.length > 1 && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Choisir la caméra :</label>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    startCameraStream(e.target.value);
                  }}
                  className="w-full text-xs p-2 border rounded-lg bg-slate-50"
                >
                  {cameraDevices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Caméra ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Video Live Preview or Canvas Snapshot */}
            <div className="relative bg-black rounded-xl overflow-hidden aspect-square flex items-center justify-center border-2 border-slate-200">
              {!capturedPhotoData ? (
                <>
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  {/* Square crop guideline */}
                  <div className="absolute inset-4 border-2 border-dashed border-amber-400 pointer-events-none rounded-xl"></div>
                </>
              ) : (
                <img src={capturedPhotoData} alt="Preview" className="w-full h-full object-cover" />
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex justify-between items-center pt-2">
              {!capturedPhotoData ? (
                <button
                  onClick={capturePhotoFromCamera}
                  className="w-full bg-[#1F3864] text-white font-bold py-2.5 rounded-xl text-xs hover:bg-[#152747] flex items-center justify-center space-x-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capturer la Photo</span>
                </button>
              ) : (
                <div className="flex space-x-2 w-full">
                  <button
                    onClick={() => { setCapturedPhotoData(null); startCameraStream(selectedDeviceId); }}
                    className="w-1/2 bg-slate-200 text-slate-800 font-bold py-2.5 rounded-xl text-xs hover:bg-slate-300"
                  >
                    Reprendre
                  </button>
                  <button
                    onClick={saveCapturedPhoto}
                    className="w-1/2 bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-emerald-700 flex items-center justify-center space-x-1"
                  >
                    <Check className="w-4 h-4" />
                    <span>Valider & Enregistrer</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= PHOTO HISTORY MODAL ================= */}
      {isPhotoHistoryOpen && employee.photoHistory && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-[#1F3864]">Historique des Photos de Profil</h3>
              <button onClick={() => setIsPhotoHistoryOpen(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {employee.photoHistory.map((rec, i) => (
                <div key={i} className="border rounded-xl p-2 bg-slate-50 text-[10px] space-y-1">
                  <img src={rec.url} alt={`Photo ${i}`} className="w-full aspect-square object-cover rounded-lg" />
                  <div className="font-bold text-slate-800">{new Date(rec.capturedAt).toLocaleDateString()}</div>
                  <div className="text-slate-500">Par: {rec.capturedBy} ({rec.method})</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= CIRCUMSTANCE FORM MODAL ================= */}
      {isCircumstanceFormOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-[#1F3864]">Enregistrer une Circonstance Datée</h3>
              <button onClick={() => setIsCircumstanceFormOpen(false)}>
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nature de la Circonstance :</label>
                <select
                  value={circNature}
                  onChange={(e) => {
                    const nat = e.target.value as CircumstanceNature;
                    setCircNature(nat);
                    if (nat === 'MALADIE') setCircPaymentRate(0.66); // 2/3 RDC
                    else if (['SUSPENSION', 'MISE_A_PIED'].includes(nat)) setCircPaymentRate(0.0);
                    else setCircPaymentRate(1.0);
                  }}
                  className="w-full p-2 border rounded-lg bg-slate-50 font-bold"
                >
                  <optgroup label="Circonstances Temporaires (Mise à jour automatique du statut)">
                    <option value="CONGE">Congé Annuel Payé</option>
                    <option value="MALADIE">Maladie / Maternité (Prise en charge RDC)</option>
                    <option value="SUSPENSION">Suspension Conservatoire (Non Payé)</option>
                    <option value="MISE_A_PIED">Mise à Pied Disciplinaire (Non Payé)</option>
                  </optgroup>
                  <optgroup label="Circonstances Définitives (Sortie d'effectif + Solde STC automatique)">
                    <option value="RUPTURE_CONTRAT">Rupture d'un commun accord</option>
                    <option value="LICENCIEMENT">Licenciement avec préavis</option>
                    <option value="FIN_CDD">Terme / Fin de CDD</option>
                    <option value="DEMISSION">Démission du Salarié</option>
                    <option value="DECES">Décès du Salarié</option>
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date de Début :</label>
                  <input
                    type="date"
                    value={circStartDate}
                    onChange={(e) => setCircStartDate(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-slate-50 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date de Fin (Si temporaire) :</label>
                  <input
                    type="date"
                    value={circEndDate}
                    onChange={(e) => setCircEndDate(e.target.value)}
                    className="w-full p-2 border rounded-lg bg-slate-50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Motif / Justificatif :</label>
                <textarea
                  value={circReason}
                  onChange={(e) => setCircReason(e.target.value)}
                  placeholder="Expliquez la circonstance (ex: Congé maladie accordé par le CMG)..."
                  className="w-full p-2 border rounded-lg bg-slate-50 h-20"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 stroke-[1.75]" />
                <div>
                  <strong>Impact Paie & Statut :</strong> Le statut de l'employé sera automatiquement mis à jour et ajusté au prorata des jours exacts de la période.
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button
                onClick={() => setIsCircumstanceFormOpen(false)}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg font-bold text-xs hover:bg-slate-300"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateCircumstance}
                className="px-4 py-2 bg-[#1F3864] text-white rounded-lg font-bold text-xs hover:bg-[#152747]"
              >
                Valider & Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EARLY RETURN MODAL ================= */}
      {isEarlyReturnOpen && selectedCircForEarlyReturn && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-[#1F3864]">Enregistrer un Retour Anticipé</h3>
            <p className="text-xs text-slate-600">
              L'employé reprend son activité avant la fin prévue ({selectedCircForEarlyReturn.endDate}). Son statut redeviendra immédiatement <strong>Actif</strong>.
            </p>

            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">Date effective de reprise :</label>
              <input
                type="date"
                value={earlyReturnDate}
                onChange={(e) => setEarlyReturnDate(e.target.value)}
                className="w-full p-2 border rounded-lg font-mono text-xs"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button onClick={() => setIsEarlyReturnOpen(false)} className="px-4 py-2 bg-slate-200 rounded-lg text-xs font-bold">Annuler</button>
              <button onClick={handleEarlyReturn} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold">Confirmer Reprise</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= REINTEGRATION MODAL ================= */}
      {isReintegrateModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-[#1F3864]">Réintégration de l'Employé dans les Effectifs</h3>
            <p className="text-xs text-slate-600">L'employé sera réactivé avec son statut Actif et réintégré dans le suivi de paie.</p>

            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">Motif de la réintégration :</label>
              <textarea
                value={reintegrateReason}
                onChange={(e) => setReintegrateReason(e.target.value)}
                placeholder="Ex: Réembauche suite à signature d'un nouveau contrat CDI..."
                className="w-full p-2 border rounded-lg text-xs h-20"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t">
              <button onClick={() => setIsReintegrateModalOpen(false)} className="px-4 py-2 bg-slate-200 rounded-lg text-xs font-bold">Annuler</button>
              <button onClick={handleReintegrate} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold">Confirmer Réintégration</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Attestation de Fin de Service */}
      <ServiceCertificateModal
        isOpen={isServiceCertOpen}
        onClose={() => setIsServiceCertOpen(false)}
        initialEmployeeId={employee.id}
      />
    </div>
  );
};
