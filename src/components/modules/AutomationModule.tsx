/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 */

import React, { useState } from 'react';
import { Zap, Bell, CheckCircle, Clock, AlertTriangle, Calendar, RefreshCw, Send } from 'lucide-react';

interface HRAlert {
  id: string;
  type: 'PROBATION_END' | 'CONTRACT_EXPIRE' | 'VISA_EXPIRE' | 'SENIORITY_ANNIVERSARY';
  employeeName: string;
  department: string;
  dueDate: string;
  daysRemaining: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'RESOLVED';
}

export const AutomationModule: React.FC = () => {
  const [alerts, setAlerts] = useState<HRAlert[]>([
    {
      id: 'ALT-101',
      type: 'PROBATION_END',
      employeeName: 'LUMUMBA Jean-Pierre',
      department: 'Exploitation',
      dueDate: '2026-08-05',
      daysRemaining: 8,
      priority: 'HIGH',
      status: 'PENDING',
    },
    {
      id: 'ALT-102',
      type: 'CONTRACT_EXPIRE',
      employeeName: 'MOKAKO Béatrice',
      department: 'Comptabilité',
      dueDate: '2026-08-20',
      daysRemaining: 23,
      priority: 'MEDIUM',
      status: 'PENDING',
    },
    {
      id: 'ALT-103',
      type: 'VISA_EXPIRE',
      employeeName: 'VAN DER MERWE Johan (Expatrié)',
      department: 'Direction Technique',
      dueDate: '2026-08-15',
      daysRemaining: 18,
      priority: 'HIGH',
      status: 'PENDING',
    },
    {
      id: 'ALT-104',
      type: 'SENIORITY_ANNIVERSARY',
      employeeName: 'TSHISEKEDI Antoine',
      department: 'Logistique',
      dueDate: '2026-08-01',
      daysRemaining: 4,
      priority: 'LOW',
      status: 'PENDING',
    },
  ]);

  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);

  const handleRunAutomation = (actionName: string) => {
    setLastSyncMessage(`Action automatisée exécutée avec succès : "${actionName}" à ${new Date().toLocaleTimeString()}`);
    setTimeout(() => setLastSyncMessage(null), 5000);
  };

  const handleResolveAlert = (id: string) => {
    setAlerts(alerts.map((a) => (a.id === id ? { ...a, status: 'RESOLVED' } : a)));
  };

  const getAlertBadge = (type: HRAlert['type']) => {
    switch (type) {
      case 'PROBATION_END':
        return 'Fin de période d\'essai';
      case 'CONTRACT_EXPIRE':
        return 'Fin de contrat CDD';
      case 'VISA_EXPIRE':
        return 'Expiration Carte de Travail Expatrié';
      case 'SENIORITY_ANNIVERSARY':
        return 'Anniversaire d\'Ancienneté (Gratification)';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-[#1F3864]">Automatisation & Workflows RH RDC</h1>
          <p className="text-xs text-slate-500">
            Rappels automatiques d'expiration, alertes fin d'essai/CDD, déclenchement de paie en 1 clic et calculs automatiques.
          </p>
        </div>
      </div>

      {lastSyncMessage && (
        <div className="p-3 bg-emerald-50 border-l-4 border-emerald-600 text-emerald-800 text-xs rounded font-bold shadow-sm">
          {lastSyncMessage}
        </div>
      )}

      {/* 1-Click Automation Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-[#1F3864]">
            <Zap className="w-5 h-5 text-[#BF9000]" />
            <h3 className="font-bold text-xs">Génération Paie Automatique</h3>
          </div>
          <p className="text-[11px] text-slate-500">Calcul automatique des bulletins mensuels pour tous les salariés actifs.</p>
          <button
            onClick={() => handleRunAutomation('Calcul automatique de la paie mensuelle')}
            className="w-full bg-[#1F3864] text-white text-xs font-bold py-2 rounded-lg hover:bg-[#152747] transition"
          >
            Lancer le Calcul 1-Clic
          </button>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-[#1F3864]">
            <Bell className="w-5 h-5 text-[#BF9000]" />
            <h3 className="font-bold text-xs">Rappels d'Entretiens Annuels</h3>
          </div>
          <p className="text-[11px] text-slate-500">Notification automatique envoyée aux managers pour les évaluations.</p>
          <button
            onClick={() => handleRunAutomation('Envoi des notifications d\'entretiens annuels')}
            className="w-full bg-slate-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-slate-900 transition"
          >
            Envoyer les Rappels
          </button>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-[#1F3864]">
            <RefreshCw className="w-5 h-5 text-[#BF9000]" />
            <h3 className="font-bold text-xs">Mise à Jour Soldes Congés</h3>
          </div>
          <p className="text-[11px] text-slate-500">Incrémentation automatique de 1.83 jour/mois pour chaque salarié.</p>
          <button
            onClick={() => handleRunAutomation('Recalcul des soldes de congés payés')}
            className="w-full bg-slate-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-slate-900 transition"
          >
            Actualiser les Soldes
          </button>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-[#1F3864]">
            <Send className="w-5 h-5 text-[#BF9000]" />
            <h3 className="font-bold text-xs">Alertes Fin de Contrat</h3>
          </div>
          <p className="text-[11px] text-slate-500">Relance RH automatique 30 jours avant terme de tout CDD ou période d'essai.</p>
          <button
            onClick={() => handleRunAutomation('Scan des échéances de contrats')}
            className="w-full bg-slate-800 text-white text-xs font-bold py-2 rounded-lg hover:bg-slate-900 transition"
          >
            Scanner les Échéances
          </button>
        </div>
      </div>

      {/* HR Automatic Alerts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#1F3864]">Registre des Alertes & Échéances Légales imminentes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#1F3864] text-white uppercase font-bold text-[11px]">
              <tr>
                <th className="py-3 px-4">Événement & Salarié</th>
                <th className="py-3 px-4">Département</th>
                <th className="py-3 px-4">Date d'Échéance</th>
                <th className="py-3 px-4">Jours Restants</th>
                <th className="py-3 px-4">Priorité</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alerts.map((a) => (
                <tr key={a.id} className={a.status === 'RESOLVED' ? 'opacity-40 bg-slate-50' : 'hover:bg-slate-50'}>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    <div>{a.employeeName}</div>
                    <div className="text-[11px] text-[#1F3864] font-semibold">{getAlertBadge(a.type)}</div>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700">{a.department}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{a.dueDate}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-black ${
                        a.daysRemaining <= 10 ? 'text-red-600' : 'text-amber-600'
                      }`}
                    >
                      Dans {a.daysRemaining} jour(s)
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.priority === 'HIGH'
                          ? 'bg-red-100 text-red-800'
                          : a.priority === 'MEDIUM'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {a.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {a.status === 'PENDING' ? (
                      <button
                        onClick={() => handleResolveAlert(a.id)}
                        className="px-3 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700"
                      >
                        Marquer Traité
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold">Traité</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
