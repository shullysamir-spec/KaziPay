/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * Composant de Génération de l'Attestation de Fin de Service / Certificat de Travail (Art. 168 Code du Travail RDC)
 */

import React, { useState, useEffect } from 'react';
import {
  Award,
  X,
  Printer,
  Download,
  Check,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  FileText,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { getEmployees } from '../../services/employeeService';
import { getCompanyConfig, CompanyConfig } from '../../services/companyService';
import { EmployeeWithContract } from '../../types/employee';
import { logAuditEvent } from '../../services/auditService';
import { CompanyDocument } from '../modules/DocumentGEDModule';
import { generateBarcodeIdentifier, registerDocument, generateBarcodeDataUrl } from '../../services/barcodeService';
import { DocumentBarcode } from './DocumentBarcode';

interface ServiceCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmployeeId?: string;
  onDocumentGenerated?: (doc: CompanyDocument) => void;
}

export const ServiceCertificateModal: React.FC<ServiceCertificateModalProps> = ({
  isOpen,
  onClose,
  initialEmployeeId,
  onDocumentGenerated,
}) => {
  const [employees, setEmployees] = useState<EmployeeWithContract[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(initialEmployeeId || '');
  const [company, setCompany] = useState<CompanyConfig>(getCompanyConfig());

  // Form parameters for certificate
  const [entryDate, setEntryDate] = useState<string>('');
  const [exitDate, setExitDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [departureReason, setDepartureReason] = useState<string>('Fin de contrat à durée déterminée (CDD)');
  const [positionsHeld, setPositionsHeld] = useState<string>('');
  const [includeSoldeQuittance, setIncludeSoldeQuittance] = useState<boolean>(true);
  const [signerName, setSignerName] = useState<string>('Direction des Ressources Humaines');
  const [signerTitle, setSignerTitle] = useState<string>('Directeur Général / DRH');
  const [issueCity, setIssueCity] = useState<string>('Kinshasa');
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialEmployeeId) {
      setSelectedEmployeeId(initialEmployeeId);
    }
  }, [initialEmployeeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const empList = await getEmployees();
      setEmployees(empList);

      if (!selectedEmployeeId && empList.length > 0) {
        setSelectedEmployeeId(empList[0].id || '');
      }
    } catch (err) {
      console.error('Erreur chargement employés:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentEmp = employees.find((e) => e.id === selectedEmployeeId);

  // Update defaults when employee selection changes
  useEffect(() => {
    if (currentEmp) {
      setEntryDate(currentEmp.hireDate || '2025-01-01');
      setPositionsHeld(currentEmp.position || 'Agent d\'Exploitation');
    }
  }, [selectedEmployeeId, currentEmp]);

  if (!isOpen) return null;

  const handleGeneratePDF = async () => {
    if (!currentEmp) return;
    setDownloading(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Barcode generation
      const barcodeId = generateBarcodeIdentifier('CERT');
      const barcodeDataUrl = await generateBarcodeDataUrl(barcodeId, 'CODE128', { height: 35, displayValue: true });

      registerDocument({
        barcodeId,
        documentType: 'Certificat / Attestation',
        documentTypeCode: 'CERT',
        documentNumber: `CERT-${Date.now().toString().slice(-6)}`,
        title: `Attestation de Fin de Service - ${currentEmp.lastName} ${currentEmp.firstName}`,
        employeeName: `${currentEmp.lastName} ${currentEmp.firstName}`,
        employeeMatricule: currentEmp.matricule,
        createdAt: new Date().toISOString(),
        createdBy: signerName,
        status: 'Validated',
        version: 'v1.0',
        moduleRoute: 'ged',
      });

      // En-tête officiel de l'entreprise
      doc.setFillColor(31, 56, 100); // #1F3864 Navy
      doc.rect(0, 0, pageWidth, 14, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO — ERP RH NOVARISPAY', 15, 9);
      doc.text('DOCUMENT OFFICIEL CONFORME CODE DU TRAVAIL', pageWidth - 15, 9, { align: 'right' });

      // Information Entreprise Header
      doc.setTextColor(31, 56, 100);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(company.name.toUpperCase(), 15, 28);

      // Add Barcode image top right
      if (barcodeDataUrl) {
        try {
          doc.addImage(barcodeDataUrl, 'PNG', pageWidth - 70, 18, 55, 12);
        } catch (err) {
          console.warn('Barcode PDF insertion error:', err);
        }
      }

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`${company.address} — N° RCCM: ${company.rccm || 'CD/KIN/RCCM/14-B-0123'} | N° ID.NAT: ${company.idNat || '01-93-N45100P'}`, 15, 34);
      doc.text(`N° CNSS Employeur: ${company.cnssEmployerNumber || '1014850021'} | Tél: ${company.phone} | Email: ${company.email}`, 15, 39);

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(15, 43, pageWidth - 15, 43);

      // Titre du Document
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, 50, pageWidth - 40, 22, 3, 3, 'FD');

      doc.setTextColor(31, 56, 100);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ATTESTATION DE FIN DE SERVICE', pageWidth / 2, 60, { align: 'center' });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(191, 144, 0); // Gold
      doc.text('(CERTIFICAT DE TRAVAIL CONFORME À L\'ARTICLE 168 DU CODE DU TRAVAIL RDC)', pageWidth / 2, 67, { align: 'center' });

      // Corps du Texte
      let y = 84;
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      const introText = `Je soussigné(e), ${signerName}, agissant en qualité de ${signerTitle} au sein de la société ${company.name}, certifie et atteste par la présente que :`;
      const splitIntro = doc.splitTextToSize(introText, pageWidth - 30);
      doc.text(splitIntro, 15, y);
      y += splitIntro.length * 6 + 4;

      // Encadré Employé
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(15, y, pageWidth - 30, 48, 3, 3, 'FD');

      let empY = y + 7;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 56, 100);
      doc.text(`Monsieur / Madame : ${currentEmp.lastName.toUpperCase()} ${currentEmp.firstName}`, 20, empY);
      
      empY += 7;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text(`Matricule RH : ${currentEmp.matricule}    |    Sexe : ${currentEmp.gender === 'M' ? 'Masculin' : 'Féminin'}    |    N° CNSS : ${currentEmp.cnss || 'En cours'}`, 20, empY);

      empY += 7;
      doc.text(`Département / Direction : ${currentEmp.department}`, 20, empY);

      empY += 7;
      doc.setFont('helvetica', 'bold');
      doc.text(`Date d'Engagement (Entrée) : ${entryDate}`, 20, empY);

      empY += 7;
      doc.text(`Date de Fin de Service (Sortie) : ${exitDate}`, 20, empY);

      empY += 7;
      doc.setFont('helvetica', 'normal');
      doc.text(`Motif de fin de service : ${departureReason}`, 20, empY);

      y += 56;

      // Section Fonctions Occupées (Art. 168 exige les emplois occupés)
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 56, 100);
      doc.text('EMPLOIS ET FONCTIONS SUCCESSIVEMENT OCCUPÉS :', 15, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      const posText = `Pendant toute la durée de son service au sein de notre établissement, l'intéressé(e) a exercé la fonction de : "${positionsHeld}" avec dévouement et compétence.`;
      const splitPos = doc.splitTextToSize(posText, pageWidth - 30);
      doc.text(splitPos, 15, y);
      y += splitPos.length * 5 + 8;

      // Déclaration de libération légale
      doc.setFont('helvetica', 'normal');
      const freeText = `Conformément aux dispositions de l'Article 168 de la Loi n° 015/2002 portant Code du Travail en République Démocratique du Congo, nous certifions que l'intéressé(e) quitte notre société libre de tout engagement envers elle.`;
      const splitFree = doc.splitTextToSize(freeText, pageWidth - 30);
      doc.text(splitFree, 15, y);
      y += splitFree.length * 5 + 6;

      if (includeSoldeQuittance) {
        doc.setFillColor(236, 253, 245);
        doc.setDrawColor(167, 243, 208);
        doc.roundedRect(15, y, pageWidth - 30, 16, 2, 2, 'FD');
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(6, 95, 70);
        doc.setFontSize(8.5);
        doc.text('ATTESTATION POUR SOLDE DE TOUT COMPTE :', 20, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.text('L\'entreprise confirme que le salarié a perçu l\'intégralité de son décompte final (salaires, pécules de congé et indemnités légales).', 20, y + 11);
        y += 22;
      } else {
        y += 4;
      }

      // Clôture
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`En foi de quoi, la présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.`, 15, y);
      y += 12;

      // Fait à Kinshasa le...
      doc.text(`Fait à ${issueCity}, le ${issueDate}`, pageWidth - 20, y, { align: 'right' });
      y += 10;

      // Cadre de Signature & Sceau
      const sigY = y;
      doc.setDrawColor(203, 213, 225);
      doc.rect(pageWidth - 85, sigY, 70, 35);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 56, 100);
      doc.text('POUR L\'EMPLOYEUR :', pageWidth - 80, sigY + 6);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(signerTitle, pageWidth - 80, sigY + 11);
      doc.text(company.name, pageWidth - 80, sigY + 15);

      doc.setTextColor(16, 185, 129);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('[SIGNÉ ÉLECTRONIQUEMENT]', pageWidth - 80, sigY + 24);

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`ID Hash: KZ-CERT-${Date.now().toString(36).toUpperCase()}`, pageWidth - 80, sigY + 30);

      // Footer
      doc.setFillColor(241, 245, 249);
      doc.rect(0, 282, pageWidth, 15, 'F');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Document généré conformément au Code du Travail RDC par NovarisPay ERP System.', 15, 290);
      doc.text(`Page 1/1 — Certificat RH N° CERT-${Date.now().toString().slice(-6)}`, pageWidth - 15, 290, { align: 'right' });

      // Save PDF
      const filename = `Attestation_Fin_Service_${currentEmp.lastName}_${currentEmp.matricule}.pdf`;
      doc.save(filename);

      // Save to GED & Audit Trail
      const newDoc: CompanyDocument = {
        id: `DOC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        title: `Attestation de Fin de Service - ${currentEmp.lastName} ${currentEmp.firstName}`,
        category: 'Actes Administratifs & PV',
        employeeMatricule: currentEmp.matricule,
        employeeName: `${currentEmp.lastName} ${currentEmp.firstName}`,
        department: currentEmp.department,
        uploadDate: issueDate,
        fileType: 'PDF',
        fileSize: '1.2 MB',
        confidentiality: 'CONFIDENTIEL_RH',
        tags: ['Attestation', 'Fin de Service', 'Art. 168', 'Code du Travail RDC', currentEmp.matricule],
        status: 'VALID',
        notes: `Délivrée le ${issueDate} pour motif: ${departureReason}. Transmis à l'employé.`,
      };

      await logAuditEvent(
        'CREATE',
        'EMPLOYEES',
        `Génération Attestation de Fin de Service (Art. 168) pour ${currentEmp.lastName} (${currentEmp.matricule})`,
        signerName,
        'GESTIONNAIRE_RH',
        currentEmp.id,
        null,
        newDoc
      );

      if (onDocumentGenerated) {
        onDocumentGenerated(newDoc);
      }

      setSuccessMessage(`L'attestation a été générée avec succès pour ${currentEmp.lastName} ${currentEmp.firstName} et enregistrée dans la GED !`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error('Erreur génération attestation:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="bg-[#1F3864] px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-400/40">
              <Award className="w-6 h-6 text-amber-400 stroke-[1.75]" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide flex items-center gap-2">
                <span>Génération d'Attestation de Fin de Service</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/30">
                  Art. 168 Code du Travail RDC
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Certificat de travail officiel libérant le salarié de tout engagement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition text-white"
          >
            <X className="w-5 h-5 stroke-[1.75]" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 text-slate-800">
          {/* Form Options Column */}
          <div className="lg:col-span-5 space-y-4 text-xs">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 stroke-[1.75]" />
              <div>
                <strong>Exigence Légale RDC :</strong> À l'expiration du contrat, l'employeur a l'obligation légale (Art. 168) de délivrer un certificat de travail mentionnant exclusivement la date d'entrée, de sortie et les fonctions occupées.
              </div>
            </div>

            {/* Select Employee */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#1F3864] stroke-[1.75]" />
                <span>Employé Concerné</span>
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#1F3864] focus:outline-none"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.matricule} — {emp.lastName.toUpperCase()} {emp.firstName} ({emp.department})
                  </option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 stroke-[1.75]" />
                  <span>Date d'Entrée</span>
                </label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-[#1F3864] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 stroke-[1.75]" />
                  <span>Date de Sortie</span>
                </label>
                <input
                  type="date"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-[#1F3864] focus:outline-none"
                />
              </div>
            </div>

            {/* Departure Reason */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Motif de Fin de Service</label>
              <select
                value={departureReason}
                onChange={(e) => setDepartureReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-[#1F3864] focus:outline-none"
              >
                <option value="Fin de contrat à durée déterminée (CDD)">Fin de contrat à durée déterminée (CDD)</option>
                <option value="Démission à l'initiative du travailleur">Démission à l'initiative du travailleur</option>
                <option value="Licenciement pour motifs économiques / réorganisation">Licenciement pour motifs économiques</option>
                <option value="Licenciement avec préavis">Licenciement avec préavis</option>
                <option value="Résiliation d'un commun accord (Rupture conventionnelle)">Résiliation d'un commun accord</option>
                <option value="Départ à la retraite de l'agent">Départ à la retraite</option>
              </select>
            </div>

            {/* Positions Held */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Postes & Fonctions Occupés</label>
              <textarea
                rows={2}
                value={positionsHeld}
                onChange={(e) => setPositionsHeld(e.target.value)}
                placeholder="Ex: Ingénieur Réseaux, Responsable d'Exploitation"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-[#1F3864] focus:outline-none"
              />
            </div>

            {/* Solde de tout compte checkbox */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">Attestation de Solde de Tout Compte</span>
                <span className="text-[10px] text-slate-500">Inclure la mention d'apurement intégral des indemnités</span>
              </div>
              <input
                type="checkbox"
                checked={includeSoldeQuittance}
                onChange={(e) => setIncludeSoldeQuittance(e.target.checked)}
                className="w-4 h-4 text-[#1F3864] rounded focus:ring-[#1F3864]"
              />
            </div>

            {/* Signer Config */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">Nom du Signataire</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-700 text-[11px]">Qualité du Signataire</label>
                <input
                  type="text"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs text-slate-900"
                />
              </div>
            </div>

            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[1.75]" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>

          {/* Document Preview Column */}
          <div className="lg:col-span-7 bg-slate-100 p-4 rounded-xl border border-slate-200 flex flex-col justify-between overflow-y-auto">
            <div className="bg-white p-6 rounded-lg shadow border border-slate-300 font-sans text-xs space-y-4">
              {/* Header */}
              <div className="border-b pb-3 flex justify-between items-start">
                <div>
                  <h3 className="font-black text-[#1F3864] text-base uppercase">{company.name}</h3>
                  <p className="text-[10px] text-slate-500">
                    {company.address} • N° RCCM: {company.rccm || 'CD/KIN/RCCM/14-B-0123'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    N° ID.NAT: {company.idNat || '01-93-N45100P'} • CNSS: {company.cnssEmployerNumber || '1014850021'}
                  </p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold bg-[#1F3864] text-white px-2 py-0.5 rounded">
                    DOCUMENT OFFICIEL
                  </span>
                  <DocumentBarcode compact value="NVP-CERT-2026-000102-4F81A3" documentType="ATTESTATION RH" />
                </div>
              </div>

              {/* Title */}
              <div className="text-center bg-slate-50 py-3 rounded border border-slate-200 space-y-0.5">
                <h2 className="font-black text-sm text-[#1F3864] uppercase tracking-wider">
                  ATTESTATION DE FIN DE SERVICE
                </h2>
                <p className="text-[9px] font-bold text-[#BF9000] uppercase">
                  (Certificat de travail - Article 168 du Code du Travail RDC)
                </p>
              </div>

              {/* Content */}
              {currentEmp ? (
                <div className="space-y-3 text-[11px] leading-relaxed text-slate-700">
                  <p>
                    Je soussigné(e), <strong>{signerName}</strong>, agissant en qualité de <strong>{signerTitle}</strong> de la société <strong>{company.name}</strong>, certifie par la présente que :
                  </p>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-sans space-y-1">
                    <div>
                      <strong>Salarié(e) :</strong> {currentEmp.lastName.toUpperCase()} {currentEmp.firstName} (Matricule : <span className="font-mono">{currentEmp.matricule}</span>)
                    </div>
                    <div>
                      <strong>N° CNSS :</strong> <span className="font-mono">{currentEmp.cnss || 'Non renseigné'}</span> | <strong>Département :</strong> {currentEmp.department}
                    </div>
                    <div>
                      <strong>Période de Service :</strong> Du <span className="font-bold">{entryDate}</span> au <span className="font-bold">{exitDate}</span>
                    </div>
                    <div>
                      <strong>Motif de fin de service :</strong> {departureReason}
                    </div>
                  </div>

                  <div>
                    <strong>Emplois & Fonctions occupés :</strong>
                    <p className="text-slate-900 font-semibold bg-amber-50/60 p-2 rounded border border-amber-200/60 mt-1">
                      "{positionsHeld}"
                    </p>
                  </div>

                  <p>
                    Conformément aux dispositions de l'Article 168 de la Loi n° 015/2002 portant Code du Travail en RDC, nous certifions que l'intéressé(e) quitte notre société <strong>libre de tout engagement envers elle</strong>.
                  </p>

                  {includeSoldeQuittance && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-[10px] text-emerald-900 font-semibold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[1.75]" />
                      <span>Attestation d'apurement : Le salarié a perçu l'intégralité de son décompte final et indemnités légales.</span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-between items-end border-t border-slate-100">
                    <div className="text-[10px] text-slate-400">
                      Généré via NovarisPay ERP System RDC
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] block font-bold text-slate-800">Fait à {issueCity}, le {issueDate}</span>
                      <div className="mt-2 border border-slate-300 p-2 rounded bg-slate-50 inline-block text-[10px] text-left">
                        <span className="font-bold text-[#1F3864] block">POUR L'EMPLOYEUR</span>
                        <span className="text-emerald-600 font-bold block text-[9px]">✓ SIGNÉ ÉLECTRONIQUEMENT</span>
                        <span className="text-slate-400 text-[8px] font-mono">Hash: KZ-CERT-VERIFIED</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400">Veuillez sélectionner un employé</div>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-4 flex items-center justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition"
              >
                Annuler
              </button>
              <button
                onClick={handleGeneratePDF}
                disabled={downloading || !currentEmp}
                className="px-5 py-2.5 bg-[#1F3864] hover:bg-[#152747] text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-amber-400 stroke-[1.75]" />
                <span>{downloading ? 'Génération du PDF...' : 'Télécharger le PDF & Enregistrer dans la GED'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
