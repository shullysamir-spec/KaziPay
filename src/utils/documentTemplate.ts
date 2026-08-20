/**
 * @license
 * NovarisPay - ERP RH & Paie RDC
 * Unified Document Template, Embedded Logo Engine & Barcode Service
 * Conformité Code du Travail RDC, DGI, CNSS, INPP, ONEM
 */

import { jsPDF } from 'jspdf';
import { CompanyConfig, getCompanyConfig } from '../services/companyService';
import { generateBarcodeDataUrl, generateBarcodeIdentifier, registerDocument } from '../services/barcodeService';
import { formatCDF, formatUSD, formatNumber, formatDateFR, safeNumber } from './documentFormatter';

/**
 * Embedded Base64 raster image generator for client company logo.
 * Guarantees 100% availability for print and PDF generation with zero external network requests.
 */
export function getEmbeddedCompanyLogoDataUrl(companyOverride?: Partial<CompanyConfig>): string {
  const company = { ...getCompanyConfig(), ...(companyOverride || {}) };

  // If client company uploaded a logo (Base64 data URL), use it directly
  if (company.logoUrl && company.logoUrl.startsWith('data:image')) {
    return company.logoUrl;
  }

  // Generate crisp canvas raster of the corporate emblem & typography for the client company
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 440;
    canvas.height = 120;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Background clean
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Emblem Shield / Badge
      ctx.fillStyle = company.primaryColor || '#1F3864'; // Corporate Navy
      ctx.beginPath();
      ctx.roundRect(10, 10, 100, 100, 16);
      ctx.fill();

      // Gold Accent Ribbon
      ctx.fillStyle = company.accentColor || '#BF9000'; // Corporate Gold
      ctx.beginPath();
      ctx.roundRect(70, 20, 26, 50, 6);
      ctx.fill();

      // Monogram from company initials in white
      const rawName = company.name || 'ENTREPRISE';
      const words = rawName.trim().split(/\s+/).filter(Boolean);
      const initials = words.length >= 2 
        ? `${words[0][0]}${words[1][0]}`.toUpperCase()
        : rawName.substring(0, 2).toUpperCase();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 50px "Times New Roman", Times, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, 48, 62);

      // Company Name Wordmark
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = company.primaryColor || '#1F3864';
      ctx.font = 'bold 36px "Times New Roman", Times, serif';
      
      const displayName = rawName.length > 22 ? rawName.substring(0, 20) + '...' : rawName;
      ctx.fillText(displayName.toUpperCase(), 125, 58);

      // Subtitle
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 15px "Times New Roman", Times, serif';
      ctx.fillText('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO', 127, 88);

      // Subtle divider bar
      ctx.fillStyle = company.accentColor || '#BF9000';
      ctx.fillRect(127, 98, 290, 3);

      return canvas.toDataURL('image/png');
    }
  } catch (e) {
    console.warn('Erreur génération canvas logo:', e);
  }

  // Fallback simple 1x1 png if canvas unavailable
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

export interface PdfDocumentHeaderOptions {
  documentTitle: string; // e.g. "BULLETIN DE PAIE", "LETTRE DE TRANSMISSION"
  documentSubtitle?: string; // e.g. "Période : Juillet 2026", "Conforme Art. 91 Code du Travail"
  documentReference?: string; // e.g. "BS-202607-001", "NP-TRANSM-2026-0042"
  barcodeId?: string;
  docTypeCode?: string; // "PAY", "TRANSM", "DECL", "FACT", "CERT", "STC", "360"
  companyOverride?: Partial<CompanyConfig>;
  accentColor?: [number, number, number];
  primaryColor?: [number, number, number];
}

/**
 * Standardized High-Definition PDF Header for all official RDC documents
 * Renders client company logo, aligned company identifiers, document banner & certified barcode.
 */
