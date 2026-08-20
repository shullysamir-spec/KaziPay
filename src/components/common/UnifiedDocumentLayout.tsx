/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * Composant Gabarit Document Unifié pour Impression & Visualisation HTML
 * Conforme aux standards officiels de la République Démocratique du Congo
 */

import React from 'react';
import { getCompanyConfig, CompanyConfig } from '../../services/companyService';
import { DocumentBarcode } from './DocumentBarcode';
import { deriveCompanyPrefix, generateBarcodeIdentifier } from '../../services/barcodeService';

interface UnifiedDocumentHeaderProps {
  title: string;
  subtitle?: string;
  referenceNumber?: string;
  barcodeId?: string;
  date?: string;
  companyOverride?: Partial<CompanyConfig>;
  hideBarcode?: boolean;
}

export const UnifiedDocumentHeader: React.FC<UnifiedDocumentHeaderProps> = ({
  title,
  subtitle,
  referenceNumber,
  barcodeId,
  date = new Date().toLocaleDateString('fr-FR'),
  companyOverride,
  hideBarcode = false,
}) => {
  const company = { ...getCompanyConfig(), ...(companyOverride || {}) };
  const effectiveBarcodeId = barcodeId || generateBarcodeIdentifier('DOC', undefined, company.name);

  // Compute initials for company avatar badge fallback
  const rawName = company.name || 'ENTREPRISE';
  const words = rawName.trim().split(/\s+/).filter(Boolean);
  const initials = words.length >= 2 
    ? `${words[0][0]}${words[1][0]}`.toUpperCase()
    : rawName.substring(0, 2).toUpperCase();

  return (
    <div className="border-b-2 border-[#1F3864] pb-4 mb-6 text-slate-800">
      {/* Top National Header Bar */}
      <div className="bg-[#1F3864] text-white text-[9px] font-bold px-3 py-1 flex items-center justify-between rounded-t-lg mb-3 print:rounded-none">
        <span>RÉPUBLIQUE DÉMOCRATIQUE DU CONGO — DOCUMENT OFFICIEL RH</span>
        <span>CONFORME AU CODE DU TRAVAIL & LÉGISLATION RDC</span>
      </div>

      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        {/* Left: Logo & Company Identification */}
        <div className="flex items-start space-x-3.5 max-w-xl">
          <div className="shrink-0 pt-0.5">
            {company.logoUrl ? (
              <img
                src={company.logoUrl}
                alt={company.name || 'Logo Entreprise'}
                className="h-14 w-auto object-contain max-w-[130px] rounded"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div 
                className="h-12 w-14 rounded-lg flex flex-col items-center justify-center text-white font-black text-sm shadow-sm border border-slate-700/20"
                style={{ backgroundColor: company.primaryColor || '#1F3864' }}
              >
                <span>{initials}</span>
                <span className="text-[7px] font-bold tracking-widest text-[#BF9000] uppercase">RDC</span>
              </div>
            )}
          </div>

          <div className="space-y-0.5 text-left">
            <h1 className="text-sm font-black text-[#1F3864] uppercase tracking-wide">
              {company.name || 'ENTREPRISE RDC'}
            </h1>
            <p className="text-[10px] text-slate-600 font-serif leading-tight">
              {company.address} — {company.cityProvince || 'Kinshasa, RDC'}
            </p>
            <p className="text-[9.5px] text-slate-500 font-serif leading-tight">
              RCCM : <strong>{company.rccm || 'CD/KIN/RCCM/22-B-01452'}</strong> | ID.NAT : <strong>{company.idNat || '01-93-N48120P'}</strong> | NIF : <strong>{company.nif || 'A2210892X'}</strong>
            </p>
            <p className="text-[9.5px] text-slate-500 font-serif leading-tight">
              N° CNSS Employeur : <strong>{company.cnssEmployerNumber || '1004812001-C'}</strong> | Tél : {company.phone || '+243 810 000 000'} | Email : {company.email || 'contact@entreprise.cd'}
            </p>
          </div>
        </div>

        {/* Right: Document Title, Reference & Certified Barcode */}
        <div className="text-right flex flex-col items-end shrink-0">
          <div className="bg-[#1F3864] text-white px-3 py-1.5 rounded-lg shadow-sm text-right">
            <div className="text-xs font-black uppercase tracking-wider">{title}</div>
            {subtitle && <div className="text-[9px] text-[#BF9000] font-bold">{subtitle}</div>}
          </div>

          {referenceNumber && (
            <div className="text-[10px] font-bold text-slate-700 mt-1.5 font-serif">
              Réf : <span className="font-mono text-[#1F3864]">{referenceNumber}</span>
            </div>
          )}

          <div className="text-[9px] text-slate-500 font-serif">
            Date : <strong>{date}</strong>
          </div>

          {!hideBarcode && (
            <div className="mt-1.5">
              <DocumentBarcode
                value={effectiveBarcodeId}
                documentType={title}
                compact={true}
                height={24}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface UnifiedDocumentFooterProps {
  barcodeId?: string;
  referenceNumber?: string;
  legalNote?: string;
  pageNumber?: number;
  totalPages?: number;
}

export const UnifiedDocumentFooter: React.FC<UnifiedDocumentFooterProps> = ({
  barcodeId,
  referenceNumber,
  legalNote = "Généré par NovarisPay • Document officiel certifié conforme au Code du Travail & aux normes fiscales et sociales RDC.",
  pageNumber = 1,
  totalPages = 1,
}) => {
  const todayStr = new Date().toLocaleDateString('fr-FR');

  return (
    <div className="border-t border-slate-300 pt-3 mt-8 text-[9px] text-slate-500 font-serif space-y-1.5">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="text-left">
          <p className="font-semibold text-slate-600">{legalNote}</p>
          <p className="text-[8.5px] text-slate-400 mt-0.5">
            Édité le {todayStr} {referenceNumber ? `• Réf : ${referenceNumber}` : ''} {barcodeId ? `• ID Traçabilité : ${barcodeId}` : ''}
          </p>
        </div>

        <div className="text-right shrink-0 flex items-center space-x-2">
          {barcodeId && (
            <span className="font-mono text-[8px] bg-slate-100 px-1.5 py-0.5 rounded border text-slate-600">
              {barcodeId}
            </span>
          )}
          <span className="font-bold text-slate-700">
            Page {pageNumber} / {totalPages}
          </span>
        </div>
      </div>
    </div>
  );
};
