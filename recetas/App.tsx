
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
    quick: false,
    healthy: false,
    noOven: false,
    vegetarian: false,
    servings: 2,
    allergies: ''
  });
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('santisystems_history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

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
      setError(err.message || 'Error al conectar con Gemini. Revisa tu clave API.');
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
      setError('No se pudieron generar las recetas. Intenta simplificar los ingredientes.');
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

  const addIngredient = () => {
    if (newIngredient.trim()) {
      setDetectedIngredients([...detectedIngredients, newIngredient.trim()]);
      setNewIngredient('');
    }
  };

  const removeIngredient = (idx: number) => {
    setDetectedIngredients(prev => prev.filter((_, i) => i !== idx));
  };

  const loadFromHistory = (item: HistoryItem) => {
    setDetectedIngredients(item.ingredients);
    setRecipes(item.recipes);
    setActiveTab('main');
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Tus Recetas</h2>
                <button onClick={resetAll} className="text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded-lg">
                  Reiniciar
                </button>
              </div>
              {recipes.map(recipe => (
                <RecipeResult key={recipe.id} recipe={recipe} />
              ))}
            </div>
          ) : editingIngredients ? (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h2 className="font-bold text-slate-800">Ingredientes detectados</h2>
                <div className="flex flex-wrap gap-2">
                  {detectedIngredients.map((ing, idx) => (
                    <span key={idx} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                      {ing}
                      <button onClick={() => removeIngredient(idx)} className="hover:text-emerald-900 font-bold">×</button>
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
                    onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                  />
                  <button onClick={addIngredient} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold">OK</button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h2 className="font-bold text-slate-800">Preferencias</h2>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={preferences.vegetarian} onChange={(e) => setPreferences({ ...preferences, vegetarian: e.target.checked })} className="w-5 h-5 accent-emerald-600"/>
                    <span className="text-sm">Vegetariano</span>
                  </label>
                  <div className="flex flex-col gap-1 p-3 border rounded-xl">
                    <span className="text-xs text-slate-500">Comensales: {preferences.servings}</span>
                    <input type="range" min="1" max="8" value={preferences.servings} onChange={(e) => setPreferences({ ...preferences, servings: parseInt(e.target.value) })} className="w-full accent-emerald-600"/>
                  </div>
                </div>
                <input 
                  type="text" 
                  value={preferences.allergies} 
                  onChange={(e) => setPreferences({ ...preferences, allergies: e.target.value })}
                  placeholder="Alergias o exclusiones..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none"
                />
              </div>

              <button onClick={handleGenerate} className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all">
                ¡Cocinar ahora!
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-extrabold text-slate-800">¿Qué tienes hoy?</h2>
                <p className="text-slate-500">Sube fotos de tu nevera y deja que la IA decida.</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <ImagePicker images={images} setImages={setImages} />
                <button onClick={handleAnalyze} disabled={images.length === 0} className="w-full mt-6 bg-emerald-600 text-white p-4 rounded-2xl font-bold shadow-lg disabled:opacity-50 transition-all">
                  Analizar Nevera
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 text-sm font-medium flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p>{error}</p>
            </div>
          )}
        </div>
      ) : (
        <HistoryView history={history} onSelect={loadFromHistory} onClear={() => {setHistory([]); localStorage.removeItem('santisystems_history');}} onDeleteItem={(id) => {const u = history.filter(i => i.id !== id); setHistory(u); localStorage.setItem('santisystems_history', JSON.stringify(u));}} />
      )}
    </Layout>
  );
};

export default App;
