
import React from 'react';
import { Upload, Plus } from 'lucide-react';
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
        if (file.type !== 'application/pdf') continue;

        try {
          const budgetData = await parseBudgetPdf(file);
          newBudgets.push(budgetData);
        } catch (err) {
          console.error(`Error parsing ${file.name}:`, err);
          onError(`Error al leer el archivo ${file.name}.`);
        }
      }

      if (newBudgets.length > 0) {
        onBudgetsDetected(newBudgets);
      }
    } finally {
      onProcessingEnd();
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white p-2 rounded-[32px] border border-slate-200">
      <div className="flex items-center gap-3 mb-6 p-4">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <Upload className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="font-black text-slate-800 tracking-tight">PDF Budget Upload</h3>
      </div>
      
      <label className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-blue-200 rounded-[32px] cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition-all group overflow-hidden relative">
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
             <Upload className="w-10 h-10 text-blue-600" />
          </div>
          <h4 className="text-xl font-black text-slate-800 mb-2">Upload PDF Budget</h4>
          <p className="text-slate-400 text-sm leading-relaxed max-w-[200px]">
            Drag and drop or tap to select your file. Only PDF formats are supported.
          </p>
        </div>

        <div className="absolute bottom-8 w-full px-8">
           <div className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
             <Plus className="w-5 h-5" /> Select File
           </div>
        </div>

        <input 
          type="file" 
          className="hidden" 
          multiple 
          accept=".pdf"
          onChange={handleFileChange} 
        />
      </label>
    </div>
  );
};
