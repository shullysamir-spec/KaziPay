/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * Module GED (Gestion Électronique des Documents) & Traçabilité par Département et Employé
 */

import React, { useState, useEffect } from 'react';
import {
  FolderArchive,
  FileText,
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Building2,
  User,
  Tag,
  Shield,
  Upload,
  Clock,
  Sparkles,
  Lock,
  Award,
} from 'lucide-react';
import { getCompanyConfig, CompanyConfig } from '../../services/companyService';
import { logAuditEvent } from '../../services/auditService';
import { ServiceCertificateModal } from '../common/ServiceCertificateModal';
import { DocumentUploadScanModal, DocumentUploadResult } from '../common/DocumentUploadScanModal';
import { DocumentBarcode } from '../common/DocumentBarcode';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { useToast } from '../../context/ToastContext';
import { QrCode } from 'lucide-react';

export interface CompanyDocument {
  id: string; // e.g. DOC-2026-089
  title: string;
  category:
    | 'Contrats & Avenants'
    | 'Pièces d\'Identité & Passeports'
    | 'Diplômes & Certificats'
    | 'Fiches & Rapports Médicaux'
    | 'Sanctions & Disciplinaire'
    | 'Bulletins & Attestations de Salaire'
    | 'Actes Administratifs & PV'
    | 'Notes de Service & Directives';
  employeeMatricule?: string;
  employeeName?: string;
  department: string;
  uploadDate: string;
  expiryDate?: string; // Optional e.g. CDD expiration or passport expiration
  fileType: 'PDF' | 'PNG' | 'JPG' | 'DOCX' | 'XLSX';
  fileSize: string;
  confidentiality: 'PUBLIC_INTERNE' | 'CONFIDENTIEL_RH' | 'STRICTEMENT_RESTREINT';
  tags: string[];
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'ARCHIVED';
  fileUrl?: string; // Base64 or object URL
  notes?: string;
  barcodeId?: string;
}

