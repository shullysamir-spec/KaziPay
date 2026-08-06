/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 */

import { Currency } from './employee';

export type LoanStatus = 'EN_COURS' | 'SOLDE' | 'SUSPENDU';

export interface Loan {
  id?: string;
  employeeId: string;
  employeeName?: string;
  label: string;
  reason?: string;
  totalAmount: number;
  amount?: number;
  currency: Currency;
  monthlyDeduction: number;
  remainingBalance: number;
  startDate?: string;
  requestDate?: string;
  endDate?: string;
  status: LoanStatus;
  createdAt?: string;
}
