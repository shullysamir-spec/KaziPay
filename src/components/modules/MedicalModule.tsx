/**
 * @license
 * KaziPay - ERP RH et Paie RDC
 * Module Suivi Médical & Génération de Bons de Soins (Code du Travail RDC Art. 177, 178)
 */

import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  Plus,
  FileText,
  Printer,
  Download,
  Search,
  CheckCircle2,
  Clock,
  UserCheck,
  Building2,
  AlertCircle,
  Shield,
  Filter,
  Eye,
  Stethoscope,
  Calendar,
  Sparkles,
  Activity,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { getCompanyConfig, CompanyConfig } from '../../services/companyService';
import { logAuditEvent } from '../../services/auditService';

export interface Beneficiary {
  name: string;
  relationship: 'EMPLOYEE' | 'SPOUSE' | 'CHILD';
  birthDate?: string;
}

export interface MedicalVoucher {
  id: string; // e.g. BON-MED-2026-001
  employeeMatricule: string;
  employeeName: string;
  department: string;
  beneficiaryName: string;
  beneficiaryType: 'Salarié Titulaire' | 'Conjoint(e)' | 'Enfant à Charge';
  medicalCenterName: string; // e.g. HJ Hospitals, Hôpital du Cinquantenaire, Centre Médical de la Gombe, Monkole
  careCategory: 'Consultation Générale' | 'Spécialiste' | 'Hospitalisation' | 'Laboratoire & Biologie' | 'Pharmacie' | 'Maternité';
  issueDate: string;
  expiryDate: string;
  coverageRate: number; // e.g. 100 or 80
  reasonNotes: string;
  status: 'ISSUED' | 'USED' | 'EXPIRED' | 'CANCELLED';
  issuedBy: string;
}

export interface MedicalRecord {
  employeeMatricule: string;
  employeeName: string;
  department: string;
  bloodGroup: string;
  allergies: string;
  lastMedicalCheckup: string;
  nextMedicalCheckup: string;
  fitnessStatus: 'APT_TOTAL' | 'APT_AVEC_RESERVE' | 'INAPT_TEMPORAIRE';
  primaryClinic: string;
  dependents: Beneficiary[];
}

export interface HospitalReport {
  id: string; // e.g. REP-MED-2026-001
  voucherId?: string; // e.g. BON-MED-2026-001
  employeeMatricule: string;
  employeeName: string;
  department: string;
  hospitalName: string;
  doctorName: string;
  reportDate: string;
  consultationType: string;
  clinicalDiagnosis: string;
  restDaysGranted: number; // Repos médical accordé
  fitnessStatus: 'APT_TOTAL' | 'APT_AVEC_RESERVE' | 'INAPT_TEMPORAIRE';
  hospitalCostCDF: number;
  status: 'VALIDATED' | 'FOLLOW_UP_REQUIRED' | 'CLOSED';
  notes?: string;
}

