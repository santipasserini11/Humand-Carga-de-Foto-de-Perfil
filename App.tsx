/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { 
  Upload, 
  Key, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  FileArchive, 
  AlertCircle,
  ChevronRight,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UploadResult {
  employeeId: string;
  status: 'success' | 'error';
  message?: string;
  fileName: string;
}

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [currentProgress, setCurrentProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setZipFile(e.target.files[0]);
      setError(null);
    }
  };

  const processUploads = async () => {
    if (!zipFile || !apiKey) {
      setError('Por favor, proporciona la API Key y el archivo ZIP.');
      return;
    }

    setIsProcessing(true);
    setResults([]);
    setError(null);

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(zipFile);
      
      const imageFiles = Object.values(contents.files).filter(file => {
        // Ignore directories and hidden files
        if (file.dir || file.name.startsWith('.') || file.name.includes('__MACOSX')) return false;
        // Check for common image extensions
        return /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
      });

      if (imageFiles.length === 0) {
        throw new Error('No se encontraron imágenes válidas en el archivo ZIP.');
      }

      setCurrentProgress({ current: 0, total: imageFiles.length });

      const uploadResults: UploadResult[] = [];

      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const fileName = file.name.split('/').pop() || file.name;
        const employeeId = fileName.split('.')[0];
        
        try {
          const blob = await file.async('blob');
          const mimeType = blob.type || 'image/jpeg';

          // Correct URL and Auth from the provided script
          const url = `https://api-prod.humand.co/public/api/v1/users/${employeeId}/profile-picture`;
          
          // The script uses 'files' in requests.put, which translates to multipart/form-data
          const formData = new FormData();
          formData.append('file', blob, fileName);

          const response = await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': `Basic ${apiKey}`,
              // Note: Do not set Content-Type header when using FormData, 
              // the browser will set it automatically with the boundary
            },
            body: formData,
          });

          if (response.status !== 200) {
            const errorText = await response.text().catch(() => 'Error desconocido');
            throw new Error(errorText || `HTTP ${response.status}`);
          }

          uploadResults.push({
            employeeId,
            fileName,
            status: 'success'
          });
        } catch (err: any) {
          uploadResults.push({
            employeeId,
            fileName,
            status: 'error',
            message: err.message
          });
        }

        setCurrentProgress(prev => ({ ...prev, current: i + 1 }));
        setResults([...uploadResults]);
      }

    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al procesar el archivo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="min-h-screen bg-[#F4F7FA] font-sans text-[#141414]">
      {/* Top Navigation */}
      <nav className="bg-white px-8 py-5 border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center">
          <div className="flex items-center gap-0">
            <span className="text-[28px] font-bold text-[#2D3A8C] font-outfit tracking-[-0.06em] leading-none select-none">
              humand
            </span>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-16">
        {/* Header Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">Carga masiva de fotos de perfil</h1>
          <p className="text-lg text-gray-500 font-medium">Automatiza la actualización de imágenes de tus empleados desde un archivo ZIP</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] p-12 md:p-20 relative overflow-hidden">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Sube tu archivo ZIP</h2>
            <p className="text-gray-500 mb-10 leading-relaxed">
              Arrastra tu archivo aquí o haz clic para seleccionarlo. <br />
              Se procesarán todas las imágenes detectadas dentro del comprimido.
            </p>

            {/* Drop Area */}
            <div className={cn(
              "border-2 border-dashed rounded-[32px] p-16 transition-all relative group",
              zipFile ? "border-[#4F6EF7] bg-blue-50/30" : "border-blue-100 bg-blue-50/10 hover:bg-blue-50/30"
            )}>
              <input 
                type="file" 
                className="hidden" 
                id="zip-upload" 
                accept=".zip" 
                onChange={handleFileChange} 
                disabled={isProcessing}
              />
              <label htmlFor="zip-upload" className="cursor-pointer flex flex-col items-center">
                <div className={cn(
                  "px-10 py-4 rounded-2xl font-bold text-base flex items-center gap-3 shadow-xl transition-all active:scale-95 mb-6",
                  isProcessing ? "bg-gray-200 text-gray-400" : "bg-[#4F6EF7] text-white hover:bg-[#3D5AD9] shadow-blue-200"
                )}>
                  {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  {zipFile ? zipFile.name : "Seleccionar archivo"}
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">O ARRASTRA Y SUELTA</span>
              </label>
            </div>

            {/* Configuration & Progress */}
            <div className="mt-12 max-w-sm mx-auto space-y-6">
              <div className="text-left">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">API Key Humand</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Ingresa tu token..."
                    className="w-full pl-11 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-300"
                  />
                </div>
              </div>

              <button
                onClick={processUploads}
                disabled={isProcessing || !apiKey || !zipFile}
                className={cn(
                  "w-full py-5 rounded-2xl font-bold text-sm transition-all shadow-xl uppercase tracking-widest",
                  isProcessing || !apiKey || !zipFile
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                    : "bg-[#4F6EF7] text-white hover:bg-[#3D5AD9] shadow-blue-100 active:scale-[0.98]"
                )}
              >
                {isProcessing ? "Procesando..." : "Iniciar Carga"}
              </button>

              {isProcessing && (
                <div className="pt-4">
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">
                    <span>Progreso de carga</span>
                    <span>{Math.round((currentProgress.current / currentProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-[#4F6EF7]"
                      initial={{ width: 0 }}
                      animate={{ width: `${(currentProgress.current / currentProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <p className="mt-12 text-xs text-gray-400 leading-relaxed italic max-w-md mx-auto">
              Recuerda que las fotos deben estar nombradas con el ID del usuario (ej: 1234.jpg) para que el sistema pueda asociarlas correctamente.
            </p>
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mt-8 bg-red-50 border border-red-100 p-6 rounded-3xl flex gap-4 items-center max-w-2xl mx-auto"
            >
              <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Section */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-16 space-y-8"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Resultados de la carga</h3>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-bold text-gray-500">{successCount} Éxitos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-sm font-bold text-gray-500">{errorCount} Errores</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((result, idx) => (
                  <motion.div
                    key={`${result.employeeId}-${idx}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "p-5 rounded-3xl border flex items-center justify-between transition-all",
                      result.status === 'success' 
                        ? "bg-white border-emerald-100 shadow-sm" 
                        : "bg-white border-red-100 shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                        result.status === 'success' ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500"
                      )}>
                        {result.status === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">ID: {result.employeeId}</p>
                        <p className="text-xs text-gray-400 font-medium">{result.fileName}</p>
                      </div>
                    </div>
                    {result.message && (
                      <span className="text-[10px] font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-xl max-w-[120px] truncate">
                        {result.message}
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
