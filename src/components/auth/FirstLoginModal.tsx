/**
 * @license
 * KaziPay - ERP RH et Paie RDC
 */

import React, { useState } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { UserProfile } from '../../types/auth';
import { KeyRound, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface FirstLoginModalProps {
  user: UserProfile;
  onPasswordChanged: () => void;
}

export const FirstLoginModal: React.FC<FirstLoginModalProps> = ({ user, onPasswordChanged }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setErrorMsg('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
      }
      await updateDoc(doc(db, 'users', user.uid), {
        mustChangePassword: false,
      });
      onPasswordChanged();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors du changement de mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
        <div className="flex items-center space-x-3 mb-4 text-[#1F3864]">
          <KeyRound className="w-8 h-8 text-[#BF9000]" />
          <div>
            <h2 className="text-lg font-bold">Changement de mot de passe obligatoire</h2>
            <p className="text-xs text-slate-500">Première connexion détectée</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-4">
          Pour des raisons de sécurité, vous devez modifier votre mot de passe temporaire avant de continuer.
        </p>

        {errorMsg && (
          <div className="mb-4 bg-red-50 border-l-4 border-[#C00000] p-3 rounded text-xs text-red-800 flex items-start space-x-2">
            <ShieldAlert className="w-4 h-4 text-[#C00000] flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="Minimum 8 caractères"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              placeholder="Répétez le mot de passe"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1F3864] hover:bg-[#152747] text-white font-bold py-2.5 px-4 rounded-lg text-sm shadow transition"
          >
            {loading ? 'Mise à jour...' : 'Enregistrer le nouveau mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
};
