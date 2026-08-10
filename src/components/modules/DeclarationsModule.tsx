/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * Module Déclarations Gouvernementales (DGI, CNSS, INPP, ONEM) & Lettres de Transmission Officielles
 */

import React, { useEffect, useState } from 'react';
import { getPayrollRuns, getPayslipsForRun } from '../../services/payrollService';
import { PayrollRun, Payslip } from '../../types/payroll';
import { getCompanyConfig, CompanyConfig } from '../../services/companyService';
import { jsPDF } from 'jspdf';
import { formatCDF, formatUSD, safeNumber } from '../../utils/documentFormatter';
import { FileCheck, Download, FileSpreadsheet, Building2, Printer, Send, History, CheckCircle2, Clock } from 'lucide-react';
import { logAuditEvent } from '../../services/auditService';

export interface TransmissionLetter {
  id: string; // e.g. TRM-2026-CNSS-07
  organism: 'CNSS' | 'DGI_IRPP' | 'INPP' | 'ONEM';
  recipientTitle: string; // e.g. À Monsieur le Directeur Provincial de la CNSS / Kinshasa-Gombe
  period: string; // e.g. Juillet 2026
  totalAmountCDF: number;
  paymentMode: 'Virement Bancaire' | 'Chèque Certifié' | 'Bordereau de Versement';
  bankReference: string;
  generatedDate: string;
  status: 'GENERATED' | 'TRANSMITTED' | 'ACKNOWLEDGED';
  customBodyText?: string;
}

