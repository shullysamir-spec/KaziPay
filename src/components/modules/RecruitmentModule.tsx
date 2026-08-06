/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 */

import React, { useState } from 'react';
import { UserCheck, Briefcase, FileCheck2, Plus, Star, CheckCircle2, Search, Filter } from 'lucide-react';

interface Position {
  id: string;
  title: string;
  department: string;
  level: string;
  salaryMinCDF: number;
  salaryMaxCDF: number;
  keySkills: string[];
}

interface Candidate {
  id: string;
  fullName: string;
  positionTitle: string;
  appliedDate: string;
  interviewScore: number; // /100
  stage: 'SOURCING' | 'SCREENING' | 'INTERVIEW_1' | 'TEST_TECH' | 'INTERVIEW_FINAL' | 'OFFER' | 'HIRED';
  comments: string;
}

export const RecruitmentModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'POSITIONS' | 'CANDIDATES' | 'SCORECARD'>('CANDIDATES');

  // Sample Positions
  const [positions, setPositions] = useState<Position[]>([
    {
      id: 'POS-01',
      title: 'Chef de Projet Exploitation Minière',
      department: 'Operations',
      level: 'Cadre Supérieur',
      salaryMinCDF: 4500000,
      salaryMaxCDF: 7500000,
      keySkills: ['Gestion d\'équipe', 'Normes HSE RDC', 'Gestion de budget'],
    },
    {
      id: 'POS-02',
      title: 'Comptable Spécialiste Paie RDC',
      department: 'Finance & Paie',
      level: 'Agent de Maîtrise',
      salaryMinCDF: 1800000,
      salaryMaxCDF: 3200000,
      keySkills: ['SYSCOHADA', 'Déclarations CNSS/INPP/IRPP', 'NovarisPay ERP'],
    },
    {
      id: 'POS-03',
      title: 'Directeur des Ressources Humaines adjoint',
      department: 'Ressources Humaines',
      level: 'Cadre de Direction',
      salaryMinCDF: 5000000,
      salaryMaxCDF: 9000000,
      keySkills: ['Code du Travail RDC', 'Dialogue Social', 'Gestion des Performances'],
    },
  ]);

  // Sample Candidates Pipeline
  const [candidates, setCandidates] = useState<Candidate[]>([
    {
      id: 'CND-101',
      fullName: 'TSHIMANGA Christian',
      positionTitle: 'Comptable Spécialiste Paie RDC',
      appliedDate: '2026-07-10',
      interviewScore: 88,
      stage: 'INTERVIEW_FINAL',
      comments: 'Excellente maîtrise du calcul d\'IRPP et des barèmes dégressifs. Recommandé.',
    },
    {
      id: 'CND-102',
      fullName: 'BAHATI Grace',
      positionTitle: 'Chef de Projet Exploitation Minière',
      appliedDate: '2026-07-15',
      interviewScore: 92,
      stage: 'OFFER',
      comments: 'Parcours minier solide dans le Lualaba. Offre salariale transmise.',
    },
    {
      id: 'CND-103',
      fullName: 'KIBAMBE David',
      positionTitle: 'Comptable Spécialiste Paie RDC',
      appliedDate: '2026-07-20',
      interviewScore: 74,
      stage: 'TEST_TECH',
      comments: 'Test technique sur tableur et cas de litige social en cours d\'évaluation.',
    },
  ]);

  // New Candidate Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCand, setNewCand] = useState<Partial<Candidate>>({
    fullName: '',
    positionTitle: positions[0]?.title || '',
    stage: 'SCREENING',
    interviewScore: 80,
    comments: '',
  });

  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCand.fullName) return;
    const item: Candidate = {
      id: `CND-${Math.floor(100 + Math.random() * 900)}`,
      fullName: newCand.fullName,
      positionTitle: newCand.positionTitle || 'Poste RH',
      appliedDate: new Date().toISOString().split('T')[0],
      interviewScore: newCand.interviewScore || 75,
      stage: newCand.stage || 'SCREENING',
      comments: newCand.comments || 'Candidature enregistrée',
    };
    setCandidates([item, ...candidates]);
    setIsModalOpen(false);
  };

  const getStageBadge = (stage: Candidate['stage']) => {
    switch (stage) {
      case 'HIRED':
        return 'bg-emerald-100 text-emerald-800 font-bold';
      case 'OFFER':
        return 'bg-blue-100 text-[#1F3864] font-bold';
      case 'INTERVIEW_FINAL':
        return 'bg-purple-100 text-purple-800 font-bold';
      case 'TEST_TECH':
        return 'bg-amber-100 text-amber-800 font-bold';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-[#1F3864]">Recrutement & Procédure d'Interview par Poste</h1>
          <p className="text-xs text-slate-500">
            Fiches de postes, grilles d'évaluation normalisées et suivi du pipeline des candidats.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#1F3864] hover:bg-[#152747] text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 shadow transition"
        >
          <Plus className="w-4 h-4 text-[#BF9000]" />
          <span>Ajouter un Candidat</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2">
        <button
          onClick={() => setActiveTab('CANDIDATES')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'CANDIDATES'
              ? 'border-[#1F3864] text-[#1F3864]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Pipeline Candidats ({candidates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('POSITIONS')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'POSITIONS'
              ? 'border-[#1F3864] text-[#1F3864]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Catalogue des Postes ({positions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SCORECARD')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'SCORECARD'
              ? 'border-[#1F3864] text-[#1F3864]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Grilles d'Interview Type</span>
        </button>
      </div>

      {/* Tab 1: Candidates */}
      {activeTab === 'CANDIDATES' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#1F3864] text-white uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Candidat</th>
                  <th className="py-3 px-4">Poste Postulé</th>
                  <th className="py-3 px-4">Date Candidature</th>
                  <th className="py-3 px-4">Note Interview / 100</th>
                  <th className="py-3 px-4">Étape Actuelle</th>
                  <th className="py-3 px-4">Synthèse & Décision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((cand) => (
                  <tr key={cand.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{cand.fullName}</div>
                      <div className="text-[10px] font-mono text-[#1F3864]">{cand.id}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{cand.positionTitle}</td>
                    <td className="py-3 px-4 text-slate-600">{cand.appliedDate}</td>
                    <td className="py-3 px-4 font-black text-emerald-800 text-sm">
                      {cand.interviewScore} / 100
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${getStageBadge(cand.stage)}`}>
                        {cand.stage}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{cand.comments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Positions */}
      {activeTab === 'POSITIONS' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {positions.map((pos) => (
              <div key={pos.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#1F3864] bg-blue-100 px-2 py-0.5 rounded">
                    {pos.department}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mt-1">{pos.title}</h3>
                  <div className="text-xs text-slate-500">{pos.level}</div>
                </div>

                <div className="text-xs bg-white p-2.5 rounded border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Fourchette Salariale RDC</div>
                  <div className="font-mono font-bold text-slate-800">
                    {pos.salaryMinCDF.toLocaleString()} - {pos.salaryMaxCDF.toLocaleString()} FC
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-500 mb-1">Compétences clés :</div>
                  <div className="flex flex-wrap gap-1">
                    {pos.keySkills.map((sk, i) => (
                      <span key={i} className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded font-medium">
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Interview Scorecard Standard */}
      {activeTab === 'SCORECARD' && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#1F3864]">Barème Standard d'Interview RDC (Pondération 100 Points)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-xl bg-slate-50 space-y-2">
              <strong className="text-xs font-bold text-slate-900">1. Compétences Techniques & Légales (40 Pts)</strong>
              <p className="text-xs text-slate-600">
                Maîtrise du Code du Travail RDC, normes comptables SYSCOHADA, fiscalité des salaires (IRPP/IPR, CNSS, INPP, ONEM).
              </p>
            </div>
            <div className="p-4 border rounded-xl bg-slate-50 space-y-2">
              <strong className="text-xs font-bold text-slate-900">2. Expérience & Réalisations Antérieures (25 Pts)</strong>
              <p className="text-xs text-slate-600">
                Volume d'effectifs gérés, historique de résolution des litiges sociaux, stabilité professionnelle.
              </p>
            </div>
            <div className="p-4 border rounded-xl bg-slate-50 space-y-2">
              <strong className="text-xs font-bold text-slate-900">3. Aptitudes Comportementales & Soft Skills (20 Pts)</strong>
              <p className="text-xs text-slate-600">
                Capacité de négociation avec les délégués syndicaux, leadership, intégrité et confidentialité.
              </p>
            </div>
            <div className="p-4 border rounded-xl bg-slate-50 space-y-2">
              <strong className="text-xs font-bold text-slate-900">4. Pratique des Outils RH ERP & Langes (15 Pts)</strong>
              <p className="text-xs text-slate-600">
                Maîtrise de NovarisPay ERP, tableurs avancés, Français et Anglais professionnel.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Candidate */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4">
            <h2 className="text-base font-bold text-[#1F3864]">Nouveau Candidat au Recrutement</h2>
            <form onSubmit={handleAddCandidate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Nom Complet du Candidat *</label>
                <input
                  type="text"
                  required
                  value={newCand.fullName || ''}
                  onChange={(e) => setNewCand({ ...newCand, fullName: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="Ex: KALONJI Joseph"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Poste Vise *</label>
                <select
                  value={newCand.positionTitle || ''}
                  onChange={(e) => setNewCand({ ...newCand, positionTitle: e.target.value })}
                  className="w-full p-2 border rounded font-semibold"
                >
                  {positions.map((p) => (
                    <option key={p.id} value={p.title}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1">Note d'Interview (/ 100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newCand.interviewScore || 80}
                  onChange={(e) => setNewCand({ ...newCand, interviewScore: parseInt(e.target.value) })}
                  className="w-full p-2 border rounded font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Remarques de l'Évaluateur RH</label>
                <textarea
                  value={newCand.comments || ''}
                  onChange={(e) => setNewCand({ ...newCand, comments: e.target.value })}
                  className="w-full p-2 border rounded h-20"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
