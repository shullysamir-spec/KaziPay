/**
 * @license
 * KaziPay - ERP RH et Paie RDC
 */

import React, { useState } from 'react';
import { Award, BookOpen, Target, Plus, CheckCircle, FileText, Calendar, Star, BarChart2 } from 'lucide-react';
import { UserProfile } from '../../types/auth';

interface Evaluation {
  id: string;
  employeeName: string;
  department: string;
  period: string; // Ex: "2025/2026"
  evaluator: string;
  rating: number; // 1 à 5
  kpiAchievement: number; // % Ex: 92%
  feedback: string;
  recommendation: 'PROMOTION' | 'AUGMENTATION' | 'FORMATION' | 'MAINTIEN';
  status: 'COMPLETED' | 'PENDING';
}

interface TrainingCourse {
  id: string;
  title: string;
  provider: string;
  category: string;
  startDate: string;
  endDate: string;
  budgetCDF: number;
  participantsCount: number;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
}

export const PerformanceModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'EVALUATIONS' | 'CAMPAIGNS' | 'SUCCESSION' | 'TRAINING' | 'SKILL_MATRIX'>('EVALUATIONS');

  // Sample evaluations
  const [evaluations, setEvaluations] = useState<Evaluation[]>([
    {
      id: 'EV-001',
      employeeName: 'MUKENDI Jean-Paul',
      department: 'Exploitation',
      period: 'Bilan Annuel 2025',
      evaluator: 'Kabongo Marie (DRH)',
      rating: 4.5,
      kpiAchievement: 95,
      feedback: 'Performance exceptionnelle sur la gestion des équipes de terrain à Lubumbashi.',
      recommendation: 'PROMOTION',
      status: 'COMPLETED',
    },
    {
      id: 'EV-002',
      employeeName: 'KAPINGA Sarah',
      department: 'Comptabilité',
      period: 'Bilan Annuel 2025',
      evaluator: 'Mbala Alain (Chef Comptable)',
      rating: 4.0,
      kpiAchievement: 88,
      feedback: 'Clôtures mensuelles rigoureuses et conformité fiscale irréprochable.',
      recommendation: 'AUGMENTATION',
      status: 'COMPLETED',
    },
  ]);

  // Sample training
  const [trainings, setTrainings] = useState<TrainingCourse[]>([
    {
      id: 'TR-101',
      title: 'Code du Travail RDC & Prévention des Litiges',
      provider: 'Cabinet Juridique Kinshasa',
      category: 'Droit Social',
      startDate: '2026-08-10',
      endDate: '2026-08-12',
      budgetCDF: 3500000,
      participantsCount: 8,
      status: 'PLANNED',
    },
    {
      id: 'TR-102',
      title: 'Normes OHADA & Fiscalité IRPP / IPR 2026',
      provider: 'Ordre des Experts Comptables RDC',
      category: 'Finance & Paie',
      startDate: '2026-06-15',
      endDate: '2026-06-18',
      budgetCDF: 5000000,
      participantsCount: 5,
      status: 'COMPLETED',
    },
  ]);

  // Modal State for New Evaluation
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [newEval, setNewEval] = useState<Partial<Evaluation>>({
    employeeName: '',
    department: 'Exploitation',
    period: 'Bilan 2026',
    evaluator: 'Direction RH',
    rating: 4,
    kpiAchievement: 85,
    feedback: '',
    recommendation: 'AUGMENTATION',
    status: 'COMPLETED',
  });

  const handleAddEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEval.employeeName) return;
    const item: Evaluation = {
      id: `EV-00${evaluations.length + 1}`,
      employeeName: newEval.employeeName,
      department: newEval.department || 'RH',
      period: newEval.period || '2026',
      evaluator: newEval.evaluator || 'RH',
      rating: newEval.rating || 4,
      kpiAchievement: newEval.kpiAchievement || 80,
      feedback: newEval.feedback || 'Évaluation enregistrée',
      recommendation: newEval.recommendation || 'MAINTIEN',
      status: 'COMPLETED',
    };
    setEvaluations([item, ...evaluations]);
    setIsEvalModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-[#1F3864]">Performance, Évaluations & Formations</h1>
          <p className="text-xs text-slate-500">
            Suivi des entretiens annuels, atteinte des objectifs KPI, cartographie des compétences et plan de formation.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeTab === 'EVALUATIONS' && (
            <button
              onClick={() => setIsEvalModalOpen(true)}
              className="bg-[#1F3864] hover:bg-[#152747] text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow transition"
            >
              <Plus className="w-4 h-4 text-[#BF9000]" />
              <span>Nouvel Entretien Annuel</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('EVALUATIONS')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'EVALUATIONS'
              ? 'border-[#1F3864] text-[#1F3864]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Entretiens & Bilans ({evaluations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CAMPAIGNS')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'CAMPAIGNS'
              ? 'border-[#1F3864] text-[#1F3864]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Campagnes 6 Mois & 12 Mois</span>
        </button>

        <button
          onClick={() => setActiveTab('SUCCESSION')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'SUCCESSION'
              ? 'border-[#1F3864] text-[#1F3864]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Plan de Succession & Matrice 9-Box</span>
        </button>

        <button
          onClick={() => setActiveTab('TRAINING')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'TRAINING'
              ? 'border-[#1F3864] text-[#1F3864]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Plan de Formation ({trainings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SKILL_MATRIX')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 whitespace-nowrap ${
            activeTab === 'SKILL_MATRIX'
              ? 'border-[#1F3864] text-[#1F3864]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Matrice des Compétences</span>
        </button>
      </div>

      {/* Content 1: Evaluations */}
      {activeTab === 'EVALUATIONS' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
              <span className="text-xs text-blue-700 font-bold uppercase block">Note Moyenne Entreprise</span>
              <span className="text-2xl font-black text-[#1F3864]">4.25 / 5</span>
              <span className="text-[10px] text-blue-600 block mt-1">Évaluation globale 2025-2026</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
              <span className="text-xs text-emerald-700 font-bold uppercase block">Atteinte Moyenne KPI</span>
              <span className="text-2xl font-black text-emerald-800">91.5 %</span>
              <span className="text-[10px] text-emerald-600 block mt-1">Objectifs d'exploitation validés</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
              <span className="text-xs text-amber-700 font-bold uppercase block">Promotions Proposées</span>
              <span className="text-2xl font-black text-[#BF9000]">12 %</span>
              <span className="text-[10px] text-amber-600 block mt-1">Candidats à l'avancement interne</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#1F3864] text-white uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Salarié & Département</th>
                  <th className="py-3 px-4">Période & Évaluateur</th>
                  <th className="py-3 px-4">Note / 5</th>
                  <th className="py-3 px-4">KPIs Atteints</th>
                  <th className="py-3 px-4">Recommandation RH</th>
                  <th className="py-3 px-4">Avis Synthétique</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evaluations.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{ev.employeeName}</div>
                      <div className="text-[11px] text-slate-500">{ev.department}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{ev.period}</div>
                      <div className="text-[11px] text-slate-500">{ev.evaluator}</div>
                    </td>
                    <td className="py-3 px-4 font-black text-[#1F3864]">
                      <div className="flex items-center space-x-1">
                        <Star className="w-3.5 h-3.5 text-[#BF9000] fill-[#BF9000]" />
                        <span>{ev.rating} / 5</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700">{ev.kpiAchievement}%</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#1F3864]">
                        {ev.recommendation}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{ev.feedback}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content 1.5: Campaigns */}
      {activeTab === 'CAMPAIGNS' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base font-bold text-[#1F3864]">Gestion des Campagnes d'Évaluation Périodiques</h2>
              <p className="text-xs text-slate-500">
                Lancement automatique ou manuel des entretiens à rythme semestriel (6 mois) ou annuel (12 mois) selon les exigences des postes.
              </p>
            </div>
            <button className="bg-[#1F3864] text-white font-bold px-4 py-2 rounded-lg text-xs hover:bg-[#152747]">
              + Lancer une Nouvelle Campagne
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#1F3864]">Campagne Semestrielle H1 2026 (6 mois)</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">En Cours</span>
              </div>
              <p className="text-xs text-slate-600">
                <strong>Postes ciblés :</strong> Équipes terrain, Opérateurs, Commerciaux & Agents d'exploitation.
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Avancement global</span>
                  <span className="font-bold">78% (35 / 45 réalisés)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full" style={{ width: '78%' }}></div>
                </div>
              </div>
              <div className="text-[11px] text-slate-500">Date limite : 31 Août 2026</div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#1F3864]">Campagne Annuelle 2026 (12 mois)</span>
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Planifiée</span>
              </div>
              <p className="text-xs text-slate-600">
                <strong>Postes ciblés :</strong> Cadres de Direction, Chefs de Département, Ingénieurs & Experts.
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Avancement global</span>
                  <span className="font-bold">0% (Lancement en Novembre)</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#1F3864] h-full" style={{ width: '0%' }}></div>
                </div>
              </div>
              <div className="text-[11px] text-slate-500">Période : 15 Nov 2026 - 15 Déc 2026</div>
            </div>
          </div>
        </div>
      )}

      {/* Content 1.8: Succession & Talent Matrix 9-Box */}
      {activeTab === 'SUCCESSION' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#1F3864]">Plan de Succession des Postes Clés & Matrice des Talents (9-Box Grid)</h2>
            <p className="text-xs text-slate-500">
              Cartographie de la haute performance vs potentiel d'évolution pour sécuriser les rôles stratégiques de l'entreprise.
            </p>
          </div>

          {/* 9-Box Grid */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs text-[#1F3864] uppercase tracking-wide">Matrice 9-Box : Performance vs Potentiel</h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              {/* Row 1: High Potential */}
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="font-bold text-indigo-900">Enigma / Potentiel Élevé</div>
                <div className="text-[11px] text-slate-600">Performance Faible | Potentiel Fort</div>
                <div className="mt-2 font-bold text-slate-800">• KAPINGA Sarah</div>
              </div>

              <div className="p-3 bg-[#1F3864]/10 border border-[#1F3864]/30 rounded-lg">
                <div className="font-bold text-[#1F3864]">Futur Leader / High Potential</div>
                <div className="text-[11px] text-slate-600">Performance Moyenne | Potentiel Fort</div>
                <div className="mt-2 font-bold text-slate-800">• MBUYI Patrice</div>
              </div>

              <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-lg shadow-sm">
                <div className="font-black text-emerald-950 flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400 stroke-[1.75]" />
                  <span>Talent Majeur (Star / Key Successor)</span>
                </div>
                <div className="text-[11px] text-emerald-800 font-semibold">Performance Forte | Potentiel Fort</div>
                <div className="mt-2 font-black text-emerald-900">• MUKENDI Jean-Paul</div>
                <div className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold inline-block mt-1">Prêt pour Direction</div>
              </div>

              {/* Row 2: Medium Potential */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="font-bold text-slate-800">Dilemme / À Accompagner</div>
                <div className="text-[11px] text-slate-500">Performance Faible | Potentiel Moyen</div>
                <div className="mt-2 text-slate-600">• LUKUSA Eric</div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="font-bold text-blue-900">Contributeur Clé</div>
                <div className="text-[11px] text-slate-600">Performance Moyenne | Potentiel Moyen</div>
                <div className="mt-2 font-bold text-slate-800">• KASONGO Patrick</div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="font-bold text-amber-900">Pilier Opérationnel</div>
                <div className="text-[11px] text-slate-600">Performance Forte | Potentiel Moyen</div>
                <div className="mt-2 font-bold text-slate-800">• MBALA Alain</div>
              </div>

              {/* Row 3: Low Potential */}
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="font-bold text-red-900">Sous-Performance</div>
                <div className="text-[11px] text-slate-500">Performance Faible | Potentiel Faible</div>
                <div className="mt-2 text-slate-600">• Aucun salarié</div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="font-bold text-slate-800">Professionnel Efficace</div>
                <div className="text-[11px] text-slate-500">Performance Moyenne | Potentiel Faible</div>
                <div className="mt-2 text-slate-600">• TSHIMANGA Paul</div>
              </div>

              <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg">
                <div className="font-bold text-slate-900">Expert / Ancre Technologique</div>
                <div className="text-[11px] text-slate-600">Performance Forte | Potentiel Faible</div>
                <div className="mt-2 font-bold text-slate-800">• NDAYE Chantal</div>
              </div>
            </div>
          </div>

          {/* Table Succession Plan */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs text-[#1F3864] uppercase tracking-wide">Plan de Succession des Postes Stratégiques</h3>
            <table className="w-full text-left text-xs border rounded-lg overflow-hidden">
              <thead className="bg-[#1F3864] text-white uppercase text-[10px] font-bold">
                <tr>
                  <th className="p-2.5">Poste Clé Stratégique</th>
                  <th className="p-2.5">Titulaire Actuel</th>
                  <th className="p-2.5">Risque de Départ</th>
                  <th className="p-2.5">Successeur Désigné N°1</th>
                  <th className="p-2.5">Niveau de Préparation</th>
                  <th className="p-2.5">Successeur N°2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold text-slate-900">Directeur d'Exploitation</td>
                  <td className="p-2.5">MUKENDI Jean-Paul</td>
                  <td className="p-2.5"><span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px]">Moyen</span></td>
                  <td className="p-2.5 font-black text-emerald-800">MBUYI Patrice</td>
                  <td className="p-2.5"><span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">Prêt Immédiatement (0-6m)</span></td>
                  <td className="p-2.5 text-slate-600">KASONGO Patrick (Prêt à 2 ans)</td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold text-slate-900">Chef Comptable & Fiscaliste</td>
                  <td className="p-2.5">MBALA Alain</td>
                  <td className="p-2.5"><span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">Faible</span></td>
                  <td className="p-2.5 font-black text-emerald-800">KAPINGA Sarah</td>
                  <td className="p-2.5"><span className="bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px]">Prêt à 1 an (Formation OHADA)</span></td>
                  <td className="p-2.5 text-slate-600">TSHIMANGA Paul</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content 2: Training */}
      {activeTab === 'TRAINING' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#1F3864] text-white uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Intitulé de la Formation</th>
                  <th className="py-3 px-4">Organisme Formateur</th>
                  <th className="py-3 px-4">Période</th>
                  <th className="py-3 px-4">Budget engagé (CDF)</th>
                  <th className="py-3 px-4">Inscrits</th>
                  <th className="py-3 px-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trainings.map((tr) => (
                  <tr key={tr.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{tr.title}</div>
                      <div className="text-[11px] text-[#1F3864] font-semibold">{tr.category}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{tr.provider}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {tr.startDate} au {tr.endDate}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{tr.budgetCDF.toLocaleString()} FC</td>
                    <td className="py-3 px-4 font-bold text-slate-800">{tr.participantsCount} agents</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tr.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tr.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {tr.status === 'COMPLETED' ? 'Terminé' : tr.status === 'IN_PROGRESS' ? 'En cours' : 'Planifié'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Content 3: Skill Matrix */}
      {activeTab === 'SKILL_MATRIX' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#1F3864]">Matrice des Compétences Clés RDC (Skill Matrix)</h2>
          <p className="text-xs text-slate-500">
            Évaluation synthétique de la maitrise technique et réglementaire par pôle d'activité.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {[
              { name: 'Code du Travail & Règlements RDC', level: '90%', status: 'Expert' },
              { name: 'Fiscalité IRPP & Cotisations CNSS/INPP', level: '95%', status: 'Maîtrisé' },
              { name: 'Comptabilité SYSCOHADA & Paie', level: '88%', status: 'Maîtrisé' },
              { name: 'Sécurité Industrielle & Hygiène (HSE)', level: '75%', status: 'En progression' },
              { name: 'Gestion des Relations Syndicales', level: '82%', status: 'Maîtrisé' },
              { name: 'Audit Interne & Contrôle de Paie', level: '92%', status: 'Expert' },
            ].map((skill, i) => (
              <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-xs text-slate-900">{skill.name}</strong>
                  <span className="text-[10px] font-bold bg-[#1F3864] text-white px-2 py-0.5 rounded">
                    {skill.status}
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#BF9000] h-full" style={{ width: skill.level }}></div>
                </div>
                <div className="text-[10px] text-slate-500 text-right font-mono">{skill.level} Conforme</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal for New Evaluation */}
      {isEvalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-[#1F3864]">Nouvel Entretien Annuel d'Évaluation</h2>
            <form onSubmit={handleAddEvaluation} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Nom du Salarié *</label>
                <input
                  type="text"
                  required
                  value={newEval.employeeName || ''}
                  onChange={(e) => setNewEval({ ...newEval, employeeName: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="Ex: MBUYI Patrice"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Département</label>
                  <input
                    type="text"
                    value={newEval.department || ''}
                    onChange={(e) => setNewEval({ ...newEval, department: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Note (1 à 5)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="5"
                    value={newEval.rating || 4}
                    onChange={(e) => setNewEval({ ...newEval, rating: parseFloat(e.target.value) })}
                    className="w-full p-2 border rounded font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold mb-1">Atteinte des Objectifs KPI (%)</label>
                <input
                  type="number"
                  value={newEval.kpiAchievement || 85}
                  onChange={(e) => setNewEval({ ...newEval, kpiAchievement: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded font-bold"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Avis Synthétique & Commentaires</label>
                <textarea
                  value={newEval.feedback || ''}
                  onChange={(e) => setNewEval({ ...newEval, feedback: e.target.value })}
                  className="w-full p-2 border rounded h-20"
                  placeholder="Appréciation globale des résultats..."
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEvalModalOpen(false)}
                  className="px-4 py-2 border rounded font-bold"
                >
                  Annuler
                </button>
                <button type="submit" className="px-5 py-2 bg-[#1F3864] text-white rounded font-bold">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
