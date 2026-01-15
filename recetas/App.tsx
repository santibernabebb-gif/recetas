
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

  // Load history from localStorage
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

  const removeHistoryItem = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('santisystems_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('santisystems_history');
  };

  const handleAnalyze = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setLoadingMsg('Analizando fotos para detectar ingredientes...');
    setError(null);
    try {
      const detected = await analyzeIngredients(images);
      setDetectedIngredients(detected);
      setEditingIngredients(true);
    } catch (err: any) {
      setError('Error al analizar imágenes. Por favor, intenta de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (detectedIngredients.length === 0) return;
    setLoading(true);
    setLoadingMsg('Creando recetas deliciosas para ti...');
    setError(null);
    try {
      const generated = await generateRecipes(detectedIngredients, preferences);
      setRecipes(generated);
      saveToHistory(detectedIngredients, generated);
      setEditingIngredients(false);
    } catch (err: any) {
      setError('Error al generar recetas. Intenta simplificar los filtros.');
      console.error(err);
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
        <div className="space-y-8 animate-in fade-in duration-500">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
              <p className="text-lg font-bold text-slate-700 animate-pulse text-center px-6">{loadingMsg}</p>
            </div>
          ) : recipes.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Recetas Sugeridas</h2>
                <button onClick={resetAll} className="text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                  Nueva búsqueda
                </button>
              </div>
              {recipes.map(recipe => (
                <RecipeResult key={recipe.id} recipe={recipe} />
              ))}
            </div>
          ) : editingIngredients ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Confirmar Ingredientes</h2>
                <button onClick={resetAll} className="text-red-500 font-bold text-xs bg-red-50 px-2 py-1 rounded-md hover:bg-red-100 transition-colors">
                  Cancelar / Nueva foto
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap gap-2">
                  {detectedIngredients.map((ing, idx) => (
                    <span key={idx} className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 border border-emerald-100">
                      {ing}
                      <button onClick={() => removeIngredient(idx)} className="hover:text-emerald-900 font-bold text-lg leading-none">×</button>
                    </span>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newIngredient} 
                    onChange={(e) => setNewIngredient(e.target.value)}
                    placeholder="Añadir manual..."
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                  />
                  <button onClick={addIngredient} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold">Añadir</button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <h2 className="text-lg font-bold text-slate-800">Preferencias</h2>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'quick', label: 'Rápidas' },
                    { id: 'healthy', label: 'Saludables' },
                    { id: 'noOven', label: 'Sin Horno' },
                    { id: 'vegetarian', label: 'Vegetariano' }
                  ].map(p => (
                    <label key={p.id} className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer select-none active:bg-slate-50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={(preferences as any)[p.id]} 
                        onChange={(e) => setPreferences({ ...preferences, [p.id]: e.target.checked })}
                        className="w-5 h-5 accent-emerald-600"
                      />
                      <span className="text-sm font-medium text-slate-700">{p.label}</span>
                    </label>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex justify-between">
                    Comensales: <span>{preferences.servings}</span>
                  </label>
                  <input 
                    type="range" min="1" max="6" value={preferences.servings} 
                    onChange={(e) => setPreferences({ ...preferences, servings: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Alergias o exclusiones:</label>
                  <input 
                    type="text" 
                    value={preferences.allergies} 
                    onChange={(e) => setPreferences({ ...preferences, allergies: e.target.value })}
                    placeholder="Ej: sin gluten, sin lactosa..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={detectedIngredients.length === 0}
                className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Generar Recetas
              </button>
            </div>
          ) : (
            <div className="space-y-10">
              <div className="text-center space-y-4">
                <div className="inline-block p-4 bg-emerald-100 rounded-3xl text-emerald-600 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-extrabold text-slate-800">¿Qué hay en tu nevera?</h2>
                <p className="text-slate-500 px-6">Haz fotos de tus ingredientes y te diremos qué cocinar hoy.</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <ImagePicker images={images} setImages={setImages} />
                
                <button 
                  onClick={handleAnalyze}
                  disabled={images.length === 0}
                  className="w-full mt-6 bg-emerald-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
                >
                  Detectar Ingredientes
                </button>
              </div>

              <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                <h3 className="font-bold text-emerald-800 text-sm mb-2 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Cómo funciona:
                </h3>
                <ol className="text-xs text-emerald-700 space-y-2 list-decimal list-inside">
                  <li>Haz una foto clara de tu nevera abierta o ingredientes en la mesa.</li>
                  <li>Revisaremos qué tienes usando Inteligencia Artificial.</li>
                  <li>Ajusta los ingredientes si nos hemos equivocado en algo.</li>
                  <li>¡Disfruta de recetas personalizadas en segundos!</li>
                </ol>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 text-sm font-medium flex gap-3 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}
        </div>
      ) : (
        <HistoryView 
          history={history} 
          onSelect={loadFromHistory} 
          onClear={clearHistory} 
          onDeleteItem={removeHistoryItem} 
        />
      )}
    </Layout>
  );
};

export default App;
