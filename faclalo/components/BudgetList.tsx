
import React from 'react';
import { FileText, ChevronRight, FileCode } from 'lucide-react';
import { BudgetData } from '../types';

interface BudgetListProps {
  budgets: BudgetData[];
  onSelect: (budget: BudgetData) => void;
  onDelete: (id: string) => void;
}

export const BudgetList: React.FC<BudgetListProps> = ({ budgets, onSelect, onDelete }) => {
  if (budgets.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-3xl border border-slate-100">
        <FileCode className="w-12 h-12 mx-auto mb-3 opacity-20 text-blue-600" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No hay FACTURAS recientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {budgets.map((budget, idx) => (
        <button 
          key={budget.id} 
          onClick={() => onSelect(budget)}
          className="w-full p-4 bg-white hover:bg-blue-50/50 border border-slate-100 rounded-3xl transition-all flex items-center gap-4 group text-left shadow-sm hover:shadow-md"
        >
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-white transition-colors">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="font-bold text-slate-800 truncate text-sm">{budget.clientName === "NO DETECTADO" ? budget.fileName : budget.clientName}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-tighter">
              {budget.date} • {budget.total.toFixed(2)}€
            </p>
          </div>
          <div className="flex items-center gap-3">
             <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${idx % 2 === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
               {idx % 2 === 0 ? 'Convertido' : 'Borrador'}
             </span>
             <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      ))}
    </div>
  );
};