export const DeclarationsModule: React.FC = () => {
  const [company, setCompany] = useState<CompanyConfig>(getCompanyConfig());
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>('');
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [activeTab, setActiveTab] = useState<'DECLARATIONS' | 'TRANSMISSION_LETTERS' | 'HISTORY'>('DECLARATIONS');
  const [selectedDoc, setSelectedDoc] = useState<'DGI_IRPP' | 'CNSS' | 'INPP' | 'ONEM'>('CNSS');

  // Transmission Letters State
  const [transmissionLetters, setTransmissionLetters] = useState<TransmissionLetter[]>([
    {
      id: 'TRM-2026-CNSS-07',
      organism: 'CNSS',
      recipientTitle: 'À Monsieur le Directeur Provincial de la CNSS / Kinshasa-Gombe',
      period: 'Juillet 2026',
      totalAmountCDF: 4850000,
      paymentMode: 'Virement Bancaire',
      bankReference: 'RAW-VIR-2026-9901',
      generatedDate: '2026-07-28',
      status: 'TRANSMITTED',
    },
    {
      id: 'TRM-2026-DGI-07',
      organism: 'DGI_IRPP',
      recipientTitle: 'À Monsieur le Chef de Centre des Impôts (DGI) / Gombe',
      period: 'Juillet 2026',
      totalAmountCDF: 8420000,
      paymentMode: 'Chèque Certifié',
      bankReference: 'CHQ-EQU-8812',
      generatedDate: '2026-07-28',
      status: 'GENERATED',
    },
  ]);

  const [selectedLetter, setSelectedLetter] = useState<TransmissionLetter | null>(transmissionLetters[0]);
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);

  // Form state for generating a new Transmission Letter
  const [letterForm, setLetterForm] = useState({
    organism: 'CNSS' as 'CNSS' | 'DGI_IRPP' | 'INPP' | 'ONEM',
    recipientTitle: 'À Monsieur le Directeur Provincial de la CNSS / Kinshasa-Gombe',
    paymentMode: 'Virement Bancaire' as 'Virement Bancaire' | 'Chèque Certifié' | 'Bordereau de Versement',
    bankReference: 'VIR-BCDC-2026-01',
  });

  useEffect(() => {
    setCompany(getCompanyConfig());
    async function loadRuns() {
      const list = await getPayrollRuns();
      setRuns(list);
      if (list.length > 0) setSelectedRunId(list[0].id || '');
    }
    loadRuns();
  }, []);

  useEffect(() => {
    async function loadPayslips() {
      if (!selectedRunId) return;
      const list = await getPayslipsForRun(selectedRunId);
      setPayslips(list);
    }
    loadPayslips();
  }, [selectedRunId]);

  const activeRun = runs.find((r) => r.id === selectedRunId);

  // Totaux
  const totalTaxableBase = payslips.reduce((acc, p) => acc + safeNumber(p.taxableBaseCDF), 0);
  const totalIRPP = payslips.reduce((acc, p) => acc + safeNumber(p.irppFinalCDF), 0);
  const totalCNSSEmployee = payslips.reduce((acc, p) => acc + safeNumber(p.cnssEmployeeCDF), 0);
  const totalCNSSEmployer = payslips.reduce((acc, p) => acc + safeNumber(p.cnssEmployerCDF, Math.round(safeNumber(p.grossSalaryCDF) * 0.09)), 0);
  const totalINPPEmployer = payslips.reduce((acc, p) => acc + safeNumber(p.inppEmployerCDF, Math.round(safeNumber(p.grossSalaryCDF) * 0.02)), 0);
  const totalONEMEmployer = payslips.reduce((acc, p) => acc + safeNumber(p.onemEmployerCDF, Math.round(safeNumber(p.grossSalaryCDF) * 0.002)), 0);

  const getCurrentDocAmount = (organism: 'CNSS' | 'DGI_IRPP' | 'INPP' | 'ONEM') => {
    switch (organism) {
      case 'DGI_IRPP':
        return totalIRPP;
      case 'CNSS':
        return totalCNSSEmployee + totalCNSSEmployer;
      case 'INPP':
        return totalINPPEmployer;
      case 'ONEM':
        return totalONEMEmployer;
    }
  };

  const handleGenerateTransmissionLetter = (e: React.FormEvent) => {
    e.preventDefault();
    const periodStr = activeRun?.period || 'Juillet 2026';
    const amount = getCurrentDocAmount(letterForm.organism);

    const newLetter: TransmissionLetter = {
      id: `TRM-2026-${letterForm.organism}-${Math.floor(Math.random() * 899 + 100)}`,
      organism: letterForm.organism,
      recipientTitle: letterForm.recipientTitle,
      period: periodStr,
      totalAmountCDF: amount,
      paymentMode: letterForm.paymentMode,
      bankReference: letterForm.bankReference,
      generatedDate: new Date().toISOString().split('T')[0],
      status: 'GENERATED',
    };

    setTransmissionLetters([newLetter, ...transmissionLetters]);
    setSelectedLetter(newLetter);
    setIsLetterModalOpen(false);

    logAuditEvent(
      'GENERATE_LETTER',
      'DECLARATIONS',
      `Génération de la lettre de transmission ${newLetter.id} pour la ${newLetter.organism}`,
      'finance@novarispay.cd',
      'RESPONSABLE_FINANCIER'
    );
  };

  const exportCSV = () => {
    let csv = 'Matricule,Nom,Brut,BaseImposable,IRPP,BaseCNSS,CNSSEmploye,CNSSEmployeur,INPP,ONEM\n';
    payslips.forEach((p) => {
      csv += `"${p.employeeMatricule}","${p.employeeName}",${safeNumber(p.grossSalaryCDF)},${safeNumber(p.taxableBaseCDF)},${safeNumber(p.irppFinalCDF)},${safeNumber(p.cnssBaseCDF)},${safeNumber(p.cnssEmployeeCDF)},${safeNumber(p.cnssEmployerCDF)},${safeNumber(p.inppEmployerCDF)},${safeNumber(p.onemEmployerCDF)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Declaration_${selectedDoc}_${activeRun?.period || ''}.csv`;
    a.click();
  };

  const exportPDF = () => {
    const doc = new jsPDF();

    // NovarisPay Brand Emblem / Logo in Header
    doc.setFillColor(31, 56, 100);
    doc.roundedRect(14, 12, 12, 12, 2, 2, 'F');
    doc.setFillColor(191, 144, 0);
    doc.rect(21, 15, 3, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.text('N', 16, 20.5);

    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(31, 56, 100);
    doc.text(company.name.toUpperCase(), 30, 18);

    doc.setFontSize(9);
    doc.setFont('times', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`RCCM : ${company.rccm} | ID.NAT : ${company.idNat} | NIF : ${company.nif}`, 30, 24);

    doc.setFontSize(11);
    doc.setFont('times', 'bold');
    doc.setTextColor(31, 56, 100);
    doc.text(`DÉCLARATION RÉCAPITULATIVE LÉGALE RDC : ${selectedDoc}`, 14, 34);
    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Période : ${activeRun?.period || ''} | Échéance légale : 15 du mois suivant`, 14, 40);

    let y = 50;
    doc.setFontSize(9.5);
    doc.setFont('times', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Matricule & Nom Salarié', 14, y);
    doc.text('Brut (CDF)', 140, y, { align: 'right' });
    doc.text('Montant Dû (CDF)', 192, y, { align: 'right' });
    doc.line(14, y + 2, 196, y + 2);
    y += 8;

    doc.setFont('times', 'normal');
    payslips.forEach((p) => {
      const gross = safeNumber(p.grossSalaryCDF);
      const val =
        selectedDoc === 'DGI_IRPP'
          ? safeNumber(p.irppFinalCDF)
          : selectedDoc === 'CNSS'
          ? safeNumber(p.cnssEmployeeCDF) + safeNumber(p.cnssEmployerCDF, Math.round(gross * 0.09))
          : selectedDoc === 'INPP'
          ? safeNumber(p.inppEmployerCDF, Math.round(gross * 0.02))
          : safeNumber(p.onemEmployerCDF, Math.round(gross * 0.002));

      doc.text(`${p.employeeMatricule} - ${p.employeeName}`, 14, y);
      doc.text(formatCDF(gross), 140, y, { align: 'right' });
      doc.text(formatCDF(val), 192, y, { align: 'right' });
      y += 6;
    });

    doc.save(`Declaration_${selectedDoc}_${activeRun?.period || ''}.pdf`);
  };

  const [isEditingTextModalOpen, setIsEditingTextModalOpen] = useState(false);
  const [editingText, setEditingText] = useState('');

  const handleOpenEditText = () => {
    if (!selectedLetter) return;
    const defaultBody = `Monsieur le Directeur / Chef de Service,\n\nNous avons l'honneur de vous transmettre, par la présente, la déclaration officielle des cotisations dues au titre du mois de ${selectedLetter.period} pour l'ensemble du personnel employé par notre société ${company.name}.\n\nLe montant total s'élève à : ${formatCDF(selectedLetter.totalAmountCDF)} (Francs Congolais).\n\nLe règlement afférent a été effectué par : ${selectedLetter.paymentMode} (Référence de la transaction : ${selectedLetter.bankReference}).\n\nVous en souhaitant bonne réception, nous vous prions d'agréer, Monsieur le Directeur, l'expression de nos sentiments très distingués.`;

    setEditingText(selectedLetter.customBodyText || defaultBody);
    setIsEditingTextModalOpen(true);
  };

  const handleSaveEditedText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLetter) return;

    const updated = transmissionLetters.map((l) =>
      l.id === selectedLetter.id ? { ...l, customBodyText: editingText } : l
    );
    setTransmissionLetters(updated);
    setSelectedLetter({ ...selectedLetter, customBodyText: editingText });
    setIsEditingTextModalOpen(false);

    logAuditEvent(
      'UPDATE_LETTER_TEXT',
      'DECLARATIONS',
      `Modification du corps de texte personnalisé de la lettre ${selectedLetter.id}`,
      'finance@novarispay.cd',
      'RESPONSABLE_FINANCIER'
    );
  };

  const exportLetterPDF = () => {
    if (!selectedLetter) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    // NovarisPay Brand Emblem / Logo in Header
    doc.setFillColor(31, 56, 100);
    doc.roundedRect(20, 15, 12, 12, 2, 2, 'F');
    doc.setFillColor(191, 144, 0);
    doc.rect(27, 18, 3, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.text('N', 22, 23.5);

    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(31, 56, 100);
    doc.text(company.name.toUpperCase(), 36, 20);

    doc.setFontSize(9);
    doc.setFont('times', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`${company.address} — ${company.cityProvince}`, 36, 25);
    doc.text(`RCCM: ${company.rccm} | ID.NAT: ${company.idNat} | NIF: ${company.nif}`, 36, 29);

    // Date & Ref
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9.5);
    doc.setFont('times', 'bold');
    doc.text(`Réf N° : ${selectedLetter.id}`, 20, 42);
    doc.setFont('times', 'normal');
    doc.text(`Fait à ${company.cityProvince}, le ${selectedLetter.generatedDate}`, 120, 42);

    // Destinataire Box
    doc.rect(110, 48, 85, 25);
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text(selectedLetter.recipientTitle, 114, 55, { maxWidth: 78 });

    // Objet
    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(31, 56, 100);
    doc.text(`OBJET : TRANSMISSION DE LA DÉCLARATION LÉGALE - ${selectedLetter.organism}`, 20, 82);
    doc.text(`PÉRIODE : ${selectedLetter.period.toUpperCase()}`, 20, 88);

    doc.setDrawColor(200, 200, 200);
    doc.line(20, 92, 195, 92);

    // Body
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);

    const defaultBody = `Monsieur le Directeur / Chef de Service,\n\nNous avons l'honneur de vous transmettre, par la présente, la déclaration officielle des cotisations dues au titre du mois de ${selectedLetter.period} pour l'ensemble du personnel de notre société ${company.name}.\n\nLe montant total s'élève à : ${formatCDF(selectedLetter.totalAmountCDF)} (Francs Congolais).\n\nLe règlement de cette obligation a été effectué par : ${selectedLetter.paymentMode} (Réf. Règlement : ${selectedLetter.bankReference}).\n\nVous en souhaitant bonne réception, nous vous prions d'agréer, Monsieur le Directeur, l'expression de nos sentiments très distingués.`;

    const body = selectedLetter.customBodyText || defaultBody;

    const splitBody = doc.splitTextToSize(body, 175);
    doc.text(splitBody, 20, 102);

    // Signature Area
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text('POUR LA DIRECTION GÉNÉRALE', 20, 190);
    doc.text(company.signerName, 20, 210);
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text(company.signerTitle, 20, 215);

    // Accusé de réception box - padded & wrapped to fit completely inside box
    doc.rect(120, 185, 75, 40);
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(31, 56, 100);
    doc.text("ACCUSÉ DE RÉCEPTION DE L'ORGANISME", 123, 192, { maxWidth: 68 });
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Sceau, Date & Cachet à la réception :', 123, 204);
    doc.text('Signature de l\'Agent Récepteur :', 123, 214);

    doc.save(`Lettre_Transmission_${selectedLetter.id}.pdf`);
  };

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-transmission-letter, #printable-transmission-letter * {
            visibility: visible;
          }
          #printable-transmission-letter {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-[#1F3864]">Déclarations Gouvernementales RDC & Lettres Officiels</h1>
            <span className="bg-[#1F3864] text-white text-[10px] font-black px-2 py-0.5 rounded font-mono">
              ÉCHÉANCE 15 DU MOIS
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            CNSS, INPP, ONEM, DGI (IPR) & génération automatique des lettres de transmission au format administratif RDC.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-2 text-xs bg-white font-bold text-slate-800"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} ({r.period})
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsLetterModalOpen(true)}
            className="bg-[#1F3864] hover:bg-[#152747] text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow"
          >
            <Send className="w-4 h-4 text-[#BF9000]" />
            <span>Générer Lettre de Transmission</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('DECLARATIONS')}
          className={`pb-3 px-4 border-b-2 flex items-center space-x-2 transition ${
            activeTab === 'DECLARATIONS'
              ? 'border-[#1F3864] text-[#1F3864]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Synthèse & Bordereaux de Cotisations</span>
        </button>

        <button
          onClick={() => setActiveTab('TRANSMISSION_LETTERS')}
          className={`pb-3 px-4 border-b-2 flex items-center space-x-2 transition ${
            activeTab === 'TRANSMISSION_LETTERS'
              ? 'border-[#1F3864] text-[#1F3864]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Send className="w-4 h-4 text-blue-600" />
          <span>Lettres de Transmission Officielles ({transmissionLetters.length})</span>
        </button>
      </div>

      {/* TAB 1: DECLARATIONS SUMMARY */}
      {activeTab === 'DECLARATIONS' && (
        <div className="space-y-6">
          {/* Organism Selector */}
          <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 border shadow-sm text-xs font-bold">
            <button
              onClick={() => setSelectedDoc('CNSS')}
              className={`flex-1 py-2 rounded-lg transition ${
                selectedDoc === 'CNSS' ? 'bg-[#1F3864] text-white shadow' : 'text-slate-600'
              }`}
            >
              CNSS (Sécurité Sociale 5% + 9%)
            </button>
            <button
              onClick={() => setSelectedDoc('DGI_IRPP')}
              className={`flex-1 py-2 rounded-lg transition ${
                selectedDoc === 'DGI_IRPP' ? 'bg-[#1F3864] text-white shadow' : 'text-slate-600'
              }`}
            >
              DGI - Impôt sur le Revenu (IPR)
            </button>
            <button
              onClick={() => setSelectedDoc('INPP')}
              className={`flex-1 py-2 rounded-lg transition ${
                selectedDoc === 'INPP' ? 'bg-[#1F3864] text-white shadow' : 'text-slate-600'
              }`}
            >
              INPP (Formation Pro. 3%)
            </button>
            <button
              onClick={() => setSelectedDoc('ONEM')}
              className={`flex-1 py-2 rounded-lg transition ${
                selectedDoc === 'ONEM' ? 'bg-[#1F3864] text-white shadow' : 'text-slate-600'
              }`}
            >
              ONEM (Office Emploi 0.2%)
            </button>
          </div>

          {/* Cards metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] text-slate-500 font-bold uppercase">Effectif Déclaré</span>
              <div className="text-2xl font-black text-[#1F3864] mt-1">{payslips.length} Salariés</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] text-slate-500 font-bold uppercase">Assiette de Cotisation</span>
              <div className="text-xl font-black text-slate-900 mt-1">{totalTaxableBase.toLocaleString()} FC</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] text-slate-500 font-bold uppercase">Montant Total Net à Verser</span>
              <div className="text-xl font-black text-emerald-700 mt-1">
                {getCurrentDocAmount(selectedDoc).toLocaleString()} FC
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h2 className="font-black text-sm text-[#1F3864]">Détail du Bordereau Mensuel {selectedDoc}</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={exportCSV}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 border"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={exportPDF}
                  className="bg-[#1F3864] text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 shadow"
                >
                  <Download className="w-3.5 h-3.5 text-[#BF9000]" />
                  <span>PDF Bordereau</span>
                </button>
              </div>
            </div>

            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#1F3864] text-white uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Salarié</th>
                  <th className="py-3 px-4">Salaire Brut</th>
                  <th className="py-3 px-4">Assiette Légal</th>
                  <th className="py-3 px-4 text-right">Cotisation Dûe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payslips.map((p) => {
                  const val =
                    selectedDoc === 'DGI_IRPP'
                      ? p.irppFinalCDF
                      : selectedDoc === 'CNSS'
                      ? p.cnssEmployeeCDF + p.cnssEmployerCDF
                      : selectedDoc === 'INPP'
                      ? p.inppEmployerCDF
                      : p.onemEmployerCDF;
                  return (
                    <tr key={p.id || p.employeeId} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {p.employeeMatricule} — {p.employeeName}
                      </td>
                      <td className="py-3 px-4 font-semibold">{p.grossSalaryCDF.toLocaleString()} FC</td>
                      <td className="py-3 px-4">{p.taxableBaseCDF.toLocaleString()} FC</td>
                      <td className="py-3 px-4 text-right font-black text-[#1F3864]">{val.toLocaleString()} FC</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSMISSION LETTERS */}
      {activeTab === 'TRANSMISSION_LETTERS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Letters List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <h2 className="font-black text-xs text-[#1F3864] border-b pb-2 uppercase tracking-wider">
              Courriers de Transmission Générés
            </h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {transmissionLetters.map((lettr) => (
                <div
                  key={lettr.id}
                  onClick={() => setSelectedLetter(lettr)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition space-y-1 ${
                    selectedLetter?.id === lettr.id
                      ? 'bg-[#1F3864] text-white border-[#1F3864] shadow-md'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] opacity-80">{lettr.id}</span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-2 py-0.5 rounded-full font-bold">
                      {lettr.organism}
                    </span>
                  </div>
                  <div className="font-bold text-sm">{lettr.recipientTitle}</div>
                  <div className="text-[11px] opacity-80">Montant: {formatCDF(lettr.totalAmountCDF ?? 0)}</div>
                  <div className="text-[10px] opacity-60 font-mono">Date: {lettr.generatedDate}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Letter Preview & Direct Print */}
          <div className="lg:col-span-2">
            {selectedLetter ? (
              <div className="bg-white rounded-2xl border border-slate-300 shadow-xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <div>
                    <h2 className="font-black text-[#1F3864] text-sm">Lettre de Transmission Officielle</h2>
                    <p className="text-xs text-slate-500">Format Administratif RDC</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleOpenEditText}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 shadow"
                    >
                      <span>Modifier le Texte</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 shadow"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#BF9000]" />
                      <span>Imprimer Direct</span>
                    </button>
                    <button
                      onClick={exportLetterPDF}
                      className="bg-[#1F3864] text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1 shadow"
                    >
                      <Download className="w-3.5 h-3.5 text-[#BF9000]" />
                      <span>Télécharger PDF</span>
                    </button>
                  </div>
                </div>

                {/* Printable Cover Letter Template */}
                <div
                  id="printable-transmission-letter"
                  className="p-8 border-2 border-slate-800 rounded-xl bg-white text-slate-900 space-y-6 font-serif"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                    <div className="flex items-center space-x-3">
                      {company.logoUrl ? (
                        <img src={company.logoUrl} alt="Company Logo" className="h-12 w-auto object-contain" />
                      ) : (
                        <div className="w-10 h-10 bg-[#1F3864] text-white rounded font-black flex items-center justify-center font-sans text-xs">
                          KP
                        </div>
                      )}
                      <div>
                        <div className="font-black text-lg text-[#1F3864] uppercase">{company.name}</div>
                        <div className="text-xs text-slate-700 font-sans">{company.address} — {company.cityProvince}</div>
                        <div className="text-[10px] font-mono text-slate-500 font-sans">
                          RCCM : {company.rccm} | ID.NAT : {company.idNat} | NIF : {company.nif}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-sans text-xs">
                      <div className="font-bold">Réf N° : {selectedLetter.id}</div>
                      <div className="text-slate-600">Date : {selectedLetter.generatedDate}</div>
                    </div>
                  </div>

                  {/* Recipient */}
                  <div className="flex justify-end pt-4">
                    <div className="p-4 border-2 border-slate-800 rounded-lg bg-slate-50 max-w-sm text-xs font-bold font-sans">
                      {selectedLetter.recipientTitle}
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="text-xs font-bold font-sans uppercase text-[#1F3864] bg-slate-100 p-3 rounded border">
                    OBJET : TRANSMISSION DE LA DÉCLARATION LÉGALE — {selectedLetter.organism} ({selectedLetter.period})
                  </div>

                  {/* Body */}
                  <div className="text-xs leading-relaxed space-y-4 text-left whitespace-pre-line">
                    {selectedLetter.customBodyText ? (
                      selectedLetter.customBodyText
                    ) : (
                      <>
                        <p>Monsieur le Directeur / Chef de Service,</p>
                        <p>
                          Nous avons l'honneur de vous transmettre, par la présente, la déclaration officielle des cotisations
                          et obligations légales au titre du mois de <strong>{selectedLetter.period}</strong> pour l'ensemble du
                          personnel employé par notre société <strong>{company.name}</strong>.
                        </p>
                        <p>
                          Le montant total s'élève à :{' '}
                          <strong className="text-sm font-sans">{formatCDF(selectedLetter.totalAmountCDF)}</strong> (Francs
                          Congolais).
                        </p>
                        <p>
                          Le règlement afférent a été effectué par : <strong>{selectedLetter.paymentMode}</strong> (Référence de la
                          transaction : <span className="font-mono">{selectedLetter.bankReference}</span>).
                        </p>
                        <p>
                          Vous en souhaitant bonne réception, nous vous prions d'agréer, Monsieur le Directeur, l'expression de nos
                          sentiments très distingués.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-6 pt-12 text-xs font-sans">
                    <div className="p-3 border rounded-lg bg-slate-50 space-y-1">
                      <span className="font-bold block uppercase text-[#1F3864]">POUR LA DIRECTION GÉNÉRALE</span>
                      <div className="font-bold text-slate-800 pt-2">{company.signerName}</div>
                      <div className="text-[10px] text-slate-500">{company.signerTitle}</div>
                      <div className="h-8 border-b border-dashed"></div>
                    </div>

                    <div className="p-3 border rounded-lg bg-slate-50 space-y-1">
                      <span className="font-bold block uppercase text-[#1F3864]">ACCUSÉ DE RÉCEPTION ORGANISME</span>
                      <div className="text-[10px] text-slate-500 pt-2">Sceau, Date & Signature à la Réception</div>
                      <div className="h-8 border-b border-dashed"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-12 border text-center text-slate-400 text-xs">
                Sélectionnez un courrier de transmission pour afficher et imprimer.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL NEW TRANSMISSION LETTER */}
      {isLetterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 text-xs">
            <h2 className="text-base font-bold text-[#1F3864]">Générer une Lettre de Transmission Officielle</h2>
            <form onSubmit={handleGenerateTransmissionLetter} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Organisme Destinataire *</label>
                <select
                  value={letterForm.organism}
                  onChange={(e) => setLetterForm({ ...letterForm, organism: e.target.value as any })}
                  className="w-full p-2 border rounded font-bold"
                >
                  <option value="CNSS">CNSS (Caisse Nationale de Sécurité Sociale)</option>
                  <option value="DGI_IRPP">DGI (Direction Générale des Impôts - IPR)</option>
                  <option value="INPP">INPP (Institut National de Préparation Professionnelle)</option>
                  <option value="ONEM">ONEM (Office National de l'Emploi)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Intitulé Officiel du Destinataire *</label>
                <input
                  type="text"
                  required
                  value={letterForm.recipientTitle}
                  onChange={(e) => setLetterForm({ ...letterForm, recipientTitle: e.target.value })}
                  className="w-full p-2 border rounded font-bold"
                  placeholder="ex: À Monsieur le Directeur Provincial de la CNSS / Kinshasa-Gombe"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Mode de Règlement *</label>
                  <select
                    value={letterForm.paymentMode}
                    onChange={(e) => setLetterForm({ ...letterForm, paymentMode: e.target.value as any })}
                    className="w-full p-2 border rounded font-bold"
                  >
                    <option value="Virement Bancaire">Virement Bancaire</option>
                    <option value="Chèque Certifié">Chèque Certifié</option>
                    <option value="Bordereau de Versement">Bordereau de Versement</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Référence du Paiement *</label>
                  <input
                    type="text"
                    required
                    value={letterForm.bankReference}
                    onChange={(e) => setLetterForm({ ...letterForm, bankReference: e.target.value })}
                    className="w-full p-2 border rounded font-mono"
                    placeholder="ex: RAW-VIR-2026-9901"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border rounded-xl flex items-center justify-between">
                <span className="font-bold text-slate-700">Montant Déclaré Calculé :</span>
                <span className="font-black text-emerald-700 text-sm">
                  {formatCDF(getCurrentDocAmount(letterForm.organism))}
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLetterModalOpen(false)}
                  className="px-4 py-2 border rounded-lg font-bold"
                >
                  Annuler
                </button>
                <button type="submit" className="px-5 py-2 bg-[#1F3864] text-white rounded-lg font-bold">
                  Générer le Courrier Officiel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDIT TRANSMISSION LETTER TEXT */}
      {isEditingTextModalOpen && selectedLetter && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-[#1F3864]">Personnaliser le Texte du Courrier</h2>
                <p className="text-xs text-slate-500">Transmission {selectedLetter.organism} — Réf: {selectedLetter.id}</p>
              </div>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                Personnalisation Officielle
              </span>
            </div>

            <form onSubmit={handleSaveEditedText} className="space-y-4">
              <div>
                <label className="block font-bold mb-1">Corps de texte de la Lettre de Transmission *</label>
                <textarea
                  required
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  className="w-full p-3 border rounded-xl h-56 font-serif text-xs leading-relaxed"
                  placeholder="Inscrire ou adapter le texte du courrier de transmission..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsEditingTextModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Annuler
                </button>
                <button type="submit" className="px-5 py-2 bg-[#1F3864] text-white rounded-xl font-bold shadow">
                  Mettre à jour la Lettre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
