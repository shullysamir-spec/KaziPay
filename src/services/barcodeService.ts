/**
 * @license
 * NovarisPay - ERP RH & Paie RDC
 * Core Service de Génération Automatique & Vérification Unifiée des Codes-Barres (Code 128 / QR Code)
 */

import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

export type BarcodeFormat = 'CODE128' | 'QRCODE';

export interface DocumentMetadata {
  barcodeId: string; // e.g. NVP-PAY-2026-000245-9A73F2
  documentType: string; // e.g. "Bulletin de Paie"
  documentTypeCode: string; // e.g. "PAY"
  documentNumber: string; // e.g. "BS-202607-EMP001"
  title: string; // e.g. "Bulletin de Paie - Jean KABANGA (2026-07)"
  employeeName?: string;
  employeeMatricule?: string;
  createdAt: string;
  createdBy: string;
  status: 'Draft' | 'Approved' | 'Validated' | 'Closed' | 'Archived' | 'Cancelled';
  version: string; // e.g. "v1.0"
  companyCode: string; // e.g. "NVP"
  moduleRoute: string; // e.g. "payslips" | "leave" | "discipline" | "ged" | "declarations"
  targetId?: string; // ID of the underlying record
  auditTrail: { timestamp: string; action: string; actor: string }[];
}

export interface BarcodeSettings {
  defaultFormat: BarcodeFormat;
  companyPrefix: string;
  showTextLabel: boolean;
  barHeight: number;
}

const DEFAULT_SETTINGS: BarcodeSettings = {
  defaultFormat: 'CODE128',
  companyPrefix: 'NP',
  showTextLabel: true,
  barHeight: 45,
};

const STORAGE_SETTINGS_KEY = 'novarispay_barcode_settings';
const STORAGE_REGISTRY_KEY = 'novarispay_barcode_registry';

/**
 * Dérive automatiquement un préfixe court (2-4 caractères) à partir du nom de la société
 */
export function deriveCompanyPrefix(companyName?: string): string {
  if (!companyName) {
    try {
      const cfg = localStorage.getItem('novarispay_active_company_config') || localStorage.getItem('novarispay_company_config');
      if (cfg) {
        const parsed = JSON.parse(cfg);
        if (parsed.name) companyName = parsed.name;
      }
    } catch (_) {}
  }

  if (!companyName || companyName.trim().length === 0) {
    return 'NP';
  }

  const clean = companyName.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length >= 3) {
    return words.slice(0, 3).map((w) => w[0].toUpperCase()).join('');
  } else if (words.length === 2) {
    const p1 = words[0].substring(0, 2).toUpperCase();
    const p2 = words[1].substring(0, 1).toUpperCase();
    return `${p1}${p2}`;
  } else if (words.length === 1) {
    return words[0].substring(0, 3).toUpperCase();
  }

  return 'NP';
}

/**
 * Récupère ou sauvegarde la configuration globale des codes-barres
 */
export function getBarcodeSettings(): BarcodeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Erreur lecture settings barcode:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveBarcodeSettings(settings: BarcodeSettings): void {
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Erreur sauvegarde settings barcode:', e);
  }
}

/**
 * Génère un identifiant unique et immuable pour un document
 * Structure: [CodeEntreprise]-[TypeDoc]-[Année]-[Séquence 6 chiffres]-[Hash 6 car]
 * Exemple: NP-PAY-2026-000245-9A73F2
 */
