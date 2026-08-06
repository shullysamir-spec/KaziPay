/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 */

import React from 'react';
import { ShieldCheck, Database, Key, CheckCircle, X } from 'lucide-react';

interface SuperAdminInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuperAdminInstructionsModal: React.FC<SuperAdminInstructionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
        <div className="bg-[#1F3864] text-white p-5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-[#BF9000]" />
            <h2 className="text-lg font-bold">Guide de Configuration Super Administrateur & Firebase</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-blue-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-slate-800 text-sm">
          {/* Section 1: Super Admin Credentials */}
          <div className="bg-blue-50 border-l-4 border-[#1F3864] p-4 rounded-r-lg">
            <h3 className="font-bold text-[#1F3864] text-base mb-2 flex items-center space-x-2">
              <Key className="w-5 h-5 text-[#BF9000]" />
              <span>1. Identifiants du Super Administrateur de Démonstration</span>
            </h3>
            <p className="text-slate-700 text-xs mb-3">
              Au premier chargement de l'application, NovarisPay crée automatiquement le compte Super Administrateur ci-dessous avec le niveau de privilège 100 :
            </p>
            <div className="bg-white p-3 rounded border border-slate-200 font-mono text-xs space-y-1">
              <div><strong>Email :</strong> admin@novarispay.cd</div>
              <div><strong>Mot de passe :</strong> Admin@2026!</div>
              <div><strong>Rôle :</strong> SUPERADMIN (Niveau 100)</div>
            </div>
          </div>

          {/* Section 2: Firebase Connection Details */}
          <div>
            <h3 className="font-bold text-slate-900 text-base mb-2 flex items-center space-x-2">
              <Database className="w-5 h-5 text-emerald-600" />
              <span>2. Connexion du Projet Firebase Firestore</span>
            </h3>
            <p className="text-slate-600 text-xs mb-3">
              NovarisPay est connecté à votre projet Firestore via le fichier de configuration <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800 font-bold">firebase-applet-config.json</code>.
            </p>
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Firebase Authentication :</strong> Utilisé pour l'authentification Email / Mot de passe avec détection des échecs et verrouillage automatique.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Cloud Firestore :</strong> Contient les collections persistent <code>users</code>, <code>roles</code>, <code>rolePermissions</code>, <code>statutoryParams</code>, <code>employees</code>, <code>contracts</code>, <code>attendance</code>, <code>leave</code>, <code>loans</code>, <code>payrollRuns</code>, <code>payslips</code>, <code>securityLogs</code>.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Règles de sécurité :</strong> Déployées et configurées dans <code>firestore.rules</code> pour restreindre les accès selon le RBAC NovarisPay.</span>
              </li>
            </ul>
          </div>

          {/* Section 3: Architecture & Pure Code Rule */}
          <div className="bg-amber-50 border-l-4 border-[#BF9000] p-4 rounded-r-lg text-xs">
            <h4 className="font-bold text-amber-900 mb-1">Architecture Conforme RDC :</h4>
            <p className="text-amber-800">
              Tous les calculs IRPP, CNSS, INPP, ONEM, SMIG et la double devise CDF/USD sont effectués par du code TypeScript pur déterministe. Aucune formule n'est générée dynamiquement par une IA à l'exécution.
            </p>
          </div>

          <div className="text-right pt-2 border-t border-slate-200">
            <button
              onClick={onClose}
              className="bg-[#1F3864] hover:bg-[#152747] text-white font-bold px-5 py-2 rounded-lg text-xs transition"
            >
              J'ai compris, fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