export async function renderOfficialPdfHeader(
  doc: jsPDF,
  options: PdfDocumentHeaderOptions
): Promise<{ bottomY: number; barcodeId: string }> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const company = { ...getCompanyConfig(), ...(options.companyOverride || {}) };
  const primaryColor = options.primaryColor || [31, 56, 100]; // #1F3864 Navy
  const goldColor = options.accentColor || [191, 144, 0]; // #BF9000 Gold

  // Ensure Times New Roman font
  doc.setFont('times', 'normal');

  // Top National Bar
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(7);
  doc.text('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO — DOCUMENT RH OFFICIEL', 14, 6);
  doc.text('CONFORME AU CODE DU TRAVAIL & DISPOSITIONS LÉGALES RDC', pageWidth - 14, 6, { align: 'right' });

  // Generate / register document barcode with dynamic company prefix
  const docTypeCode = options.docTypeCode || 'DOC';
  const barcodeId = options.barcodeId || generateBarcodeIdentifier(docTypeCode, undefined, company.name);
  const barcodeDataUrl = await generateBarcodeDataUrl(barcodeId, 'CODE128', {
    height: 35,
    displayValue: true,
  });

  registerDocument({
    barcodeId,
    documentType: options.documentTitle,
    documentTypeCode: docTypeCode,
    documentNumber: options.documentReference || barcodeId,
    title: `${options.documentTitle} - ${company.name}`,
    createdAt: new Date().toISOString(),
    createdBy: company.signerName || 'RH / Gestionnaire de Paie',
    status: 'Validated',
    version: 'v1.0',
    companyCode: company.name ? company.name.substring(0, 3).toUpperCase() : 'NP',
    moduleRoute: 'ged',
  });

  // Embed Local Client Company Logo (Top Left)
  const logoDataUrl = getEmbeddedCompanyLogoDataUrl(company);
  try {
    doc.addImage(logoDataUrl, 'PNG', 14, 12.5, 36, 18);
  } catch (err) {
    // Fallback vector emblem with company initials
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(14, 13, 15, 15, 2, 2, 'F');
    doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.rect(24, 16, 3, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(8);
    const initialChar = company.name ? company.name.trim().charAt(0).toUpperCase() : 'E';
    doc.text(initialChar, 18, 22);
  }

  // Document Title Banner & Barcode (Top Right)
  const rightBoxWidth = 58;
  const rightBoxX = pageWidth - 14 - rightBoxWidth;

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(rightBoxX, 12.5, rightBoxWidth, 9.5, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.text(options.documentTitle.toUpperCase(), rightBoxX + rightBoxWidth / 2, 18.5, { align: 'center' });

  if (barcodeDataUrl) {
    try {
      doc.addImage(barcodeDataUrl, 'PNG', rightBoxX, 23.5, rightBoxWidth, 12);
    } catch (e) {
      console.warn('Barcode addImage failed:', e);
    }
  }

  // Company Legal Identity Info (Between logo and right box, zero overlap)
  const infoX = 53;
  const maxInfoWidth = rightBoxX - infoX - 4;

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('times', 'bold');
  doc.setFontSize(11);
  doc.text((company.name || 'SOCIÉTÉ COMMERCIALE RDC').toUpperCase(), infoX, 17, { maxWidth: maxInfoWidth });

  doc.setTextColor(71, 85, 105);
  doc.setFont('times', 'normal');
  doc.setFontSize(7.5);
  doc.text(`${company.address || 'Kinshasa'} — ${company.cityProvince || 'Kinshasa, RDC'}`, infoX, 21.5, { maxWidth: maxInfoWidth });
  doc.text(`RCCM: ${company.rccm || 'CD/KIN/RCCM/22-B-01452'}  |  ID.NAT: ${company.idNat || '01-93-N48120P'}  |  NIF: ${company.nif || 'A2210892X'}`, infoX, 25.5, { maxWidth: maxInfoWidth });
  doc.text(`N° CNSS Emp: ${company.cnssEmployerNumber || '1004812001-C'}  |  Tél: ${company.phone || '+243 810 000 000'}`, infoX, 29.5, { maxWidth: maxInfoWidth });
  doc.text(`Email: ${company.email || 'contact@entreprise.cd'}  |  Web: ${company.website || 'www.entreprise.cd'}`, infoX, 33.5, { maxWidth: maxInfoWidth });

  // Header Divider Line
  doc.setLineWidth(0.5);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(14, 38, pageWidth - 14, 38);

  return { bottomY: 44, barcodeId };
}

export interface PdfDocumentFooterOptions {
  barcodeId?: string;
  documentReference?: string;
  legalNote?: string;
  pageNumber?: number;
  totalPages?: number;
}

/**
 * Standardized High-Definition PDF Footer for all official RDC documents
 */
export function renderOfficialPdfFooter(
  doc: jsPDF,
  options?: PdfDocumentFooterOptions
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const y = pageHeight - 12;

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(14, y - 4, pageWidth - 14, y - 4);

  doc.setFont('times', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);

  const todayStr = new Date().toLocaleDateString('fr-FR');
  const refStr = options?.documentReference ? `Réf: ${options.documentReference}` : '';
  const barcodeStr = options?.barcodeId ? `ID Sécurité: ${options.barcodeId}` : '';
  const legalNotice =
    options?.legalNote ||
    'Généré par NovarisPay • Document officiel certifié conforme au Code du Travail & à la Législation RDC';

  doc.text(legalNotice, 14, y);
  doc.text(
    `Édité le ${todayStr}  |  ${refStr}  |  ${barcodeStr}  |  Page ${options?.pageNumber || 1}/${options?.totalPages || 1}`,
    14,
    y + 4
  );
}

/**
 * Formats financial amounts with proper thousand separator according to currency
 */
export function formatDocumentCurrency(amount: any, currency: 'CDF' | 'USD' = 'CDF'): string {
  return currency === 'USD' ? formatUSD(amount) : formatCDF(amount);
}
