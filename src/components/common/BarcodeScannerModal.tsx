/**
 * @license
 * NovarisPay - ERP RH & Paie RDC
 * Modal de Vérification Unifiée et de Traçabilité des Codes-Barres
 */

import React, { useEffect, useState } from 'react';
import {
  DocumentMetadata,
  getRegisteredDocuments,
  verifyDocumentBarcode,
  BarcodeFormat,
  getBarcodeSettings,
  saveBarcodeSettings,
  generateBarcodeDataUrl,
} from '../../services/barcodeService';
import {
  QrCode,
  Search,
  X,
  ShieldCheck,
  CheckCircle2,
  Clock,
  User,
  FileText,
  AlertTriangle,
  History,
  Printer,
  ExternalLink,
  Layers,
  Settings,
  Camera,
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBarcodeId?: string;
  onNavigateToDocument?: (route: string, targetId?: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  initialBarcodeId = '',
  onNavigateToDocument,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialBarcodeId);
  const [verifiedDoc, setVerifiedDoc] = useState<DocumentMetadata | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<'scan' | 'list' | 'settings'>('scan');
  const [allDocs, setAllDocs] = useState<DocumentMetadata[]>([]);
  const [settings, setSettings] = useState(getBarcodeSettings());
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    if (initialBarcodeId) {
      setSearchQuery(initialBarcodeId);
      handleSearch(initialBarcodeId);
    }
  }, [initialBarcodeId]);

  useEffect(() => {
    if (isOpen) {
      setAllDocs(getRegisteredDocuments());
    }
  }, [isOpen]);

  const handleSearch = (query: string) => {
    if (!query.trim()) return;
    const doc = verifyDocumentBarcode(query.trim());
    if (doc) {
      setVerifiedDoc(doc);
      setNotFound(false);
    } else {
      setVerifiedDoc(null);
      setNotFound(true);
    }
  };

  const handleSimulateScan = (doc: DocumentMetadata) => {
    setSearchQuery(doc.barcodeId);
    setVerifiedDoc(doc);
    setNotFound(false);
    setActiveTab('scan');
  };

  const handleSaveSettings = () => {
    saveBarcodeSettings(settings);
    alert('Configuration du système de codes-barres enregistrée avec succès.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="bg-[#1F3864] text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <QrCode className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Système de Vérification des Codes-Barres</h2>
              <p className="text-xs text-slate-300">
                Contrôle d'authenticité, traçabilité immuable et audit-trail documentaire
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/10 rounded-lg transition text-slate-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab('scan')}
            className={`py-3 px-4 flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'scan'
                ? 'border-[#1F3864] text-[#1F3864] bg-white font-extrabold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Vérifier un Code-barres</span>
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`py-3 px-4 flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'list'
                ? 'border-[#1F3864] text-[#1F3864] bg-white font-extrabold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Registre des Documents ({allDocs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'settings'
                ? 'border-[#1F3864] text-[#1F3864] bg-white font-extrabold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configuration Globale</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'scan' && (
            <div className="space-y-6">
              {/* Search Bar & Scanner trigger */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase text-slate-600 tracking-wider">
                  Saisissez ou scannez le code-barres du document :
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                      placeholder="Ex: NVP-PAY-2026-000245-9A73F2"
                      className="w-full pl-11 pr-4 py-2.5 text-sm font-mono font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#1F3864]"
                    />
                  </div>
                  <button
                    onClick={() => handleSearch(searchQuery)}
                    className="bg-[#1F3864] hover:bg-[#152747] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow transition"
                  >
                    Vérifier
                  </button>
                  <button
                    onClick={() => {
                      setCameraActive(true);
                      setTimeout(() => {
                        setCameraActive(false);
                        if (allDocs.length > 0) handleSimulateScan(allDocs[0]);
                      }, 1500);
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2.5 rounded-xl text-xs font-bold shadow transition flex items-center space-x-1.5"
                    title="Simuler un lecteur optique ou caméra"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Scan Optique</span>
                  </button>
                </div>
              </div>

              {cameraActive && (
                <div className="bg-slate-900 text-white p-6 rounded-2xl text-center space-y-3 animate-pulse">
                  <Camera className="w-8 h-8 text-emerald-400 mx-auto animate-spin" />
                  <p className="text-xs font-bold text-slate-200">Lecture en cours du lecteur de code-barres...</p>
                  <span className="text-[10px] text-emerald-400 font-mono">Bip optique 1D / 2D actif</span>
                </div>
              )}

              {/* Result Details Card */}
              {verifiedDoc ? (
                <div className="bg-slate-50 border-2 border-emerald-500/50 rounded-2xl p-5 space-y-5 shadow-sm">
                  {/* Verified Header Badge */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 bg-emerald-100 text-emerald-700 rounded-full">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          DOCUMENT AUTHENTIFIÉ ET VALIDE
                        </span>
                        <h3 className="text-base font-black text-slate-900 mt-1">{verifiedDoc.title}</h3>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-black bg-[#1F3864] text-white px-3 py-1 rounded-lg">
                      {verifiedDoc.barcodeId}
                    </span>
                  </div>

                  {/* Document Metadata Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Type de Document</span>
                      <strong className="text-slate-900">{verifiedDoc.documentType}</strong>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Numéro de Référence</span>
                      <strong className="text-slate-900 font-mono">{verifiedDoc.documentNumber}</strong>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Statut Actuel</span>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {verifiedDoc.status}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Date de Création</span>
                      <strong className="text-slate-800">
                        {new Date(verifiedDoc.createdAt).toLocaleString('fr-FR')}
                      </strong>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Version du Fichier</span>
                      <strong className="text-slate-800 font-mono">{verifiedDoc.version}</strong>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Émis Par</span>
                      <strong className="text-slate-800">{verifiedDoc.createdBy}</strong>
                    </div>

                    {verifiedDoc.employeeName && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 col-span-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Salarié Concerné</span>
                        <strong className="text-[#1F3864]">{verifiedDoc.employeeName}</strong>{' '}
                        {verifiedDoc.employeeMatricule && (
                          <span className="font-mono text-slate-500">({verifiedDoc.employeeMatricule})</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Audit Trail Section */}
                  <div className="space-y-2 border-t pt-3">
                    <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center space-x-1.5">
                      <History className="w-4 h-4 text-[#1F3864]" />
                      <span>Journal d'Audit Immuable</span>
                    </h4>
                    <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200 text-xs max-h-40 overflow-y-auto">
                      {verifiedDoc.auditTrail.map((event, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] border-b border-slate-100 pb-1 last:border-none">
                          <span className="font-medium text-slate-800">
                            • {event.action} <span className="text-slate-400">({event.actor})</span>
                          </span>
                          <span className="font-mono text-slate-400 text-[10px]">
                            {new Date(event.timestamp).toLocaleTimeString('fr-FR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Open Document */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        onClose();
                        if (onNavigateToDocument) {
                          onNavigateToDocument(verifiedDoc.moduleRoute, verifiedDoc.targetId);
                        }
                      }}
                      className="bg-[#1F3864] hover:bg-[#152747] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center space-x-2 transition"
                    >
                      <span>Ouvrir & Consulter le Document Original</span>
                      <ExternalLink className="w-4 h-4 text-yellow-300" />
                    </button>
                  </div>
                </div>
              ) : notFound ? (
                <div className="bg-red-50 border-2 border-red-200 p-6 rounded-2xl text-center space-y-2">
                  <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
                  <h3 className="text-sm font-black text-red-900">Code-barres introuvable ou invalide</h3>
                  <p className="text-xs text-red-700">
                    L'identifiant <strong>"{searchQuery}"</strong> ne correspond à aucun document certifié dans le registre officiel.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-300 p-8 rounded-2xl text-center space-y-2">
                  <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">
                    Saisissez un code-barres ci-dessus ou choisissez un document dans le registre pour afficher son contrôle de conformité.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Documents certifiés avec code-barres immuable :</span>
                <span className="text-slate-500 font-mono">{allDocs.length} enregistré(s)</span>
              </div>
              <div className="space-y-2 max-h-[450px] overflow-y-auto">
                {allDocs.map((doc) => (
                  <div
                    key={doc.barcodeId}
                    onClick={() => handleSimulateScan(doc)}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-slate-900">{doc.title}</div>
                      <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                        <span className="font-mono text-[#1F3864] font-bold">{doc.barcodeId}</span>
                        <span>•</span>
                        <span>{doc.documentType}</span>
                        <span>•</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-emerald-100 text-emerald-800">
                      {doc.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-5 text-xs">
              <div className="space-y-1">
                <h3 className="font-black text-slate-900">Paramètres Généraux du Moteur de Code-Barres</h3>
                <p className="text-slate-500">
                  Définissez les règles globales de génération optique pour l'ensemble des documents de l'entreprise.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Format de Code-barres Défaut :</label>
                  <select
                    value={settings.defaultFormat}
                    onChange={(e) => setSettings({ ...settings, defaultFormat: e.target.value as BarcodeFormat })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-800 bg-white"
                  >
                    <option value="CODE128">Code 128 (Standard Industriel Lineaire 1D)</option>
                    <option value="QRCODE">QR Code (Standard Matriciel 2D Haute Densité)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Préfixe Code Entreprise :</label>
                  <input
                    type="text"
                    value={settings.companyPrefix}
                    onChange={(e) => setSettings({ ...settings, companyPrefix: e.target.value.toUpperCase() })}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-800 bg-white"
                    placeholder="NVP"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showText"
                    checked={settings.showTextLabel}
                    onChange={(e) => setSettings({ ...settings, showTextLabel: e.target.checked })}
                    className="w-4 h-4 text-[#1F3864] rounded focus:ring-[#1F3864]"
                  />
                  <label htmlFor="showText" className="font-bold text-slate-700">
                    Afficher le libellé sous la barre sous forme lisible
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  className="bg-[#1F3864] hover:bg-[#152747] text-white px-5 py-2 rounded-xl font-bold shadow"
                >
                  Enregistrer la Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
