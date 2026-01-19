
import React, { useState, useEffect } from 'react';
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
  Settings
} from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { BudgetList } from './components/BudgetList';
import { BudgetData, MONTHS_ABREV_ES } from './types';
import { generatePdf } from './services/documentGenerator';
import { templateStore, StoredTemplate } from './services/templateStore';

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
  const [storedTemplate, setStoredTemplate] = useState<StoredTemplate | null>(null);
  const [invoiceConfig, setInvoiceConfig] = useState({
    number: "1",
    date: new Date().toISOString().split('T')[0]
  });

  // Cargar plantilla de IndexedDB al inicio
  useEffect(() => {
    templateStore.getTemplate().then(setStoredTemplate);
  }, []);

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
      return `FACTURA ${invoiceConfig.number} ${monthAbrev}-${year}`;
    } catch (e) {
      return `FACTURA ${invoiceConfig.number} ???-26`;
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
      setTimeout(() => {
        setCurrentStep(Step.PREVIEW);
        setIsProcessing(false);
      }, 800);
    } catch (err) {
      setError("Error al procesar la factura.");
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!selectedBudget) return;
    const fullCode = getFullInvoiceCode();
    await generatePdf(
      selectedBudget, 
      { number: invoiceConfig.number, date: invoiceConfig.date }, 
      fullCode,
      storedTemplate?.data
    );
  };

  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      try {
        const saved = await templateStore.saveTemplate(file);
        setStoredTemplate(saved);
      } catch (err) {
        setError("Error al guardar la plantilla.");
      }
    }
  };

  const removeTemplate = async () => {
    await templateStore.clearTemplate();
    setStoredTemplate(null);
  };

  const updateSelectedBudget = (updates: Partial<BudgetData>) => {
    if (selectedBudget) {
      setSelectedBudget({ ...selectedBudget, ...updates });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[420px] bg-white rounded-[40px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden border border-slate-100 flex flex-col h-[880px] relative">
        
        {/* Header */}
        <div className="px-6 pt-8 pb-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {currentStep !== Step.UPLOAD && (
              <button onClick={() => setCurrentStep(currentStep - 1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ChevronLeft className="w-6 h-6 text-slate-400" />
              </button>
            )}
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[17px] font-black text-slate-800 uppercase tracking-tight leading-tight">
                {currentStep === Step.UPLOAD ? "APP-Presupuestos" : 
                 currentStep === Step.SETUP ? "Revisar Datos" : "Vista Previa"}
              </h2>
              <span className="text-[10px] font-bold text-blue-500 tracking-wider">By SantiSystems</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 pb-32">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-100 text-red-700 p-3 rounded-2xl flex items-center gap-2 text-xs font-bold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><XCircle className="w-4 h-4" /></button>
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
              
              <div className="pt-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-slate-800 text-[16px]">Presupuestos Recientes</h3>
                </div>
                <BudgetList 
                  budgets={budgets} 
                  onSelect={(b) => { setSelectedBudget(b); setCurrentStep(Step.SETUP); }}
                  onDelete={(id) => setBudgets(prev => prev.filter(b => b.id !== id))}
                />
              </div>
            </div>
          )}

          {currentStep === Step.SETUP && selectedBudget && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="pt-2">
                <h1 className="text-[24px] font-black text-slate-900 leading-[1.1]">Configurar Factura</h1>
                <p className="text-slate-400 text-[13px] mt-2 font-medium">Revisa los datos extraídos del presupuesto.</p>
              </div>

              <div className="bg-slate-50 p-5 rounded-[28px] border border-slate-100 space-y-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                    <input 
                      type="text" 
                      value={selectedBudget.clientName}
                      onChange={(e) => updateSelectedBudget({ clientName: e.target.value })}
                      className="w-full mt-1 p-3 bg-white border border-slate-100 rounded-xl text-sm font-bold focus:border-blue-400 outline-none"
                    />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº Factura</label>
                      <input 
                        type="number" 
                        value={invoiceConfig.number}
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
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Código Final</p>
                    <p className="text-lg font-black text-slate-900">{getFullInvoiceCode()}</p>
                 </div>
              </div>

              {/* Panel de Plantilla */}
              <div className="bg-slate-50 p-5 rounded-[28px] border border-slate-100">
                 <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4 text-slate-400" />
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Ajustes de Plantilla PDF</h3>
                 </div>
                 
                 {storedTemplate ? (
                   <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <div className="flex items-center gap-3">
                        <FileCheck className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-tight">Plantilla Cargada</p>
                          <p className="text-[12px] font-bold text-slate-700 truncate max-w-[150px]">{storedTemplate.name}</p>
                        </div>
                      </div>
                      <button onClick={removeTemplate} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                        <XCircle className="w-5 h-5" />
                      </button>
                   </div>
                 ) : (
                   <label className="flex items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-white hover:border-blue-300 transition-all group">
                      <div className="text-center">
                        <Plus className="w-5 h-5 text-slate-300 mx-auto group-hover:text-blue-500" />
                        <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">Subir Plantilla Base PDF</p>
                      </div>
                      <input type="file" accept="application/pdf" className="hidden" onChange={handleTemplateUpload} />
                   </label>
                 )}
                 <p className="text-[9px] text-slate-400 mt-2 ml-1 leading-tight italic">
                   Prioridad: (1) Archivo subido, (2) /public/Plantilla_Factura_BASE.pdf, (3) Diseño base simple.
                 </p>
              </div>

              <div className="space-y-3">
                 <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Líneas de la Tabla</h3>
                 <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                    {selectedBudget.lines.map((line, idx) => (
                      <div key={idx} className="p-3 bg-white border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 truncate max-w-[150px]">{line.description}</span>
                        <span className="font-black text-blue-600">{line.total.toFixed(2)}€</span>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="bg-blue-600 p-5 rounded-[28px] text-white">
                 <div className="flex justify-between items-center opacity-70 text-[10px] font-black uppercase tracking-widest">
                    <span>Total Factura</span>
                    <span>IVA 21% Incl.</span>
                 </div>
                 <div className="text-3xl font-black mt-1">{selectedBudget.total.toFixed(2)}€</div>
              </div>
            </div>
          )}

          {currentStep === Step.PREVIEW && selectedBudget && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-[24px] flex items-center justify-center gap-2 text-xs font-black border border-emerald-100">
                <CheckCircle2 className="w-4 h-4" />
                <span>Factura Lista</span>
              </div>

              <div className="aspect-[3/4] bg-slate-100 rounded-[40px] shadow-inner relative flex items-center justify-center p-6 overflow-hidden">
                 <div className="w-full h-full bg-white rounded-xl shadow-2xl flex flex-col p-6 border border-slate-200">
                    <div className="flex justify-between">
                       <div className="w-16 h-3 bg-blue-500 rounded-full"></div>
                       <div className="text-right">
                          <p className="text-[8px] font-black text-blue-600">{getFullInvoiceCode()}</p>
                          <p className="text-[6px] text-slate-400">FECHA: {invoiceConfig.date}</p>
                       </div>
                    </div>
                    <div className="mt-8 space-y-2">
                       <div className="w-full h-1 bg-slate-100 rounded-full"></div>
                       <div className="w-3/4 h-1 bg-slate-100 rounded-full"></div>
                    </div>
                    <div className="mt-8 flex-1 border-y border-slate-50 py-4">
                       <div className="flex justify-between text-[7px] font-black text-slate-300 border-b pb-1">
                          <span>ITEM</span>
                          <span>TOTAL</span>
                       </div>
                       {selectedBudget.lines.slice(0, 5).map((l, i) => (
                         <div key={i} className="flex justify-between text-[7px] py-1 border-b border-slate-50">
                            <span className="truncate max-w-[60px]">{l.description}</span>
                            <span>{l.total.toFixed(2)}€</span>
                         </div>
                       ))}
                    </div>
                    <div className="mt-4 self-end w-24 space-y-1">
                       <div className="flex justify-between text-[6px] text-slate-400"><span>Subtotal</span><span>{selectedBudget.subtotal.toFixed(2)}€</span></div>
                       <div className="flex justify-between text-[8px] font-black text-blue-600 border-t pt-1"><span>TOTAL</span><span>{selectedBudget.total.toFixed(2)}€</span></div>
                    </div>
                 </div>
                 <div className="absolute inset-0 bg-slate-900/5 flex items-center justify-center">
                    <div className="bg-white/90 backdrop-blur p-4 rounded-3xl shadow-xl flex items-center gap-3">
                       <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white"><FileText /></div>
                       <div className="text-left">
                          <p className="text-xs font-black text-slate-900">Diseño Aplicado</p>
                          <p className="text-[10px] font-bold text-slate-400 tracking-tight">Vectores Oficiales LALO</p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="flex justify-between items-center px-2">
                    <div>
                       <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Documento</p>
                       <p className="text-xl font-black text-slate-900">{getFullInvoiceCode()}</p>
                    </div>
                    <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase border border-blue-100">OFICIAL</span>
                 </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="absolute bottom-8 left-0 right-0 px-6 z-20">
          {currentStep === Step.UPLOAD && (
            <button 
              disabled={!selectedBudget}
              onClick={startConversion}
              className="w-full h-16 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-[24px] font-black text-[17px] shadow-[0_12px_40px_-10px_rgba(59,130,246,0.6)] disabled:opacity-50 transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
            >
              <Edit3 className="w-5 h-5" /> Revisar y Editar
            </button>
          )}
          {currentStep === Step.SETUP && (
            <button 
              onClick={handleGenerate}
              className="w-full h-16 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-[24px] font-black text-[17px] shadow-[0_12px_40px_-10px_rgba(59,130,246,0.6)] hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
            >
              <Save className="w-5 h-5" /> Confirmar Datos
            </button>
          )}
          {currentStep === Step.PREVIEW && (
            <div className="space-y-4">
              <button 
                onClick={handleDownload}
                className="w-full h-16 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-[24px] font-black text-[17px] shadow-[0_12px_40px_-10px_rgba(59,130,246,0.6)] hover:brightness-110 active:scale-[0.97] transition-all flex items-center justify-center gap-3 uppercase tracking-wider"
              >
                <Download className="w-5 h-5" /> Descargar Factura
              </button>
              <button onClick={() => { setSelectedBudget(null); setCurrentStep(Step.UPLOAD); }} className="w-full h-16 bg-slate-900 text-white rounded-[24px] font-black text-[17px] shadow-[0_12px_40px_-10px_rgba(15,23,42,0.4)] hover:bg-slate-800 active:scale-[0.97] transition-all flex items-center justify-center gap-3 uppercase tracking-wider">
                <Plus className="w-5 h-5" /> Subir Otro
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
            <h3 className="font-black text-2xl tracking-tight uppercase">Generando Factura</h3>
            <p className="text-slate-300 font-bold max-w-xs mx-auto">Aplicando plantilla oficial y procesando importes...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
