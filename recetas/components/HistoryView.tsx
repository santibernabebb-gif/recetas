
import React from 'react';
import { HistoryItem } from '../types';

interface HistoryViewProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
  onDeleteItem: (id: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ history, onSelect, onClear, onDeleteItem }) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-slate-500 font-medium">No hay búsquedas guardadas todavía.</p>
        <p className="text-sm text-slate-400">Las recetas generadas aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-lg font-bold text-slate-800">Historial de recetas</h2>
        <button 
          onClick={onClear} 
          className="text-xs text-red-500 font-bold bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
        >
          Borrar todo
        </button>
      </div>
      <div className="space-y-3">
        {history.map((item) => (
          <div key={item.id} className="group relative">
            <button
              onClick={() => onSelect(item)}
              className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-emerald-500 hover:shadow-md transition-all active:scale-[0.99] pr-12"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  {new Date(item.timestamp).toLocaleDateString('es-ES', { 
                    day: 'numeric', 
                    month: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase">
                  {item.recipes.length} opciones
                </span>
              </div>
              <p className="text-sm font-bold text-slate-700 truncate mr-2">
                {item.ingredients.join(', ')}
              </p>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                if(window.confirm('¿Eliminar esta búsqueda del historial?')) {
                  onDeleteItem(item.id);
                }
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              title="Eliminar del historial"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryView;
