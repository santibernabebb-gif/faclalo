
import { 
  ChevronLeft, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Download, 
  History, 
  Edit3, 
  Save, 
  Plus, 
  Mail, 
  MessageSquare, 
  MoreHorizontal,
  FileCheck,
  XCircle,
  Settings,
  ExternalLink,
  Share2,
  Send,
  RefreshCw,
  ArrowLeft,
  Home
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { BudgetList } from './components/BudgetList';
import { BudgetData, MONTHS_ABREV_ES } from './types';
import { generatePdf } from './services/documentGenerator';

enum Step {
  UPLOAD,
  SETUP,
  PREVIEW
}

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<Step>(Step.UPLOAD);
  const [budgets, setBudgets] = useState<BudgetData[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<BudgetData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastBlobUrl, setLastBlobUrl] = useState<string | null>(null);
  const [invoiceConfig, setInvoiceConfig] = useState({
    number: "1",
    date: new Date().toISOString().split('T')[0]
  });

  const handleBudgetsDetected = (newBudgets: BudgetData[]) => {
    setBudgets(prev => [...newBudgets, ...prev]);
    if (newBudgets.length > 0) {
      setSelectedBudget(newBudgets[0]);
    }
  };

  const getFullInvoiceCode = () => {
    try {
      const dateObj = new Date(invoiceConfig.date);
      const monthIndex = dateObj.getMonth();
      const monthAbrev = MONTHS_ABREV_ES[monthIndex];
      const year = dateObj.getFullYear().toString().slice(-2);
      return `${monthAbrev}-${year} FACTURA ${invoiceConfig.number}`;
    } catch (e) {
      return `???-26 FACTURA ${invoiceConfig.number}`;
    }
  };

  const startConversion = () => {
    if (selectedBudget) {
      setCurrentStep(Step.SETUP);
    } else {
      setError("Por favor, sube una FACTURA antes de continuar.");
    }
  };

  const handleGenerate = async () => {
    if (!selectedBudget) return;
    setIsProcessing(true);
    setTimeout(() => {
      setCurrentStep(Step.PREVIEW);
      setIsProcessing(false);
    }, 600);
  };

  const handleDownload = async () => {
    if (!selectedBudget) return;
    setIsProcessing(true);
    try {
      const fullCode = getFullInvoiceCode();
      const blobUrl = await generatePdf(
        selectedBudget, 
        { number: invoiceConfig.number, date: invoiceConfig.date }, 
        fullCode
      );
      setLastBlobUrl(blobUrl);
      setShowSuccess(true);
    } catch (err) {
      setError("Error al descargar la factura.");
    } finally {
      setIsProcessing(false);
    }
  };

  const shareFactura = async () => {
    if (!lastBlobUrl) return;

    try {
      const response = await fetch(lastBlobUrl);
      const blob = await response.blob();
      const fileName = `Factura_${invoiceConfig.number}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Factura ${invoiceConfig.number}`,
          text: `Te envío la factura ${getFullInvoiceCode()}`
        });
      } else {
        window.open(lastBlobUrl, '_blank');
      }
    } catch (err) {
      console.error("Error al intentar compartir:", err);
      window.open(lastBlobUrl, '_blank');
    }
  };

  const handleBack = () => {
    if (currentStep === Step.UPLOAD) {
      if (selectedBudget) {
        setSelectedBudget(null);
      }
    } else if (currentStep === Step.SETUP) {
      setCurrentStep(Step.UPLOAD);
    } else if (currentStep === Step.PREVIEW) {
      setCurrentStep(Step.SETUP);
    }
  };

  const handleReset = () => {
    setSelectedBudget(null);
    setCurrentStep(Step.UPLOAD);
    setShowSuccess(false);
    setLastBlobUrl(null);
  };

  const updateSelectedBudget = (updates: Partial<BudgetData>) => {
    if (selectedBudget) {
      setSelectedBudget({ ...selectedBudget, ...updates });
    }
  };

  const showBackButton = !(currentStep === Step.UPLOAD && !selectedBudget);
  const showHomeButton = currentStep === Step.PREVIEW || showSuccess;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="w-full max-w-[420px] bg-white rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-100 flex flex-col h-[880px] relative">
        
        {/* Header */}
        <div className="px-6 pt-8 pb-4 flex items-center justify-between z-10 items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[17px] font-black uppercase tracking-tight leading-tight">
                {currentStep === Step.UPLOAD ? "APP-FACTURAS" : 
                 currentStep === Step.SETUP ? "Revisar Datos" : "Vista Previa"}
              </h2>
              <span className="text-[10px] font-bold text-blue-500 tracking-wider">By SantiSystems</span>
            </div>
          </div>

          {/* Botones de Navegación en la esquina superior derecha */}
          <div className="flex flex-col items-end gap-2">
            {showBackButton && (
              <button 
                onClick={handleBack}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors border border-slate-100 group shadow-sm"
              >
                <ArrowLeft className="w-3 h-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
                <span className="text-[9px] font-black text-slate-400 group-hover:text-blue-500 uppercase tracking-widest transition-colors">Volver</span>
              </button>
            )}
            
            {showHomeButton && (
              <button 
                onClick={handleReset}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors group shadow-[0_4px_12px_-2px_rgba(37,99,235,0.3)]"
              >
                <Home className="w-3 h-3 text-white transition-colors" />
                <span className="text-[9px] font-black text-white uppercase tracking-widest transition-colors">Inicio</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 pb-12">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-100 text-red-700 p-3 rounded-2xl flex items-center gap-2 text-xs font-bold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><XCircle className="w-4 h-4" /></button>
            </div>
          )}

          {currentStep === Step.UPLOAD && (
            <div className="space-y-4 animate-in fade-in duration-500">
              
              {!selectedBudget ? (
                <>
                  <FileUploader 
                    onProcessingStart={() => setIsProcessing(true)}
                    onProcessingEnd={() => setIsProcessing(false)}
                    onBudgetsDetected={handleBudgetsDetected}
                    onError={setError}
                  />
                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-black text-slate-800 text-[16px]">Historial de Carga</h3>
                    </div>
                    <BudgetList 
                      budgets={budgets} 
                      onSelect={(b) => { setSelectedBudget(b); }}
                      onDelete={(id) => setBudgets(prev => prev.filter(b => b.id !== id))}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-6 py-10 animate-in zoom-in-95 duration-300">
                  <div className="bg-blue-50 rounded-[32px] p-8 border border-blue-100 flex flex-col items-center text-center shadow-sm">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-sm border border-blue-50">
                      <FileCheck className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight mb-1 uppercase tracking-tight">Archivo Cargado</h3>
                    <p className="text-sm font-bold text-slate-500 truncate w-full max-w-[240px]">
                      {selectedBudget.fileName}
                    </p>
                    
                    <button 
                      onClick={() => setSelectedBudget(null)}
                      className="mt-6 flex items-center gap-2 text-[11px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Cambiar Archivo
                    </button>
                  </div>

                  <button 
                    onClick={startConversion}
                    className="w-full h-16 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-[24px] font-black text-[17px] shadow-[0_12px_40px_-10px_rgba(59,130,246,0.6)] hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
                  >
                    <Edit3 className="w-5 h-5" /> Configurar Archivo
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === Step.SETUP && selectedBudget && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="pt-2">
                <h1 className="text-[24px] font-black leading-[1.1]">Convertir a Factura</h1>
              </div>

              <div className="bg-slate-50 p-5 rounded-[28px] border border-slate-100 space-y-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Cliente</label>
                    <input 
                      type="text" 
                      value={selectedBudget.clientName}
                      onFocus={() => { if (selectedBudget.clientName === "CLIENTE DETECTADO") updateSelectedBudget({ clientName: "" }); }}
                      onChange={(e) => updateSelectedBudget({ clientName: e.target.value.toUpperCase() })}
                      className="w-full mt-1 p-3 bg-white border border-slate-100 rounded-xl text-sm font-bold focus:border-blue-400 outline-none"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº Factura</label>
                      <input 
                        type="number" 
                        value={invoiceConfig.number}
                        onFocus={() => setInvoiceConfig({...invoiceConfig, number: ""})}
                        onChange={(e) => setInvoiceConfig({...invoiceConfig, number: e.target.value})}
                        className="w-full mt-1 p-3 bg-white border border-slate-100 rounded-xl text-sm font-bold focus:border-blue-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Factura</label>
                      <input 
                        type="date" 
                        value={invoiceConfig.date}
                        onChange={(e) => setInvoiceConfig({...invoiceConfig, date: e.target.value})}
                        className="w-full mt-1 p-3 bg-white border border-slate-100 rounded-xl text-sm font-bold focus:border-blue-400 outline-none"
                      />
                    </div>
                 </div>
                 <div className="pt-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Vista del Código</p>
                    <p className="text-lg font-black">{getFullInvoiceCode()}</p>
                 </div>
              </div>

              <div className="bg-blue-50/50 p-5 rounded-[28px] border border-blue-100">
                <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <FileCheck className="w-4 h-4" /> Modo de Generación
                </h3>
                <p className="text-[12px] font-bold text-slate-600 mt-2 leading-relaxed">
                  Se generará un nuevo PDF usando la FACTURA original. revise la factura una vez creada.
                </p>
              </div>

              <button 
                onClick={handleGenerate}
                className="w-full h-16 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-[24px] font-black text-[17px] shadow-[0_12px_40px_-10px_rgba(59,130,246,0.6)] hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
              >
                <Save className="w-5 h-5" /> Confirmar Datos
              </button>
            </div>
          )}

          {currentStep === Step.PREVIEW && selectedBudget && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-500 pb-6">
              <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-[20px] flex items-center justify-center gap-2 text-[11px] font-black border border-emerald-100">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Datos Listos para Descarga</span>
              </div>

              <div className="h-32 bg-slate-100 rounded-[32px] shadow-inner relative flex items-center justify-center p-4 overflow-hidden border border-slate-100">
                 <div className="w-2/3 h-full bg-white rounded-lg shadow-xl flex flex-col p-3 border border-slate-200 opacity-30">
                    <div className="flex justify-between">
                       <div className="w-10 h-1.5 bg-blue-500 rounded-full"></div>
                       <div className="text-right">
                          <p className="text-[5px] font-black text-blue-600">FACTURA Nº {invoiceConfig.number}</p>
                          <p className="text-[3px] text-slate-400">{invoiceConfig.date}</p>
                       </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                       <FileText className="w-8 h-8 text-slate-100" />
                    </div>
                 </div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-[24px] shadow-lg flex items-center gap-2.5 border border-white/50">
                       <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                          <FileCheck className="w-4 h-4" />
                       </div>
                       <div className="text-left pr-1">
                          <p className="text-[11px] font-black leading-tight tracking-tight">Modo Final Activo</p>
                          <p className="text-[9px] font-bold text-slate-400 tracking-tight">Preparado para descargar...</p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="pt-1">
                 <div className="flex justify-between items-center px-4 py-3 bg-slate-50 rounded-[24px] border border-slate-100 shadow-sm">
                    <div className="overflow-hidden">
                       <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Documento Final</p>
                       <p className="text-[16px] font-black truncate">{getFullInvoiceCode()}</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-3 py-1 rounded-full uppercase border border-emerald-100 flex-shrink-0">VALIDADO</span>
                 </div>
              </div>

              <div className="space-y-3 pt-2">
                <button 
                  onClick={handleDownload}
                  className="w-full h-14 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-[22px] font-black text-[16px] shadow-[0_10px_30px_-8px_rgba(59,130,246,0.6)] hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center gap-2.5 uppercase tracking-wider"
                >
                  <Download className="w-4.5 h-4.5" /> Descargar Factura
                </button>
                <button 
                  onClick={handleReset} 
                  className="w-full h-14 bg-slate-900 text-white rounded-[22px] font-black text-[16px] shadow-[0_10px_30px_-8px_rgba(15,23,42,0.4)] hover:bg-slate-800 active:scale-[0.97] transition-all flex items-center justify-center gap-2.5 uppercase tracking-wider"
                >
                  <Plus className="w-4.5 h-4.5" /> NUEVA FACTURA
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSuccess(false)}></div>
          <div className="bg-white w-full max-w-[340px] rounded-[36px] p-8 shadow-2xl relative animate-in zoom-in-95 duration-300 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
               <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-[22px] font-black mb-2 leading-tight uppercase tracking-tight">
              Factura Lista
            </h3>
            <p className="text-slate-500 text-sm font-bold mb-8">
              El archivo se ha generado. Ahora puedes enviarlo por WhatsApp o compartirlo con otras apps.
            </p>
            <div className="space-y-3">
              <button 
                onClick={shareFactura}
                className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-[15px] flex items-center justify-center gap-3 uppercase tracking-wider shadow-lg shadow-blue-200"
              >
                <Send className="w-4.5 h-4.5" /> Enviar Factura
              </button>
              <button 
                onClick={handleReset}
                className="w-full h-14 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[15px] flex items-center justify-center gap-3 uppercase tracking-wider border border-emerald-100 shadow-sm"
              >
                <Home className="w-4.5 h-4.5" /> Volver al Inicio
              </button>
              <button 
                onClick={() => setShowSuccess(false)}
                className="w-full h-10 bg-transparent text-slate-400 rounded-2xl font-black text-[11px] flex items-center justify-center gap-2 uppercase tracking-widest"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex flex-col items-center justify-center gap-6 text-white p-8 text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <FileText className="absolute inset-0 m-auto w-8 h-8 text-blue-500 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="font-black text-2xl tracking-tight uppercase">Preparando Documento</h3>
            <p className="text-slate-300 font-bold max-w-xs mx-auto">Sincronizando capas del PDF original...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
