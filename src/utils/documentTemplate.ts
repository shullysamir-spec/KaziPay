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
 * Embedded Base64 raster image of the official NovarisPay logo emblem.
 * Guarantees 100% availability for print and PDF generation with zero external network requests.
 */
let cachedLogoDataUrl: string | null = null;

export function getEmbeddedCompanyLogoDataUrl(): string {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;

  const company = getCompanyConfig();
  if (company.logoUrl && company.logoUrl.startsWith('data:image')) {
    cachedLogoDataUrl = company.logoUrl;
    return cachedLogoDataUrl;
  }

  // Generate crisp canvas raster of the corporate emblem & typography
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
      ctx.fillStyle = '#1F3864'; // Corporate Navy
      ctx.beginPath();
      ctx.roundRect(10, 10, 100, 100, 16);
      ctx.fill();

      // Gold Accent Ribbon
      ctx.fillStyle = '#BF9000'; // Corporate Gold
      ctx.beginPath();
      ctx.roundRect(70, 20, 26, 50, 6);
      ctx.fill();

      // Monogram "N" in white
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 56px "Times New Roman", Times, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('N', 48, 62);

      // "P" accent dot
      ctx.fillStyle = '#287BFF';
      ctx.beginPath();
      ctx.arc(83, 80, 8, 0, Math.PI * 2);
      ctx.fill();

      // Wordmark "NovarisPay"
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#071D49';
      ctx.font = 'bold 44px "Times New Roman", Times, serif';
      ctx.fillText('NOVARIS', 130, 60);

      ctx.fillStyle = '#119CFF';
      ctx.fillText('PAY', 342, 60);

      // Subtitle
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 15px "Times New Roman", Times, serif';
      ctx.fillText('ERP RH & PAIE • RÉPUBLIQUE DÉMOCRATIQUE DU CONGO', 132, 90);

      // Subtle divider bar
      ctx.fillStyle = '#BF9000';
      ctx.fillRect(132, 100, 290, 3);

      cachedLogoDataUrl = canvas.toDataURL('image/png');
      return cachedLogoDataUrl;
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
  documentReference?: string; // e.g. "BS-202607-001", "NVP-TRANSM-2026-0042"
  barcodeId?: string;
  docTypeCode?: string; // "PAY", "TRANSM", "DECL", "FACT", "CERT", "STC", "360"
  companyOverride?: Partial<CompanyConfig>;
  accentColor?: [number, number, number];
  primaryColor?: [number, number, number];
}

/**
 * Standardized High-Definition PDF Header for all official RDC documents
 * Renders embedded logo, aligned company identifiers, document banner & certified barcode.
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
  doc.rect(0, 0, pageWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(7.5);
  doc.text('RÉPUBLIQUE DÉMOCRATIQUE DU CONGO — ERP RH NOVARISPAY', 14, 6.5);
  doc.text('SYSTÈME SÉCURISÉ & CONFORME AU CODE DU TRAVAIL RDC', pageWidth - 14, 6.5, { align: 'right' });

  // Generate / register document barcode
  const docTypeCode = options.docTypeCode || 'DOC';
  const barcodeId = options.barcodeId || generateBarcodeIdentifier(docTypeCode);
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
    companyCode: 'NVP',
    moduleRoute: 'ged',
  });

  // Embed Local Company Logo (Top Left)
  const logoDataUrl = getEmbeddedCompanyLogoDataUrl();
  try {
    doc.addImage(logoDataUrl, 'PNG', 14, 14, 46, 16);
  } catch (err) {
    // Fallback vector emblem
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(14, 14, 14, 14, 2, 2, 'F');
    doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.rect(23, 17, 3, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(9);
    doc.text('N', 17, 23);
  }

  // Company Legal Identity Info (Next to logo)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text((company.name || 'NOVARISPAY CONGO SARL').toUpperCase(), 64, 19);

  doc.setTextColor(71, 85, 105);
  doc.setFont('times', 'normal');
  doc.setFontSize(8);
  doc.text(`${company.address || '14, Av. de la Justice, Kinshasa/Gombe'} — ${company.cityProvince || 'Kinshasa, RDC'}`, 64, 23.5);
  doc.text(`RCCM: ${company.rccm || 'CD/KIN/RCCM/22-B-01452'}  |  ID.NAT: ${company.idNat || '01-93-N48120P'}  |  NIF: ${company.nif || 'A2210892X'}`, 64, 27.5);
  doc.text(`N° CNSS Emp: ${company.cnssEmployerNumber || '1004812001-C'}  |  Tél: ${company.phone || '+243 810 000 000'}  |  Email: ${company.email || 'contact@novarispay.cd'}`, 64, 31.5);

  // Document Title Banner & Barcode (Top Right)
  const rightBoxWidth = 58;
  const rightBoxX = pageWidth - 14 - rightBoxWidth;

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(rightBoxX, 14, rightBoxWidth, 10, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(9.5);
  doc.text(options.documentTitle.toUpperCase(), rightBoxX + rightBoxWidth / 2, 20.5, { align: 'center' });

  if (barcodeDataUrl) {
    try {
      doc.addImage(barcodeDataUrl, 'PNG', rightBoxX, 26, rightBoxWidth, 11);
    } catch (e) {
      console.warn('Barcode addImage failed:', e);
    }
  }

  // Header Divider Line
  doc.setLineWidth(0.5);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(14, 39, pageWidth - 14, 39);

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
    'Document certifié immuable édité par NovarisPay ERP RH • Conforme au Code du Travail & à la Législation RDC';

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
