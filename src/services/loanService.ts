/**
 * @license
 * KaziPay - ERP RH et Paie RDC
 * 
 * SERVICE PRÊTS ET AVANCES
 */

import { collection, getDocs, setDoc, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loan } from '../types/loan';

export async function getLoans(): Promise<Loan[]> {
  try {
    const snap = await getDocs(collection(db, 'loans'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Loan));
  } catch (err) {
    console.error('Erreur getLoans:', err);
    return [];
  }
}

export async function createLoan(loan: Omit<Loan, 'id' | 'createdAt'>): Promise<void> {
  await addDoc(collection(db, 'loans'), {
    ...loan,
    createdAt: new Date().toISOString(),
  });
}

export async function updateLoanBalance(loanId: string, newBalance: number): Promise<void> {
  const isSolde = newBalance <= 0;
  await updateDoc(doc(db, 'loans', loanId), {
    remainingBalance: Math.max(0, newBalance),
    status: isSolde ? 'SOLDE' : 'EN_COURS',
  });
}
