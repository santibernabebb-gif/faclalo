
import React from 'react';
import { FileText, Trash2, ArrowRight } from 'lucide-react';
import { BudgetData } from '../types';

interface BudgetListProps {
  budgets: BudgetData[];
  onSelect: (budget: BudgetData) => void;
  onDelete: (id: string) => void;
}

export const BudgetList: React.FC<BudgetListProps> = ({ budgets, onSelect, onDelete }) => {
  if (budgets.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p>No hay presupuestos cargados todavía.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {budgets.map((budget) => (
        <div key={budget.id} className="p-4 hover:bg-slate-50/80 transition-colors group flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h4 className="font-medium text-slate-800 truncate max-w-[200px] md:max-w-md">
                {budget.clientName === "NO DETECTADO" ? budget.fileName : budget.clientName}
              </h4>
              <div className="flex gap-3 text-xs text-slate-500 mt-1">
                <span>{budget.date}</span>
                <span className="text-slate-300">|</span>
                <span className="font-semibold text-slate-700">{budget.total.toFixed(2)}€</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onDelete(budget.id)}
              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onSelect(budget)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
            >
              Facturar <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