export function generateBarcodeIdentifier(docTypeCode: string, customSeq?: number, companyName?: string): string {
  const year = new Date().getFullYear();
  const prefix = deriveCompanyPrefix(companyName);
  const type = (docTypeCode || 'DOC').toUpperCase().substring(0, 5);

  let registry = getRegisteredDocuments();
  const nextSeq = customSeq || (registry.length + 101);
  const seqFormatted = String(nextSeq).padStart(6, '0');

  // Hex hash unique et non réutilisable
  const cryptoHash = Array.from(crypto.getRandomValues(new Uint8Array(3)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();

  return `${prefix}-${type}-${year}-${seqFormatted}-${cryptoHash}`;
}

/**
 * Génère l'image Base64 (Data URL) d'un Code-Barres Code 128 ou QR Code
 */
export async function generateBarcodeDataUrl(
  value: string,
  format?: BarcodeFormat,
  options?: { width?: number; height?: number; displayValue?: boolean }
): Promise<string> {
  const settings = getBarcodeSettings();
  const activeFormat = format || settings.defaultFormat;
  const showText = options?.displayValue !== undefined ? options.displayValue : settings.showTextLabel;

  if (activeFormat === 'QRCODE') {
    try {
      const qrDataUrl = await QRCode.toDataURL(value, {
        width: options?.width || 140,
        margin: 1,
        color: {
          dark: '#071D49',
          light: '#FFFFFF',
        },
      });
      return qrDataUrl;
    } catch (err) {
      console.error('Erreur génération QR Code:', err);
      return '';
    }
  }

  // Code 128 par défaut
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, {
      format: 'CODE128',
      lineColor: '#071D49',
      width: 2,
      height: options?.height || settings.barHeight || 40,
      displayValue: showText,
      fontSize: 10,
      margin: 4,
      background: '#FFFFFF',
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Erreur génération Code 128:', err);
    return '';
  }
}

/**
 * Registre local des documents pour vérification instantanée & audit
 */
export function getRegisteredDocuments(): DocumentMetadata[] {
  try {
    const raw = localStorage.getItem(STORAGE_REGISTRY_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Erreur lecture registre documents:', e);
  }
  return [];
}

/**
 * Enregistre ou met à jour les métadonnées d'un document avec son code-barres immuable
 */
export function registerDocument(metadata: Partial<DocumentMetadata> & { barcodeId: string; title: string; documentType: string }): DocumentMetadata {
  const existingList = getRegisteredDocuments();
  const foundIndex = existingList.findIndex((d) => d.barcodeId === metadata.barcodeId);

  const now = new Date().toISOString();
  let fullDoc: DocumentMetadata;

  if (foundIndex >= 0) {
    fullDoc = {
      ...existingList[foundIndex],
      ...metadata,
      auditTrail: [
        ...existingList[foundIndex].auditTrail,
        {
          timestamp: now,
          action: 'Document mis à jour ou consulté',
          actor: metadata.createdBy || 'Système NovarisPay',
        },
      ],
    };
    existingList[foundIndex] = fullDoc;
  } else {
    fullDoc = {
      barcodeId: metadata.barcodeId,
      documentType: metadata.documentType,
      documentTypeCode: metadata.documentTypeCode || 'DOC',
      documentNumber: metadata.documentNumber || metadata.barcodeId,
      title: metadata.title,
      employeeName: metadata.employeeName,
      employeeMatricule: metadata.employeeMatricule,
      createdAt: metadata.createdAt || now,
      createdBy: metadata.createdBy || 'RH / Gestionnaire de Paie',
      status: metadata.status || 'Validated',
      version: metadata.version || 'v1.0',
      companyCode: metadata.companyCode || deriveCompanyPrefix(),
      moduleRoute: metadata.moduleRoute || 'ged',
      targetId: metadata.targetId,
      auditTrail: [
        {
          timestamp: now,
          action: 'Génération initiale et attribution du code-barres sécurisé',
          actor: metadata.createdBy || 'Système RH',
        },
      ],
    };
    existingList.unshift(fullDoc);
  }

  try {
    localStorage.setItem(STORAGE_REGISTRY_KEY, JSON.stringify(existingList));
  } catch (e) {
    console.warn('Erreur écriture registre barcode:', e);
  }

  return fullDoc;
}

/**
 * Recherche et vérifie un document par son code-barres
 */
export function verifyDocumentBarcode(barcodeId: string): DocumentMetadata | null {
  if (!barcodeId) return null;
  const cleanSearch = barcodeId.trim().toUpperCase();
  const docs = getRegisteredDocuments();

  const found = docs.find(
    (d) => d.barcodeId.toUpperCase() === cleanSearch || d.documentNumber.toUpperCase() === cleanSearch
  );

  if (found) {
    // Ajouter un événement au journal d'audit de la vérification
    found.auditTrail.push({
      timestamp: new Date().toISOString(),
      action: 'Vérification d\'authenticité par scan de code-barres',
      actor: 'Auditeur / Inspecteur',
    });
    registerDocument(found);
    return found;
  }

  return null;
}

/**
 * Initialise un jeu de données de test de documents enregistrés si vide
 */
export function seedInitialBarcodeRegistry(): void {
  const current = getRegisteredDocuments();
  if (current.length > 0) return;

  const demoDocs: DocumentMetadata[] = [
    {
      barcodeId: 'NVP-PAY-2026-000245-9A73F2',
      documentType: 'Bulletin de Paie',
      documentTypeCode: 'PAY',
      documentNumber: 'BS-202607-EMP001',
      title: 'Bulletin de Paie - KABANGA MUKENDI Jean (Juillet 2026)',
      employeeName: 'KABANGA MUKENDI Jean',
      employeeMatricule: 'EMP-2024-001',
      createdAt: '2026-07-28T10:15:00.000Z',
      createdBy: 'paie@novarispay.cd',
      status: 'Closed',
      version: 'v1.0',
      companyCode: 'NVP',
      moduleRoute: 'payslips',
      auditTrail: [
        { timestamp: '2026-07-28T10:15:00.000Z', action: 'Calcul et validation de la paie', actor: 'paie@novarispay.cd' },
        { timestamp: '2026-07-28T14:30:00.000Z', action: 'Clôture définitive et virement bancaire', actor: 'finance@novarispay.cd' },
      ],
    },
    {
      barcodeId: 'NVP-CNT-2026-000102-4B81E9',
      documentType: 'Contrat de Travail CDI',
      documentTypeCode: 'CNT',
      documentNumber: 'CT-CDI-2026-089',
      title: 'Contrat de Travail Indéterminé - TSHILOMBO Marie',
      employeeName: 'TSHILOMBO Marie',
      employeeMatricule: 'EMP-2024-002',
      createdAt: '2026-01-15T09:00:00.000Z',
      createdBy: 'rh@novarispay.cd',
      status: 'Validated',
      version: 'v1.0',
      companyCode: 'NVP',
      moduleRoute: 'ged',
      auditTrail: [
        { timestamp: '2026-01-15T09:00:00.000Z', action: 'Édition du contrat et signature des parties', actor: 'rh@novarispay.cd' },
      ],
    },
    {
      barcodeId: 'NVP-CER-2026-000088-7C12F4',
      documentType: 'Certificat de Travail',
      documentTypeCode: 'CER',
      documentNumber: 'CERT-2026-044',
      title: 'Certificat de Travail Conforme Art 92 - ILUNGA Patrick',
      employeeName: 'ILUNGA Patrick',
      employeeMatricule: 'EMP-2023-018',
      createdAt: '2026-06-30T16:00:00.000Z',
      createdBy: 'rh@novarispay.cd',
      status: 'Approved',
      version: 'v1.0',
      companyCode: 'NVP',
      moduleRoute: 'employees',
      auditTrail: [
        { timestamp: '2026-06-30T16:00:00.000Z', action: 'Délivrance de l\'attestation de fin de service', actor: 'rh@novarispay.cd' },
      ],
    },
  ];

  demoDocs.forEach(registerDocument);
}

// Initialisation au chargement du module
seedInitialBarcodeRegistry();
