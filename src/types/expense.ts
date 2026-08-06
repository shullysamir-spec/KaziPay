/**
 * @license
 * NovarisPay - Expense Reports & Reimbursements Types
 */

export type ExpenseCategory =
  | 'TRANSPORT'
  | 'HOTEL_LODGING'
  | 'MEALS'
  | 'MISSION_PERDIEM'
  | 'OFFICE_SUPPLIES'
  | 'OTHER';

export type ExpenseStatus =
  | 'SUBMITTED'
  | 'APPROVED_SUPERVISOR'
  | 'APPROVED_FINANCE'
  | 'REIMBURSED'
  | 'REJECTED';

export interface ExpenseReport {
  id: string;
  employeeMatricule: string;
  employeeName: string;
  department: string;
  category: ExpenseCategory;
  categoryLabel: string;
  amount: number;
  currency: 'CDF' | 'USD';
  amountCDF: number; // Converted amount CDF
  expenseDate: string;
  submissionDate: string;
  description: string;
  receiptUrl?: string;
  receiptFileName?: string;
  status: ExpenseStatus;
  supervisorApproval?: {
    approvedBy: string;
    approvedAt: string;
    comments?: string;
  };
  financeApproval?: {
    approvedBy: string;
    approvedAt: string;
    comments?: string;
  };
  reimbursementDetails?: {
    reimbursedAt: string;
    paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'MOBILE_MONEY';
    paymentReference: string;
    includedInPayrollPeriod?: string;
  };
  rejectionReason?: string;
}
