/**
 * @license
 * NovarisPay - ERP RH & Paie RDC
 * Composant Réutilisable d'Affichage du Code-Barres sur Document Officiel
 */

import React, { useEffect, useState } from 'react';
import {
  BarcodeFormat,
  generateBarcodeDataUrl,
  getBarcodeSettings,
  verifyDocumentBarcode,
} from '../../services/barcodeService';
import { QrCode, ShieldCheck, Copy, Check, ExternalLink } from 'lucide-react';

interface DocumentBarcodeProps {
  value: string; // ID unique du code-barres (e.g. NVP-PAY-2026-000245-9A73F2)
  format?: BarcodeFormat;
  documentType?: string;
  className?: string;
  showDetailsOnHover?: boolean;
  onVerifyClick?: (barcodeId: string) => void;
  compact?: boolean;
  printable?: boolean;
}

export const DocumentBarcode: React.FC<DocumentBarcodeProps> = ({
  value,
  format,
  documentType,
  className = '',
  onVerifyClick,
  compact = false,
  printable = true,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const settings = getBarcodeSettings();
  const activeFormat = format || settings.defaultFormat;

  useEffect(() => {
    let isMounted = true;

    async function renderBarcode() {
      if (!value) return;
      const url = await generateBarcodeDataUrl(value, activeFormat, {
        height: compact ? 30 : 45,
        displayValue: !compact,
      });
      if (isMounted) {
        setDataUrl(url);
      }
    }

    renderBarcode();
    return () => {
      isMounted = false;
    };
  }, [value, activeFormat, compact]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = () => {
    if (onVerifyClick) {
      onVerifyClick(value);
    } else {
      // Dispatch un événement global pour ouvrir le modal de vérification
      window.dispatchEvent(
        new CustomEvent('novarispay_open_barcode_verify', { detail: { barcodeId: value } })
      );
    }
  };

  if (!value) return null;

  return (
    <div
      onClick={handleVerify}
      className={`group cursor-pointer inline-flex flex-col items-end text-right select-none transition-all duration-150 ${
        printable ? '' : 'print:hidden'
      } ${className}`}
      title="Code-barres authentifié NovarisPay - Clic pour vérifier l'authenticité"
    >
      <div className="flex items-center space-x-1.5 text-[9px] font-mono text-slate-500 mb-0.5 group-hover:text-[#287BFF]">
        <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
        <span className="font-bold tracking-tight uppercase">{documentType || 'DOC SÉCURISÉ'}</span>
        <button
          onClick={handleCopy}
          className="p-0.5 hover:bg-slate-100 rounded transition opacity-0 group-hover:opacity-100"
          title="Copier l'identifiant"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
        </button>
      </div>

      {/* Barcode Image */}
      {dataUrl ? (
        <div className="bg-white p-1 rounded border border-slate-200 shadow-2xs group-hover:border-[#287BFF] transition">
          <img
            src={dataUrl}
            alt={`Code-Barres ${value}`}
            className={`object-contain max-w-full ${compact ? 'h-8' : 'h-12'}`}
          />
        </div>
      ) : (
        <div className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded border">
          {value}
        </div>
      )}

      {/* Identifier string under barcode */}
      <div className="flex items-center space-x-1 mt-0.5">
        <span className="font-mono text-[10px] font-black text-[#071D49] tracking-wider">{value}</span>
        <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover:text-[#287BFF]" />
      </div>
    </div>
  );
};
