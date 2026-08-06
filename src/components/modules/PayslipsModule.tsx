/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 */

import React, { useEffect, useState } from 'react';
import { getPayrollRuns, getPayslipsForRun } from '../../services/payrollService';
import { PayrollRun, Payslip } from '../../types/payroll';
import { DEFAULT_COMPANY_DETAILS } from '../../lib/constants';
import { getCompanyConfig, CompanyConfig } from '../../services/companyService';
import { jsPDF } from 'jspdf';
import { FileText, Printer, Download, Eye, Check } from 'lucide-react';

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

  // PDF Export for individual payslip
  const renderPayslipPDFPage = (doc: jsPDF, ps: Payslip, isFirstPage = true) => {
    if (!isFirstPage) doc.addPage();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(31, 56, 100);
    doc.text(DEFAULT_COMPANY_DETAILS.name, 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(`RCCM: ${DEFAULT_COMPANY_DETAILS.rccm} | NIF: ${DEFAULT_COMPANY_DETAILS.nif}`, 14, 26);
    doc.text(`N° CNSS Employeur: ${DEFAULT_COMPANY_DETAILS.cnssEmployerNumber}`, 14, 31);

    doc.setLineWidth(0.5);
    doc.setDrawColor(31, 56, 100);
    doc.line(14, 35, 196, 35);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`BULLETIN DE PAIE - PÉRIODE ${ps.period}`, 14, 45);

    doc.setFontSize(10);
    doc.text(`Matricule: ${ps.employeeMatricule}`, 14, 55);
    doc.text(`Nom: ${ps.employeeName}`, 14, 61);
    doc.text(`Département: ${ps.department}`, 14, 67);
    doc.text(`Poste: ${ps.position}`, 14, 73);

    let y = 85;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Libellé', 14, y);
    doc.text('Gains (CDF)', 110, y);
    doc.text('Retenues (CDF)', 150, y);

    doc.line(14, y + 2, 196, y + 2);
    y += 8;

    doc.setFont('helvetica', 'normal');
    ps.lines.forEach((line) => {
      doc.text(line.label, 14, y);
      if (line.gainCDF > 0) doc.text(line.gainCDF.toLocaleString() + ' FC', 110, y);
      if (line.deductionCDF > 0) doc.text(line.deductionCDF.toLocaleString() + ' FC', 150, y);
      y += 6;
    });

    doc.line(14, y, 196, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.text(`SALAIRE BRUT : ${ps.grossSalaryCDF.toLocaleString()} FC`, 14, y);
    y += 6;
    doc.text(`TOTAL RETENUES : ${(ps.cnssEmployeeCDF + ps.irppFinalCDF + ps.loanDeductionCDF).toLocaleString()} FC`, 14, y);
    y += 8;
    doc.setFontSize(12);
    doc.setTextColor(31, 56, 100);
    doc.text(`NET À PAYER : ${ps.netSalaryCDF.toLocaleString()} FC ($${ps.netSalaryUSD} USD)`, 14, y);

    // Signature Spaces in PDF
    y += 18;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);

    // Employer signature box
    doc.rect(14, y, 85, 30);
    doc.text('Signature de l\'Employeur / Cachet RH', 18, y + 7);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('[ Signature électronique NovarisPay RDC ]', 18, y + 18);

    // Employee signature box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.rect(111, y, 85, 30);
    doc.text('Signature du Travailleur / Salarié', 115, y + 7);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('Pour réception et accord le ____________', 115, y + 18);
  };

  const exportPDF = (ps: Payslip) => {
    const doc = new jsPDF();
    renderPayslipPDFPage(doc, ps, true);
    doc.save(`Bulletin_${ps.employeeMatricule}_${ps.period}.pdf`);
  };

  // Bulk Export for ALL payslips in run
  const exportAllPDFs = () => {
    if (payslips.length === 0) return;
    const doc = new jsPDF();
    payslips.forEach((ps, index) => {
      renderPayslipPDFPage(doc, ps, index === 0);
    });
    doc.save(`Liasse_Bulletins_Paie_Complete_${selectedRunId}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-[#1F3864]">Bulletins de Paie Conformes RDC</h1>
          <p className="text-xs text-slate-500">
            Fiches individuelles détaillées avec en-tête légal entreprise, détail des rubriques et double affichage CDF/USD.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-xs bg-white font-bold text-slate-800"
          >
            <option value="">Sélectionner un traitement</option>
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label} ({r.period})
              </option>
            ))}
          </select>

          {payslips.length > 0 && (
            <button
              onClick={exportAllPDFs}
              className="bg-[#BF9000] hover:bg-[#a37a00] text-[#1F3864] font-black px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow transition"
              title="Génère un document PDF groupé contenant tous les bulletins de la période"
            >
              <Download className="w-4 h-4 text-[#1F3864]" />
              <span>Télécharger TOUS les Bulletins (ZIP/PDF Groupé)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Payslips List, Right Selected Payslip Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Salariés du traitement ({payslips.length})
          </h2>
          {loading ? (
            <div className="text-xs text-slate-400 py-6 text-center">Chargement...</div>
          ) : payslips.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 text-center">Aucun bulletin disponible.</div>
          ) : (
            payslips.map((ps) => (
              <div
                key={ps.id || ps.employeeId}
                onClick={() => setSelectedPayslip(ps)}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                  selectedPayslip?.employeeId === ps.employeeId
                    ? 'bg-[#1F3864] text-white border-[#1F3864] shadow'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <div className="font-bold">{ps.employeeName}</div>
                <div className="text-[11px] opacity-80">{ps.employeeMatricule} — {ps.department}</div>
                <div className="font-black mt-1 text-yellow-300">
                  {ps.netSalaryCDF.toLocaleString()} FC (${ps.netSalaryUSD})
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Col: Official Conforme RDC Payslip Preview */}
        <div className="lg:col-span-2">
          {selectedPayslip ? (
            <div className="bg-white rounded-xl border border-slate-300 shadow-lg p-6 space-y-6">
              {/* Top Employer Header */}
              <div className="flex items-start justify-between border-b border-slate-300 pb-4">
                <div className="flex items-center space-x-3">
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt="Company Logo" className="h-12 w-auto object-contain" />
                  ) : (
                    <div className="w-10 h-10 bg-[#1F3864] text-white font-black flex items-center justify-center rounded text-xs">
                      KP
                    </div>
                  )}
                  <div>
                    <h2 className="font-extrabold text-lg text-[#1F3864]">{company.name}</h2>
                    <p className="text-xs text-slate-600">{company.address}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-1">
                      RCCM: {company.rccm} | ID.NAT: {company.idNat} | NIF: {company.nif}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      N° CNSS Employeur: {company.cnssEmployerNumber}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-[#1F3864] text-white font-black px-3 py-1 rounded text-xs inline-block">
                    BULLETIN DE PAIE
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-1">Période : {selectedPayslip.period}</div>
                  <div className="text-[10px] text-slate-500">Taux: 1 USD = {selectedPayslip.exchangeRate} FC</div>
                </div>
              </div>

              {/* Employee Info Header */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">Matricule & Salarié</span>
                  <strong className="text-slate-900 text-sm">{selectedPayslip.employeeName}</strong>
                  <div className="font-mono text-[11px] text-[#1F3864]">{selectedPayslip.employeeMatricule}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Département & Fonction</span>
                  <strong className="text-slate-900">{selectedPayslip.department}</strong>
                  <div className="text-slate-600 text-[11px]">{selectedPayslip.position}</div>
                </div>
              </div>

              {/* Payslip Lines Table */}
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-800 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="p-2 border-b">Libellé de la Rubrique</th>
                    <th className="p-2 border-b text-right">Base (FC)</th>
                    <th className="p-2 border-b text-right">Gains (FC)</th>
                    <th className="p-2 border-b text-right">Retenues (FC)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedPayslip.lines.map((line, i) => (
                    <tr key={i}>
                      <td className="p-2 font-medium">{line.label}</td>
                      <td className="p-2 text-right text-slate-600">{line.baseCDF ? line.baseCDF.toLocaleString() : '-'}</td>
                      <td className="p-2 text-right font-bold text-emerald-700">
                        {line.gainCDF > 0 ? line.gainCDF.toLocaleString() : '-'}
                      </td>
                      <td className="p-2 text-right font-bold text-red-700">
                        {line.deductionCDF > 0 ? line.deductionCDF.toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary Footer */}
              <div className="bg-slate-900 text-white p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">SALAIRE BRUT : {selectedPayslip.grossSalaryCDF.toLocaleString()} FC</div>
                  <div className="text-xs text-slate-400">TOTAL RETENUES : {(selectedPayslip.cnssEmployeeCDF + selectedPayslip.irppFinalCDF + selectedPayslip.loanDeductionCDF).toLocaleString()} FC</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[#BF9000] uppercase font-bold block">NET À PAYER</span>
                  <span className="text-xl font-black text-white">{selectedPayslip.netSalaryCDF.toLocaleString()} FC</span>
                  <span className="text-xs text-yellow-300 block font-bold">${selectedPayslip.netSalaryUSD} USD</span>
                </div>
              </div>

              {/* Signatures Box */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4 text-xs">
                <div className="p-3 bg-slate-50 border rounded text-center">
                  <span className="font-bold text-slate-700 block mb-2">Signature de l'Employeur / Cachet RH</span>
                  <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 py-1 px-2 rounded inline-flex items-center gap-1 my-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[1.75]" />
                    <span>Signé électroniquement (NovarisPay)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block font-mono">Approuvé & Payé par la Direction RH</span>
                </div>

                <div className="p-3 bg-slate-50 border rounded text-center">
                  <span className="font-bold text-slate-700 block mb-2">Signature du Travailleur / Salarié</span>
                  <div className="border-b-2 border-dashed border-slate-300 my-4"></div>
                  <span className="text-[10px] text-slate-500 block">Emargement "Pour réception et accord le ____________"</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => exportPDF(selectedPayslip)}
                  className="bg-[#1F3864] text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-1 shadow"
                >
                  <Download className="w-4 h-4 text-[#BF9000]" />
                  <span>Télécharger PDF</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              Sélectionnez un bulletin dans la liste à gauche.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