export const DocumentGEDModule: React.FC = () => {
  const [company, setCompany] = useState<CompanyConfig>(getCompanyConfig());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDoc, setSelectedDoc] = useState<CompanyDocument | null>(null);
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [activeBarcodeVerifyId, setActiveBarcodeVerifyId] = useState<string>('');
  const toast = useToast();

  useEffect(() => {
    const handleOpenVerify = (e: CustomEvent<{ barcodeId: string }>) => {
      if (e.detail?.barcodeId) {
        setActiveBarcodeVerifyId(e.detail.barcodeId);
        setIsBarcodeModalOpen(true);
      }
    };

    window.addEventListener('novarispay_open_barcode_verify', handleOpenVerify as EventListener);
    return () => {
      window.removeEventListener('novarispay_open_barcode_verify', handleOpenVerify as EventListener);
    };
  }, []);

  // Initial Sample GED Data
  const [documents, setDocuments] = useState<CompanyDocument[]>([
    {
      id: 'DOC-2026-001',
      title: 'Contrat de Travail CDI - KASONGO Patrick',
      category: 'Contrats & Avenants',
      employeeMatricule: 'NP-2026-089',
      employeeName: 'KASONGO Patrick',
      department: 'Exploitation',
      uploadDate: '2026-01-15',
      fileType: 'PDF',
      fileSize: '1.4 MB',
      confidentiality: 'CONFIDENTIEL_RH',
      tags: ['CDI', 'RDC', 'Contrat Initat'],
      status: 'VALID',
      notes: 'Contrat CDI visé par l\'ONEM selon Art. 44 du Code du Travail.',
    },
    {
      id: 'DOC-2026-002',
      title: 'Passeport & Carte d\'Électeur - ILUNGA Samuel',
      category: 'Pièces d\'Identité & Passeports',
      employeeMatricule: 'NP-2026-042',
      employeeName: 'ILUNGA Samuel',
      department: 'Logistique',
      uploadDate: '2025-11-20',
      expiryDate: '2026-08-15',
      fileType: 'PDF',
      fileSize: '850 KB',
      confidentiality: 'CONFIDENTIEL_RH',
      tags: ['Identité', 'Passeport', 'Gombe'],
      status: 'EXPIRING_SOON',
      notes: 'Passeport expirant en Août 2026. Renouvellement à prévoir.',
    },
    {
      id: 'DOC-2026-003',
      title: 'Compte-Rendu Hospitalier Bilan Général - KASONGO Patrick',
      category: 'Fiches & Rapports Médicaux',
      employeeMatricule: 'NP-2026-089',
      employeeName: 'KASONGO Patrick',
      department: 'Exploitation',
      uploadDate: '2026-07-22',
      fileType: 'PDF',
      fileSize: '2.1 MB',
      confidentiality: 'STRICTEMENT_RESTREINT',
      tags: ['Hôpital HJ', 'Aptitude', 'Bilan 2026'],
      status: 'VALID',
      notes: 'Rapport médical HJ Hospitals déclarant le salarié apte au poste.',
    },
    {
      id: 'DOC-2026-004',
      title: 'Procès-Verbal de Sanction Disciplinaire - TSHILOMBO Marc',
      category: 'Sanctions & Disciplinaire',
      employeeMatricule: 'NP-2026-011',
      employeeName: 'TSHILOMBO Marc',
      department: 'Finance & Comptabilité',
      uploadDate: '2026-06-10',
      fileType: 'PDF',
      fileSize: '1.1 MB',
      confidentiality: 'CONFIDENTIEL_RH',
      tags: ['Blâme', 'Retard', 'Procédure Art. 72'],
      status: 'VALID',
      notes: 'Avertissement écrit notifié et déchargé.',
    },
    {
      id: 'DOC-2026-005',
      title: 'Attestation de Réussite Licence Polytechnique - MUKENDI Jean-Luc',
      category: 'Diplômes & Certificats',
      employeeMatricule: 'NP-2026-001',
      employeeName: 'MUKENDI Jean-Luc',
      department: 'Ressources Humaines',
      uploadDate: '2024-03-01',
      fileType: 'PDF',
      fileSize: '3.2 MB',
      confidentiality: 'PUBLIC_INTERNE',
      tags: ['Diplôme', 'Unikin', 'Ingénieur'],
      status: 'VALID',
    },
  ]);

  // Form State for new Document
  const [newDocForm, setNewDocForm] = useState<Partial<CompanyDocument>>({
    title: '',
    category: 'Contrats & Avenants',
    employeeName: '',
    employeeMatricule: '',
    department: 'Exploitation',
    fileType: 'PDF',
    confidentiality: 'CONFIDENTIEL_RH',
    tags: [],
    notes: '',
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    setCompany(getCompanyConfig());
  }, []);

  const departmentsList = [
    'Exploitation',
    'Logistique',
    'Finance & Comptabilité',
    'Ressources Humaines',
    'Informatique & IT',
    'Direction Générale',
    'Juridique & Contentieux',
  ];

  const categoriesList = [
    'Contrats & Avenants',
    'Pièces d\'Identité & Passeports',
    'Diplômes & Certificats',
    'Fiches & Rapports Médicaux',
    'Sanctions & Disciplinaire',
    'Bulletins & Attestations de Salaire',
    'Actes Administratifs & PV',
    'Notes de Service & Directives',
  ];

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocForm.title) return;

    const today = new Date().toISOString().split('T')[0];
    const tagsArray = tagInput
      ? tagInput.split(',').map((t) => t.trim())
      : ['RH', newDocForm.department || 'Général'];

    const newDoc: CompanyDocument = {
      id: `DOC-2026-00${documents.length + 1}`,
      title: newDocForm.title,
      category: (newDocForm.category as any) || 'Contrats & Avenants',
      employeeMatricule: newDocForm.employeeMatricule || undefined,
      employeeName: newDocForm.employeeName || undefined,
      department: newDocForm.department || 'Général',
      uploadDate: today,
      expiryDate: newDocForm.expiryDate || undefined,
      fileType: (newDocForm.fileType as any) || 'PDF',
      fileSize: '1.2 MB',
      confidentiality: (newDocForm.confidentiality as any) || 'CONFIDENTIEL_RH',
      tags: tagsArray,
      status: newDocForm.expiryDate ? 'VALID' : 'VALID',
      notes: newDocForm.notes || '',
    };

    setDocuments([newDoc, ...documents]);
    setSelectedDoc(newDoc);
    setIsNewDocModalOpen(false);

    logAuditEvent(
      'UPLOAD_DOCUMENT',
      'GED',
      `Enregistrement du document ${newDoc.id} (${newDoc.title}) pour ${newDoc.employeeName || newDoc.department}`,
      'ged@novarispay.cd',
      'ARCHIVISTE_RH',
      newDoc.id
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewDocForm((prev) => ({
          ...prev,
          fileUrl: reader.result as string,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.employeeName && doc.employeeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = selectedDepartment === 'ALL' || doc.department === selectedDepartment;
    const matchesCategory = selectedCategory === 'ALL' || doc.category === selectedCategory;

    return matchesSearch && matchesDept && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-[#1F3864]">Gestion Électronique des Documents (GED) RH</h1>
            <span className="bg-[#1F3864] text-white text-[10px] font-black px-2 py-0.5 rounded font-mono">
              SÉCURITÉ & ARCHIVAGE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centralisation, suivi par département & employé, alertes d'expiration pour ne perdre aucune donnée entreprise.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setActiveBarcodeVerifyId('');
              setIsBarcodeModalOpen(true);
            }}
            className="bg-indigo-700 hover:bg-indigo-800 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow transition"
          >
            <QrCode className="w-4 h-4 text-yellow-300" />
            <span>Contrôle Code-Barres</span>
          </button>
          <button
            onClick={() => setIsScanModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow transition"
          >
            <Upload className="w-4 h-4 text-emerald-200" />
            <span>Numériser / Scan Caméra & Import</span>
          </button>
          <button
            onClick={() => setIsCertificateModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow transition"
          >
            <Award className="w-4 h-4 text-slate-950 stroke-[1.75]" />
            <span>Attestation de Fin de Service (Art. 168)</span>
          </button>
          <button
            onClick={() => setIsNewDocModalOpen(true)}
            className="bg-[#1F3864] hover:bg-[#152747] text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shadow transition"
          >
            <Plus className="w-4 h-4 text-[#BF9000]" />
            <span>Ajouter un Document</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Total Documents Archivés</span>
          <div className="text-2xl font-black text-[#1F3864] mt-1">{documents.length} Fichiers</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Contrats & Diplômes</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {documents.filter((d) => d.category.includes('Contrats') || d.category.includes('Diplômes')).length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-amber-600 font-bold uppercase block">Péremptions Proches (30j)</span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {documents.filter((d) => d.status === 'EXPIRING_SOON').length} Fichier(s)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Départements Couverts</span>
          <div className="text-2xl font-black text-blue-800 mt-1">
            {new Set(documents.map((d) => d.department)).size} Départements
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par titre, employé, tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border rounded-xl text-xs font-medium"
          />
        </div>

        <div>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="w-full p-1.5 border rounded-xl font-bold text-slate-700 bg-white"
          >
            <option value="ALL">Tous les Départements</option>
            {departmentsList.map((d) => (
              <option key={d} value={d}>
                Département : {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-1.5 border rounded-xl font-bold text-slate-700 bg-white"
          >
            <option value="ALL">Toutes les Catégories</option>
            {categoriesList.map((c) => (
              <option key={c} value={c}>
                Catégorie : {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Cards List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <h2 className="font-black text-xs text-[#1F3864] uppercase tracking-wider border-b pb-2 flex items-center justify-between">
              <span>Registre Électronique des Documents ({filteredDocs.length})</span>
              <span className="text-[10px] text-slate-400 font-mono">Stockage Sécurisé NovarisPay</span>
            </h2>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredDocs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium">
                  Aucun document ne correspond à vos critères de recherche.
                </div>
              ) : (
                filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition space-y-2 ${
                      selectedDoc?.id === doc.id
                        ? 'bg-[#1F3864] text-white border-[#1F3864] shadow-md'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] opacity-75">{doc.id}</span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            selectedDoc?.id === doc.id
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {doc.category}
                        </span>
                      </div>

                      {doc.status === 'EXPIRING_SOON' && (
                        <span className="bg-amber-500 text-white font-bold text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Expiration Proche
                        </span>
                      )}
                    </div>

                    <div className="font-bold text-sm leading-snug">{doc.title}</div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] opacity-85">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 stroke-[1.75]" />
                        <span>{doc.department} {doc.employeeName ? `• ${doc.employeeName}` : ''}</span>
                      </span>
                      <span className="font-mono">{doc.fileSize} ({doc.fileType})</span>
                    </div>

                    <div className="flex items-center space-x-1 pt-1">
                      {doc.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                            selectedDoc?.id === doc.id
                              ? 'bg-white/10 text-slate-200'
                              : 'bg-slate-200/80 text-slate-600'
                          }`}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Document Detail Preview Column */}
        <div>
          {selectedDoc ? (
            <div className="bg-white rounded-2xl border border-slate-300 shadow-xl p-5 space-y-4">
              {/* Header */}
              <div className="border-b pb-3">
                <span className="text-[10px] font-mono text-slate-400 block">{selectedDoc.id}</span>
                <h3 className="font-black text-sm text-[#1F3864]">{selectedDoc.title}</h3>
                <span className="inline-block mt-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  {selectedDoc.category}
                </span>
              </div>

              {/* Attributes Grid */}
              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border space-y-1">
                  <div className="text-[10px] text-slate-500 font-bold">RATTACHEMENT DÉPARTEMENT / SALARIÉ</div>
                  <div className="font-bold text-slate-800">{selectedDoc.department}</div>
                  {selectedDoc.employeeName && (
                    <div className="text-[11px] text-slate-600">
                      Employé: {selectedDoc.employeeName} ({selectedDoc.employeeMatricule || 'Mat. N/A'})
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-slate-50 rounded-lg border">
                    <span className="text-[10px] text-slate-500 block">Date d'Indexation :</span>
                    <span className="font-mono font-bold text-slate-800">{selectedDoc.uploadDate}</span>
                  </div>

                  <div className="p-2 bg-slate-50 rounded-lg border">
                    <span className="text-[10px] text-slate-500 block">Expiration :</span>
                    <span className="font-mono font-bold text-red-700">
                      {selectedDoc.expiryDate || 'N/A (Permanent)'}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border">
                  <div className="text-[10px] text-slate-500 font-bold mb-1">NIVEAU DE CONFIDENTIALITÉ</div>
                  <div className="flex items-center space-x-1.5 font-bold text-slate-800 text-[11px]">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    <span>{selectedDoc.confidentiality}</span>
                  </div>
                </div>

                {selectedDoc.notes && (
                  <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-xl text-slate-700">
                    <div className="text-[10px] font-bold text-amber-800 mb-0.5">Note de Suivi RH :</div>
                    <p className="text-[11px] leading-relaxed">{selectedDoc.notes}</p>
                  </div>
                )}
              </div>

              {/* Company Logo Header Stamp */}
              <div className="p-3 border-2 border-[#1F3864] rounded-xl bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="text-xs font-black text-[#1F3864] uppercase">{company.name}</div>
                  <div className="text-[9px] text-slate-500 font-mono">Archive Officielle GED • Certifiée</div>
                </div>
                <div className="w-8 h-8 bg-[#1F3864] text-[#BF9000] rounded-lg flex items-center justify-center font-black text-xs shadow-sm">
                  N
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 pt-2 border-t">
                <a
                  href={selectedDoc.fileUrl || '#'}
                  download={`${selectedDoc.id}_${selectedDoc.title.replace(/\s+/g, '_')}`}
                  className="flex-1 bg-[#1F3864] hover:bg-[#152747] text-white font-bold py-2 rounded-xl text-xs text-center flex items-center justify-center space-x-1 shadow"
                >
                  <Download className="w-3.5 h-3.5 text-[#BF9000]" />
                  <span>Télécharger Fichier</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 border text-center text-slate-400 text-xs">
              Sélectionnez un document pour consulter ses attributs et le télécharger.
            </div>
          )}
        </div>
      </div>

      {/* MODAL NEW DOCUMENT */}
      {isNewDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 text-xs">
            <h2 className="text-base font-bold text-[#1F3864]">Indexer un Nouveau Document dans la GED</h2>

            <form onSubmit={handleAddDocument} className="space-y-3">
              <div>
                <label className="block font-bold mb-1">Titre du Document *</label>
                <input
                  type="text"
                  required
                  value={newDocForm.title}
                  onChange={(e) => setNewDocForm({ ...newDocForm, title: e.target.value })}
                  className="w-full p-2 border rounded-xl font-bold"
                  placeholder="ex: Contrat CDI - MUKENDI Jean-Luc"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Catégorie *</label>
                  <select
                    value={newDocForm.category}
                    onChange={(e) => setNewDocForm({ ...newDocForm, category: e.target.value as any })}
                    className="w-full p-2 border rounded-xl font-bold"
                  >
                    {categoriesList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1">Département Concerné *</label>
                  <select
                    value={newDocForm.department}
                    onChange={(e) => setNewDocForm({ ...newDocForm, department: e.target.value })}
                    className="w-full p-2 border rounded-xl font-bold"
                  >
                    {departmentsList.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Nom de l'Employé (Optionnel)</label>
                  <input
                    type="text"
                    value={newDocForm.employeeName || ''}
                    onChange={(e) => setNewDocForm({ ...newDocForm, employeeName: e.target.value })}
                    className="w-full p-2 border rounded-xl"
                    placeholder="ex: KASONGO Patrick"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Matricule Employé</label>
                  <input
                    type="text"
                    value={newDocForm.employeeMatricule || ''}
                    onChange={(e) => setNewDocForm({ ...newDocForm, employeeMatricule: e.target.value })}
                    className="w-full p-2 border rounded-xl font-mono"
                    placeholder="ex: NP-2026-089"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">Date d'Expiration (Si applicable)</label>
                  <input
                    type="date"
                    value={newDocForm.expiryDate || ''}
                    onChange={(e) => setNewDocForm({ ...newDocForm, expiryDate: e.target.value })}
                    className="w-full p-2 border rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Confidentialité</label>
                  <select
                    value={newDocForm.confidentiality}
                    onChange={(e) => setNewDocForm({ ...newDocForm, confidentiality: e.target.value as any })}
                    className="w-full p-2 border rounded-xl font-bold"
                  >
                    <option value="PUBLIC_INTERNE">Public Interne</option>
                    <option value="CONFIDENTIEL_RH">Confidentiel RH</option>
                    <option value="STRICTEMENT_RESTREINT">Strictement Restreint</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Fichier à Joindre (PDF/Images)</label>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="w-full p-1.5 border rounded-xl bg-slate-50 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Tags (Séparés par des virgules)</label>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="w-full p-2 border rounded-xl font-mono"
                  placeholder="ex: CDI, ONEM, Bilan2026"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Notes / Remarques d'Archivage</label>
                <textarea
                  value={newDocForm.notes || ''}
                  onChange={(e) => setNewDocForm({ ...newDocForm, notes: e.target.value })}
                  className="w-full p-2 border rounded-xl h-16 text-xs"
                  placeholder="Precision d'archivage..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsNewDocModalOpen(false)}
                  className="px-4 py-2 border rounded-xl font-bold"
                >
                  Annuler
                </button>
                <button type="submit" className="px-5 py-2 bg-[#1F3864] text-white rounded-xl font-bold shadow">
                  Enregistrer dans la GED
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Attestation de Fin de Service */}
      <ServiceCertificateModal
        isOpen={isCertificateModalOpen}
        onClose={() => setIsCertificateModalOpen(false)}
        onDocumentGenerated={(newDoc) => {
          setDocuments((prev) => [newDoc, ...prev]);
        }}
      />

      {/* Modal Numérisation & Import Scan Caméra / Fichier Dossier */}
      <DocumentUploadScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        titleHint="Numérisation GED - Scan Caméra Direct ou Dossier"
        defaultCategory="Contrats & Avenants"
        onDocumentAdded={(res: DocumentUploadResult) => {
          const today = new Date().toISOString().split('T')[0];
          const created: CompanyDocument = {
            id: `DOC-2026-00${documents.length + 1}`,
            title: res.title,
            category: 'Contrats & Avenants',
            department: 'Exploitation',
            uploadDate: today,
            fileType: 'PDF',
            fileSize: '1.8 MB',
            confidentiality: 'CONFIDENTIEL_RH',
            tags: ['NUMÉRISÉ', 'SCAN_DIRECT'],
            status: 'VALID',
            fileUrl: res.fileData,
            notes: `Fichier numérisé via ${res.fileName}`,
          };
          setDocuments((prev) => [created, ...prev]);
          setSelectedDoc(created);
        }}
      />

      {/* Modal Universel de Vérification & Contrôle Optique des Codes-Barres */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        initialBarcodeId={activeBarcodeVerifyId}
      />
    </div>
  );
};
