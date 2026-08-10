/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * Composant Modal/Tiroir de Consultation Légale Code du Travail RDC
 */

import React, { useState } from 'react';
import { RDC_LABOUR_LAW_ARTICLES, LawArticle } from '../../lib/rdcLabourLaw';
import { BookOpen, X, Shield, Search, FileText, Check } from 'lucide-react';

interface LegalReferenceModalProps {
  moduleKey: string; // 'EMPLOYEES' | 'DISCIPLINE' | 'PAYROLL' | 'LEAVE'
  isOpen: boolean;
  onClose: () => void;
}

export const LegalReferenceModal: React.FC<LegalReferenceModalProps> = ({
  moduleKey,
  isOpen,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<LawArticle | null>(null);

  if (!isOpen) return null;

  const articles = RDC_LABOUR_LAW_ARTICLES[moduleKey] || RDC_LABOUR_LAW_ARTICLES['EMPLOYEES'];

  const filteredArticles = articles.filter(
    (a) =>
      a.article.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#071D49] text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#287BFF] text-white rounded-xl flex items-center justify-center font-black">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide">Base Légale & Code du Travail RDC</h2>
              <p className="text-xs text-blue-200 font-mono">
                Module : {moduleKey} — Textes officiels & Décrets ministériels
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un article de loi, un décret ou un mot clé..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#287BFF] outline-none"
            />
          </div>

          {/* Articles list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredArticles.map((art) => (
              <div
                key={art.article}
                onClick={() => setSelectedArticle(art)}
                className={`p-4 rounded-xl border text-xs cursor-pointer transition space-y-2 ${
                  selectedArticle?.article === art.article
                    ? 'border-[#287BFF] bg-blue-50/50 shadow-md ring-1 ring-[#287BFF]'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-[#071D49] bg-blue-50 px-2 py-0.5 rounded font-mono">
                    {art.article}
                  </span>
                  <span className="text-[10px] text-slate-400 italic truncate max-w-[150px]">{art.source}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{art.title}</h3>
                <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">{art.summary}</p>
              </div>
            ))}
          </div>

          {/* Detailed Full Article Viewer */}
          {selectedArticle && (
            <div className="mt-4 p-5 bg-slate-900 text-slate-100 rounded-xl space-y-3 border border-slate-700 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-black text-[#119CFF] font-mono">
                  {selectedArticle.article} — {selectedArticle.title}
                </span>
                <span className="text-[10px] text-slate-400">{selectedArticle.source}</span>
              </div>
              <p className="text-xs font-serif leading-relaxed text-slate-200 whitespace-pre-line bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                "{selectedArticle.fullText}"
              </p>
              <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                <span className="flex items-center gap-1 text-emerald-400 font-bold">
                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[1.75]" />
                  Conforme à la législation du travail RDC 2026
                </span>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="text-blue-400 font-bold hover:underline"
                >
                  Fermer la vue détaillée
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t flex justify-between items-center text-xs text-slate-500">
          <span className="flex items-center gap-1.5 font-medium">
            <Shield className="w-4 h-4 text-emerald-600" />
            Base juridique à jour - République Démocratique du Congo
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#287BFF] hover:bg-[#1A6CFA] text-white font-bold rounded-xl text-xs shadow transition"
          >
            Fermer le Guide
          </button>
        </div>
      </div>
    </div>
  );
};
