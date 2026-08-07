/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * 
 * SERVICE PRÊTS ET AVANCES
 */

import { collection, getDocs, setDoc, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db, sanitizeData } from '../lib/firebase';
import { Loan } from '../types/loan';

export async function getLoans(): Promise<Loan[]> {
  try {
    const snap = await getDocs(collection(db, 'loans'));
    return snap.docs.map((d) => {
      const data = d.data();
      const totalAmt = data.totalAmount ?? data.amount ?? 0;
      return {
        id: d.id,
        ...data,
        label: data.label || data.reason || 'Avance sur salaire',
        totalAmount: Number(totalAmt),
        monthlyDeduction: Number(data.monthlyDeduction ?? 0),
        remainingBalance: Number(data.remainingBalance ?? totalAmt),
        currency: data.currency || 'CDF',
        status: data.status || 'EN_COURS',
      } as Loan;
    });
  } catch (err) {
    console.error('Erreur getLoans:', err);
    return [];
  }
}

export async function createLoan(loan: Omit<Loan, 'id' | 'createdAt'>): Promise<void> {
  await addDoc(collection(db, 'loans'), sanitizeData({
    ...loan,
    createdAt: new Date().toISOString(),
  }));
}

export async function updateLoanBalance(loanId: string, newBalance: number): Promise<void> {
  const cleanBalance = isNaN(newBalance) ? 0 : Math.max(0, newBalance);
  const isSolde = cleanBalance <= 0;
  await updateDoc(doc(db, 'loans', loanId), sanitizeData({
    remainingBalance: cleanBalance,
    status: isSolde ? 'SOLDE' : 'EN_COURS',
  }));
}
