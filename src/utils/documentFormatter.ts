/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * Common Document Formatter & Design System for Official RDC Documents
 */

import { jsPDF } from 'jspdf';

/**
 * Ensures a value is a valid finite number, falling back to 0 or a specified fallback.
 */
export function safeNumber(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  const num = typeof val === 'number' ? val : Number(val);
  return isFinite(num) ? num : fallback;
}

/**
 * Formats a CDF amount safely with standard space (or non-breaking space) thousand separators.
 * Guarantees NO slashes `/`, NO `NaN`, NO `undefined`.
 * Example: 4140000 -> "4 140 000 FC"
 */
export function formatCDF(amount: any, includeSuffix = true): string {
  const safe = safeNumber(amount, 0);
  const rounded = Math.round(safe);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return includeSuffix ? `${formatted} FC` : formatted;
}

/**
 * Formats a USD amount safely with 2 decimal places and standard space thousand separators.
 * Guarantees NO slashes `/`, NO `NaN`, NO `undefined`.
 * Example: 1250.5 -> "$1 250.50 USD"
 */
export function formatUSD(amount: any, includeCurrency = true): string {
  const safe = safeNumber(amount, 0);
  const parts = safe.toFixed(2).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const formatted = `${integerPart}.${parts[1]}`;
  return includeCurrency ? `$${formatted} USD` : `$${formatted}`;
}

/**
 * General number formatting with configurable decimals and space separators.
 */
export function formatNumber(amount: any, decimals = 0): string {
  const safe = safeNumber(amount, 0);
  if (decimals === 0) {
    return Math.round(safe).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }
  const parts = safe.toFixed(decimals).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${integerPart}.${parts[1]}`;
}

/**
 * Formats an ISO date string (YYYY-MM-DD) to French format DD/MM/YYYY
 */
export function formatDateFR(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Configures jsPDF to use Times New Roman font ('times') in normal/bold/italic.
 */
export function applyDocFont(
  doc: jsPDF,
  style: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal',
  size = 11
) {
  doc.setFont('times', style);
  doc.setFontSize(size);
}

/**
 * CSS classes string or style object for HTML Document Views.
 * Ensures Times New Roman, regular line height, normal letter spacing.
 */
export const DOCUMENT_CONTAINER_CLASS =
  'font-serif text-slate-900 bg-white p-8 md:p-12 max-w-4xl mx-auto shadow-md border border-slate-200 print:shadow-none print:border-none print:p-0 print:max-w-none text-[11pt] leading-normal tracking-normal';