export const MedicalModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'VOUCHERS' | 'RECORDS' | 'CLINICS' | 'HOSPITAL_REPORTS'>('VOUCHERS');
  const [company, setCompany] = useState<CompanyConfig>(getCompanyConfig());

  // Sample Vouchers Data
  const [vouchers, setVouchers] = useState<MedicalVoucher[]>([
    {
      id: 'BON-MED-2026-001',
      employeeMatricule: 'KP-2026-089',
      employeeName: 'KASONGO Patrick',
      department: 'Exploitation',
      beneficiaryName: 'KASONGO Patrick',
      beneficiaryType: 'Salarié Titulaire',
      medicalCenterName: 'HJ Hospitals Kinshasa',
      careCategory: 'Consultation Générale',
      issueDate: '2026-07-20',
      expiryDate: '2026-08-05',
      coverageRate: 100,
      reasonNotes: 'Syndrome fébril & examen bilanciel annuel.',
      status: 'ISSUED',
      issuedBy: 'M. MUKENDI Jean-Luc (DRH)',
    },
    {
      id: 'BON-MED-2026-002',
      employeeMatricule: 'KP-2026-042',
      employeeName: 'ILUNGA Samuel',
      department: 'Logistique',
      beneficiaryName: 'ILUNGA Marie-Louise',
      beneficiaryType: 'Conjoint(e)',
      medicalCenterName: 'Centre Médical de la Gombe',
      careCategory: 'Maternité',
      issueDate: '2026-07-15',
      expiryDate: '2026-07-30',
      coverageRate: 80,
      reasonNotes: 'Consultation prénatale de routine.',
      status: 'USED',
      issuedBy: 'M. MUKENDI Jean-Luc (DRH)',
    },
  ]);

  // Sample Records Data
  const [records] = useState<MedicalRecord[]>([
    {
      employeeMatricule: 'KP-2026-089',
      employeeName: 'KASONGO Patrick',
      department: 'Exploitation',
      bloodGroup: 'O+',
      allergies: 'Pénicilline',
      lastMedicalCheckup: '2026-01-15',
      nextMedicalCheckup: '2027-01-15',
      fitnessStatus: 'APT_TOTAL',
      primaryClinic: 'HJ Hospitals Kinshasa',
      dependents: [
        { name: 'KASONGO Patrick', relationship: 'EMPLOYEE' },
        { name: 'KASONGO Mireille', relationship: 'SPOUSE' },
        { name: 'KASONGO David', relationship: 'CHILD', birthDate: '2018-05-12' },
      ],
    },
    {
      employeeMatricule: 'KP-2026-042',
      employeeName: 'ILUNGA Samuel',
      department: 'Logistique',
      bloodGroup: 'A+',
      allergies: 'Aucune connue',
      lastMedicalCheckup: '2026-03-10',
      nextMedicalCheckup: '2027-03-10',
      fitnessStatus: 'APT_TOTAL',
      primaryClinic: 'Centre Médical de la Gombe',
      dependents: [
        { name: 'ILUNGA Samuel', relationship: 'EMPLOYEE' },
        { name: 'ILUNGA Marie-Louise', relationship: 'SPOUSE' },
      ],
    },
  ]);

  // Sample Hospital Reports Data
  const [hospitalReports, setHospitalReports] = useState<HospitalReport[]>([
    {
      id: 'REP-MED-2026-001',
      voucherId: 'BON-MED-2026-001',
      employeeMatricule: 'KP-2026-089',
      employeeName: 'KASONGO Patrick',
      department: 'Exploitation',
      hospitalName: 'HJ Hospitals Kinshasa',
      doctorName: 'Dr. MBUYI Tshilombo (Médecin Généraliste)',
      reportDate: '2026-07-22',
      consultationType: 'Examen de Routine & Biologie',
      clinicalDiagnosis: 'Paludisme simple à P. falciparum léger + surmenage physique.',
      restDaysGranted: 3,
      fitnessStatus: 'APT_AVEC_RESERVE',
      hospitalCostCDF: 145000,
      status: 'VALIDATED',
      notes: 'Repos prescrit du 22 au 25 juillet. Traitement antipaludique administré.',
    },
    {
      id: 'REP-MED-2026-002',
      voucherId: 'BON-MED-2026-002',
      employeeMatricule: 'KP-2026-042',
      employeeName: 'ILUNGA Samuel',
      department: 'Logistique',
      hospitalName: 'Centre Médical de la Gombe',
      doctorName: 'Dr. KAPINGA Grâce (Gynécologue)',
      reportDate: '2026-07-18',
      consultationType: 'Consultation Prénatale Ayant Droit',
      clinicalDiagnosis: 'Bilan prénatal du 2ème trimestre normal.',
      restDaysGranted: 0,
      fitnessStatus: 'APT_TOTAL',
      hospitalCostCDF: 85000,
      status: 'CLOSED',
      notes: 'Prise en charge à 80% accordée selon la convention entreprise.',
    },
  ]);

  const [selectedVoucher, setSelectedVoucher] = useState<MedicalVoucher | null>(vouchers[0]);
  const [selectedReport, setSelectedReport] = useState<HospitalReport | null>(hospitalReports[0]);
  const [isNewVoucherModalOpen, setIsNewVoucherModalOpen] = useState(false);
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State for new Hospital Report
  const [newReportForm, setNewReportForm] = useState<Partial<HospitalReport>>({
    voucherId: 'BON-MED-2026-001',
    employeeMatricule: 'KP-2026-089',
    employeeName: 'KASONGO Patrick',
    department: 'Exploitation',
    hospitalName: 'HJ Hospitals Kinshasa',
    doctorName: 'Dr. KALALA Paul',
    consultationType: 'Consultation Spécialisée',
    clinicalDiagnosis: '',
    restDaysGranted: 0,
    fitnessStatus: 'APT_TOTAL',
    hospitalCostCDF: 120000,
    notes: '',
  });

  // Form State for new Voucher
  const [newVoucherForm, setNewVoucherForm] = useState<Partial<MedicalVoucher>>({
    employeeMatricule: 'KP-2026-089',
    employeeName: 'KASONGO Patrick',
    department: 'Exploitation',
    beneficiaryName: 'KASONGO Patrick',
    beneficiaryType: 'Salarié Titulaire',
    medicalCenterName: 'HJ Hospitals Kinshasa',
    careCategory: 'Consultation Générale',
    coverageRate: 100,
    reasonNotes: '',
  });

  useEffect(() => {
    setCompany(getCompanyConfig());
  }, []);

  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoucherForm.employeeName || !newVoucherForm.medicalCenterName) return;

    const today = new Date().toISOString().split('T')[0];
    const exp = new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0];

    const v: MedicalVoucher = {
      id: `BON-MED-2026-00${vouchers.length + 1}`,
      employeeMatricule: newVoucherForm.employeeMatricule || 'KP-2026-100',
      employeeName: newVoucherForm.employeeName,
      department: newVoucherForm.department || 'Général',
      beneficiaryName: newVoucherForm.beneficiaryName || newVoucherForm.employeeName,
      beneficiaryType: newVoucherForm.beneficiaryType || 'Salarié Titulaire',
      medicalCenterName: newVoucherForm.medicalCenterName,
      careCategory: newVoucherForm.careCategory || 'Consultation Générale',
      issueDate: today,
      expiryDate: exp,
      coverageRate: newVoucherForm.coverageRate || 100,
      reasonNotes: newVoucherForm.reasonNotes || 'Prise en charge médicale entreprise.',
      status: 'ISSUED',
      issuedBy: company.signerName + ' (' + company.signerTitle + ')',
    };

    setVouchers([v, ...vouchers]);
    setSelectedVoucher(v);
    setIsNewVoucherModalOpen(false);

    logAuditEvent(
      'CREATE_VOUCHER',
      'MEDICAL',
      `Émission du bon de soins ${v.id} pour ${v.beneficiaryName} au centre ${v.medicalCenterName}`,
      'rh@kazipay.cd',
      'RESPONSABLE_RH',
      v.id
    );
  };

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportForm.employeeName || !newReportForm.hospitalName) return;

    const today = new Date().toISOString().split('T')[0];

    const rep: HospitalReport = {
      id: `REP-MED-2026-00${hospitalReports.length + 1}`,
      voucherId: newReportForm.voucherId || `BON-MED-2026-001`,
      employeeMatricule: newReportForm.employeeMatricule || 'KP-2026-089',
      employeeName: newReportForm.employeeName,
      department: newReportForm.department || 'Exploitation',
      hospitalName: newReportForm.hospitalName,
      doctorName: newReportForm.doctorName || 'Dr. Non Spécifié',
      reportDate: today,
      consultationType: newReportForm.consultationType || 'Consultation Spécialisée',
      clinicalDiagnosis: newReportForm.clinicalDiagnosis || 'Bilan hospitalier conforme.',
      restDaysGranted: Number(newReportForm.restDaysGranted) || 0,
      fitnessStatus: newReportForm.fitnessStatus || 'APT_TOTAL',
      hospitalCostCDF: Number(newReportForm.hospitalCostCDF) || 0,
      status: 'VALIDATED',
      notes: newReportForm.notes || '',
    };

    setHospitalReports([rep, ...hospitalReports]);
    setSelectedReport(rep);
    setIsNewReportModalOpen(false);

    logAuditEvent(
      'CREATE_HOSPITAL_REPORT',
      'MEDICAL',
      `Enregistrement du rapport médical hôpital ${rep.id} pour ${rep.employeeName} (${rep.hospitalName})`,
      'rh@kazipay.cd',
      'RESPONSABLE_RH',
      rep.id
    );
  };

  const exportReportPDF = () => {
    if (!selectedReport) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // Header Company Box
    doc.setFillColor(31, 56, 100);
    doc.rect(15, 12, 180, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(company.name.toUpperCase(), 20, 22);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`RCCM : ${company.rccm} | ID.NAT : ${company.idNat} | NIF : ${company.nif}`, 20, 28);
    doc.text(`RAPPORT DE SUIVI MÉDICAL HOSPITALIER (RDC)`, 20, 33);

    // Title Report Box
    doc.setFillColor(243, 244, 246);
    doc.rect(15, 42, 180, 18, 'F');
    doc.setDrawColor(31, 56, 100);
    doc.rect(15, 42, 180, 18, 'D');

    doc.setTextColor(31, 56, 100);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`RAPPORT DE CONSULTATION HÔPITAL : ${selectedReport.id}`, 20, 52);
    doc.setFontSize(9);
    doc.text(`DATE HÔPITAL : ${selectedReport.reportDate}`, 130, 52);

    let y = 68;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('I. IDENTIFICATION PATIENT & ÉTABLISSEMENT', 15, y);

    doc.setLineWidth(0.3);
    doc.line(15, y + 2, 195, y + 2);

    y += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Employé :', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${selectedReport.employeeName} (${selectedReport.employeeMatricule} — ${selectedReport.department})`, 50, y);

    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Établissement :', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedReport.hospitalName, 50, y);

    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Médecin Traitant :', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedReport.doctorName, 50, y);

    y += 12;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('II. DIAGNOSTIC CLINIQUE & RECOMMANDATIONS', 15, y);
    doc.line(15, y + 2, 195, y + 2);

    y += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Diagnostic :', 20, y);
    doc.setFont('helvetica', 'normal');
    const diagLines = doc.splitTextToSize(selectedReport.clinicalDiagnosis, 130);
    doc.text(diagLines, 50, y);

    y += diagLines.length * 6 + 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Repos Prescrit :', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${selectedReport.restDaysGranted} jour(s) de repos médical accordé(s)`, 50, y);

    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Aptitude Travail :', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedReport.fitnessStatus, 50, y);

    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Montant Facture :', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${selectedReport.hospitalCostCDF.toLocaleString()} CDF`, 50, y);

    doc.save(`Rapport_Hospitalier_${selectedReport.id}.pdf`);
  };

  const handleDirectPrint = () => {
    window.print();
  };

  const exportVoucherPDF = () => {
    if (!selectedVoucher) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pColor = company.primaryColor || '#1F3864';

    // Header Company Box
    doc.setFillColor(31, 56, 100);
    doc.rect(15, 12, 180, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(company.name.toUpperCase(), 20, 22);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`RCCM : ${company.rccm} | ID.NAT : ${company.idNat} | NIF : ${company.nif}`, 20, 28);
    doc.text(`SERVICE DE SANTÉ & PRÉVENTION MÉDICALE AU TRAVAIL (CODE RDC ART. 177)`, 20, 33);

    // Title Voucher Box
    doc.setFillColor(243, 244, 246);
    doc.rect(15, 42, 180, 18, 'F');
    doc.setDrawColor(31, 56, 100);
    doc.rect(15, 42, 180, 18, 'D');

    doc.setTextColor(31, 56, 100);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(`BON DE SOINS MÉDICAUX N° : ${selectedVoucher.id}`, 20, 52);

    doc.setFontSize(9);
    doc.text(`DATE D'ÉMISSION : ${selectedVoucher.issueDate}  |  VALABLE JUSQU'AU : ${selectedVoucher.expiryDate}`, 110, 52);

    // Grid Info
    let y = 68;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('I. INFORMATIONS SUR LE BÉNÉFICIAIRE & SALARIÉ', 15, y);

    doc.setLineWidth(0.3);
    doc.line(15, y + 2, 195, y + 2);

    y += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Employé Titulaire :', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${selectedVoucher.employeeName} (Matricule: ${selectedVoucher.employeeMatricule})`, 60, y);

    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Département :', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedVoucher.department, 60, y);

    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Bénéficiaire Effectif :', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${selectedVoucher.beneficiaryName} (${selectedVoucher.beneficiaryType})`, 60, y);

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.text('II. ÉTABLISSEMENT DE SANTÉ & PRESTATIONS', 15, y);
    doc.line(15, y + 2, 195, y + 2);

    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Centre / Hôpital Agréé :', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedVoucher.medicalCenterName, 65, y);

    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Catégorie de Soins :', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedVoucher.careCategory, 65, y);

    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Taux de Prise en Charge :', 20, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(`${selectedVoucher.coverageRate}% PAR L'ENTREPRISE`, 65, y);

    y += 6;
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('Motif / Observations :', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedVoucher.reasonNotes || 'Soin médical sous convention.', 65, y);

    // Official Stamp and Signature Box
    y += 20;
    doc.setFillColor(248, 250, 252);
    doc.rect(15, y, 85, 40, 'F');
    doc.rect(15, y, 85, 40, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('POUR LE SERVICE RH / MÉDICAL', 20, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.text(company.signerName, 20, y + 16);
    doc.text(company.signerTitle, 20, y + 22);

    doc.setFillColor(236, 253, 245);
    doc.rect(110, y, 85, 40, 'F');
    doc.setDrawColor(16, 185, 129);
    doc.rect(110, y, 85, 40, 'D');

    doc.setTextColor(5, 150, 105);
    doc.setFont('helvetica', 'bold');
    doc.text('VISAT & CACHET DU CENTRE MÉDICAL', 115, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Date de Réception : ..... / ..... / 2026', 115, y + 18);
    doc.text('Signature du Médecin Traitant :', 115, y + 26);

    doc.save(`Bon_Soins_${selectedVoucher.id}_${selectedVoucher.beneficiaryName.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Printable Area Target CSS for Window Print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-voucher, #printable-voucher *, #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-voucher, #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      {/* Top Banner Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-[#1F3864]">Suivi Médical & Bons de Soins (RDC Art. 177)</h1>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded font-mono">
              SANTÉ AU TRAVAIL
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Génération instantanée de bons de prise en charge médicale, visites médicales périodiques & ayants droit.
          </p>
        </div>

        <button
          onClick={() => setIsNewVoucherModalOpen(true)}
          className="bg-[#1F3864] hover:bg-[#152747] text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow transition"
        >
          <Plus className="w-4 h-4 text-[#BF9000]" />
          <span>Nouveau Bon de Soins</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('VOUCHERS')}
          className={`pb-3 px-4 border-b-2 flex items-center space-x-2 transition ${
            activeTab === 'VOUCHERS'
              ? 'border-[#1F3864] text-[#1F3864]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Bons de Soins Médicaux Émis ({vouchers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('RECORDS')}
          className={`pb-3 px-4 border-b-2 flex items-center space-x-2 transition ${
            activeTab === 'RECORDS'
              ? 'border-[#1F3864] text-[#1F3864]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Stethoscope className="w-4 h-4 text-emerald-600" />
          <span>Fiches Médicales & Ayants Droit</span>
        </button>

        <button
          onClick={() => setActiveTab('CLINICS')}
          className={`pb-3 px-4 border-b-2 flex items-center space-x-2 transition ${
            activeTab === 'CLINICS'
              ? 'border-[#1F3864] text-[#1F3864]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>Centres Médicaux & Hôpitaux Agréés (RDC)</span>
        </button>

        <button
          onClick={() => setActiveTab('HOSPITAL_REPORTS')}
          className={`pb-3 px-4 border-b-2 flex items-center space-x-2 transition ${
            activeTab === 'HOSPITAL_REPORTS'
              ? 'border-[#1F3864] text-[#1F3864]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4 text-rose-600" />
          <span>Rapports Hôpitaux ({hospitalReports.length})</span>
        </button>
      </div>

      {/* TAB 1: VOUCHERS LIST & PREVIEW */}
      {activeTab === 'VOUCHERS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vouchers List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par bon, employé..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border rounded-xl text-xs"
              />
            </div>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {vouchers
                .filter(
                  (v) =>
                    v.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    v.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    v.medicalCenterName.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVoucher(v)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition space-y-1 ${
                      selectedVoucher?.id === v.id
                        ? 'bg-[#1F3864] text-white border-[#1F3864] shadow-md'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] opacity-80">{v.id}</span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                          v.status === 'ISSUED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-slate-500/20 text-slate-300'
                        }`}
                      >
                        {v.status === 'ISSUED' ? 'Valide' : 'Utilisé'}
                      </span>
                    </div>
                    <div className="font-bold text-sm">{v.beneficiaryName}</div>
                    <div className="text-[11px] opacity-80">
                      {v.medicalCenterName} • {v.careCategory}
                    </div>
                    <div className="text-[10px] opacity-60 font-mono pt-1">Émis le: {v.issueDate}</div>
                  </div>
                ))}
            </div>
          </div>

          {/* Voucher Document Printable Preview */}
          <div className="lg:col-span-2">
            {selectedVoucher ? (
              <div className="bg-white rounded-2xl border border-slate-300 shadow-xl p-6 space-y-6">
                {/* Actions Header */}
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h2 className="font-black text-sm text-[#1F3864]">Aperçu Bon de Soins Officiel</h2>
                    <p className="text-xs text-slate-500">Prise en charge médicale entreprise KaziPay RDC</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleDirectPrint}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 shadow"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#BF9000]" />
                      <span>Imprimer Bon</span>
                    </button>

                    <button
                      onClick={exportVoucherPDF}
                      className="bg-[#1F3864] hover:bg-[#152747] text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 shadow"
                    >
                      <Download className="w-3.5 h-3.5 text-[#BF9000]" />
                      <span>Télécharger PDF</span>
                    </button>
                  </div>
                </div>

                {/* Printable Official Voucher Template */}
                <div
                  id="printable-voucher"
                  className="p-6 border-2 border-slate-800 rounded-xl bg-white text-slate-900 space-y-6 font-sans"
                >
                  {/* Top Company Header */}
                  <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
                    <div className="flex items-center space-x-3">
                      {company.logoUrl ? (
                        <img src={company.logoUrl} alt="Company Logo" className="h-10 w-auto object-contain" />
                      ) : (
                        <div className="w-9 h-9 bg-[#1F3864] text-white rounded font-black flex items-center justify-center font-sans text-xs">
                          KP
                        </div>
                      )}
                      <div>
                        <div className="text-xl font-black text-[#1F3864] uppercase tracking-tight">
                          {company.name}
                        </div>
                        <div className="text-xs font-bold text-slate-700">{company.address} — {company.cityProvince}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          RCCM : {company.rccm} | ID.NAT : {company.idNat} | NIF : {company.nif}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-[#1F3864] text-white font-black text-xs px-3 py-1.5 rounded uppercase">
                        BON DE SOINS MÉDICAUX
                      </div>
                      <div className="text-xs font-mono font-bold text-[#1F3864] mt-1">{selectedVoucher.id}</div>
                    </div>
                  </div>

                  {/* Dates & Validity */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border text-xs">
                    <div>
                      <span className="font-bold text-slate-500 block">Date d'Émission :</span>
                      <span className="font-mono font-bold text-slate-800">{selectedVoucher.issueDate}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block">Date Limite de Validité :</span>
                      <span className="font-mono font-bold text-red-700">{selectedVoucher.expiryDate}</span>
                    </div>
                  </div>

                  {/* Beneficiary Details */}
                  <div className="space-y-2 text-xs">
                    <h3 className="font-black text-sm text-[#1F3864] uppercase tracking-wider border-b pb-1">
                      1. IDENTIFICATION DU BÉNÉFICIAIRE
                    </h3>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-slate-500">Employé Titulaire :</span>
                        <div className="font-bold text-sm text-slate-900">{selectedVoucher.employeeName}</div>
                        <div className="text-[11px] text-slate-600 font-mono">Matricule: {selectedVoucher.employeeMatricule}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Bénéficiaire du Soin :</span>
                        <div className="font-bold text-sm text-slate-900">{selectedVoucher.beneficiaryName}</div>
                        <div className="text-[11px] text-slate-600 font-bold">{selectedVoucher.beneficiaryType}</div>
                      </div>
                    </div>
                  </div>

                  {/* Clinic & Care Details */}
                  <div className="space-y-2 text-xs">
                    <h3 className="font-black text-sm text-[#1F3864] uppercase tracking-wider border-b pb-1">
                      2. ÉTABLISSEMENT MÉDICAL & PRESTATIONS
                    </h3>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-slate-500">Centre / Hôpital Agréé :</span>
                        <div className="font-bold text-slate-900 text-sm">{selectedVoucher.medicalCenterName}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Nature des Soins :</span>
                        <div className="font-bold text-slate-900 text-sm">{selectedVoucher.careCategory}</div>
                      </div>
                    </div>

                    <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                      <span className="font-bold text-emerald-900 text-xs">Taux de Prise en Charge Entreprise :</span>
                      <span className="text-base font-black text-emerald-700">{selectedVoucher.coverageRate}%</span>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-6 pt-6 border-t-2 border-slate-800 text-xs">
                    <div className="p-3 border rounded-lg bg-slate-50 space-y-2">
                      <span className="font-bold text-slate-800 block text-[11px] uppercase">Visa Direction RH / Médical</span>
                      <div className="font-semibold text-slate-700">{company.signerName}</div>
                      <div className="text-[10px] text-slate-500">{company.signerTitle}</div>
                      <div className="h-8 border-b border-dashed"></div>
                    </div>

                    <div className="p-3 border rounded-lg bg-slate-50 space-y-2">
                      <span className="font-bold text-slate-800 block text-[11px] uppercase">
                        Visat & Cachet du Centre Médical
                      </span>
                      <div className="text-[10px] text-slate-500">Sceau de l'Hôpital & Signature Médecin</div>
                      <div className="h-8 border-b border-dashed"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 border text-center text-slate-400 text-xs">
                Sélectionnez un bon de soins pour afficher et imprimer.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MEDICAL RECORDS */}
      {activeTab === 'RECORDS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="font-black text-sm text-[#1F3864]">Fiches Médicales des Salariés & Couverture Ayants Droit</h2>
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 font-bold border-b text-slate-700">
                <tr>
                  <th className="p-3">Employé</th>
                  <th className="p-3">Groupe Sanguin</th>
                  <th className="p-3">Allergies / Remarques</th>
                  <th className="p-3">Dernière Visite</th>
                  <th className="p-3">Prochaine Visite</th>
                  <th className="p-3">Aptitude Travail</th>
                  <th className="p-3">Ayants Droit Couverts</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-800">
                {records.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-bold">
                      {r.employeeName}
                      <div className="text-[10px] font-mono text-slate-500">{r.employeeMatricule}</div>
                    </td>
                    <td className="p-3 font-bold text-red-600">{r.bloodGroup}</td>
                    <td className="p-3">{r.allergies}</td>
                    <td className="p-3 font-mono">{r.lastMedicalCheckup}</td>
                    <td className="p-3 font-mono">{r.nextMedicalCheckup}</td>
                    <td className="p-3">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                        Aptitude Totale
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="space-y-0.5">
                        {r.dependents.map((dep, dIdx) => (
                          <div key={dIdx} className="text-[11px] font-medium text-slate-700">
                            • {dep.name} ({dep.relationship === 'SPOUSE' ? 'Conjoint(e)' : dep.relationship === 'CHILD' ? 'Enfant' : 'Salarié'})
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CLINICS */}
      {activeTab === 'CLINICS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'HJ Hospitals Kinshasa', city: 'Kinshasa / Limete', phone: '+243 818 000 000', rate: '100% ou 80%' },
            { name: 'Centre Médical de la Gombe (CMG)', city: 'Kinshasa / Gombe', phone: '+243 890 000 000', rate: '100%' },
            { name: 'Hôpital du Cinquantenaire', city: 'Kinshasa / Lingwala', phone: '+243 811 111 222', rate: '80%' },
            { name: 'Centre Hospitalier Monkole', city: 'Kinshasa / Mont-Ngafula', phone: '+243 999 888 777', rate: '100%' },
            { name: 'Polyclinique Don Bosco', city: 'Lubumbashi / Haut-Katanga', phone: '+243 850 123 456', rate: '100%' },
            { name: 'Cliniques Universitaires de Kinshasa', city: 'Kinshasa / Lemba', phone: '+243 812 345 678', rate: '100%' },
          ].map((c, i) => (
            <div key={i} className="p-4 bg-white border rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center space-x-2 text-[#1F3864]">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm">{c.name}</h3>
              </div>
              <p className="text-xs text-slate-500">{c.city}</p>
              <div className="text-xs font-mono font-bold text-slate-700">{c.phone}</div>
              <div className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded w-max">
                Prise en charge: {c.rate}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: HOSPITAL REPORTS & MEDICAL FOLLOW-UP */}
      {activeTab === 'HOSPITAL_REPORTS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reports List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="font-black text-xs text-[#1F3864] uppercase tracking-wider">
                Rapports d'Hôpitaux Enregistrés
              </h2>
              <button
                onClick={() => setIsNewReportModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nouveau Rapport</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {hospitalReports.map((rep) => (
                <div
                  key={rep.id}
                  onClick={() => setSelectedReport(rep)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition space-y-1 ${
                    selectedReport?.id === rep.id
                      ? 'bg-[#1F3864] text-white border-[#1F3864] shadow-md'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] opacity-80">{rep.id}</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        rep.fitnessStatus === 'APT_TOTAL'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {rep.fitnessStatus === 'APT_TOTAL' ? 'Aptitude Totale' : 'Aptitude Réserve / Rest'}
                    </span>
                  </div>

                  <div className="font-bold text-sm">{rep.employeeName}</div>
                  <div className="text-[11px] opacity-80">{rep.hospitalName}</div>
                  <div className="text-[10px] opacity-60 font-mono">Date Hôpital: {rep.reportDate}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Detailed Report Card & Direct Print */}
          <div className="lg:col-span-2">
            {selectedReport ? (
              <div className="bg-white rounded-2xl border border-slate-300 shadow-xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h2 className="font-black text-[#1F3864] text-sm">Fiche Médicale Hospitalière & Suivi Diagnostic</h2>
                    <p className="text-xs text-slate-500">Rapport émis par le Centre Médical Agréé</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleDirectPrint}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 shadow"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#BF9000]" />
                      <span>Imprimer Direct</span>
                    </button>
                    <button
                      onClick={exportReportPDF}
                      className="bg-[#1F3864] hover:bg-[#152747] text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 shadow"
                    >
                      <Download className="w-3.5 h-3.5 text-[#BF9000]" />
                      <span>Télécharger PDF</span>
                    </button>
                  </div>
                </div>

                {/* Printable Official Report Template */}
                <div
                  id="printable-report"
                  className="p-6 border-2 border-slate-800 rounded-xl bg-white text-slate-900 space-y-6 font-sans"
                >
                  {/* Top Company Header */}
                  <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
                    <div className="flex items-center space-x-3">
                      {company.logoUrl ? (
                        <img src={company.logoUrl} alt="Company Logo" className="h-10 w-auto object-contain" />
                      ) : (
                        <div className="w-9 h-9 bg-[#1F3864] text-white rounded font-black flex items-center justify-center font-sans text-xs">
                          KP
                        </div>
                      )}
                      <div>
                        <div className="text-xl font-black text-[#1F3864] uppercase tracking-tight">
                          {company.name}
                        </div>
                        <div className="text-xs font-bold text-slate-700">{company.address} — {company.cityProvince}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          RCCM : {company.rccm} | ID.NAT : {company.idNat} | NIF : {company.nif}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-[#1F3864] text-white font-black text-xs px-3 py-1.5 rounded uppercase">
                        RAPPORT MÉDICAL HÔPITAL
                      </div>
                      <div className="text-xs font-mono font-bold text-[#1F3864] mt-1">{selectedReport.id}</div>
                    </div>
                  </div>

                  {/* Patient & Clinic Banner */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border text-xs">
                    <div>
                      <span className="font-bold text-slate-500 block uppercase">Patient Employé :</span>
                      <div className="font-black text-sm text-[#1F3864]">{selectedReport.employeeName}</div>
                      <div className="text-slate-600 font-mono">Matricule : {selectedReport.employeeMatricule}</div>
                      <div className="text-slate-600">Département : {selectedReport.department}</div>
                    </div>

                    <div>
                      <span className="font-bold text-slate-500 block uppercase">Centre Médical Traitant :</span>
                      <div className="font-black text-sm text-[#1F3864]">{selectedReport.hospitalName}</div>
                      <div className="text-slate-700 font-bold">{selectedReport.doctorName}</div>
                      <div className="text-slate-600 font-mono">Date Consultation : {selectedReport.reportDate}</div>
                    </div>
                  </div>

                  {/* Medical Assessment Details */}
                  <div className="space-y-4 text-xs">
                    <div className="border-b pb-2">
                      <h3 className="font-black text-xs text-[#1F3864] uppercase">Diagnostic Clinique & Rapport Médical</h3>
                      <p className="p-3 bg-slate-50 border rounded-lg mt-2 text-slate-800 font-medium leading-relaxed">
                        {selectedReport.clinicalDiagnosis}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                        <span className="font-bold text-rose-900 block text-[11px]">Repos Médical Prescrit :</span>
                        <div className="text-lg font-black text-rose-700 mt-1">
                          {selectedReport.restDaysGranted} Jour(s)
                        </div>
                        <div className="text-[10px] text-rose-800">Dispense temporaire de prestation selon certificat</div>
                      </div>

                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <span className="font-bold text-emerald-900 block text-[11px]">Facturation Hospitalière :</span>
                        <div className="text-lg font-black text-emerald-700 mt-1">
                          {selectedReport.hospitalCostCDF.toLocaleString()} CDF
                        </div>
                        <div className="text-[10px] text-emerald-800">Facture transmise au service RH/Finance</div>
                      </div>
                    </div>

                    {selectedReport.notes && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-slate-800">
                        <span className="font-bold text-amber-900 block text-[11px]">Remarques de Suivi RH :</span>
                        <div className="text-xs mt-0.5">{selectedReport.notes}</div>
                      </div>
                    )}
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-6 pt-6 border-t-2 border-slate-800 text-xs">
                    <div className="p-3 border rounded-lg bg-slate-50 space-y-2">
                      <span className="font-bold text-slate-800 block text-[11px] uppercase">Service Médecine du Travail RH</span>
                      <div className="font-semibold text-slate-700">{company.signerName}</div>
                      <div className="text-[10px] text-slate-500">{company.signerTitle}</div>
                      <div className="h-8 border-b border-dashed"></div>
                    </div>

                    <div className="p-3 border rounded-lg bg-slate-50 space-y-2">
                      <span className="font-bold text-slate-800 block text-[11px] uppercase">
                        Sceau & Signature Médecin Traitant
                      </span>
                      <div className="text-[10px] text-slate-500">{selectedReport.doctorName}</div>
                      <div className="h-8 border-b border-dashed"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 border text-center text-slate-400 text-xs">
                Sélectionnez un rapport d'hôpital pour afficher les détails.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL NEW VOUCHER */}
      {isNewVoucherModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-[#1F3864]">Émettre un Bon de Soins Médicaux</h2>
            <form onSubmit={handleCreateVoucher} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Employé Titulaire *</label>
                <input
                  type="text"
                  required
                  value={newVoucherForm.employeeName}
                  onChange={(e) => setNewVoucherForm({ ...newVoucherForm, employeeName: e.target.value })}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Nom du Bénéficiaire *</label>
                  <input
                    type="text"
                    required
                    value={newVoucherForm.beneficiaryName}
                    onChange={(e) => setNewVoucherForm({ ...newVoucherForm, beneficiaryName: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Lien de Parenté *</label>
                  <select
                    value={newVoucherForm.beneficiaryType}
                    onChange={(e) => setNewVoucherForm({ ...newVoucherForm, beneficiaryType: e.target.value as any })}
                    className="w-full p-2 border rounded font-bold"
                  >
                    <option value="Salarié Titulaire">Salarié Titulaire</option>
                    <option value="Conjoint(e)">Conjoint(e)</option>
                    <option value="Enfant à Charge">Enfant à Charge</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Hôpital / Centre Agréé *</label>
                  <select
                    value={newVoucherForm.medicalCenterName}
                    onChange={(e) => setNewVoucherForm({ ...newVoucherForm, medicalCenterName: e.target.value })}
                    className="w-full p-2 border rounded font-bold"
                  >
                    <option value="HJ Hospitals Kinshasa">HJ Hospitals Kinshasa</option>
                    <option value="Centre Médical de la Gombe">Centre Médical de la Gombe</option>
                    <option value="Hôpital du Cinquantenaire">Hôpital du Cinquantenaire</option>
                    <option value="Centre Hospitalier Monkole">Centre Hospitalier Monkole</option>
                    <option value="Polyclinique Don Bosco Lubumbashi">Polyclinique Don Bosco Lubumbashi</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Nature des Soins *</label>
                  <select
                    value={newVoucherForm.careCategory}
                    onChange={(e) => setNewVoucherForm({ ...newVoucherForm, careCategory: e.target.value as any })}
                    className="w-full p-2 border rounded font-bold"
                  >
                    <option value="Consultation Générale">Consultation Générale</option>
                    <option value="Spécialiste">Spécialiste</option>
                    <option value="Hospitalisation">Hospitalisation</option>
                    <option value="Laboratoire & Biologie">Laboratoire & Biologie</option>
                    <option value="Pharmacie">Pharmacie</option>
                    <option value="Maternité">Maternité</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Taux de Prise en Charge (%)</label>
                <select
                  value={newVoucherForm.coverageRate}
                  onChange={(e) => setNewVoucherForm({ ...newVoucherForm, coverageRate: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded font-bold"
                >
                  <option value={100}>100% (Prise en charge totale)</option>
                  <option value={80}>80% (Prise en charge partielle 80/20)</option>
                  <option value={50}>50% (Co-paiement 50/50)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Motif / Diagnostic Présomptif</label>
                <textarea
                  value={newVoucherForm.reasonNotes || ''}
                  onChange={(e) => setNewVoucherForm({ ...newVoucherForm, reasonNotes: e.target.value })}
                  className="w-full p-2 border rounded h-16 text-xs"
                  placeholder="Precisions utiles pour le centre medical..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewVoucherModalOpen(false)}
                  className="px-4 py-2 border rounded-lg font-bold"
                >
                  Annuler
                </button>
                <button type="submit" className="px-5 py-2 bg-[#1F3864] text-white rounded-lg font-bold">
                  Générer le Bon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NEW HOSPITAL REPORT */}
      {isNewReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 text-xs">
            <h2 className="text-base font-bold text-[#1F3864]">Enregistrer un Rapport Médical d'Hôpital</h2>
            <form onSubmit={handleCreateReport} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Nom de l'Employé *</label>
                  <input
                    type="text"
                    required
                    value={newReportForm.employeeName}
                    onChange={(e) => setNewReportForm({ ...newReportForm, employeeName: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Matricule Employé *</label>
                  <input
                    type="text"
                    required
                    value={newReportForm.employeeMatricule}
                    onChange={(e) => setNewReportForm({ ...newReportForm, employeeMatricule: e.target.value })}
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Hôpital / Établissement *</label>
                  <select
                    value={newReportForm.hospitalName}
                    onChange={(e) => setNewReportForm({ ...newReportForm, hospitalName: e.target.value })}
                    className="w-full p-2 border rounded font-bold"
                  >
                    <option value="HJ Hospitals Kinshasa">HJ Hospitals Kinshasa</option>
                    <option value="Centre Médical de la Gombe">Centre Médical de la Gombe</option>
                    <option value="Hôpital du Cinquantenaire">Hôpital du Cinquantenaire</option>
                    <option value="Centre Hospitalier Monkole">Centre Hospitalier Monkole</option>
                    <option value="Polyclinique Don Bosco Lubumbashi">Polyclinique Don Bosco Lubumbashi</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Médecin Traitant *</label>
                  <input
                    type="text"
                    required
                    value={newReportForm.doctorName}
                    onChange={(e) => setNewReportForm({ ...newReportForm, doctorName: e.target.value })}
                    className="w-full p-2 border rounded"
                    placeholder="ex: Dr. KALALA Paul"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Diagnostic Clinique / Constats Hospitaliers *</label>
                <textarea
                  required
                  value={newReportForm.clinicalDiagnosis}
                  onChange={(e) => setNewReportForm({ ...newReportForm, clinicalDiagnosis: e.target.value })}
                  className="w-full p-2 border rounded h-20 text-xs"
                  placeholder="Décrire les résultats d'analyses, examens ou recommandations du médecin..."
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold mb-1">Repos Accordé (Jrs)</label>
                  <input
                    type="number"
                    min="0"
                    value={newReportForm.restDaysGranted}
                    onChange={(e) => setNewReportForm({ ...newReportForm, restDaysGranted: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded font-bold text-rose-700"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Aptitude Travail</label>
                  <select
                    value={newReportForm.fitnessStatus}
                    onChange={(e) => setNewReportForm({ ...newReportForm, fitnessStatus: e.target.value as any })}
                    className="w-full p-2 border rounded font-bold"
                  >
                    <option value="APT_TOTAL">Aptitude Totale</option>
                    <option value="APT_AVEC_RESERVE">Aptitude avec Réserve</option>
                    <option value="INAPT_TEMPORAIRE">Inaptitude Temporaire</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1">Cout Facture (CDF)</label>
                  <input
                    type="number"
                    value={newReportForm.hospitalCostCDF}
                    onChange={(e) => setNewReportForm({ ...newReportForm, hospitalCostCDF: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Remarques RH / Suivi</label>
                <input
                  type="text"
                  value={newReportForm.notes || ''}
                  onChange={(e) => setNewReportForm({ ...newReportForm, notes: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="Notes de suivi ou ajustements de poste requis..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsNewReportModalOpen(false)}
                  className="px-4 py-2 border rounded-lg font-bold"
                >
                  Annuler
                </button>
                <button type="submit" className="px-5 py-2 bg-[#1F3864] text-white rounded-lg font-bold">
                  Enregistrer le Rapport
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
