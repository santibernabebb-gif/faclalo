
import React from 'react';
import { Upload } from 'lucide-react';
import { parseBudgetPdf } from '../services/pdfParser';
import { BudgetData } from '../types';

interface FileUploaderProps {
  onProcessingStart: () => void;
  onProcessingEnd: () => void;
  onBudgetsDetected: (budgets: BudgetData[]) => void;
  onError: (msg: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onProcessingStart,
  onProcessingEnd,
  onBudgetsDetected,
  onError
}) => {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    onProcessingStart();
    const newBudgets: BudgetData[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type !== 'application/pdf') {
          console.warn(`Skipping non-PDF file: ${file.name}`);
          continue;
        }

        try {
          const budgetData = await parseBudgetPdf(file);
          newBudgets.push(budgetData);
        } catch (err) {
          console.error(`Error parsing ${file.name}:`, err);
          onError(`Error al leer el archivo ${file.name}. Asegúrate de que es un PDF de presupuesto válido.`);
        }
      }

      if (newBudgets.length > 0) {
        onBudgetsDetected(newBudgets);
      }
    } finally {
      onProcessingEnd();
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h3 className="font-semibold text-slate-800 mb-4">Subir Presupuestos</h3>
      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="w-10 h-10 text-slate-400 mb-2" />
          <p className="mb-2 text-sm text-slate-500">
            <span className="font-semibold">Click para subir</span> o arrastra PDFs
          </p>
          <p className="text-xs text-slate-400">PDF (Múltiples permitidos)</p>
        </div>
        <input 
          type="file" 
          className="hidden" 
          multiple 
          accept=".pdf"
          onChange={handleFileChange} 
        />
      </label>
      <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 leading-relaxed">
        <strong>Tip:</strong> El sistema extraerá automáticamente el cliente, fecha y líneas del presupuesto usando IA y parsing directo.
      </div>
    </div>
  );
};
