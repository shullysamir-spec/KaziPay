/**
 * @license
 * NovarisPay - HR & Payroll Management System
 * 
 * GLOBAL LANGUAGE (I18N) CONTEXT & HOOK
 * Provides seamless reactive language switching between French (FR) and English (EN)
 * across the entire application with persistence to localStorage.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Language, i18n, Translations } from '../lib/i18n';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: Translations;
  formatDate: (dateStr: string | Date | undefined, includeTime?: boolean) => string;
  formatNumber: (num: number, decimals?: number) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'novarispay_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'fr' || saved === 'en') {
        return saved;
      }
    } catch {
      // Ignore localStorage errors
    }
    return 'fr';
  });

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch (e) {
      console.warn('Could not save language to localStorage:', e);
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'fr' ? 'en' : 'fr');
  }, [lang, setLang]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = i18n[lang] || i18n.fr;

  const formatDate = useCallback(
    (dateStr: string | Date | undefined, includeTime = false): string => {
      if (!dateStr) return '-';
      try {
        const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
        if (isNaN(d.getTime())) return String(dateStr);

        const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
        const options: Intl.DateTimeFormatOptions = {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
        };
        return new Intl.DateTimeFormat(locale, options).format(d);
      } catch {
        return String(dateStr);
      }
    },
    [lang]
  );

  const formatNumber = useCallback(
    (num: number, decimals = 2): string => {
      if (isNaN(num)) return '0';
      const locale = lang === 'fr' ? 'fr-FR' : 'en-US';
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(num);
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, formatDate, formatNumber }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider
    const fallbackLang: Language = 'fr';
    return {
      lang: fallbackLang,
      setLang: () => {},
      toggleLang: () => {},
      t: i18n[fallbackLang],
      formatDate: (d) => String(d || '-'),
      formatNumber: (n) => String(n),
    };
  }
  return context;
};
