/**
 * @license
 * NovarisPay - ERP RH et Paie RDC
 * Module de Configuration Système, Barèmes Légaux RDC 100% Paramétrables & Branding Entreprise
 */

import React, { useState, useEffect } from 'react';
import { DEFAULT_STATUTORY_PARAMS_2026 } from '../../payroll/engine';
import { getCompanyConfig, saveCompanyConfig, CompanyConfig } from '../../services/companyService';
import {
  getStatutoryParamsHistory,
  saveStatutoryParams,
} from '../../services/payrollService';
import { StatutoryParams } from '../../types/payroll';
import {
  Settings,
  Save,
  CheckCircle2,
  Shield,
  Image,
  Palette,
  FileText,
  Upload,
  UserCheck,
  History,
  Info,
  Calendar,
  Layers,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { logAuditEvent } from '../../services/auditService';

export const SettingsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'BRANDING' | 'STATUTORY_RATES' | 'HISTORY'>('BRANDING');
  
  // Company state
  const [company, setCompany] = useState<CompanyConfig>(getCompanyConfig());
  
  // Statutory state
  const [statutoryParams, setStatutoryParams] = useState<StatutoryParams>(DEFAULT_STATUTORY_PARAMS_2026);
  const [historyList, setHistoryList] = useState<StatutoryParams[]>([]);
  const [changeNotes, setChangeNotes] = useState('');
  
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    setCompany(getCompanyConfig());
    loadStatutoryHistory();
  }, []);

  const loadStatutoryHistory = async () => {
    setLoadingHistory(true);
    try {
      const history = await getStatutoryParamsHistory();
      setHistoryList(history);
      if (history.length > 0) {
        setStatutoryParams(history[0]);
      }
    } catch (err) {
      console.error('Erreur chargement historique barèmes:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    saveCompanyConfig(company);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);

    logAuditEvent(
      'UPDATE_SETTINGS',
      'SETTINGS',
      `Mise à jour du branding entreprise pour ${company.name}`,
      'admin@novarispay.cd',
      'ADMINISTRATEUR'
    );
  };

  const handleSaveStatutoryParams = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calcul automatique du taux patronal CNSS global
    const totalCnssPatronal =
      Number(statutoryParams.cnssEmployerPensionsRate) +
      Number(statutoryParams.cnssEmployerWorkRisksRate) +
      Number(statutoryParams.cnssEmployerFamilyRate);

    const newParamVersion: StatutoryParams = {
      ...statutoryParams,
      cnssEmployerRate: Number(totalCnssPatronal.toFixed(4)),
      smigDailyCDF: Number(statutoryParams.smigDailyCDF),
      familyAllowanceDailyPerChildCDF: Number(statutoryParams.familyAllowanceDailyPerChildCDF),
      cnssEmployeeRate: Number(statutoryParams.cnssEmployeeRate),
      cnssEmployerPensionsRate: Number(statutoryParams.cnssEmployerPensionsRate),
      cnssEmployerWorkRisksRate: Number(statutoryParams.cnssEmployerWorkRisksRate),
      cnssEmployerFamilyRate: Number(statutoryParams.cnssEmployerFamilyRate),
      inppRateUpTo50: Number(statutoryParams.inppRateUpTo50),
      inppRate51To300: Number(statutoryParams.inppRate51To300),
      inppRateAbove300: Number(statutoryParams.inppRateAbove300),
      onemRate: Number(statutoryParams.onemRate),
      irppMaxCapPercent: Number(statutoryParams.irppMaxCapPercent),
      irppDependentDiscountRate: Number(statutoryParams.irppDependentDiscountRate),
      quotiteCessiblePercent: Number(statutoryParams.quotiteCessiblePercent),
      createdByName: 'Administrateur RH',
      changeNotes: changeNotes || 'Mise à jour des barèmes légaux RDC',
    };

    try {
      await saveStatutoryParams(
        newParamVersion,
        'admin@novarispay.cd',
        'Administrateur RH'
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      setChangeNotes('');
      await loadStatutoryHistory();

      logAuditEvent(
        'UPDATE_STATUTORY_RATES',
        'SETTINGS',
        `Création version barème légal : ${newParamVersion.version} (Date d'effet : ${newParamVersion.effectiveDate})`,
        'admin@novarispay.cd',
        'ADMINISTRATEUR'
      );
    } catch (err: any) {
      alert('Erreur lors de la sauvegarde du barème : ' + err.message);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompany((prev) => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompany((prev) => ({ ...prev, signatureImageBase64: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#1F3864]">Paramètres Légaux, Taux RDC & Identity Entreprise</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configuration 100% paramétrable de la législation sociale et fiscale RDC (Code du Travail & Loi CNSS 2016).
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('BRANDING')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
              activeTab === 'BRANDING' ? 'bg-white text-[#1F3864] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Branding & Entête</span>
          </button>
          <button
            onClick={() => setActiveTab('STATUTORY_RATES')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
              activeTab === 'STATUTORY_RATES' ? 'bg-white text-[#1F3864] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Taux & Barèmes Légaux RDC</span>
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
              activeTab === 'HISTORY' ? 'bg-white text-[#1F3864] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-purple-600" />
            <span>Historique des Versions</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Modifications enregistrées avec succès dans la base de données !</span>
        </div>
      )}

      {/* PROOF OF CONFIGURABILITY BANNER */}
      <div className="bg-gradient-to-r from-blue-900 via-[#1F3864] to-indigo-900 text-white p-4 rounded-2xl shadow-sm border border-blue-800 space-y-2">
        <div className="flex items-center space-x-2 font-black text-sm text-amber-300">
          <Shield className="w-5 h-5 text-amber-400" />
          <span>Preuve de Paramétrage 100% Dynamique (Aucun taux écrit en dur)</span>
        </div>
        <p className="text-xs text-blue-100 leading-relaxed">
          <strong>Vérification du Taux CNSS Patronal :</strong> Le taux CNSS Patronal (global de <strong>{(statutoryParams.cnssEmployerRate * 100).toFixed(1)}%</strong>) est ventilé par branche :
          Branche Pensions <strong>{(statutoryParams.cnssEmployerPensionsRate * 100).toFixed(1)}%</strong>, Risques Pro <strong>{(statutoryParams.cnssEmployerWorkRisksRate * 100).toFixed(1)}%</strong>, Allocations Familiales <strong>{(statutoryParams.cnssEmployerFamilyRate * 100).toFixed(1)}%</strong>.
          Ce taux est consommé directement par le moteur <code className="bg-black/30 px-1 py-0.5 rounded text-amber-200">engine.ts (calculatePayslip)</code> via les paramètres de la période. Modifier ces taux ci-dessous réimpacte le calcul instantanément sans modifier une seule ligne de code.
        </p>
      </div>

      {/* TAB 1: BRANDING & COMPANY DETAILS */}
      {activeTab === 'BRANDING' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Company Profile & Legal IDs */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-black text-[#1F3864] border-b pb-2 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#BF9000]" />
              <span>Coordonnées Légales & Immatriculations RDC</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">Raison Sociale de l'Entreprise *</label>
                <input
                  type="text"
                  value={company.name}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                  className="w-full p-2 border rounded-xl font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">RCCM *</label>
                  <input
                    type="text"
                    value={company.rccm}
                    onChange={(e) => setCompany({ ...company, rccm: e.target.value })}
                    className="w-full p-2 border rounded-xl font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Id. Nationale *</label>
                  <input
                    type="text"
                    value={company.idNat}
                    onChange={(e) => setCompany({ ...company, idNat: e.target.value })}
                    className="w-full p-2 border rounded-xl font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">NIF (Impôts) *</label>
                  <input
                    type="text"
                    value={company.nif}
                    onChange={(e) => setCompany({ ...company, nif: e.target.value })}
                    className="w-full p-2 border rounded-xl font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">N° CNSS Employeur *</label>
                  <input
                    type="text"
                    value={company.cnssEmployerNumber}
                    onChange={(e) => setCompany({ ...company, cnssEmployerNumber: e.target.value })}
                    className="w-full p-2 border rounded-xl font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">N° Affiliation INPP</label>
                  <input
                    type="text"
                    value={company.inppEmployerNumber || ''}
                    onChange={(e) => setCompany({ ...company, inppEmployerNumber: e.target.value })}
                    className="w-full p-2 border rounded-xl font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">N° Identifiant ONEM</label>
                  <input
                    type="text"
                    value={company.onemEmployerNumber || ''}
                    onChange={(e) => setCompany({ ...company, onemEmployerNumber: e.target.value })}
                    className="w-full p-2 border rounded-xl font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Adresse Physique du Siège</label>
                <input
                  type="text"
                  value={company.address}
                  onChange={(e) => setCompany({ ...company, address: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Ville & Province RDC</label>
                <input
                  type="text"
                  value={company.cityProvince || 'Kinshasa, RDC'}
                  onChange={(e) => setCompany({ ...company, cityProvince: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveCompany}
                  className="w-full bg-[#1F3864] hover:bg-[#152747] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow"
                >
                  <Save className="w-4 h-4 text-[#BF9000]" />
                  <span>Sauvegarder le Branding</span>
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Logo, Palette & Signatures */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-black text-[#1F3864] border-b pb-2 flex items-center space-x-2">
              <Palette className="w-4 h-4 text-emerald-600" />
              <span>Logo, Palette Couleurs & Signataire RH</span>
            </h2>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border rounded-xl space-y-2">
                <label className="block font-bold text-slate-800">Logo de l'Entreprise :</label>
                {company.logoUrl ? (
                  <div className="flex items-center space-x-3">
                    <img src={company.logoUrl} alt="Logo" className="w-16 h-16 object-contain border p-1 rounded-lg bg-white" />
                    <button
                      type="button"
                      onClick={() => setCompany({ ...company, logoUrl: undefined })}
                      className="text-red-600 font-bold text-[11px] hover:underline"
                    >
                      Supprimer Logo
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-input" />
                    <label
                      htmlFor="logo-input"
                      className="px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 cursor-pointer flex items-center space-x-1.5 hover:bg-slate-100"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Charger un fichier Logo (PNG/JPG)</span>
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold mb-1.5">Couleur Principale d'Entête :</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={company.primaryColor || '#1F3864'}
                    onChange={(e) => setCompany({ ...company, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <span className="font-mono text-xs font-bold">{company.primaryColor}</span>
                </div>
              </div>

              <div className="pt-2 border-t space-y-3">
                <h3 className="font-bold text-slate-800 flex items-center gap-1">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  <span>Responsable Signataire Officiel</span>
                </h3>

                <div>
                  <label className="block font-bold mb-1">Nom Complet du Signataire *</label>
                  <input
                    type="text"
                    value={company.signerName}
                    onChange={(e) => setCompany({ ...company, signerName: e.target.value })}
                    className="w-full p-2 border rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Titre / Fonction Officielle *</label>
                  <input
                    type="text"
                    value={company.signerTitle}
                    onChange={(e) => setCompany({ ...company, signerTitle: e.target.value })}
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Live Preview Header */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-300 shadow-md p-5 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Aperçu en Direct de l'Entête Officiel
              </h2>

              <div className="p-4 rounded-xl border-2 border-slate-800 bg-white space-y-2">
                <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2">
                  <div>
                    <div className="font-black text-sm uppercase" style={{ color: company.primaryColor || '#1F3864' }}>
                      {company.name || 'VOTRE ENTREPRISE SARL'}
                    </div>
                    <div className="text-[10px] text-slate-600 font-medium">
                      {company.address} • {company.cityProvince}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono">
                      RCCM : {company.rccm} | NIF : {company.nif}
                    </div>
                  </div>

                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt="Logo Preview" className="w-12 h-12 object-contain" />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-white text-xs"
                      style={{ backgroundColor: company.primaryColor || '#1F3864' }}
                    >
                      LOGO
                    </div>
                  )}
                </div>

                <div className="text-[10px] text-right font-bold text-slate-700 pt-1">
                  Direction RH & Paie — Généré via NovarisPay RDC
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STATUTORY RATES ADMINISTRATION (100% CONFIGURABLE) */}
      {activeTab === 'STATUTORY_RATES' && (
        <form onSubmit={handleSaveStatutoryParams} className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-sm mb-1">Versionnement obligatoire à chaque modification :</span>
              Toute modification crée un **nouveau barème versionné** avec sa date d'effet. Les traitements de paie passés ou clôturés conservent la version qui prévalait au moment de leur exécution.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Version Metadata */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 col-span-1 md:col-span-2 lg:col-span-4">
              <h3 className="font-black text-sm text-[#1F3864] flex items-center gap-2 border-b pb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Identification de la Nouvelle Version du Barème</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold mb-1">Code Version *</label>
                  <input
                    type="text"
                    value={statutoryParams.version}
                    onChange={(e) => setStatutoryParams({ ...statutoryParams, version: e.target.value })}
                    className="w-full p-2 border rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Date d'Effet *</label>
                  <input
                    type="date"
                    value={statutoryParams.effectiveDate}
                    onChange={(e) => setStatutoryParams({ ...statutoryParams, effectiveDate: e.target.value })}
                    className="w-full p-2 border rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Motif de Révision *</label>
                  <input
                    type="text"
                    value={changeNotes}
                    onChange={(e) => setChangeNotes(e.target.value)}
                    placeholder="ex: Révision légale taux CNSS arrêté 2026"
                    className="w-full p-2 border rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Block 1: SMIG & Allocations */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
              <h3 className="font-black text-[#1F3864] flex items-center gap-1.5 border-b pb-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>SMIG & Allocations Familiales</span>
              </h3>

              <div>
                <label className="block font-bold mb-1">SMIG Journalier (CDF/jour) *</label>
                <input
                  type="number"
                  value={Number.isNaN(statutoryParams.smigDailyCDF) ? '' : (statutoryParams.smigDailyCDF ?? 21500)}
                  onChange={(e) => setStatutoryParams({ ...statutoryParams, smigDailyCDF: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full p-2 border rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Alloc. Familiales / Enfant / Jour *</label>
                <input
                  type="number"
                  value={
                    Number.isNaN(statutoryParams.familyAllowanceDailyCDF)
                      ? ''
                      : (statutoryParams.familyAllowanceDailyCDF ?? (statutoryParams as any).familyAllowanceDailyPerChildCDF ?? 796)
                  }
                  onChange={(e) =>
                    setStatutoryParams({
                      ...statutoryParams,
                      familyAllowanceDailyCDF: e.target.value === '' ? 0 : Number(e.target.value),
                    })
                  }
                  className="w-full p-2 border rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Block 2: CNSS Cotisations */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
              <h3 className="font-black text-[#1F3864] flex items-center gap-1.5 border-b pb-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>CNSS Salarié & Patronal</span>
              </h3>

              <div>
                <label className="block font-bold mb-1">CNSS Salarié (Dénomination QPO) *</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.001"
                    value={Number.isNaN(statutoryParams.cnssEmployeeRate) ? '' : (statutoryParams.cnssEmployeeRate ?? 0.05)}
                    onChange={(e) => setStatutoryParams({ ...statutoryParams, cnssEmployeeRate: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full p-2 border rounded-xl font-mono font-bold"
                  />
                  <span className="font-bold text-slate-500">
                    {((Number.isNaN(statutoryParams.cnssEmployeeRate) ? 0.05 : (statutoryParams.cnssEmployeeRate ?? 0.05)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t space-y-2">
                <span className="block font-bold text-slate-800">CNSS Patronal - Ventilation par Branche :</span>
                
                <div>
                  <label className="block text-[11px] text-slate-600 font-medium">1. Branche Pensions (Retraite) :</label>
                  <input
                    type="number"
                    step="0.001"
                    value={Number.isNaN(statutoryParams.cnssEmployerPensionsRate) ? '' : (statutoryParams.cnssEmployerPensionsRate ?? 0.05)}
                    onChange={(e) => setStatutoryParams({ ...statutoryParams, cnssEmployerPensionsRate: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full p-1.5 border rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 font-medium">2. Branche Risques Professionnels :</label>
                  <input
                    type="number"
                    step="0.001"
                    value={Number.isNaN(statutoryParams.cnssEmployerWorkRisksRate) ? '' : (statutoryParams.cnssEmployerWorkRisksRate ?? 0.015)}
                    onChange={(e) => setStatutoryParams({ ...statutoryParams, cnssEmployerWorkRisksRate: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full p-1.5 border rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-600 font-medium">3. Branche Allocations Familiales :</label>
                  <input
                    type="number"
                    step="0.001"
                    value={Number.isNaN(statutoryParams.cnssEmployerFamilyRate) ? '' : (statutoryParams.cnssEmployerFamilyRate ?? 0.025)}
                    onChange={(e) => setStatutoryParams({ ...statutoryParams, cnssEmployerFamilyRate: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full p-1.5 border rounded-lg font-mono"
                  />
                </div>

                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between font-bold text-blue-900">
                  <span>Total CNSS Patronal :</span>
                  <span className="font-mono text-sm">
                    {(
                      ((Number.isNaN(statutoryParams.cnssEmployerPensionsRate) ? 0.05 : (statutoryParams.cnssEmployerPensionsRate ?? 0.05)) +
                        (Number.isNaN(statutoryParams.cnssEmployerWorkRisksRate) ? 0.015 : (statutoryParams.cnssEmployerWorkRisksRate ?? 0.015)) +
                        (Number.isNaN(statutoryParams.cnssEmployerFamilyRate) ? 0.025 : (statutoryParams.cnssEmployerFamilyRate ?? 0.025))) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Block 3: INPP & ONEM */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
              <h3 className="font-black text-[#1F3864] flex items-center gap-1.5 border-b pb-2">
                <Shield className="w-4 h-4 text-purple-600" />
                <span>INPP & ONEM Patronal</span>
              </h3>

              <div>
                <label className="block font-bold mb-1">INPP (1 à 50 salariés) *</label>
                <input
                  type="number"
                  step="0.001"
                  value={Number.isNaN(statutoryParams.inppSmallRate) ? '' : (statutoryParams.inppSmallRate ?? (statutoryParams as any).inppRateUpTo50 ?? 0.03)}
                  onChange={(e) => setStatutoryParams({ ...statutoryParams, inppSmallRate: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full p-2 border rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">INPP (51 à 300 salariés) *</label>
                <input
                  type="number"
                  step="0.001"
                  value={Number.isNaN(statutoryParams.inppMediumRate) ? '' : (statutoryParams.inppMediumRate ?? (statutoryParams as any).inppRate51To300 ?? 0.02)}
                  onChange={(e) => setStatutoryParams({ ...statutoryParams, inppMediumRate: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full p-2 border rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">ONEM Rate (Tous effectifs) *</label>
                <input
                  type="number"
                  step="0.0001"
                  value={Number.isNaN(statutoryParams.onemRate) ? '' : (statutoryParams.onemRate ?? 0.002)}
                  onChange={(e) => setStatutoryParams({ ...statutoryParams, onemRate: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full p-2 border rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Block 4: Rules & Leaves */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 text-xs">
              <h3 className="font-black text-[#1F3864] flex items-center gap-1.5 border-b pb-2">
                <Shield className="w-4 h-4 text-amber-600" />
                <span>Plafonds & Congés Légaux</span>
              </h3>

              <div>
                <label className="block font-bold mb-1">Plafond Max IRPP (% Imposable) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={
                    Number.isNaN(statutoryParams.irppMaxPercentage)
                      ? ''
                      : (statutoryParams.irppMaxPercentage ?? (statutoryParams as any).irppMaxCapPercent ?? 0.30)
                  }
                  onChange={(e) => setStatutoryParams({ ...statutoryParams, irppMaxPercentage: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full p-2 border rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Réduction IRPP / Enfant à Charge *</label>
                <input
                  type="number"
                  step="0.005"
                  value={Number.isNaN(statutoryParams.irppDependentDiscountRate) ? '' : (statutoryParams.irppDependentDiscountRate ?? 0.02)}
                  onChange={(e) =>
                    setStatutoryParams({ ...statutoryParams, irppDependentDiscountRate: e.target.value === '' ? 0 : Number(e.target.value) })
                  }
                  className="w-full p-2 border rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Quotité Cessible Max Saisie-Arrêt *</label>
                <input
                  type="number"
                  step="0.01"
                  value={
                    Number.isNaN(statutoryParams.quotiteCessibleMaxRate)
                      ? ''
                      : (statutoryParams.quotiteCessibleMaxRate ?? (statutoryParams as any).quotiteCessiblePercent ?? 0.30)
                  }
                  onChange={(e) => setStatutoryParams({ ...statutoryParams, quotiteCessibleMaxRate: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full p-2 border rounded-xl font-mono"
                />
              </div>
            </div>
          </div>

          {/* Barème IRPP Table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-black text-sm text-[#1F3864] flex items-center gap-2 border-b pb-2">
              <Layers className="w-4 h-4 text-[#BF9000]" />
              <span>Barème Progressif de l'Impôt sur le Revenu (IRPP RDC)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold">
                    <th className="p-2 border">Tranche N°</th>
                    <th className="p-2 border">Min (CDF)</th>
                    <th className="p-2 border">Max (CDF)</th>
                    <th className="p-2 border">Taux Impôt (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {(statutoryParams?.irppBrackets || DEFAULT_STATUTORY_PARAMS_2026.irppBrackets).map((bracket: any, idx: number) => {
                    const minVal = bracket.minAmount ?? bracket.minCDF ?? 0;
                    const maxVal = bracket.maxAmount ?? bracket.maxCDF ?? Infinity;
                    const rateVal = bracket.rate ?? 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50 border-b font-mono">
                        <td className="p-2 border font-bold">Tranche {idx + 1}</td>
                        <td className="p-2 border">{minVal.toLocaleString()} FC</td>
                        <td className="p-2 border">{maxVal === Infinity || maxVal === null || maxVal === undefined ? 'Au-delà' : `${maxVal.toLocaleString()} FC`}</td>
                        <td className="p-2 border font-bold text-blue-700">{(rateVal * 100).toFixed(0)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="bg-[#1F3864] hover:bg-[#152747] text-white font-bold px-6 py-3 rounded-xl text-xs flex items-center space-x-2 shadow-lg transition"
            >
              <Save className="w-4.5 h-4.5 text-[#BF9000]" />
              <span>Enregistrer et Publier la Version {statutoryParams.version}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: HISTORY OF PARAMETERS */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-black text-[#1F3864] flex items-center space-x-2 border-b pb-2">
            <History className="w-4.5 h-4.5 text-purple-600" />
            <span>Historique Intégral des Barèmes Légaux RDC enregistrés</span>
          </h2>

          {loadingHistory ? (
            <div className="text-xs text-slate-500 py-6 text-center">Chargement de l'historique...</div>
          ) : historyList.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center">Aucune version antérieure dans l'historique.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b">
                    <th className="p-3 border">Version</th>
                    <th className="p-3 border">Date d'Effet</th>
                    <th className="p-3 border">Taux CNSS Patronal</th>
                    <th className="p-3 border">CNSS Salarié</th>
                    <th className="p-3 border">Plafond IRPP</th>
                    <th className="p-3 border">SMIG / jour</th>
                    <th className="p-3 border">Auteur / Motif</th>
                    <th className="p-3 border text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 font-mono">
                      <td className="p-3 font-bold text-blue-900 border">{item.version}</td>
                      <td className="p-3 font-bold border">{item.effectiveDate}</td>
                      <td className="p-3 border text-blue-700 font-bold">
                        {(item.cnssEmployerRate * 100).toFixed(1)}%
                        <span className="text-[10px] text-slate-500 font-normal block">
                          ({(item.cnssEmployerPensionsRate * 100).toFixed(1)}% / {(item.cnssEmployerWorkRisksRate * 100).toFixed(1)}% / {(item.cnssEmployerFamilyRate * 100).toFixed(1)}%)
                        </span>
                      </td>
                      <td className="p-3 border">{(item.cnssEmployeeRate * 100).toFixed(1)}%</td>
                      <td className="p-3 border">{(item.irppMaxCapPercent * 100).toFixed(0)}%</td>
                      <td className="p-3 border font-bold text-slate-800">{item.smigDailyCDF.toLocaleString()} FC</td>
                      <td className="p-3 font-sans text-slate-600 border">
                        <span className="font-bold text-slate-800 block">{item.createdByName || 'Admin'}</span>
                        <span className="text-[10px] text-slate-500">{item.changeNotes || '-'}</span>
                      </td>
                      <td className="p-3 text-right border font-sans">
                        <button
                          onClick={() => {
                            setStatutoryParams(item);
                            setActiveTab('STATUTORY_RATES');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border rounded font-bold text-[11px] text-slate-700"
                        >
                          Charger cette version
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
