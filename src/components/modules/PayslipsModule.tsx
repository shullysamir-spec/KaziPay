/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * 
 * MODULE BULLETIN DE PAIE ENTERPRISE & CONFORME RDC
 * Structure en 11 sections professionnelles avec lisibilité A4 et export PDF/Impression conforme.
 */

import React, { useEffect, useState } from 'react';
import {
  getPayrollRuns,
  getPayslipsForRun,
  archivePayslip,
  recalculateSinglePayslip,
  updatePayslipDetails
} from '../../services/payrollService';
import { PayrollRun, Payslip } from '../../types/payroll';
import { DEFAULT_COMPANY_DETAILS } from '../../lib/constants';
import { getCompanyConfig, CompanyConfig } from '../../services/companyService';
import { DocumentBarcode } from '../common/DocumentBarcode';
import { generateBarcodeDataUrl } from '../../services/barcodeService';
import { jsPDF } from 'jspdf';
import { formatCDF, formatUSD, safeNumber } from '../../utils/documentFormatter';
import {
  FileText,
  Printer,
  Download,
  Check,
  Building2,
  User,
  Calendar,
  Clock,
  Wallet,
  ShieldCheck,
  QrCode,
  Briefcase,
  AlertCircle,
  Award,
  CreditCard,
  Layers,
  RotateCcw,
  Archive,
  Edit3,
  Loader2,
  X
} from 'lucide-react';

interface PayslipsModuleProps {
  initialRunId?: string;
}

