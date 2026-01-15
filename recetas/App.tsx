
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import ImagePicker from './components/ImagePicker';
import RecipeResult from './components/RecipeResult';
import HistoryView from './components/HistoryView';
import { analyzeIngredients, generateRecipes } from './services/geminiService';
import { Recipe, Preferences, HistoryItem } from './types';

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);
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
    const checkKey = async () => {
      // @ts-ignore
      const selected = await window.aistudio?.hasSelectedApiKey();
      const envKey = process.env.API_KEY;
      if (!selected && !envKey) {
        setHasApiKey(false);
      }
    };
    checkKey();

    const saved = localStorage.getItem('santisystems_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const handleOpenKeySelector = async () => {
    // @ts-ignore
    await window.aistudio?.openSelectKey();
    setHasApiKey(true);
  };

  const saveToHistory = (ingredients: string[], generated: Recipe[]) => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      ingredients,
      recipes: generated
    };
    const updated = [newItem, ...history].slice(0, 10);
    setHistory(updated);
    localStorage.setItem('santisystems_history', JSON.stringify(updated));
  };

  const handleAnalyze = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setLoadingMsg('Analizando fotos con IA...');
    setError(null);
    try {
      const detected = await analyzeIngredients(images);
      setDetectedIngredients(detected);
      setEditingIngredients(true);
    } catch (err: any) {
      if (err.message?.includes("API Key")) {
        setHasApiKey(false);
      } else {
        setError(err.message || 'Error al conectar con la IA. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (detectedIngredients.length === 0) return;
    setLoading(true);
    setLoadingMsg('Creando recetas únicas...');
    setError(null);
    try {
      const generated = await generateRecipes(detectedIngredients, preferences);
      setRecipes(generated);
      saveToHistory(detectedIngredients, generated);
      setEditingIngredients(false);
    } catch (err: any) {
      setError('No se pudieron generar las recetas. Revisa tu conexión.');
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

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6 animate-in">
          <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Acceso Requerido</h1>
            <p className="text-slate-500 text-sm">Para que la IA de Santisystems cocine por ti, necesitas configurar tu clave API.</p>
          </div>
          <button 
            onClick={handleOpenKeySelector}
            className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
          >
            Configurar Clave API
          </button>
          <p className="text-xs text-slate-400">
            Debes seleccionar un proyecto con facturación activa en <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline">Google AI Studio</a>.
          </p>
        </div>
      </div>
    );
  }

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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Tus Recetas</h2>
                <button onClick={resetAll} className="text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded-lg">
                  Nueva búsqueda
                </button>
              </div>
              {recipes.map(recipe => (
                <RecipeResult key={recipe.id} recipe={recipe} />
              ))}
            </div>
          ) : editingIngredients ? (
            <div className="space-y-6">
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
                    placeholder="Añadir manual..."
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    onKeyDown={(e) => e.key === 'Enter' && (setDetectedIngredients([...detectedIngredients, newIngredient]), setNewIngredient(''))}
                  />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h2 className="font-bold text-slate-800">Filtros</h2>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer">
                    <input type="checkbox" checked={preferences.vegetarian} onChange={(e) => setPreferences({ ...preferences, vegetarian: e.target.checked })} className="w-5 h-5 accent-emerald-600"/>
                    <span className="text-sm">Vegetariano</span>
                  </label>
                  <div className="p-3 border rounded-xl">
                    <span className="text-xs text-slate-500 block">Platos para: {preferences.servings}</span>
                    <input type="range" min="1" max="8" value={preferences.servings} onChange={(e) => setPreferences({ ...preferences, servings: parseInt(e.target.value) })} className="w-full accent-emerald-600 mt-1"/>
                  </div>
                </div>
              </div>

              <button onClick={handleGenerate} className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95">
                Generar Recetas
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-extrabold text-slate-800">Santisystems</h2>
                <p className="text-slate-500">¿Qué tienes hoy en la cocina?</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <ImagePicker images={images} setImages={setImages} />
                <button onClick={handleAnalyze} disabled={images.length === 0} className="w-full mt-6 bg-emerald-600 text-white p-4 rounded-2xl font-bold shadow-lg disabled:opacity-50 transition-all">
                  Detectar con IA
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 text-sm font-medium flex items-center gap-3">
              <p>{error}</p>
            </div>
          )}
        </div>
      ) : (
        <HistoryView history={history} onSelect={(item) => { setDetectedIngredients(item.ingredients); setRecipes(item.recipes); setActiveTab('main'); }} onClear={() => {setHistory([]); localStorage.removeItem('santisystems_history');}} onDeleteItem={(id) => {const u = history.filter(i => i.id !== id); setHistory(u); localStorage.setItem('santisystems_history', JSON.stringify(u));}} />
      )}
    </Layout>
  );
};

export default App;
