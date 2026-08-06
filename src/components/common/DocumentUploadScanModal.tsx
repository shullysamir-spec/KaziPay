/**
 * @license
 * NovarisPay - HR & Payroll Management System
 * 
 * MODAL DE NUMERISATION DE DOCUMENTS (SCAN CAMERA DIRECT ET IMPORT DOSSIER)
 */

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, FileText, Check, RefreshCw, AlertCircle, Scan, ShieldCheck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export interface DocumentUploadResult {
  title: string;
  category: string;
  fileData: string; // base64 or blob url
  fileName: string;
  fileType: string;
  uploadedAt: string;
}

interface DocumentUploadScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentAdded: (doc: DocumentUploadResult) => void;
  defaultCategory?: string;
  titleHint?: string;
}

export const DocumentUploadScanModal: React.FC<DocumentUploadScanModalProps> = ({
  isOpen,
  onClose,
  onDocumentAdded,
  defaultCategory = 'Autre Document',
  titleHint = 'Scan ou Import Document',
}) => {
  const [activeTab, setActiveTab] = useState<'CAMERA' | 'FOLDER'>('CAMERA');
  const [docTitle, setDocTitle] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scannedDocUrl, setScannedDocUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [fileType, setFileType] = useState<string>('image/jpeg');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const toast = useToast();

  const categories = [
    'Contrat de travail',
    'Certificat Médical',
    'Pièce d\'identité / Passeport',
    'Diplôme & Certification',
    'Déclaration Légale CNSS/INPP',
    'Fiche de Paie Signée',
    'Attestation de Service',
    'Autre Document',
  ];

  // Camera Management
  const startCamera = async () => {
    setCameraError(null);
    setScannedDocUrl(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
        audio: false,
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Document scan camera error:', err);
      setCameraError(
        "Accès caméra refusé ou indisponible. Basculez sur l'onglet 'Importer un fichier' si vous n'avez pas de scanner/webcam."
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'CAMERA' && !scannedDocUrl) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 600;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setScannedDocUrl(dataUrl);
      setSelectedFileName(`Scan_Cam_${Date.now()}.jpg`);
      setFileType('image/jpeg');
      stopCamera();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setFileType(file.type || 'application/pdf');
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setScannedDocUrl(evt.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!scannedDocUrl) {
      toast.error('Veuillez d\'abord capturer ou importer un document.');
      return;
    }
    const finalTitle = docTitle.trim() || selectedFileName || 'Document scanné';
    onDocumentAdded({
      title: finalTitle,
      category,
      fileData: scannedDocUrl,
      fileName: selectedFileName || `${finalTitle}.jpg`,
      fileType,
      uploadedAt: new Date().toISOString().split('T')[0],
    });
    toast.success(`Document "${finalTitle}" numérisé et enregistré avec succès !`);
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#1F3864] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Scan className="w-5 h-5 text-[#BF9000]" />
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">{titleHint}</h3>
              <p className="text-[10px] text-blue-200">Scan Caméra Direct ou Import de Fichier Dossier</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 text-[#BF9000] hover:text-white rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category & Title fields */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Catégorie de Document
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs font-semibold p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nom / Intitulé du Document
            </label>
            <input
              type="text"
              placeholder="ex: Contrat de travail_2026.pdf"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium"
            />
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab('CAMERA');
              setScannedDocUrl(null);
            }}
            className={`flex-1 py-2.5 px-4 flex items-center justify-center space-x-2 border-b-2 transition ${
              activeTab === 'CAMERA'
                ? 'border-[#1F3864] text-[#1F3864] dark:text-blue-400 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Scan Direct (Caméra)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('FOLDER');
              stopCamera();
            }}
            className={`flex-1 py-2.5 px-4 flex items-center justify-center space-x-2 border-b-2 transition ${
              activeTab === 'FOLDER'
                ? 'border-[#1F3864] text-[#1F3864] dark:text-blue-400 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Fichier du Dossier</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {activeTab === 'CAMERA' && (
            <div className="space-y-4 flex flex-col items-center">
              {!scannedDocUrl ? (
                <div className="relative w-full h-56 bg-slate-950 rounded-xl overflow-hidden border-2 border-dashed border-[#1F3864] flex items-center justify-center">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />

                  {/* Document Scan Guideline Frame */}
                  <div className="absolute inset-4 border-2 border-[#BF9000] border-dashed rounded-lg pointer-events-none flex items-center justify-center">
                    <div className="text-[10px] text-[#BF9000] font-mono bg-black/60 px-2 py-1 rounded">
                      Aligner le document dans le cadre
                    </div>
                  </div>

                  {!isCameraActive && !cameraError && (
                    <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-400">
                      <RefreshCw className="w-8 h-8 animate-spin mb-2 text-[#BF9000]" />
                      <span className="text-xs">Chargement du flux vidéo...</span>
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute inset-0 p-4 text-center bg-slate-900 flex flex-col items-center justify-center text-red-400 space-y-2">
                      <AlertCircle className="w-8 h-8" />
                      <p className="text-xs">{cameraError}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative w-full h-56 bg-slate-900 rounded-xl overflow-hidden border-2 border-emerald-500 flex items-center justify-center">
                  <img src={scannedDocUrl} alt="Document numérisé" className="w-full h-full object-contain" />
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />

              {!scannedDocUrl ? (
                <button
                  onClick={takeSnapshot}
                  disabled={!isCameraActive}
                  className="w-full py-2.5 bg-[#1F3864] hover:bg-[#152747] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow"
                >
                  <Camera className="w-4 h-4 text-[#BF9000]" />
                  <span>Scanner le Document</span>
                </button>
              ) : (
                <div className="w-full flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setScannedDocUrl(null);
                      startCamera();
                    }}
                    className="flex-1 py-2 border border-slate-300 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center space-x-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Rescanner</span>
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1 shadow"
                  >
                    <Check className="w-4 h-4" />
                    <span>Enregistrer</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'FOLDER' && (
            <div className="space-y-4">
              {!scannedDocUrl ? (
                <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#1F3864] bg-slate-50 dark:bg-slate-800/40 transition">
                  <Upload className="w-10 h-10 text-[#1F3864] dark:text-blue-400 mb-2" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Sélectionner un fichier depuis votre ordinateur
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">
                    PDF, PNG, JPG, DOCX (Max 15 Mo)
                  </span>
                  <input type="file" onChange={handleFileUpload} className="hidden" />
                </label>
              ) : (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-emerald-600" />
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                        {selectedFileName}
                      </span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">
                        Fichier prêt à l'enregistrement
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setScannedDocUrl(null)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {scannedDocUrl && (
                <button
                  onClick={handleSubmit}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmer & Enregistrer</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Stockage sécurisé GED NovarisPay RDC</span>
          </div>
          <span>Cryptage AES-256</span>
        </div>
      </div>
    </div>
  );
};
