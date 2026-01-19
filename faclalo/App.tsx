import React, { useState, useCallback } from 'react';
import { FileUp, List, FileText, ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { BudgetList } from './components/BudgetList';
import { InvoiceEditor } from './components/InvoiceEditor';
import { BudgetData } from './types';

const App: React.FC = () => {
  const [budgets, setBudgets] = useState<BudgetData[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<BudgetData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBudgetsDetected = (newBudgets: BudgetData[]) => {
    setBudgets(prev => [...prev, ...newBudgets]);
  };

  const handleSelectBudget = (budget: BudgetData) => {
    setSelectedBudget(budget);
    setError(null);
  };

  const handleBack = () => {
    setSelectedBudget(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">LALO Facturación</h1>
          <p className="text-slate-500 mt-1">Transforma presupuestos en facturas profesionales</p>
        </div>
        <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">V.26</div>
      </header>

      <main className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {!selectedBudget ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <div className="sticky top-6">
                <FileUploader 
                  onProcessingStart={() => setIsProcessing(true)}
                  onProcessingEnd={() => setIsProcessing(false)}
                  onBudgetsDetected={handleBudgetsDetected}
                  onError={setError}
                />
              </div>
            </div>
            
            <div className="md:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                  <List className="w-4 h-4 text-slate-400" />
                  <h2 className="font-semibold text-slate-700">Presupuestos Cargados</h2>
                </div>
                {isProcessing ? (
                  <div className="p-12 flex flex-col items-center justify-center gap-4 text-slate-500">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p>Analizando documentos con IA...</p>
                  </div>
                ) : (
                  <BudgetList 
                    budgets={budgets} 
                    onSelect={handleSelectBudget}
                    onDelete={(id) => setBudgets(prev => prev.filter(b => b.id !== id))}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-4">
              <button 
                onClick={handleBack}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="flex items-center gap-2 text-slate-800 font-semibold">
                <FileText className="w-5 h-5 text-blue-500" />
                <span>Generar Factura</span>
              </div>
            </div>
            <InvoiceEditor budget={selectedBudget} onBack={handleBack} />
          </div>
        )}
      </main>
      
      <footer className="mt-12 pt-8 border-t border-slate-200 text-center text-slate-400 text-sm">
        &copy; {new Date().getFullYear()} LALO Servicios. Formato Fiscal 2026.
      </footer>
    </div>
  );
};

export default App;
