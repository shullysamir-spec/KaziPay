/**
 * @license
 * KaziPay - ERP RH et Paie RDC
 */

import { Currency } from './employee';

export type LoanStatus = 'EN_COURS' | 'SOLDE' | 'SUSPENDU';

export interface Loan {
  id?: string;
  employeeId: string;
  employeeName?: string;
  label: string;
  totalAmount: number;
  currency: Currency;
  monthlyDeduction: number;
  remainingBalance: number;
  startDate: string;
  endDate?: string;
  status: LoanStatus;
  createdAt: string;
}
