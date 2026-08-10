/**
 * @license
 * NovarisPay - HR & Payroll Management System
 * 
 * MODAL D'AIDE AUX RACCOURCIS CLAVIER GLOBAUX
 */

import React from 'react';
import { Keyboard, X, Sparkles } from 'lucide-react';
import { Language, i18n } from '../../lib/i18n';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: Language;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose, lang = 'fr' }) => {
  if (!isOpen) return null;

  const t = i18n[lang].shortcuts;

  const shortcuts = [
    { key: 'Ctrl + D', description: t.dashboard },
    { key: 'Ctrl + P', description: t.payroll },
    { key: 'Ctrl + E', description: t.employees },
    { key: 'Ctrl + A', description: t.attendance },
    { key: 'Ctrl + R', description: t.reports },
    { key: 'Ctrl + S', description: t.settings },
    { key: 'Ctrl + L', description: t.leave },
    { key: 'Ctrl + M', description: t.medical },
    { key: 'Ctrl + G', description: t.documents },
    { key: 'Ctrl + K / ?', description: t.guide },
  ];

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#071D49] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#287BFF] text-white flex items-center justify-center font-bold">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">{t.title}</h3>
              <p className="text-[10px] text-blue-200">{t.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-300 hover:text-white rounded transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of shortcuts */}
        <div className="p-5 space-y-2.5 max-h-[60vh] overflow-y-auto">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
            >
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{s.description}</span>
              <kbd className="px-2.5 py-1 text-[11px] font-mono font-bold text-[#287BFF] dark:text-blue-300 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-center flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5 text-[#287BFF]" />
            <span>{t.escToClose}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#287BFF] hover:bg-[#1A6CFA] text-white font-bold rounded-xl text-xs transition"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
