
import React, { useState } from 'react';
import { ChevronLeft, Loader2, AlertCircle, CheckCircle2, FileText, Download, Share2, Mail, MessageSquare, History, MoreHorizontal } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { BudgetList } from './components/BudgetList';
import { InvoiceEditor } from './components/InvoiceEditor';
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
    number: "INV-2026-0001",
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
      // In a real app we'd trigger generation here, for now we just move to preview
      // The actual download happens in the preview screen
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 flex flex-col h-[850px]">
        
        {/* Header Area */}
        <div className="p-6 flex items-center justify-between">
          {currentStep !== Step.UPLOAD && (
            <button onClick={() => setCurrentStep(currentStep - 1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6 text-blue-600" />
            </button>
          )}
          <h2 className="text-lg font-bold text-slate-800 flex-1 text-center">
            {currentStep === Step.UPLOAD && "PDF Budget Upload"}
            {currentStep === Step.SETUP && "Invoice Setup"}
            {currentStep === Step.PREVIEW && "Invoice Preview"}
          </h2>
          {currentStep === Step.PREVIEW ? (
            <button onClick={() => setCurrentStep(Step.UPLOAD)} className="text-blue-600 font-bold text-sm">Done</button>
          ) : (
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
              <div className="w-5 h-5 bg-slate-400 rounded-full"></div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 pb-24 relative">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {currentStep === Step.UPLOAD && (
            <div className="space-y-6">
              <FileUploader 
                onProcessingStart={() => setIsProcessing(true)}
                onProcessingEnd={() => setIsProcessing(false)}
                onBudgetsDetected={handleBudgetsDetected}
                onError={setError}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Invoice Date</label>
                  <input 
                    type="date" 
                    value={invoiceConfig.date}
                    onChange={(e) => setInvoiceConfig({...invoiceConfig, date: e.target.value})}
                    className="w-full mt-1 p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Start Number</label>
                  <input 
                    type="text" 
                    value={invoiceConfig.number}
                    onChange={(e) => setInvoiceConfig({...invoiceConfig, number: e.target.value})}
                    className="w-full mt-1 p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800">Recent Budgets</h3>
                  <button className="text-blue-600 text-xs font-bold">View All</button>
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
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 leading-tight">Finalize Invoice Details</h1>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">Confirm the details below to convert your budget into a formal invoice.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Invoice Date</label>
                  <input 
                    type="date" 
                    value={invoiceConfig.date}
                    onChange={(e) => setInvoiceConfig({...invoiceConfig, date: e.target.value})}
                    className="w-full mt-1 p-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Invoice Number</label>
                  <input 
                    type="text" 
                    value={invoiceConfig.number}
                    onChange={(e) => setInvoiceConfig({...invoiceConfig, number: e.target.value})}
                    className="w-full mt-1 p-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Source Budget PDF</h3>
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Uploaded</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-16 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col p-1.5 gap-1">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full"></div>
                    <div className="w-3/4 h-1.5 bg-slate-100 rounded-full"></div>
                    <div className="mt-2 w-full h-1 bg-slate-50 rounded-full"></div>
                    <div className="w-full h-1 bg-slate-50 rounded-full"></div>
                    <div className="w-full h-1 bg-slate-50 rounded-full"></div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-bold text-slate-800 truncate">{selectedBudget.fileName}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">1.2 MB • {selectedBudget.date}</p>
                  </div>
                  <button onClick={() => setCurrentStep(Step.UPLOAD)} className="text-blue-600 text-xs font-bold">Replace</button>
                </div>
              </div>
            </div>
          )}

          {currentStep === Step.PREVIEW && selectedBudget && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Invoice Generated Successfully</span>
              </div>

              <div className="text-center px-4">
                <h1 className="text-2xl font-black text-slate-900">Ready to distribute</h1>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">Your PDF budget has been converted to a formal invoice.</p>
              </div>

              <div className="aspect-[3/4] bg-slate-100 rounded-3xl shadow-inner relative flex items-center justify-center p-8">
                 <div className="w-full h-full bg-white rounded-lg shadow-2xl flex flex-col p-4 gap-2 border border-slate-200 transform hover:scale-105 transition-transform duration-500">
                    <div className="w-full h-4 bg-blue-100 rounded-sm"></div>
                    <div className="flex justify-between items-start mt-4">
                      <div className="space-y-1">
                        <div className="w-20 h-2 bg-slate-100 rounded-full"></div>
                        <div className="w-16 h-1.5 bg-slate-50 rounded-full"></div>
                      </div>
                      <div className="w-12 h-12 bg-slate-900 rounded-sm"></div>
                    </div>
                    <div className="mt-8 space-y-2">
                      <div className="w-full h-2 bg-slate-50 rounded-full"></div>
                      <div className="w-full h-2 bg-slate-50 rounded-full"></div>
                      <div className="w-full h-2 bg-slate-50 rounded-full"></div>
                    </div>
                    <div className="mt-auto flex justify-end">
                      <div className="w-24 h-6 bg-slate-100 rounded-sm"></div>
                    </div>
                 </div>
                 <button className="absolute bottom-6 right-6 bg-white/90 backdrop-blur shadow-xl p-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase text-slate-800 border border-slate-200">
                   <ChevronLeft className="w-4 h-4 rotate-180" /> Preview
                 </button>
              </div>

              <div className="flex justify-between items-center px-2">
                <div>
                   <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Current Document</p>
                   <p className="text-lg font-black text-slate-900">{invoiceConfig.number}</p>
                   <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                     <History className="w-3 h-3" /> Issued: {new Date(invoiceConfig.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                   </p>
                </div>
                <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">Official</span>
              </div>

              <div className="space-y-4 pt-4">
                <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Share with client</p>
                <div className="flex justify-between items-center px-4">
                  <button className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-800 border border-slate-100"><Mail className="w-5 h-5" /></button>
                  <button className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-800 border border-slate-100"><MessageSquare className="w-5 h-5" /></button>
                  <button className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-800 border border-slate-100"><History className="w-5 h-5" /></button>
                  <button className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-800 border border-slate-100"><MoreHorizontal className="w-5 h-5" /></button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-slate-100">
          {currentStep === Step.UPLOAD && (
            <button 
              onClick={startConversion}
              className="w-full py-4 bg-blue-600 text-white rounded-[24px] font-black text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <FileText className="w-6 h-6" /> Start Conversion
            </button>
          )}
          {currentStep === Step.SETUP && (
            <button 
              onClick={handleGenerate}
              className="w-full py-4 bg-blue-600 text-white rounded-[24px] font-black text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <FileText className="w-6 h-6" /> Generate Invoice
            </button>
          )}
          {currentStep === Step.PREVIEW && (
            <div className="space-y-4">
              <button 
                onClick={handleDownload}
                className="w-full py-4 bg-blue-600 text-white rounded-[24px] font-black text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <Download className="w-6 h-6" /> Download PDF
              </button>
              <button className="w-full py-4 bg-slate-900 text-white rounded-[24px] font-black text-lg shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                <History className="w-6 h-6" /> Save to History
              </button>
            </div>
          )}
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 text-white">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <p className="font-black text-xl">Processing document...</p>
        </div>
      )}
    </div>
  );
};

export default App;
