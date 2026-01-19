
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
    <div className="bg-white p-2.5 rounded-[40px] border border-slate-100 shadow-sm">
      <label className="flex flex-col items-center justify-center w-full aspect-[1/1.1] border-[2px] border-dashed border-blue-100 rounded-[32px] cursor-pointer bg-slate-50/30 hover:bg-blue-50/40 transition-all group overflow-hidden relative">
        <div className="flex flex-col items-center justify-center p-8 text-center pb-24">
          <div className="w-20 h-20 bg-blue-100 rounded-[28px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm shadow-blue-100/50">
             <Upload className="w-10 h-10 text-blue-600" />
          </div>
          <h4 className="text-2xl font-black text-slate-800 mb-3 tracking-tight uppercase">Subir Presupuesto</h4>
          <p className="text-slate-400 text-[14px] leading-relaxed max-w-[220px] font-medium">
            Arrastra y suelta o toca para seleccionar tu archivo. Solo se admiten formatos PDF.
          </p>
        </div>

        {/* Action Button inside Uploader */}
        <div className="absolute bottom-8 w-full px-8">
           <div className="w-full h-14 bg-gradient-to-r from-blue-600 to-blue-400 text-white rounded-[20px] font-black text-[15px] flex items-center justify-center gap-2 shadow-[0_10px_30px_-5px_rgba(59,130,246,0.5)] active:scale-95 transition-transform uppercase">
             <Plus className="w-5 h-5" /> Seleccionar Archivo
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
