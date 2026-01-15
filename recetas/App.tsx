
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import ImagePicker from './components/ImagePicker';
import RecipeResult from './components/RecipeResult';
import HistoryView from './components/HistoryView';
import { analyzeIngredients, generateRecipes } from './services/geminiService';
import { Recipe, Preferences, HistoryItem } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'main' | 'history'>('main');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [detectedIngredients, setDetectedIngredients] = useState<string[]>([]);
  const [editingIngredients, setEditingIngredients] = useState(false);
  const [newIngredient, setNewIngredient] = useState('');
  const [preferences, setPreferences] = useState<Preferences>({
    quick: false, healthy: false, noOven: false, vegetarian: false, servings: 2, allergies: ''
  });
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('santisystems_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  const saveToHistory = (ingredients: string[], generated: Recipe[]) => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      ingredients,
      recipes: generated
    };
    setHistory(prev => {
      const updated = [newItem, ...prev].slice(0, 10);
      localStorage.setItem('santisystems_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAnalyze = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setLoadingMsg('Analizando con IA...');
    setError(null);
    try {
      const detected = await analyzeIngredients(images);
      if (detected && detected.length > 0) {
        setDetectedIngredients(detected);
        setEditingIngredients(true);
      } else {
        setError("No se detectaron ingredientes claros.");
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar con la IA");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (detectedIngredients.length === 0) return;
    setLoading(true);
    setLoadingMsg('Creando tus recetas...');
    setError(null);
    try {
      const generated = await generateRecipes(detectedIngredients, preferences);
      setRecipes(generated);
      saveToHistory(detectedIngredients, generated);
      setEditingIngredients(false);
    } catch (err: any) {
      setError(err.message || "Error al generar recetas");
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setImages([]);
    setDetectedIngredients([]);
    setRecipes([]);
    setEditingIngredients(false);
    setError(null);
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'main' ? (
        <div className="space-y-8 animate-in">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
              <p className="text-lg font-bold text-slate-700 animate-pulse">{loadingMsg}</p>
            </div>
          ) : recipes.length > 0 ? (
            <div className="space-y-6 animate-in">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Tus Recetas</h2>
                <button onClick={resetAll} className="text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
                  Nueva búsqueda
                </button>
              </div>
              {recipes.map(recipe => (
                <RecipeResult key={recipe.id} recipe={recipe} />
              ))}
            </div>
          ) : editingIngredients ? (
            <div className="space-y-6 animate-in">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h2 className="font-bold text-slate-800">Confirmar Ingredientes</h2>
                <div className="flex flex-wrap gap-2">
                  {detectedIngredients.map((ing, idx) => (
                    <span key={idx} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                      {ing}
                      <button onClick={() => setDetectedIngredients(prev => prev.filter((_, i) => i !== idx))} className="font-bold">×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newIngredient} 
                    onChange={(e) => setNewIngredient(e.target.value)}
                    placeholder="Añadir ingrediente..."
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newIngredient.trim()) {
                        setDetectedIngredients(prev => [...prev, newIngredient.trim()]);
                        setNewIngredient('');
                      }
                    }}
                  />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h2 className="font-bold text-slate-800">Preferencias</h2>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={preferences.vegetarian} 
                      onChange={(e) => setPreferences(prev => ({ ...prev, vegetarian: e.target.checked }))} 
                      className="w-5 h-5 accent-emerald-600"
                    />
                    <span className="text-sm">Vegetariano</span>
                  </label>
                  <div className="p-3 border rounded-xl">
                    <span className="text-xs text-slate-500 block mb-1">Comensales: {preferences.servings}</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="8" 
                      value={preferences.servings} 
                      onChange={(e) => setPreferences(prev => ({ ...prev, servings: parseInt(e.target.value) }))} 
                      className="w-full accent-emerald-600"
                    />
                  </div>
                </div>
              </div>

              <button onClick={handleGenerate} className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95">
                Generar Recetas
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in">
              <div className="text-center space-y-2">
                <h2 className="text-4xl font-black text-slate-800 tracking-tight">Santisystems</h2>
                <p className="text-slate-500 font-medium">Cocinamos con lo que tienes</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <ImagePicker images={images} setImages={setImages} />
                <button 
                  onClick={handleAnalyze} 
                  disabled={images.length === 0} 
                  className="w-full mt-6 bg-emerald-600 text-white p-4 rounded-2xl font-bold shadow-lg disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  Identificar Ingredientes
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 text-sm font-medium flex items-start gap-3 animate-in">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p>{error}</p>
            </div>
          )}
        </div>
      ) : (
        <HistoryView 
          history={history} 
          onSelect={(item) => { setDetectedIngredients(item.ingredients); setRecipes(item.recipes); setActiveTab('main'); }} 
          onClear={() => { if(confirm('¿Borrar historial?')) setHistory([]); }} 
          onDeleteItem={(id) => setHistory(prev => prev.filter(i => i.id !== id))} 
        />
      )}
    </Layout>
  );
};

export default App;
