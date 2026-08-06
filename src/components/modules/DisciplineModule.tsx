/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * Module Disciplinaire & Contentieux RH (Code du Travail RDC - Art. 72, 73, 74)
 */

import React, { useState, useEffect } from 'react';
import {
  Gavel,
  AlertOctagon,
  FileText,
  Plus,
  Printer,
  Download,
  Clock,
  Edit3,
  CheckCircle2,
  ShieldAlert,
  Bot,
  BookOpen,
  Search,
  Check,
  Send,
  Eye,
  Sparkles,
  Lock,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { getCompanyConfig, CompanyConfig } from '../../services/companyService';
import { LegalReferenceModal } from '../common/LegalReferenceModal';
import { getLegalAdvice, LegalAdviceResponse } from '../../services/legalAdvisorService';
import { logAuditEvent } from '../../services/auditService';

export type SanctionType =
  | 'EXPLANATION_REQUEST' // Demande d'explication (48h)
  | 'WARNING' // Avertissement écrit
  | 'REPRIMAND' // Blâme
  | 'TEMPORARY_SUSPENSION' // Mise à pied (1-8 jours)
  | 'HEAVY_DISMISSAL'; // Licenciement pour faute lourde

export interface DisciplinaryCase {
  id: string;
  employeeMatricule: string;
  employeeName: string;
  department: string;
  type: SanctionType;
  infractionDate: string;
  notificationDate: string;
  responseDeadlineDate: string; // 48h légal
  reason: string;
  daysSuspended?: number; // Pour mise à pied
  customLetterContent?: string; // Lettre personnalisée / modifiée
  status: 'PENDING_RESPONSE' | 'CLOSED_ACCEPTED' | 'APPEALED';
  isSignedElectronically?: boolean;
  signerName?: string;
  signerTitle?: string;
  signedAt?: string;
  // Employee response and final decision tracking
  employeeResponseText?: string;
  employeeResponseDate?: string;
  rhFinalDecisionNotes?: string;
  finalSanctionType?: SanctionType | 'DISMISSED';
}

export const DisciplineModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'LETTERS' | 'LEGAL_ADVISOR' | 'EMPLOYEE_HISTORY'>('LETTERS');

  const [cases, setCases] = useState<DisciplinaryCase[]>([
    {
      id: 'DISC-2026-001',
      employeeMatricule: 'KP-2026-089',
      employeeName: 'KASONGO Patrick',
      department: 'Exploitation',
      type: 'EXPLANATION_REQUEST',
      infractionDate: '2026-07-24',
      notificationDate: '2026-07-25',
      responseDeadlineDate: '2026-07-27',
      reason: 'Absence injustifiée de 3 jours consécutifs sur le site d\'exploitation de Maluku.',
      customLetterContent: `Monsieur / Madame,\n\nConformément aux dispositions du Code du Travail de la République Démocratique du Congo (Art. 72) et du Règlement Intérieur de notre entreprise, nous portons à votre connaissance les faits suivants observés en date du 24/07/2026 :\n\n"Absence injustifiée de 3 jours consécutifs sur le site d'exploitation de Maluku sans justification médicale ni accord de la hiérarchie."\n\nAfin de respecter le principe du contradictoire, vous disposez d'un délai strict de 48 heures ouvrables à compter de la réception du présent courrier pour nous transmettre vos explications écrites quant aux motifs ayant conduit à ce manquement.\n\nVeuillez agréer, Monsieur / Madame, l'expression de nos salutations distinguées.`,
      status: 'PENDING_RESPONSE',
      isSignedElectronically: true,
      signerName: 'M. MUKENDI Jean-Luc',
      signerTitle: 'Directeur des Ressources Humaines',
      signedAt: '2026-07-25 09:30',
    },
    {
      id: 'DISC-2026-002',
      employeeMatricule: 'KP-2026-042',
      employeeName: 'ILUNGA Samuel',
      department: 'Logistique',
      type: 'TEMPORARY_SUSPENSION',
      infractionDate: '2026-07-10',
      notificationDate: '2026-07-12',
      responseDeadlineDate: '2026-07-14',
      reason: 'Non-respect caractérisé des consignes de sécurité routière et casse matériel de transport.',
      daysSuspended: 3,
      customLetterContent: `Monsieur / Madame,\n\nFaisant suite à notre demande d'explication en date du 10/07/2026 et à l'analyse de vos justifications jugées insatisfaisantes par la Direction RH ;\n\nConformément aux Articles 72 et 73 du Code du Travail RDC, nous vous notifions par la présente une MISE À PIED DISCIPLINAIRE d'une durée de 3 (trois) jours sans solde, allant du 13/07/2026 au 15/07/2026 inclus.\n\nNous vous enroignons un respect strict des consignes à votre reprise de poste sous peine de mesures plus sévères.\n\nSalutations distinguées.`,
      status: 'CLOSED_ACCEPTED',
      isSignedElectronically: true,
      signerName: 'M. MUKENDI Jean-Luc',
      signerTitle: 'Directeur des Ressources Humaines',
      signedAt: '2026-07-12 14:15',
    },
  ]);

  const [company, setCompany] = useState<CompanyConfig>(getCompanyConfig());
  const [selectedCase, setSelectedCase] = useState<DisciplinaryCase | null>(cases[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [isEditingLetter, setIsEditingLetter] = useState(false);
  const [editedText, setEditedText] = useState('');

  // Employee Response Modal State
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [responseForm, setResponseForm] = useState({
    responseText: '',
    responseDate: new Date().toISOString().split('T')[0],
    rhNotes: '',
    finalDecision: 'WARNING' as SanctionType | 'DISMISSED',
  });

  useEffect(() => {
    setCompany(getCompanyConfig());
  }, []);

  const openResponseModal = () => {
    if (!selectedCase) return;
    setResponseForm({
      responseText: selectedCase.employeeResponseText || '',
      responseDate: selectedCase.employeeResponseDate || new Date().toISOString().split('T')[0],
      rhNotes: selectedCase.rhFinalDecisionNotes || '',
      finalDecision: selectedCase.finalSanctionType || 'WARNING',
    });
    setIsResponseModalOpen(true);
  };

  const handleSaveEmployeeResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    let updatedLetterText = selectedCase.customLetterContent;
    let newType = selectedCase.type;

    if (responseForm.finalDecision === 'DISMISSED') {
      updatedLetterText = `Monsieur / Madame ${selectedCase.employeeName},\n\nSuite à votre lettre de réponse en date du ${responseForm.responseDate} apportant vos explications suite à notre demande d'explication du ${selectedCase.notificationDate} ;\n\nAprès examen attentif de vos éléments de justification par la Direction RH ("${responseForm.rhNotes}"), la Direction a décidé de CLASSER CETTE PROCÉDURE SANS SUITE et d'accepter vos explications.\n\nAucune sanction ne sera inscrite à votre dossier disciplinaire.\n\nSalutations distinguées.`;
    } else {
      newType = responseForm.finalDecision as SanctionType;
      updatedLetterText = `DECISION FINALE RH SUITE À LA DEMANDE D'EXPLICATION DU ${selectedCase.notificationDate}\n\nMonsieur / Madame ${selectedCase.employeeName},\n\nAyant pris acte de vos explications transmises le ${responseForm.responseDate} ("${responseForm.responseText.slice(0, 100)}...") ;\n\nAprès étude par la Direction RH ("${responseForm.rhNotes}"), vos motifs n'ont pas été jugés de nature à exonérer votre responsabilité.\n\nEn conséquence, nous vous notifions par la présente la sanction finale suivante : ${getSanctionLabel(newType).toUpperCase()}.\n\nSalutations distinguées.`;
    }

    const updated = cases.map((c) =>
      c.id === selectedCase.id
        ? {
            ...c,
            type: newType,
            employeeResponseText: responseForm.responseText,
            employeeResponseDate: responseForm.responseDate,
            rhFinalDecisionNotes: responseForm.rhNotes,
            finalSanctionType: responseForm.finalDecision,
            customLetterContent: updatedLetterText,
            status: 'CLOSED_ACCEPTED' as const,
          }
        : c
    );

    setCases(updated);
    setSelectedCase(updated.find((c) => c.id === selectedCase.id) || null);
    setIsResponseModalOpen(false);

    logAuditEvent(
      'DECISION_SANCTION',
      'DISCIPLINE',
      `Décision disciplinaire enregistrée pour ${selectedCase.employeeName} (${responseForm.finalDecision})`,
      'rh@novarispay.cd',
      'RESPONSABLE_RH',
      selectedCase.id
    );
  };

  // Search and filter for history view
  const [historySearch, setHistorySearch] = useState('');

  // AI Legal Advisor State
  const [advisorForm, setAdvisorForm] = useState({
    employeeName: 'KASONGO Patrick',
    position: 'Conducteur d\'Engins',
    department: 'Exploitation',
    contractType: 'CDI',
    proposedInfraction: 'Refus répétitif de porter les Equipements de Protection Individuelle (EPI) sur le chantier.',
  });
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceResult, setAdviceResult] = useState<LegalAdviceResponse | null>(null);

  // New Case Form State
  const [newCase, setNewCase] = useState<Partial<DisciplinaryCase>>({
    employeeMatricule: 'KP-2026-101',
    employeeName: '',
    department: 'Exploitation',
    type: 'EXPLANATION_REQUEST',
    reason: '',
    daysSuspended: 0,
  });

  useEffect(() => {
    if (selectedCase) {
      setEditedText(
        selectedCase.customLetterContent ||
          `Monsieur / Madame,\n\nConformément aux dispositions du Code du Travail de la République Démocratique du Congo (Art. 72) et du Règlement Intérieur de notre entreprise, nous portons à votre connaissance les faits suivants observés en date du ${selectedCase.infractionDate} :\n\n"${selectedCase.reason}"\n\nAfin de respecter le principe du contradictoire, vous disposez d'un délai strict de 48 heures pour nous transmettre vos explications écrites.\n\nVeuillez agréer, Monsieur / Madame, nos salutations distinguées.`
      );
    }
  }, [selectedCase]);

  const getSanctionLabel = (type: SanctionType) => {
    switch (type) {
      case 'EXPLANATION_REQUEST':
        return 'Demande d\'Explication (Délai 48h)';
      case 'WARNING':
        return 'Avertissement Écrit';
      case 'REPRIMAND':
        return 'Blâme Officiel';
      case 'TEMPORARY_SUSPENSION':
        return 'Mise à Pied Disciplinaire';
      case 'HEAVY_DISMISSAL':
        return 'Licenciement Faute Lourde (Code RDC)';
    }
  };

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCase.employeeName || !newCase.reason) return;

    const today = new Date().toISOString().split('T')[0];
    const deadline = new Date(Date.now() + 48 * 3600 * 1000).toISOString().split('T')[0];

    const c: DisciplinaryCase = {
      id: `DISC-2026-00${cases.length + 1}`,
      employeeMatricule: newCase.employeeMatricule || 'KP-2026-000',
      employeeName: newCase.employeeName,
      department: newCase.department || 'Général',
      type: newCase.type || 'EXPLANATION_REQUEST',
      infractionDate: today,
      notificationDate: today,
      responseDeadlineDate: deadline,
      reason: newCase.reason,
      daysSuspended: newCase.daysSuspended || 0,
      customLetterContent: `Monsieur / Madame,\n\nConformément aux dispositions du Code du Travail de la RDC (Art. 72) et du Règlement Intérieur, nous vous prions de prendre connaissance des faits observés le ${today} :\n\n"${newCase.reason}"\n\nVous disposez d'un délai strict de 48 heures pour fournir vos explications écrites au Service RH.\n\nSalutations distinguées.`,
      status: 'PENDING_RESPONSE',
      isSignedElectronically: true,
      signerName: 'M. MUKENDI Jean-Luc',
      signerTitle: 'Directeur des Ressources Humaines',
      signedAt: `${today} ${new Date().toLocaleTimeString().slice(0, 5)}`,
    };

    setCases([c, ...cases]);
    setSelectedCase(c);
    setIsModalOpen(false);

    logAuditEvent(
      'SANCTION',
      'DISCIPLINE',
      `Création procédure disciplinaire ${c.id} (${getSanctionLabel(c.type)}) pour ${c.employeeName}`,
      'rh@novarispay.cd',
      'GESTIONNAIRE_RH',
      c.id
    );
  };

  const handleSaveLetterText = () => {
    if (!selectedCase) return;

    const updated = cases.map((c) =>
      c.id === selectedCase.id ? { ...c, customLetterContent: editedText } : c
    );
    setCases(updated);
    setSelectedCase({ ...selectedCase, customLetterContent: editedText });
    setIsEditingLetter(false);

    logAuditEvent(
      'UPDATE',
      'DISCIPLINE',
      `Modification texte du courrier ${selectedCase.id} pour ${selectedCase.employeeName}`,
      'rh@novarispay.cd',
      'GESTIONNAIRE_RH',
      selectedCase.id
    );
  };

  const handleToggleElectronicSignature = () => {
    if (!selectedCase) return;

    const newSignedStatus = !selectedCase.isSignedElectronically;
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);

    const updatedCase = {
      ...selectedCase,
      isSignedElectronically: newSignedStatus,
      signerName: newSignedStatus ? 'M. MUKENDI Jean-Luc' : undefined,
      signerTitle: newSignedStatus ? 'Directeur des Ressources Humaines' : undefined,
      signedAt: newSignedStatus ? nowStr : undefined,
    };

    setCases(cases.map((c) => (c.id === selectedCase.id ? updatedCase : c)));
    setSelectedCase(updatedCase);

    logAuditEvent(
      'SIGN_LETTER',
      'DISCIPLINE',
      `${newSignedStatus ? 'Signature électronique apposée sur' : 'Signature révoquée pour'} ${selectedCase.id}`,
      'drh@novarispay.cd',
      'DIRECTEUR_RH',
      selectedCase.id
    );
  };

  const handleAskLegalAdvisor = async () => {
    setAdviceLoading(true);
    const history = cases
      .filter((c) => c.employeeName.toLowerCase().includes(advisorForm.employeeName.toLowerCase()))
      .map((c) => ({ date: c.notificationDate, type: c.type, reason: c.reason }));

    const res = await getLegalAdvice({
      employeeName: advisorForm.employeeName,
      position: advisorForm.position,
      department: advisorForm.department,
      contractType: advisorForm.contractType,
      sanctionHistory: history,
      proposedInfraction: advisorForm.proposedInfraction,
    });

    setAdviceResult(res);
    setAdviceLoading(false);

    logAuditEvent(
      'CREATE',
      'DISCIPLINE',
      `Consultation Conseiller Juridique IA pour ${advisorForm.employeeName}`,
      'rh@novarispay.cd',
      'GESTIONNAIRE_RH'
    );
  };

  // PDF Export Function
  const exportSanctionPDF = () => {
    if (!selectedCase) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const primaryColor = '#1F3864';

    // Header Company Box
    doc.setFillColor(31, 56, 100);
    doc.rect(15, 12, 180, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(company.name.toUpperCase(), 20, 22);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('DIRECTION DES RESSOURCES HUMAINES & CONTENTIEUX SOCIAL - RDC', 20, 28);

    // Right Ref Box
    doc.setFillColor(240, 240, 240);
    doc.rect(140, 38, 55, 16, 'F');
    doc.setTextColor(31, 56, 100);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`RÉF : ${selectedCase.id}`, 143, 44);
    doc.text(`DATE : ${selectedCase.notificationDate}`, 143, 50);

    // Subject Box
    doc.setDrawColor(220, 38, 38);
    doc.setFillColor(254, 242, 242);
    doc.rect(15, 60, 180, 16, 'DF');

    doc.setTextColor(153, 27, 27);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`OBJET : ${getSanctionLabel(selectedCase.type).toUpperCase()}`, 20, 67);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Destinataire : M./Mme ${selectedCase.employeeName} (Matricule : ${selectedCase.employeeMatricule}) - Dép. ${selectedCase.department}`,
      20,
      73
    );

    // Letter Body
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);

    const bodyText = selectedCase.customLetterContent || selectedCase.reason;
    const splitLines = doc.splitTextToSize(bodyText, 170);

    doc.text(splitLines, 20, 90);

    // Signature Area
    const startSigY = 190;
    doc.setLineWidth(0.3);
    doc.setDrawColor(200, 200, 200);

    // Employer Electronic Signature Box
    doc.rect(15, startSigY, 85, 45);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 56, 100);
    doc.text('POUR LA DIRECTION RH', 20, startSigY + 7);

    if (selectedCase.isSignedElectronically) {
      doc.setFillColor(236, 253, 245);
      doc.rect(18, startSigY + 12, 79, 28, 'F');
      doc.setDrawColor(16, 185, 129);
      doc.rect(18, startSigY + 12, 79, 28, 'D');

      doc.setTextColor(5, 150, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('[SIGNÉ ÉLECTRONIQUEMENT]', 22, startSigY + 18);

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.text(selectedCase.signerName || 'M. MUKENDI Jean-Luc', 22, startSigY + 24);
      doc.setFontSize(7);
      doc.text(selectedCase.signerTitle || 'Directeur RH NovarisPay', 22, startSigY + 29);
      doc.text(`Horodatage : ${selectedCase.signedAt || selectedCase.notificationDate}`, 22, startSigY + 34);
    } else {
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'italic');
      doc.text('[ Signature & Cachet RH ]', 25, startSigY + 25);
    }

    // Employee Receipt Box
    doc.rect(110, startSigY, 85, 45);
    doc.setTextColor(31, 56, 100);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("ACCUSÉ DE RÉCEPTION DE L'EMPLOYÉ", 115, startSigY + 7);

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Mention : "Reçu en mains propres le : ....../....../2026"', 115, startSigY + 18);
    doc.text('Signature & Emargement du salarié :', 115, startSigY + 26);

    // Footer Legal Mention
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Document officiel généré par ERP NovarisPay RDC — Conforme au Code du Travail RDC (Loi n° 15/013 Art. 72)',
      15,
      285
    );

    doc.save(`Lettre_Sanction_${selectedCase.id}_${selectedCase.employeeName.replace(/\s+/g, '_')}.pdf`);

    logAuditEvent(
      'EXPORT',
      'DISCIPLINE',
      `Téléchargement Lettre PDF ${selectedCase.id} pour ${selectedCase.employeeName}`,
      'rh@novarispay.cd',
      'GESTIONNAIRE_RH',
      selectedCase.id
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-[#1F3864]">Contentieux RH & Procédures Disciplinaires RDC</h1>
            <span className="bg-blue-100 text-[#1F3864] text-[10px] font-black px-2 py-0.5 rounded font-mono">
              ART. 72 CODE DU TRAVAIL
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Émission et modification de lettres de sanction, signature électronique RH, assistant juridique virtuel IA & archivage des courriers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsLegalModalOpen(true)}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition"
          >
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span>Guide Légal Code RDC</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#1F3864] hover:bg-[#152747] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow transition"
          >
            <Plus className="w-4 h-4 text-[#BF9000]" />
            <span>Nouvelle Procédure</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('LETTERS')}
          className={`pb-3 px-4 border-b-2 flex items-center space-x-2 transition ${
            activeTab === 'LETTERS'
              ? 'border-[#1F3864] text-[#1F3864]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Lettres & Sanctions Émises ({cases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('LEGAL_ADVISOR')}
          className={`pb-3 px-4 border-b-2 flex items-center space-x-2 transition ${
            activeTab === 'LEGAL_ADVISOR'
              ? 'border-[#1F3864] text-[#1F3864]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bot className="w-4 h-4 text-amber-600" />
          <span>Conseiller Juridique IA (RDC)</span>
        </button>

        <button
          onClick={() => setActiveTab('EMPLOYEE_HISTORY')}
          className={`pb-3 px-4 border-b-2 flex items-center space-x-2 transition ${
            activeTab === 'EMPLOYEE_HISTORY'
              ? 'border-[#1F3864] text-[#1F3864]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Gavel className="w-4 h-4 text-slate-600" />
          <span>Historique & Suivi des Courriers par Agent</span>
        </button>
      </div>

      {/* TAB 1: LETTERS & EDITOR */}
      {activeTab === 'LETTERS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Cases List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <h2 className="text-xs font-bold uppercase text-slate-500 tracking-wider flex items-center justify-between">
              <span>Dossiers Disciplinaires</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-mono">{cases.length}</span>
            </h2>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {cases.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCase(c);
                    setIsEditingLetter(false);
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition space-y-1 ${
                    selectedCase?.id === c.id
                      ? 'bg-[#1F3864] text-white border-[#1F3864] shadow-md'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] opacity-80">{c.id}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1 ${
                        c.isSignedElectronically
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {c.isSignedElectronically ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400 stroke-[1.75]" />
                          <span>Signé</span>
                        </>
                      ) : (
                        'Non Signé'
                      )}
                    </span>
                  </div>
                  <div className="font-bold text-sm">{c.employeeName}</div>
                  <div className="text-[11px] opacity-80">
                    {c.department} • {c.employeeMatricule}
                  </div>
                  <div className="text-[11px] font-semibold text-amber-300 pt-1 border-t border-white/10 mt-1">
                    {getSanctionLabel(c.type)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Preview & Editor */}
          <div className="lg:col-span-2">
            {selectedCase ? (
              <div className="bg-white rounded-2xl border border-slate-300 shadow-xl p-6 space-y-6">
                {/* Document Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-2">
                  <div>
                    <h2 className="font-black text-base text-[#1F3864]">{company.name}</h2>
                    <p className="text-xs text-slate-600">Direction RH - Contentieux & Disciplinary Files</p>
                    <p className="text-[10px] font-mono text-slate-400">Réf: {selectedCase.id}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={openResponseModal}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center space-x-1 shadow"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Réponse Salarié & Décision RH</span>
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg flex items-center space-x-1 shadow"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#BF9000]" />
                      <span>Imprimer Direct</span>
                    </button>

                    <button
                      onClick={() => setIsEditingLetter(!isEditingLetter)}
                      className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg flex items-center space-x-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditingLetter ? 'Aperçu' : 'Éditer'}</span>
                    </button>

                    <button
                      onClick={handleToggleElectronicSignature}
                      className={`px-3 py-1.5 font-bold text-xs rounded-lg flex items-center space-x-1.5 transition ${
                        selectedCase.isSignedElectronically
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{selectedCase.isSignedElectronically ? 'Signé' : 'Signer RH'}</span>
                    </button>

                    <button
                      onClick={exportSanctionPDF}
                      className="bg-[#1F3864] text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 shadow"
                    >
                      <Download className="w-3.5 h-3.5 text-[#BF9000]" />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>

                {/* Subject Box */}
                <div className="p-4 bg-red-50 border-l-4 border-red-600 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-red-900 text-sm">
                    OBJET : {getSanctionLabel(selectedCase.type).toUpperCase()}
                  </div>
                  <div className="text-slate-800">
                    Destinataire : <strong>M. / Mme {selectedCase.employeeName}</strong> (Matricule :{' '}
                    {selectedCase.employeeMatricule})
                  </div>
                  <div className="text-slate-800">Département : {selectedCase.department}</div>
                </div>

                {/* Letter Content: Editing Mode vs Preview Mode */}
                {isEditingLetter ? (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700">
                      Éditeur de Courrier Officiel (Texte entièrement personnalisable) :
                    </label>
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="w-full h-64 p-4 border rounded-xl font-serif text-xs leading-relaxed text-slate-900 bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-[#1F3864]"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setIsEditingLetter(false)}
                        className="px-3 py-1.5 border rounded-lg text-xs font-bold"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleSaveLetterText}
                        className="px-4 py-1.5 bg-[#1F3864] text-white rounded-lg text-xs font-bold"
                      >
                        Enregistrer les Modifications
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs leading-relaxed text-slate-800 whitespace-pre-line font-serif bg-slate-50/70 p-5 rounded-xl border border-slate-200">
                    {selectedCase.customLetterContent || selectedCase.reason}
                  </div>
                )}

                {/* Electronic Signature Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t text-xs">
                  <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                    <span className="font-bold text-slate-800 block text-xs">
                      Signature du Responsable RH (NovarisPay)
                    </span>
                    {selectedCase.isSignedElectronically ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] space-y-1">
                        <div className="font-bold text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>DOCUMENT SIGNÉ ÉLECTRONIQUEMENT</span>
                        </div>
                        <div className="text-slate-700 font-semibold">{selectedCase.signerName}</div>
                        <div className="text-slate-500 text-[10px]">{selectedCase.signerTitle}</div>
                        <div className="text-[9px] font-mono text-slate-400">Horodatage: {selectedCase.signedAt}</div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 italic">
                        Non signé électroniquement. Cliquez sur "Apposer Signature RH" ci-dessus.
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                    <span className="font-bold text-slate-800 block text-xs">Accusé de Réception de l'Employé</span>
                    <div className="p-3 bg-white border border-slate-200 rounded-lg text-[11px] space-y-1 text-slate-500">
                      <div>Mention obligatoire : "Reçu en mains propres le ..."</div>
                      <div className="h-6"></div>
                      <div className="border-t pt-1 font-mono text-[9px]">Émargement et date du salarié</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 border text-center text-slate-400 text-xs">
                Sélectionnez un dossier disciplinaire.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AI LEGAL ADVISOR */}
      {activeTab === 'LEGAL_ADVISOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Advisor Inputs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center space-x-2 text-[#1F3864]">
              <Bot className="w-5 h-5 text-amber-600" />
              <h2 className="font-black text-sm">Conseiller Juridique Virtuel RH (RDC)</h2>
            </div>
            <p className="text-xs text-slate-500">
              Analyse la situation disciplinaire d'un salarié par rapport à son historique et formule un conseil juridique d'expert conforme au Code du Travail RDC (Art. 72).
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Nom du Salarié</label>
                <input
                  type="text"
                  value={advisorForm.employeeName}
                  onChange={(e) => setAdvisorForm({ ...advisorForm, employeeName: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Poste</label>
                  <input
                    type="text"
                    value={advisorForm.position}
                    onChange={(e) => setAdvisorForm({ ...advisorForm, position: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Contrat</label>
                  <select
                    value={advisorForm.contractType}
                    onChange={(e) => setAdvisorForm({ ...advisorForm, contractType: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="STAGE">Stagiaire</option>
                    <option value="CONSULTANCE">Consultant</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Description Détaillée de la Faute Actuelle *</label>
                <textarea
                  rows={4}
                  value={advisorForm.proposedInfraction}
                  onChange={(e) => setAdvisorForm({ ...advisorForm, proposedInfraction: e.target.value })}
                  className="w-full p-2 border rounded-lg text-xs"
                  placeholder="Inscrire précisément les faits reprochés..."
                />
              </div>

              <button
                onClick={handleAskLegalAdvisor}
                disabled={adviceLoading}
                className="w-full py-2.5 bg-[#1F3864] hover:bg-[#152747] text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow transition"
              >
                <Sparkles className="w-4 h-4 text-[#BF9000]" />
                <span>{adviceLoading ? 'Analyse Juridique en cours...' : 'Obtenir l\'Avis Juridique Conforme RDC'}</span>
              </button>
            </div>
          </div>

          {/* Advisor Results */}
          <div className="lg:col-span-2 space-y-4">
            {adviceResult ? (
              <div className="bg-white rounded-2xl border border-slate-300 shadow-lg p-6 space-y-6">
                {/* Recommendation Header */}
                <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">
                      Recommandation Sanction RDC
                    </span>
                    <span className="bg-emerald-500 text-white font-bold text-[9px] px-2 py-0.5 rounded">
                      CONFORME ART. 72
                    </span>
                  </div>
                  <h3 className="text-base font-black text-amber-300">{adviceResult.recommendedSanctionLabel}</h3>
                </div>

                {/* Analysis Body */}
                <div className="p-4 bg-slate-50 border rounded-xl text-xs space-y-2">
                  <h4 className="font-bold text-[#1F3864]">Analyse Stratégique RH & Droit du Travail :</h4>
                  <p className="whitespace-pre-line leading-relaxed text-slate-800 font-serif">
                    {adviceResult.advice}
                  </p>
                </div>

                {/* Risks & Steps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                    <h4 className="font-bold text-red-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                      <span>Risques Juridiques à Éviter :</span>
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-red-800 text-[11px]">
                      {adviceResult.legalRisks.map((r, idx) => (
                        <li key={idx}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                    <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <span>Procédure Légale RDC à Suivre :</span>
                    </h4>
                    <ol className="list-decimal list-inside space-y-1 text-blue-800 text-[11px]">
                      {adviceResult.proceduralSteps.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 border text-center text-slate-400 text-xs space-y-2">
                <Bot className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="font-bold text-slate-600">Renseignez la faute et cliquez sur "Obtenir l'Avis Juridique".</p>
                <p className="text-[11px] text-slate-400">
                  Le conseiller analyse le Code du Travail RDC, la jurisprudence de l'Inspection du Travail et l'historique du salarié.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EMPLOYEE SANCTION HISTORY */}
      {activeTab === 'EMPLOYEE_HISTORY' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-black text-sm text-[#1F3864]">Registre de Suivi des Courriers & Sanctions par Agent</h2>
              <p className="text-xs text-slate-500">
                Historique complet des demandes d'explication, avertissements et mises à pied émises dans l'entreprise.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par employé ou matricule..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                <tr>
                  <th className="p-3">Réf.</th>
                  <th className="p-3">Employé</th>
                  <th className="p-3">Matricule</th>
                  <th className="p-3">Département</th>
                  <th className="p-3">Sanction</th>
                  <th className="p-3">Date Émission</th>
                  <th className="p-3">Délai 48h</th>
                  <th className="p-3">Statut Signature</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y text-slate-800">
                {cases
                  .filter(
                    (c) =>
                      c.employeeName.toLowerCase().includes(historySearch.toLowerCase()) ||
                      c.employeeMatricule.toLowerCase().includes(historySearch.toLowerCase())
                  )
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono text-[11px] font-bold text-[#1F3864]">{c.id}</td>
                      <td className="p-3 font-bold">{c.employeeName}</td>
                      <td className="p-3 font-mono">{c.employeeMatricule}</td>
                      <td className="p-3">{c.department}</td>
                      <td className="p-3 font-semibold text-amber-800">{getSanctionLabel(c.type)}</td>
                      <td className="p-3 font-mono">{c.notificationDate}</td>
                      <td className="p-3 font-mono">{c.responseDeadlineDate}</td>
                      <td className="p-3">
                        {c.isSignedElectronically ? (
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600 stroke-[1.75]" />
                            <span>Signé RH</span>
                          </span>
                        ) : (
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            En attente
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedCase(c);
                            setActiveTab('LETTERS');
                          }}
                          className="px-2.5 py-1 bg-[#1F3864] text-white rounded text-[11px] font-bold"
                        >
                          Voir Courrier
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL NEW PROCEDURE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-[#1F3864]">Nouvelle Procédure Disciplinaire RDC</h2>
            <form onSubmit={handleCreateCase} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Matricule Employé</label>
                  <input
                    type="text"
                    required
                    value={newCase.employeeMatricule || ''}
                    onChange={(e) => setNewCase({ ...newCase, employeeMatricule: e.target.value })}
                    className="w-full p-2 border rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Nom Complet *</label>
                  <input
                    type="text"
                    required
                    value={newCase.employeeName || ''}
                    onChange={(e) => setNewCase({ ...newCase, employeeName: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Nature de la Sanction *</label>
                <select
                  value={newCase.type || 'EXPLANATION_REQUEST'}
                  onChange={(e) => setNewCase({ ...newCase, type: e.target.value as SanctionType })}
                  className="w-full p-2 border rounded font-bold"
                >
                  <option value="EXPLANATION_REQUEST">Demande d'Explication (48h légal)</option>
                  <option value="WARNING">Avertissement Écrit</option>
                  <option value="REPRIMAND">Blâme Officiel</option>
                  <option value="TEMPORARY_SUSPENSION">Mise à Pied Disciplinaire (1 à 8 jours max)</option>
                  <option value="HEAVY_DISMISSAL">Licenciement Faute Lourde (Art. 74)</option>
                </select>
              </div>

              {newCase.type === 'TEMPORARY_SUSPENSION' && (
                <div>
                  <label className="block font-bold mb-1">Nombre de jours de mise à pied (1 à 8 jours max RDC)</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={newCase.daysSuspended || 3}
                    onChange={(e) => setNewCase({ ...newCase, daysSuspended: parseInt(e.target.value) })}
                    className="w-full p-2 border rounded font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold mb-1">Description Détaillée des Faits Reprochés *</label>
                <textarea
                  required
                  value={newCase.reason || ''}
                  onChange={(e) => setNewCase({ ...newCase, reason: e.target.value })}
                  className="w-full p-2 border rounded h-24 text-xs"
                  placeholder="Inscrire les circonstances, dates, lieux et témoins..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg font-bold"
                >
                  Annuler
                </button>
                <button type="submit" className="px-5 py-2 bg-[#1F3864] text-white rounded-lg font-bold">
                  Enregistrer & Générer Courrier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUIVI RÉPONSE DU SALARIÉ & DÉCISION RH */}
      {isResponseModalOpen && selectedCase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-black text-[#1F3864]">Suivi de la Réponse du Salarié & Décision Finale</h2>
                <p className="text-xs text-slate-500">
                  Cas Réf: {selectedCase.id} — Employé : {selectedCase.employeeName}
                </p>
              </div>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                Délai 48h Légals
              </span>
            </div>

            <form onSubmit={handleSaveEmployeeResponse} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1">Date de Réception de la Réponse Écrite *</label>
                <input
                  type="date"
                  required
                  value={responseForm.responseDate}
                  onChange={(e) => setResponseForm({ ...responseForm, responseDate: e.target.value })}
                  className="w-full p-2 border rounded-xl font-bold font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Motif & Explications fournie par l'Employé *</label>
                <textarea
                  required
                  value={responseForm.responseText}
                  onChange={(e) => setResponseForm({ ...responseForm, responseText: e.target.value })}
                  className="w-full p-3 border rounded-xl h-24 text-xs font-serif"
                  placeholder="Inscrire le résumé ou le texte intégral de la justification écrite transmise par le salarié..."
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Appréciation & Remarques de la Direction RH *</label>
                <textarea
                  required
                  value={responseForm.rhNotes}
                  onChange={(e) => setResponseForm({ ...responseForm, rhNotes: e.target.value })}
                  className="w-full p-2.5 border rounded-xl h-16 text-xs"
                  placeholder="Justification RH pour la décision finale retenue..."
                />
              </div>

              <div>
                <label className="block font-bold mb-1 text-[#1F3864]">Décision Finale Retenue par l'Entreprise *</label>
                <select
                  value={responseForm.finalDecision}
                  onChange={(e) => setResponseForm({ ...responseForm, finalDecision: e.target.value as any })}
                  className="w-full p-2.5 border-2 border-[#1F3864] rounded-xl font-bold text-xs"
                >
                  <option value="DISMISSED">Classer Sans Suite (Explications Acceptées / Pas de Sanction)</option>
                  <option value="WARNING">Maintien d'un Avertissement Écrit</option>
                  <option value="REPRIMAND">Blâme Officiel au Dossier</option>
                  <option value="TEMPORARY_SUSPENSION">Mise à Pied Disciplinaire (1 à 8 jours max)</option>
                  <option value="HEAVY_DISMISSAL">Licenciement pour Faute Lourde (Art. 74)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsResponseModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold text-slate-700"
                >
                  Annuler
                </button>
                <button type="submit" className="px-5 py-2 bg-[#1F3864] text-white rounded-xl font-bold shadow">
                  Statuer & Mettre à Jour le Courrier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RDC LEGAL REFERENCE MODAL */}
      <LegalReferenceModal
        moduleKey="DISCIPLINE"
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
      />
    </div>
  );
};
