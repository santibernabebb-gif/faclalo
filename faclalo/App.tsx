
import React, { useState } from 'react';
import { ChevronLeft, Loader2, AlertCircle, CheckCircle2, FileText, Download, Share2, Mail, MessageSquare, History, MoreHorizontal, User } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { BudgetList } from './components/BudgetList';
import { BudgetData } from './types';
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
  const [invoiceConfig, setInvoiceConfig] = useState({
    number: "FACT-2026-0001",
    date: new Date().toISOString().split('T')[0]
  });

  const handleBudgetsDetected = (newBudgets: BudgetData[]) => {
    setBudgets(prev => [...newBudgets, ...prev]);
    if (newBudgets.length > 0) {
      setSelectedBudget(newBudgets[0]);
    }
  };

  const startConversion = () => {
    if (selectedBudget) {
      setCurrentStep(Step.SETUP);
    } else {
      setError("Por favor, sube un presupuesto antes de continuar.");
    }
  };

  const handleGenerate = async () => {
    if (!selectedBudget) return;
    setIsProcessing(true);
    try {
      setCurrentStep(Step.PREVIEW);
    } catch (err) {
      setError("Error al procesar la factura.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedBudget) return;
    await generatePdf(selectedBudget, { 
      number: parseInt(invoiceConfig.number.replace(/\D/g, '')) || 1, 
      date: invoiceConfig.date 
    }, invoiceConfig.number);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans">
      {/* Mobile-style Container with very rounded corners */}
      <div className="w-full max-w-[420px] bg-white rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-100 flex flex-col h-[880px] relative">
        
        {/* Top Header Bar */}
        <div className="px-6 pt-8 pb-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {currentStep !== Step.UPLOAD ? (
              <button onClick={() => setCurrentStep(currentStep - 1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ChevronLeft className="w-6 h-6 text-slate-400" />
              </button>
            ) : (
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
            )}
            <h2 className="text-[17px] font-black text-slate-800 uppercase tracking-tight">
              {currentStep === Step.UPLOAD && "Subir Presupuesto"}
              {currentStep === Step.SETUP && "Configurar Factura"}
              {currentStep === Step.PREVIEW && "Vista Previa"}
            </h2>
          </div>
          
          {currentStep === Step.PREVIEW ? (
            <button onClick={() => setCurrentStep(Step.UPLOAD)} className="text-blue-600 font-black text-sm pr-2">HECHO</button>
          ) : (
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
              <User className="w-5 h-5 text-slate-400" />
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 pb-32">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-100 text-red-700 p-3 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {currentStep === Step.UPLOAD && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <FileUploader 
                onProcessingStart={() => setIsProcessing(true)}
                onProcessingEnd={() => setIsProcessing(false)}
                onBudgetsDetected={handleBudgetsDetected}
                onError={setError}
              />
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Factura</label>
                  <input 
                    type="date" 
                    value={invoiceConfig.date}
                    onChange={(e) => setInvoiceConfig({...invoiceConfig, date: e.target.value})}
                    className="w-full mt-1.5 p-4 bg-white border border-slate-100 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-400 shadow-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº Inicial</label>
                  <input 
                    type="text" 
                    value={invoiceConfig.number}
                    onChange={(e) => setInvoiceConfig({...invoiceConfig, number: e.target.value})}
                    className="w-full mt-1.5 p-4 bg-white border border-slate-100 rounded-2xl text-[13px] font-bold outline-none focus:border-blue-400 shadow-sm"
                  />
                </div>
              </div>

              <div className="pt-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-slate-800 text-[16px]">Presupuestos Recientes</h3>
                  <button className="text-blue-600 text-[12px] font-black uppercase">Ver Todos</button>
                </div>
                <BudgetList 
                  budgets={budgets} 
                  onSelect={(b) => { setSelectedBudget(b); startConversion(); }}
                  onDelete={(id) => setBudgets(prev => prev.filter(b => b.id !== id))}
                />
              </div>
            </div>
          )}

          {currentStep === Step.SETUP && selectedBudget && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="pt-2">
                <h1 className="text-[28px] font-black text-slate-900 leading-[1.1]">Finalizar Detalles</h1>
                <p className="text-slate-400 text-[14px] mt-3 leading-relaxed font-medium">Confirma los datos a continuación para convertir el presupuesto en una factura formal.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Factura</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={invoiceConfig.date}
                      onChange={(e) => setInvoiceConfig({...invoiceConfig, date: e.target.value})}
                      className="w-full mt-1.5 p-4 bg-white border border-slate-100 rounded-2xl text-[15px] outline-none focus:border-blue-400 font-bold shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de Factura</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={invoiceConfig.number}
                      onChange={(e) => setInvoiceConfig({...invoiceConfig, number: e.target.value})}
                      className="w-full mt-1.5 p-4 bg-white border border-slate-100 rounded-2xl text-[15px] outline-none focus:border-blue-400 font-bold shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PDF del Presupuesto Original</h3>
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2.5 py-1 rounded-full uppercase border border-blue-100">Subido</span>
                </div>
                <div className="p-4 bg-slate-50/50 rounded-[28px] border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-16 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col p-2 gap-1.5">
                    <div className="w-full h-1.5 bg-blue-100 rounded-full"></div>
                    <div className="w-3/4 h-1.5 bg-slate-100 rounded-full"></div>
                    <div className="mt-auto w-full h-1 bg-slate-50 rounded-full"></div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[15px] font-black text-slate-800 truncate">{selectedBudget.fileName}</p>
                    <p className="text-[11px] text-slate-400 font-bold mt-1">1.2 MB • {selectedBudget.date}</p>
                  </div>
                  <button onClick={() => setCurrentStep(Step.UPLOAD)} className="text-blue-600 text-xs font-black px-3 py-2 hover:bg-white rounded-xl transition-colors uppercase">Reemplazar</button>
                </div>
              </div>
            </div>
          )}

          {currentStep === Step.PREVIEW && selectedBudget && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-[24px] flex items-center justify-center gap-2 text-xs font-black border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
                <span>Factura Generada con Éxito</span>
              </div>

              <div className="text-center px-4">
                <h1 className="text-[28px] font-black text-slate-900 leading-tight">Lista para enviar</h1>
                <p className="text-slate-400 text-[14px] mt-2 leading-relaxed font-medium">Tu presupuesto PDF ha sido convertido en una factura profesional.</p>
              </div>

              <div className="aspect-[3/4] bg-slate-100 rounded-[40px] shadow-inner relative flex items-center justify-center p-8 overflow-hidden group">
                 <div className="w-full h-full bg-white rounded-xl shadow-2xl flex flex-col p-5 gap-3 border border-slate-200 group-hover:scale-[1.02] transition-transform duration-700">
                    <div className="w-full h-5 bg-blue-500 rounded-[4px]"></div>
                    <div className="flex justify-between items-start mt-4">
                      <div className="space-y-2">
                        <div className="w-24 h-2.5 bg-slate-100 rounded-full"></div>
                        <div className="w-20 h-2 bg-slate-50 rounded-full"></div>
                      </div>
                      <div className="w-14 h-14 bg-slate-900 rounded-lg flex items-center justify-center">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-md"></div>
                      </div>
                    </div>
                    <div className="mt-10 space-y-3">
                      <div className="w-full h-2.5 bg-slate-50 rounded-full"></div>
                      <div className="w-full h-2.5 bg-slate-50 rounded-full"></div>
                      <div className="w-3/4 h-2.5 bg-slate-50 rounded-full"></div>
                    </div>
                    <div className="mt-auto flex justify-end">
                      <div className="w-28 h-8 bg-slate-100 rounded-lg border border-slate-200"></div>
                    </div>
                 </div>
                 <button className="absolute bottom-6 right-6 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-4 rounded-[24px] flex items-center gap-2 text-[11px] font-black uppercase text-slate-800 border border-slate-100 hover:scale-105 transition-transform active:scale-95">
                   <ChevronLeft className="w-4 h-4 rotate-180 text-blue-600" /> VISTA PREVIA
                 </button>
              </div>

              <div className="flex justify-between items-center px-2">
                <div>
                   <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Documento Actual</p>
                   <p className="text-2xl font-black text-slate-900 tracking-tight">{invoiceConfig.number}</p>
                   <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5 mt-1.5">
                     <History className="w-4 h-4" /> Emitido: {new Date(invoiceConfig.date).toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' })}
                   </p>
                </div>
                <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase border border-blue-100">OFICIAL</span>
              </div>

              <div className="space-y-5 pt-4">
                <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Compartir con el cliente</p>
                <div className="flex justify-between items-center px-2">
                  {[Mail, MessageSquare, History, MoreHorizontal].map((Icon, i) => (
                    <button key={i} className="w-14 h-14 bg-white rounded-[24px] flex items-center justify-center text-slate-800 border border-slate-100 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all active:scale-90">
                      <Icon className="w-6 h-6" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Global Action Button Area - Matches specific glowing style */}
        <div className="absolute bottom-8 left-0 right-0 px-6 z-20">
          {currentStep === Step.UPLOAD && (
            <button 
              onClick={startConversion}
              className="w-full h-16 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-[24px] font-black text-[17px] shadow-[0_12px_40px_-10px_rgba(59,130,246,0.6)] hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
            >
              <FileText className="w-5 h-5" /> Iniciar Conversión
            </button>
          )}
          {currentStep === Step.SETUP && (
            <button 
              onClick={handleGenerate}
              className="w-full h-16 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-[24px] font-black text-[17px] shadow-[0_12px_40px_-10px_rgba(59,130,246,0.6)] hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
            >
              <FileText className="w-5 h-5" /> Generar Factura
            </button>
          )}
          {currentStep === Step.PREVIEW && (
            <div className="space-y-4">
              <button 
                onClick={handleDownload}
                className="w-full h-16 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-[24px] font-black text-[17px] shadow-[0_12px_40px_-10px_rgba(59,130,246,0.6)] hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
              >
                <Download className="w-5 h-5" /> Descargar PDF
              </button>
              <button className="w-full h-16 bg-slate-900 text-white rounded-[24px] font-black text-[17px] shadow-[0_12px_40px_-10px_rgba(15,23,42,0.4)] hover:bg-slate-800 active:scale-[0.97] transition-all flex items-center justify-center gap-3 uppercase tracking-wider">
                <History className="w-5 h-5" /> Guardar en Historial
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex flex-col items-center justify-center gap-6 text-white p-8 text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            <FileText className="absolute inset-0 m-auto w-8 h-8 text-blue-500 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="font-black text-2xl tracking-tight uppercase">Procesando documento</h3>
            <p className="text-slate-300 font-bold max-w-xs mx-auto">La IA de Gemini está analizando tu presupuesto y preparando tu factura profesional...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
