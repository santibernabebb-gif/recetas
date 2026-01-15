
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'main' | 'history';
  setActiveTab: (tab: 'main' | 'history') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-white shadow-xl relative">
      <header className="bg-emerald-600 text-white p-6 sticky top-0 z-20 shadow-md">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="bg-white text-emerald-600 p-1 rounded-lg">S</span>
          Santisystems - Recetas
        </h1>
        <p className="text-emerald-100 text-sm mt-1">IA al servicio de tu cocina</p>
      </header>

      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-slate-200 flex justify-around p-3 z-30">
        <button 
          onClick={() => setActiveTab('main')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'main' ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-xs font-medium">Recetas</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-emerald-600' : 'text-slate-400'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-medium">Historial</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
