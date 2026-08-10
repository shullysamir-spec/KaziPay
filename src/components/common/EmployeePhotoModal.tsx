/**
 * @license
 * NovarisPay - HR & Payroll Management System
 * 
 * MODAL DE CAPTURE PHOTO EMPLOYE (CAMERA EN DIRECT OU DOSSIER)
 */

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, RefreshCw, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface EmployeePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoSelected: (photoUrl: string) => void;
  currentPhotoUrl?: string;
  employeeName: string;
}

export const EmployeePhotoModal: React.FC<EmployeePhotoModalProps> = ({
  isOpen,
  onClose,
  onPhotoSelected,
  currentPhotoUrl,
  employeeName,
}) => {
  const [activeTab, setActiveTab] = useState<'CAMERA' | 'FOLDER'>('CAMERA');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const toast = useToast();

  // Start WebCam
  const startCamera = async () => {
    setCameraError(null);
    setCapturedPhoto(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' },
        audio: false,
      });
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        "Impossible d'accéder à la caméra. Vérifiez les autorisations de votre navigateur ou branchez une webcam."
      );
      setIsCameraActive(false);
    }
  };

  // Stop WebCam
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'CAMERA' && !capturedPhoto) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  // Capture frame from video
  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const size = Math.min(video.videoWidth || 400, video.videoHeight || 400);

    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const sx = (video.videoWidth - size) / 2;
      const sy = (video.videoHeight - size) / 2;
      ctx.drawImage(video, sx, sy, size, size, 0, 0, 400, 400);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setCapturedPhoto(dataUrl);
      stopCamera();
    }
  };

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Le fichier sélectionné n'est pas une image valide (JPG, PNG, WEBP)");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCapturedPhoto(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onPhotoSelected(capturedPhoto);
      toast.success(`Photo d'identité de ${employeeName} enregistrée avec succès`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#071D49] text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-[#287BFF]" />
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">Photo d'Identité du Salarié</h3>
              <p className="text-[10px] text-blue-200 truncate max-w-[260px]">{employeeName}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 text-slate-300 hover:text-white rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab('CAMERA');
              setCapturedPhoto(null);
            }}
            className={`flex-1 py-3 px-4 flex items-center justify-center space-x-2 border-b-2 transition ${
              activeTab === 'CAMERA'
                ? 'border-[#287BFF] text-[#287BFF] dark:text-blue-400 bg-white dark:bg-slate-900 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Scan Caméra Direct</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('FOLDER');
              stopCamera();
            }}
            className={`flex-1 py-3 px-4 flex items-center justify-center space-x-2 border-b-2 transition ${
              activeTab === 'FOLDER'
                ? 'border-[#287BFF] text-[#287BFF] dark:text-blue-400 bg-white dark:bg-slate-900 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Fichier du Dossier</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {activeTab === 'CAMERA' && (
            <div className="flex flex-col items-center space-y-4">
              {!capturedPhoto ? (
                <div className="relative w-64 h-64 bg-slate-900 rounded-full border-4 border-[#071D49] overflow-hidden shadow-inner flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  {!isCameraActive && !cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-900">
                      <RefreshCw className="w-8 h-8 animate-spin mb-2 text-[#287BFF]" />
                      <span className="text-xs">Activation de la webcam...</span>
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute inset-0 p-4 text-center bg-slate-900 flex flex-col items-center justify-center text-red-400 space-y-2">
                      <AlertCircle className="w-8 h-8" />
                      <p className="text-xs">{cameraError}</p>
                      <button
                        onClick={startCamera}
                        className="px-3 py-1 bg-red-800 text-white rounded text-xs font-bold"
                      >
                        Réessayer
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative w-64 h-64 bg-slate-900 rounded-full border-4 border-emerald-500 overflow-hidden shadow-xl">
                  <img src={capturedPhoto} alt="Snapshot" className="w-full h-full object-cover" />
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />

              {!capturedPhoto ? (
                <button
                  onClick={takeSnapshot}
                  disabled={!isCameraActive}
                  className="w-full py-3 bg-[#287BFF] hover:bg-[#1A6CFA] disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md transition"
                >
                  <Camera className="w-4 h-4 text-white" />
                  <span>Prendre la Photo</span>
                </button>
              ) : (
                <div className="w-full flex items-center space-x-3">
                  <button
                    onClick={() => {
                      setCapturedPhoto(null);
                      startCamera();
                    }}
                    className="flex-1 py-2.5 border border-slate-300 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 hover:bg-slate-100 transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reprendre</span>
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow transition"
                  >
                    <Check className="w-4 h-4" />
                    <span>Valider la Photo</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'FOLDER' && (
            <div className="space-y-4">
              {!capturedPhoto ? (
                <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#1F3864] dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-800/40 transition">
                  <ImageIcon className="w-12 h-12 text-[#1F3864] dark:text-blue-400 mb-2 opacity-80" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    Cliquez ou glissez une image d'identité
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1">Formats acceptés : JPG, PNG, WEBP (max 5Mo)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative w-48 h-48 bg-slate-900 rounded-full border-4 border-emerald-500 overflow-hidden shadow-xl">
                    <img src={capturedPhoto} alt="Uploaded avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="w-full flex items-center space-x-3">
                    <button
                      onClick={() => setCapturedPhoto(null)}
                      className="flex-1 py-2.5 border border-slate-300 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 hover:bg-slate-100 transition"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Changer d'image</span>
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow transition"
                    >
                      <Check className="w-4 h-4" />
                      <span>Valider</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