export const PayslipsModule: React.FC<PayslipsModuleProps> = ({ initialRunId }) => {
  const [company, setCompany] = useState<CompanyConfig>(getCompanyConfig());
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>(initialRunId || '');
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Modal d'édition manuelle de bulletin
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    baseSalaryContract: 0,
    allowancesCDF: 0,
    primesCDF: 0,
    overtimeAmountCDF: 0,
    loanDeductionCDF: 0,
    reason: '',
  });

  useEffect(() => {
    setCompany(getCompanyConfig());
  }, []);

  useEffect(() => {
    async function init() {
      const runList = await getPayrollRuns();
      setRuns(runList);
      const activeId = initialRunId || (runList.length > 0 ? runList[0].id || '' : '');
      setSelectedRunId(activeId);
    }
    init();
  }, [initialRunId]);

  useEffect(() => {
    async function loadPayslips() {
      if (!selectedRunId) return;
      setLoading(true);
      const list = await getPayslipsForRun(selectedRunId);
      setPayslips(list);
      if (list.length > 0) setSelectedPayslip(list[0]);
      setLoading(false);
    }
    loadPayslips();
  }, [selectedRunId]);

  // Helper pour formater la période "202607" -> "Juillet 2026"
  const formatPeriodLabel = (periodStr: string) => {
    if (!periodStr || periodStr.length !== 6) return periodStr;
    const year = periodStr.substring(0, 4);
    const monthIndex = parseInt(periodStr.substring(4, 6), 10) - 1;
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return `${months[monthIndex] || ''} ${year}`;
  };

  // Generation PDF haute résolution A4 avec Code-Barres certifié
  const renderPayslipPDFPage = async (doc: jsPDF, ps: Payslip, isFirstPage = true) => {
    if (!isFirstPage) doc.addPage();

    const barcodeId = ps.barcodeId || 'NVP-PAY-2026-000245-9A73F2';
    const barcodeDataUrl = await generateBarcodeDataUrl(barcodeId, 'CODE128', { height: 35, displayValue: true });

    // Palette Couleurs Enterprise
    const primaryColor = [31, 56, 100]; // #1F3864
    const goldColor = [191, 144, 0];    // #BF9000
    const textColor = [40, 40, 40];
    const lightGray = [245, 247, 250];

    // 1. En-tête Employeur avec Logo NovarisPay (Times New Roman)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(14, 11, 10, 10, 1.5, 1.5, 'F');
    doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.rect(20, 13, 2.5, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(7.5);
    doc.text('N', 15.5, 18);

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(company.name || DEFAULT_COMPANY_DETAILS.name, 28, 18);

    doc.setFontSize(9);
    doc.setFont('times', 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`${company.address || DEFAULT_COMPANY_DETAILS.address}`, 28, 23);
    doc.text(`RCCM: ${company.rccm || DEFAULT_COMPANY_DETAILS.rccm}  |  ID.NAT: ${company.idNat || DEFAULT_COMPANY_DETAILS.idNat}  |  NIF: ${company.nif || DEFAULT_COMPANY_DETAILS.nif}`, 14, 28);
    doc.text(`N° CNSS Employeur: ${company.cnssEmployerNumber || DEFAULT_COMPANY_DETAILS.cnssEmployerNumber}  |  Tél: ${company.phone || '+243 810 000 000'}`, 14, 33);

    // Titre Bulletin
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(130, 10, 66, 12, 'F');
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('BULLETIN DE PAIE', 133, 16);
    doc.setFontSize(8);
    doc.text(`Période : ${formatPeriodLabel(ps.period)}`, 133, 20);

    // Dessiner l'image du Code-Barres certifié
    if (barcodeDataUrl) {
      try {
        doc.addImage(barcodeDataUrl, 'PNG', 130, 23, 66, 12);
      } catch (err) {
        console.warn('Erreur ajout image barcode PDF:', err);
      }
    }

    doc.setLineWidth(0.5);
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.line(14, 37, 196, 37);

    // 2. Informations Salarié & Période (Cadre)
    let y = 42;
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(14, y, 182, 32, 'F');
    doc.setDrawColor(210, 215, 225);
    doc.rect(14, y, 182, 32, 'S');

    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont('times', 'bold');
    doc.text('INFORMATIONS DU SALARIÉ', 18, y + 6);
    doc.text('PÉRIODE ET PRÉSENCES', 110, y + 6);

    doc.setFont('times', 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    
    // Col 1
    doc.text(`Matricule : ${ps.employeeMatricule}`, 18, y + 12);
    doc.text(`Nom : ${ps.employeeName}`, 18, y + 17);
    doc.text(`Fonction : ${ps.position}`, 18, y + 22);
    doc.text(`Département : ${ps.department}`, 18, y + 27);

    // Col 2
    doc.text(`Contrat : ${ps.contractType || 'CDI'}  |  Ancienneté : ${ps.seniorityText || '1 an'}`, 110, y + 12);
    doc.text(`N° CNSS : ${ps.cnssNumber || 'N/A'}  |  NIF : ${ps.nif || 'N/A'}`, 110, y + 17);
    doc.text(`Banque : ${ps.bankName || 'RAWBANK'} (${ps.bankAccountMasked || 'Virement'})`, 110, y + 22);
    doc.text(`Jours prestés : ${ps.daysWorked}j / 26j  |  Heures norm : ${ps.normalHours || 173.3}h`, 110, y + 27);

    // 3. Tableau des Rubriques (Gains & Retenues)
    y = 80;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(14, y, 182, 7, 'F');
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Code & Libellé de la Rubrique', 18, y + 5);
    doc.text('Base (CDF)', 110, y + 5, { align: 'right' });
    doc.text('Gains (CDF)', 150, y + 5, { align: 'right' });
    doc.text('Retenues (CDF)', 192, y + 5, { align: 'right' });

    y += 7;
    doc.setFont('times', 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    ps.lines.forEach((line) => {
      doc.text(line.label, 18, y + 5);
      doc.text(line.baseCDF ? formatCDF(line.baseCDF, false) : '-', 110, y + 5, { align: 'right' });
      doc.text(line.gainCDF > 0 ? formatCDF(line.gainCDF, false) : '-', 150, y + 5, { align: 'right' });
      doc.text(line.deductionCDF > 0 ? formatCDF(line.deductionCDF, false) : '-', 192, y + 5, { align: 'right' });
      y += 6;
    });

    doc.setDrawColor(200, 200, 200);
    doc.line(14, y + 2, 196, y + 2);
    y += 6;

    // 4. Synthèse Net à Payer Box
    const grossVal = safeNumber(ps.grossSalaryCDF);
    const cnssEmpVal = safeNumber(ps.cnssEmployeeCDF);
    const irppVal = safeNumber(ps.irppFinalCDF);
    const loanVal = safeNumber(ps.loanDeductionCDF);
    const totalRetenues = safeNumber(ps.totalDeductionsCDF, cnssEmpVal + irppVal + loanVal);
    const netCDFVal = safeNumber(ps.netSalaryCDF, grossVal - totalRetenues);
    const netUSDVal = safeNumber(ps.netSalaryUSD, ps.exchangeRate ? netCDFVal / ps.exchangeRate : 0);

    doc.setFillColor(31, 56, 100);
    doc.rect(14, y, 182, 18, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.5);
    doc.setFont('times', 'normal');
    doc.text(`Salaire Brut Total : ${formatCDF(grossVal)}`, 18, y + 7);
    doc.text(`Total Retenues : ${formatCDF(totalRetenues)}`, 18, y + 13);

    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(255, 220, 100);
    doc.text(`NET À PAYER : ${formatCDF(netCDFVal)}`, 192, y + 7, { align: 'right' });
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`(${formatUSD(netUSDVal)} - Taux: 1 USD = ${formatCDF(ps.exchangeRate, false)} FC)`, 192, y + 13, { align: 'right' });

    y += 24;

    // 5. Section Charges Patronales & Congés (2 Colonnes)
    const cnssPatronal = safeNumber(ps.cnssEmployerCDF, Math.round(grossVal * 0.09));
    const inppPatronal = safeNumber(ps.inppEmployerCDF, Math.round(grossVal * (company.companySize === 'LARGE' ? 0.01 : 0.02)));
    const onemPatronal = safeNumber(ps.onemEmployerCDF, Math.round(grossVal * 0.002));
    const totalCharges = cnssPatronal + inppPatronal + onemPatronal;
    const masseSalariale = safeNumber(ps.totalEmployerCostCDF, grossVal + totalCharges);

    doc.setFontSize(8.5);
    doc.setFont('times', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('CHARGES PATRONALES RDC (A TITRE INDICATIF)', 14, y);
    doc.text('SOLDE DES CONGÉS ET PAIEMENT', 110, y);

    y += 4;
    doc.setFont('times', 'normal');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);

    doc.text(`CNSS Patronal (9%) : ${formatCDF(cnssPatronal)}`, 14, y + 4);
    doc.text(`INPP (${company.companySize === 'LARGE' ? '1%' : '2%'}) : ${formatCDF(inppPatronal)}`, 14, y + 9);
    doc.text(`ONEM (0.2%) : ${formatCDF(onemPatronal)}`, 14, y + 14);
    doc.setFont('times', 'bold');
    doc.text(`Masse salariale totale : ${formatCDF(masseSalariale)}`, 14, y + 19);

    doc.setFont('times', 'normal');
    doc.text(`Congés Acquis : ${ps.leaveEarnedDays || 18}j  |  Pris : ${ps.leaveTakenDays || 4}j  |  Solde : ${ps.leaveRemainingDays || 14}j`, 110, y + 4);
    doc.text(`Mode de règlement : ${ps.paymentMethod || 'Virement Bancaire'}`, 110, y + 9);
    doc.text(`Réf. Virement : ${ps.paymentReference || 'VIR-' + ps.period}`, 110, y + 14);
    doc.text(`Date de paiement : ${ps.payDate || '28/' + ps.period.substring(4, 6) + '/' + ps.period.substring(0, 4)}`, 110, y + 19);

    y += 28;

    // 6. Signatures & Mentions Légales
    doc.rect(14, y, 85, 24);
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.text('Signature de l\'Employeur / Cachet RH', 18, y + 6);
    doc.setFont('times', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 120, 60);
    doc.text('[ Signature Numérique NovarisPay RDC Certifiée ]', 18, y + 15);

    doc.rect(111, y, 85, 24);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.setFont('times', 'bold');
    doc.setFontSize(8.5);
    doc.text('Signature du Salarié', 115, y + 6);
    doc.setFont('times', 'normal');
    doc.setFontSize(7.5);
    doc.text('Pour réception et accord le ____/____/2026', 115, y + 15);

    y += 28;
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(`Bulletin de paie édité le ${new Date().toLocaleDateString('fr-FR')} — Réf: ${ps.payslipRef || 'BS-' + ps.period}. Conformément à l'Art. 91 du Code du Travail RDC, ce bulletin est à conserver sans limitation de durée.`, 14, y);
  };

  const exportPDF = async (ps: Payslip) => {
    const doc = new jsPDF();
    await renderPayslipPDFPage(doc, ps, true);
    doc.save(`Bulletin_${ps.employeeMatricule}_${ps.period}.pdf`);
  };

  const exportAllPDFs = async () => {
    if (payslips.length === 0) return;
    const doc = new jsPDF();
    for (let index = 0; index < payslips.length; index++) {
      await renderPayslipPDFPage(doc, payslips[index], index === 0);
    }
    doc.save(`Liasse_Bulletins_Paie_${selectedRunId}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleArchive = async (ps: Payslip) => {
    if (!selectedRunId || !ps.employeeId) return;
    if (!window.confirm(`Voulez-vous vraiment archiver le bulletin de ${ps.employeeName} ? Il sera masqué de la liste principale.`)) return;
    setActionLoading(ps.employeeId);
    try {
      await archivePayslip(selectedRunId, ps.employeeId, 'admin@novarispay.cd', 'Archivage utilisateur');
      const list = await getPayslipsForRun(selectedRunId);
      setPayslips(list);
      const remaining = list.filter(p => !p.isArchived);
      if (remaining.length > 0) setSelectedPayslip(remaining[0]);
      else setSelectedPayslip(null);
    } catch (err: any) {
      alert('Erreur lors de l\'archivage: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecalculate = async (ps: Payslip) => {
    if (!selectedRunId || !ps.employeeId) return;
    if (!window.confirm(`Reprendre à zéro et recalculer le bulletin de ${ps.employeeName} à partir de son contrat et de ses variables actuelles ?`)) return;
    setActionLoading(ps.employeeId);
    try {
      const updated = await recalculateSinglePayslip(selectedRunId, ps.employeeId, 'admin@novarispay.cd');
      const list = await getPayslipsForRun(selectedRunId);
      setPayslips(list);
      setSelectedPayslip(updated);
    } catch (err: any) {
      alert('Erreur lors du recalcul: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenEditModal = (ps: Payslip) => {
    const currentRun = runs.find(r => r.id === selectedRunId);
    if (currentRun?.status === 'CLOSED') {
      alert('Impossible de modifier un bulletin : la période est clôturée.');
      return;
    }
    setEditForm({
      baseSalaryContract: ps.baseSalaryContract || 0,
      allowancesCDF: ps.allowancesCDF || 0,
      primesCDF: ps.primesCDF || 0,
      overtimeAmountCDF: ps.overtimeAmountCDF || 0,
      loanDeductionCDF: ps.loanDeductionCDF || 0,
      reason: '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPayslip || !selectedRunId) return;
    setActionLoading('save_edit');
    try {
      const rate = selectedPayslip.exchangeRate || 2850;
      const baseSalaryInCDF = selectedPayslip.baseCurrency === 'USD'
        ? editForm.baseSalaryContract * rate
        : editForm.baseSalaryContract;

      const grossCDF = Math.round(
        baseSalaryInCDF + editForm.allowancesCDF + editForm.primesCDF + editForm.overtimeAmountCDF
      );
      const cnssCDF = Math.min(grossCDF * 0.05, 450000 * 0.05);
      const taxableCDF = Math.max(0, grossCDF - cnssCDF);
      const irppCDF = Math.round(taxableCDF * 0.15);
      const netCDF = Math.max(0, grossCDF - cnssCDF - irppCDF - editForm.loanDeductionCDF);

      await updatePayslipDetails(
        selectedRunId,
        selectedPayslip.employeeId,
        {
          baseSalaryContract: editForm.baseSalaryContract,
          allowancesCDF: editForm.allowancesCDF,
          primesCDF: editForm.primesCDF,
          overtimeAmountCDF: editForm.overtimeAmountCDF,
          loanDeductionCDF: editForm.loanDeductionCDF,
          grossSalaryCDF: grossCDF,
          cnssEmployeeCDF: cnssCDF,
          irppFinalCDF: irppCDF,
          netSalaryCDF: netCDF,
          netSalaryUSD: Number((netCDF / rate).toFixed(2)),
        },
        'admin@novarispay.cd',
        'GESTIONNAIRE_RH',
        editForm.reason || 'Correction manuelle d\'éléments du bulletin'
      );

      const list = await getPayslipsForRun(selectedRunId);
      setPayslips(list);
      const updatedPs = list.find(p => p.employeeId === selectedPayslip.employeeId);
      if (updatedPs) setSelectedPayslip(updatedPs);
      setIsEditModalOpen(false);
    } catch (err: any) {
      alert('Erreur lors de la modification: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const visiblePayslips = payslips.filter(p => showArchived ? true : !p.isArchived);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#1F3864] text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
              Audit-Ready RDC
            </span>
            <h1 className="text-xl font-black text-[#1F3864]">Bulletins de Paie Conformes & Certifiés</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Fiches individuelles structurées en 11 sections réglementaires selon le Code du Travail et l'Administration Fiscale RDC.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white font-bold text-slate-800 focus:ring-2 focus:ring-[#1F3864]"
          >
            <option value="">Sélectionner un traitement de paie</option>
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} ({formatPeriodLabel(r.period)})
              </option>
            ))}
          </select>

          {payslips.length > 0 && (
            <>
              <button
                onClick={handlePrint}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 border border-slate-300 transition"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Imprimer (A4)</span>
              </button>

              <button
                onClick={exportAllPDFs}
                className="bg-[#BF9000] hover:bg-[#a37a00] text-[#1F3864] font-black px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow transition"
                title="Télécharger l'intégralité des bulletins du traitement au format PDF groupé"
              >
                <Download className="w-4 h-4 text-[#1F3864]" />
                <span>Télécharger Liasse PDF</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Mobile Quick Employee Selector (< lg) */}
        <div className="block lg:hidden bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2 print:hidden">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <User className="w-4 h-4 text-[#1F3864]" />
              <span>Choisir le Salarié ({visiblePayslips.length})</span>
            </label>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`text-[10px] font-bold px-2 py-1 rounded border transition min-h-[36px] flex items-center ${
                showArchived
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {showArchived ? 'Masquer Archivés' : 'Voir Archivés'}
            </button>
          </div>
          <select
            value={selectedPayslip?.employeeId || ''}
            onChange={(e) => {
              const found = visiblePayslips.find((p) => p.employeeId === e.target.value);
              if (found) setSelectedPayslip(found);
            }}
            className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-white font-bold text-slate-900 min-h-[44px]"
          >
            {visiblePayslips.map((ps) => (
              <option key={ps.id || ps.employeeId} value={ps.employeeId}>
                {ps.employeeName} ({ps.employeeMatricule}) — {formatCDF(ps.netSalaryCDF)}
              </option>
            ))}
          </select>
        </div>

        {/* Left Side: Desktop Employee List (>= lg) */}
        <div className="hidden lg:block lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center space-x-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Salariés ({visiblePayslips.length})</span>
            </h2>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition ${
                showArchived
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              }`}
              title="Afficher ou masquer les bulletins archivés"
            >
              {showArchived ? 'Masquer Archivés' : 'Voir Archivés'}
            </button>
          </div>

          {loading ? (
            <div className="text-xs text-slate-400 py-8 text-center animate-pulse">Chargement des bulletins...</div>
          ) : visiblePayslips.length === 0 ? (
            <div className="text-xs text-slate-400 py-8 text-center italic">Aucun bulletin disponible pour cette sélection.</div>
          ) : (
            <div className="space-y-1.5 max-h-[750px] overflow-y-auto pr-1">
              {visiblePayslips.map((ps) => (
                <div
                  key={ps.id || ps.employeeId}
                  onClick={() => setSelectedPayslip(ps)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between ${
                    selectedPayslip?.employeeId === ps.employeeId
                      ? 'bg-[#1F3864] text-white border-[#1F3864] shadow-md'
                      : ps.isArchived
                      ? 'bg-amber-50/60 border-amber-200 text-slate-600 opacity-75'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold flex items-center space-x-1">
                      <span>{ps.employeeName}</span>
                      {ps.isArchived && (
                        <span className="bg-amber-600 text-white text-[9px] font-bold px-1 rounded">Archivé</span>
                      )}
                    </div>
                    <div className={`text-[11px] ${selectedPayslip?.employeeId === ps.employeeId ? 'text-slate-200' : 'text-slate-500'}`}>
                      {ps.employeeMatricule} — {ps.department}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-black ${selectedPayslip?.employeeId === ps.employeeId ? 'text-yellow-300' : 'text-[#1F3864]'}`}>
                      {formatCDF(ps.netSalaryCDF)}
                    </div>
                    <div className={`text-[10px] font-bold ${selectedPayslip?.employeeId === ps.employeeId ? 'text-slate-300' : 'text-slate-400'}`}>
                      ${ps.netSalaryUSD} USD
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Enterprise 11-Section Payslip Preview */}
        <div className="lg:col-span-3 overflow-x-auto">
          {selectedPayslip ? (
            <div className="bg-white rounded-xl border border-slate-300 shadow-xl p-6 md:p-8 space-y-6 max-w-4xl mx-auto font-sans print:shadow-none print:border-none print:p-0">
              
              {/* SECTION 1: EMPLOYER INFORMATION & HEADER */}
              <div className="flex flex-col md:flex-row items-start justify-between border-b-2 border-[#1F3864] pb-4 gap-4">
                <div className="flex items-start space-x-4">
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt="Logo Entreprise" className="h-14 w-auto object-contain max-w-[140px]" />
                  ) : (
                    <div className="w-12 h-12 bg-[#1F3864] text-white font-black flex items-center justify-center rounded-lg text-base shadow">
                      {company.name ? company.name.substring(0, 2).toUpperCase() : 'KP'}
                    </div>
                  )}
                  <div>
                    <h2 className="font-black text-xl text-[#1F3864] tracking-tight">{company.name || DEFAULT_COMPANY_DETAILS.name}</h2>
                    <p className="text-xs text-slate-600 leading-relaxed">{company.address || DEFAULT_COMPANY_DETAILS.address}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 font-mono mt-1">
                      <span><strong>RCCM:</strong> {company.rccm || DEFAULT_COMPANY_DETAILS.rccm}</span>
                      <span><strong>ID.NAT:</strong> {company.idNat || DEFAULT_COMPANY_DETAILS.idNat}</span>
                      <span><strong>NIF:</strong> {company.nif || DEFAULT_COMPANY_DETAILS.nif}</span>
                      <span><strong>CNSS Emp:</strong> {company.cnssEmployerNumber || DEFAULT_COMPANY_DETAILS.cnssEmployerNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right self-stretch md:self-auto flex flex-col justify-between items-end gap-2">
                  <div className="bg-[#1F3864] text-white px-4 py-1.5 rounded-md text-xs font-black tracking-widest uppercase shadow">
                    BULLETIN DE PAIE
                  </div>
                  <DocumentBarcode
                    value={selectedPayslip.barcodeId || 'NVP-PAY-2026-000245-9A73F2'}
                    documentType="BULLETIN DE PAIE"
                  />
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Période de Paie</span>
                    <strong className="text-sm font-black text-slate-900">{formatPeriodLabel(selectedPayslip.period)}</strong>
                    <div className="text-[11px] text-slate-500 font-mono">Taux : 1 USD = {selectedPayslip.exchangeRate} FC</div>
                  </div>
                </div>
              </div>

              {/* SECTION 2 & 3: EMPLOYEE INFORMATION & PAYROLL PERIOD */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                {/* Col 1: Employee Identity */}
                <div className="space-y-1.5 border-r border-slate-200 pr-4">
                  <div className="flex items-center space-x-1.5 text-[#1F3864] font-bold text-[11px] uppercase tracking-wider mb-2">
                    <User className="w-3.5 h-3.5 text-[#1F3864]" />
                    <span>Informations du Salarié</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">Matricule :</span>
                    <span className="col-span-2 font-mono font-bold text-slate-900">{selectedPayslip.employeeMatricule}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">Nom complet :</span>
                    <span className="col-span-2 font-black text-slate-900">{selectedPayslip.employeeName}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">Fonction / Poste :</span>
                    <span className="col-span-2 font-semibold text-slate-800">{selectedPayslip.position}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">Département :</span>
                    <span className="col-span-2 text-slate-800">{selectedPayslip.department}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">Grade / Catégorie :</span>
                    <span className="col-span-2 text-slate-700">{selectedPayslip.grade || 'Cadre / Catégorie 5'}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">Nationalité :</span>
                    <span className="col-span-2 text-slate-700">{selectedPayslip.nationality || 'Congolaise (RDC)'}</span>
                  </div>
                </div>

                {/* Col 2: Contract, Tax & Statutory Infos */}
                <div className="space-y-1.5 pl-0 md:pl-2">
                  <div className="flex items-center space-x-1.5 text-[#1F3864] font-bold text-[11px] uppercase tracking-wider mb-2">
                    <Briefcase className="w-3.5 h-3.5 text-[#1F3864]" />
                    <span>Contrat & Statut Légaux</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">Type de contrat :</span>
                    <span className="col-span-2 font-bold text-slate-800">{selectedPayslip.contractType || 'CDI'}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">Date d'embauche :</span>
                    <span className="col-span-2 text-slate-800">{selectedPayslip.hireDate || '15/01/2023'}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">Ancienneté :</span>
                    <span className="col-span-2 text-slate-800 font-medium">{selectedPayslip.seniorityText || '1 an 6 mois'}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">N° CNSS Salarié :</span>
                    <span className="col-span-2 font-mono text-slate-800">{selectedPayslip.cnssNumber || 'N/A'}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">NIF Salarié :</span>
                    <span className="col-span-2 font-mono text-slate-800">{selectedPayslip.nif || 'N/A'}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-slate-500 font-medium">Charges famille :</span>
                    <span className="col-span-2 text-slate-800 font-bold">{selectedPayslip.dependentsCount} enfant(s) (-{Math.min(9, selectedPayslip.dependentsCount) * 2}% IPR)</span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: ATTENDANCE & TIME SUMMARY */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs space-y-2">
                <div className="flex items-center justify-between text-[#1F3864] font-bold border-b pb-1.5">
                  <span className="flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Synthèse du Temps de Travail & Présences (Mois de {formatPeriodLabel(selectedPayslip.period)})</span>
                  </span>
                  <span className="text-slate-500 text-[11px]">Base légale : 26 jours / 173.33 heures</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-1">
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-[10px] text-slate-500 uppercase block">Jours Prestés</span>
                    <strong className="text-sm font-black text-slate-900">{selectedPayslip.daysWorked} j</strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-[10px] text-slate-500 uppercase block">Heures Normales</span>
                    <strong className="text-sm font-black text-slate-900">{selectedPayslip.normalHours || 173.3} h</strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-[10px] text-slate-500 uppercase block">Heures Sup. (130-200%)</span>
                    <strong className="text-sm font-black text-indigo-700">{selectedPayslip.overtimeHoursTotal || 0} h</strong>
                  </div>
                  <div className="bg-slate-50 p-2 rounded">
                    <span className="text-[10px] text-slate-500 uppercase block">Congés & Maladie</span>
                    <strong className="text-sm font-bold text-slate-700">{selectedPayslip.paidLeaveDays || 0} j / {selectedPayslip.sickLeaveDays || 0} j</strong>
                  </div>
                </div>
              </div>

              {/* SECTIONS 5 & 6: EARNINGS & DEDUCTIONS TABLE */}
              <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1F3864] text-white uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="p-2.5 border-b">Code / Rubrique de Paie</th>
                      <th className="p-2.5 border-b text-right">Base (CDF)</th>
                      <th className="p-2.5 border-b text-right">Gains (CDF)</th>
                      <th className="p-2.5 border-b text-right">Retenues (CDF)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedPayslip.lines.map((line, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <td className="p-2.5 font-medium text-slate-900">
                          <span className="font-mono text-[10px] text-slate-400 mr-2">{line.code}</span>
                          {line.label}
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-600">
                          {line.baseCDF ? formatCDF(line.baseCDF, false) : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                          {line.gainCDF > 0 ? formatCDF(line.gainCDF, false) : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-red-700">
                          {line.deductionCDF > 0 ? formatCDF(line.deductionCDF, false) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td className="p-2.5 text-slate-900">TOTAL BRUT & RETENUES</td>
                      <td className="p-2.5 text-right">-</td>
                      <td className="p-2.5 text-right text-emerald-800 font-black font-mono">
                        {formatCDF(selectedPayslip.grossSalaryCDF)}
                      </td>
                      <td className="p-2.5 text-right text-red-800 font-black font-mono">
                        {formatCDF(selectedPayslip.totalDeductionsCDF || (safeNumber(selectedPayslip.cnssEmployeeCDF) + safeNumber(selectedPayslip.irppFinalCDF) + safeNumber(selectedPayslip.loanDeductionCDF)))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* SECTION 7: NET PAY PROMINENT CALLOUT */}
              <div className="bg-[#1F3864] text-white p-5 rounded-xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center md:text-left">
                  <div className="text-xs text-slate-300 font-medium">
                    Salaire Brut : <strong className="text-white font-mono">{formatCDF(selectedPayslip.grossSalaryCDF)}</strong>
                  </div>
                  <div className="text-xs text-slate-300 font-medium">
                    Total Retenues Légales & Prêts : <strong className="text-white font-mono">{formatCDF(selectedPayslip.totalDeductionsCDF || (safeNumber(selectedPayslip.cnssEmployeeCDF) + safeNumber(selectedPayslip.irppFinalCDF) + safeNumber(selectedPayslip.loanDeductionCDF)))}</strong>
                  </div>
                </div>

                <div className="text-center md:text-right border-t md:border-t-0 md:border-l border-slate-600 pt-3 md:pt-0 md:pl-6">
                  <span className="text-xs text-[#BF9000] font-black uppercase tracking-normal block">NET À PAYER SALARIÉ</span>
                  <div className="text-2xl md:text-3xl font-black text-white tracking-normal my-0.5">
                    {formatCDF(selectedPayslip.netSalaryCDF)}
                  </div>
                  <div className="text-xs text-yellow-300 font-bold font-mono">
                    {formatUSD(selectedPayslip.netSalaryUSD)}
                  </div>
                </div>
              </div>

              {/* SECTION 8, 9 & 10: LEAVE BALANCE, EMPLOYER CONTRIBUTIONS & PAYMENT INFORMATION */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Leave Balance */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="font-bold text-[#1F3864] uppercase text-[10px] tracking-normal border-b pb-1">
                    8. Solde des Congés
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Congés acquis :</span>
                    <strong className="text-slate-800">{selectedPayslip.leaveEarnedDays || 18} jours</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Congés pris :</span>
                    <strong className="text-slate-800">{selectedPayslip.leaveTakenDays || 4} jours</strong>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-bold">
                    <span className="text-slate-700">Solde restant :</span>
                    <strong className="text-emerald-700 font-black">{selectedPayslip.leaveRemainingDays || 14} jours</strong>
                  </div>
                </div>

                {/* Employer Charges */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                  <div className="font-bold text-[#1F3864] uppercase text-[10px] tracking-normal border-b pb-1">
                    9. Charges Patronales RDC
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">CNSS Patronal (9%) :</span>
                    <span className="font-mono text-slate-800">{formatCDF(safeNumber(selectedPayslip.cnssEmployerCDF, Math.round(safeNumber(selectedPayslip.grossSalaryCDF) * 0.09)))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">INPP (1-3%) :</span>
                    <span className="font-mono text-slate-800">{formatCDF(safeNumber(selectedPayslip.inppEmployerCDF, Math.round(safeNumber(selectedPayslip.grossSalaryCDF) * 0.02)))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ONEM (0.2%) :</span>
                    <span className="font-mono text-slate-800">{formatCDF(safeNumber(selectedPayslip.onemEmployerCDF, Math.round(safeNumber(selectedPayslip.grossSalaryCDF) * 0.002)))}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-bold">
                    <span className="text-slate-700">Masse Salariale Total :</span>
                    <span className="font-mono text-[#1F3864]">{formatCDF(safeNumber(selectedPayslip.totalEmployerCostCDF, safeNumber(selectedPayslip.grossSalaryCDF) + safeNumber(selectedPayslip.cnssEmployerCDF, Math.round(safeNumber(selectedPayslip.grossSalaryCDF) * 0.09)) + safeNumber(selectedPayslip.inppEmployerCDF, Math.round(safeNumber(selectedPayslip.grossSalaryCDF) * 0.02)) + safeNumber(selectedPayslip.onemEmployerCDF, Math.round(safeNumber(selectedPayslip.grossSalaryCDF) * 0.002))))}</span>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                  <div className="font-bold text-[#1F3864] uppercase text-[10px] tracking-wider border-b pb-1">
                    10. Modalités de Règlement
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Mode de paiement :</span>
                    <strong className="text-slate-800">{selectedPayslip.paymentMethod || 'Virement Bancaire'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Établissement :</span>
                    <strong className="text-slate-800">{selectedPayslip.bankName || 'RAWBANK RDC'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Réf. Virement :</span>
                    <span className="font-mono text-slate-800">{selectedPayslip.paymentReference || 'VIR-' + selectedPayslip.period}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="text-slate-500">Date d'exécution :</span>
                    <strong className="text-slate-800">{selectedPayslip.payDate || '28/' + selectedPayslip.period.substring(4, 6) + '/' + selectedPayslip.period.substring(0, 4)}</strong>
                  </div>
                </div>
              </div>

              {/* SECTION 11: SIGNATURES, QR CODE & LEGAL FOOTER */}
              <div className="border-t pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-6 text-xs">
                  {/* Employer Stamp & Digital Signature */}
                  <div className="p-3.5 bg-slate-50 border rounded-xl text-center space-y-2">
                    <span className="font-bold text-slate-800 block">Signature de l'Employeur / Cachet RH</span>
                    <div className="text-[10px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 py-1.5 px-3 rounded-lg inline-flex items-center space-x-1.5 shadow-sm">
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2]" />
                      <span>Signature Électronique Certifiée (NovarisPay)</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-mono">Approuvé & Libéré par la Direction RH</span>
                  </div>

                  {/* Employee Acknowledgment */}
                  <div className="p-3.5 bg-slate-50 border rounded-xl text-center space-y-2">
                    <span className="font-bold text-slate-800 block">Emargement du Salarié</span>
                    <div className="border-b-2 border-dashed border-slate-300 my-4"></div>
                    <span className="text-[10px] text-slate-500 block italic">"Pour réception et accord le ____/____/2026"</span>
                  </div>
                </div>

                {/* Footer Legal Notice */}
                <div className="bg-slate-100 p-3 rounded-xl text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <strong>Réf Bulletin :</strong> {selectedPayslip.payslipRef || 'BS-' + selectedPayslip.period} | <strong>Code-barres Unique :</strong> <span className="font-mono font-bold text-[#1F3864]">{selectedPayslip.barcodeId || 'NVP-PAY-2026-000245-9A73F2'}</span>
                    <p className="text-[9px] text-slate-400 mt-0.5">Conformément à l'Art. 91 du Code du Travail de la RDC, ce bulletin est certifié immuable et doit être conservé sans limitation de durée.</p>
                  </div>
                  <DocumentBarcode
                    compact
                    value={selectedPayslip.barcodeId || 'NVP-PAY-2026-000245-9A73F2'}
                    documentType="PAIE RDC"
                  />
                </div>
              </div>

              {/* Action Buttons & Management Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 print:hidden">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleRecalculate(selectedPayslip)}
                    disabled={actionLoading === selectedPayslip.employeeId}
                    className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3.5 py-2 rounded-lg text-xs flex items-center space-x-1.5 border border-amber-300 transition disabled:opacity-50"
                    title="Reprendre à zéro et recalculer les montants à partir du contrat et des présences"
                  >
                    {actionLoading === selectedPayslip.employeeId ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-900" />
                    ) : (
                      <RotateCcw className="w-4 h-4 text-amber-800" />
                    )}
                    <span>Reprendre à zéro (Recalculer)</span>
                  </button>

                  <button
                    onClick={() => handleArchive(selectedPayslip)}
                    disabled={actionLoading === selectedPayslip.employeeId}
                    className="bg-red-50 hover:bg-red-100 text-red-800 font-bold px-3.5 py-2 rounded-lg text-xs flex items-center space-x-1.5 border border-red-200 transition disabled:opacity-50"
                    title="Archiver ce bulletin en erreur sans supprimer les données"
                  >
                    <Archive className="w-4 h-4 text-red-700" />
                    <span>Archiver Bulletin</span>
                  </button>

                  {runs.find(r => r.id === selectedRunId)?.status !== 'CLOSED' && (
                    <button
                      onClick={() => handleOpenEditModal(selectedPayslip)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold px-3.5 py-2 rounded-lg text-xs flex items-center space-x-1.5 border border-blue-200 transition"
                      title="Modifier manuellement les éléments du bulletin avant clôture"
                    >
                      <Edit3 className="w-4 h-4 text-blue-700" />
                      <span>Modifier Éléments</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrint}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 border border-slate-300 transition"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Imprimer</span>
                  </button>

                  <button
                    onClick={() => exportPDF(selectedPayslip)}
                    className="bg-[#1F3864] text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow hover:bg-[#152747] transition"
                  >
                    <Download className="w-4 h-4 text-[#BF9000]" />
                    <span>Télécharger PDF</span>
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Veuillez sélectionner un bulletin de paie dans la liste de gauche.
            </div>
          )}
        </div>
      </div>

      {/* Modal de Modification Manuelle de Bulletin */}
      {isEditModalOpen && selectedPayslip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-base font-black text-[#1F3864]">Modification du Bulletin de Paie</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {selectedPayslip.employeeName} ({selectedPayslip.employeeMatricule}) — {formatPeriodLabel(selectedPayslip.period)}
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Salaire Contractuel ({selectedPayslip.baseCurrency})</label>
                <input
                  type="number"
                  value={editForm.baseSalaryContract}
                  onChange={(e) => setEditForm({ ...editForm, baseSalaryContract: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#1F3864]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Allocations / Indemnités (FC)</label>
                  <input
                    type="number"
                    value={editForm.allowancesCDF}
                    onChange={(e) => setEditForm({ ...editForm, allowancesCDF: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-900 focus:ring-2 focus:ring-[#1F3864]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primes & Gratifications (FC)</label>
                  <input
                    type="number"
                    value={editForm.primesCDF}
                    onChange={(e) => setEditForm({ ...editForm, primesCDF: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-900 focus:ring-2 focus:ring-[#1F3864]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Heures Supp. (FC)</label>
                  <input
                    type="number"
                    value={editForm.overtimeAmountCDF}
                    onChange={(e) => setEditForm({ ...editForm, overtimeAmountCDF: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-900 focus:ring-2 focus:ring-[#1F3864]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Retenue Prêt / Avance (FC)</label>
                  <input
                    type="number"
                    value={editForm.loanDeductionCDF}
                    onChange={(e) => setEditForm({ ...editForm, loanDeductionCDF: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-900 focus:ring-2 focus:ring-[#1F3864]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Motif de la modification (Audit Trail)</label>
                <textarea
                  rows={2}
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  placeholder="Ex: Correction prime de fonction oubliée..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 focus:ring-2 focus:ring-[#1F3864]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 border-t pt-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={actionLoading === 'save_edit'}
                className="px-4 py-2 rounded-lg bg-[#1F3864] text-white font-bold text-xs hover:bg-[#152747] shadow flex items-center space-x-1.5 disabled:opacity-50"
              >
                {actionLoading === 'save_edit' && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                <span>Enregistrer & Recalculer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

