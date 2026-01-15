
import React from 'react';
import { Recipe } from '../types';

interface RecipeResultProps {
  recipe: Recipe;
}

const RecipeResult: React.FC<RecipeResultProps> = ({ recipe }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 mb-4">
      <div className="flex justify-between items-start">
        <h3 className="text-xl font-bold text-slate-800 leading-tight">{recipe.name}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${recipe.difficulty === 'fácil' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
          {recipe.difficulty}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-600">
        <div className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {recipe.time}
        </div>
        <div className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          {recipe.servings} comensales
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-bold text-slate-700 text-sm">Ingredientes:</h4>
        <ul className="grid grid-cols-1 gap-1">
          {recipe.ingredients.map((ing, idx) => (
            <li key={idx} className="text-sm flex items-center gap-2">
              {ing.hasIt ? (
                <span className="text-emerald-500">✓</span>
              ) : (
                <span className="text-red-400">✗</span>
              )}
              <span className={ing.hasIt ? 'text-slate-700' : 'text-slate-400 italic'}>{ing.name}</span>
            </li>
          ))}
        </ul>
      </div>

      {recipe.missingIngredients.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
          <p className="text-xs text-amber-700 font-medium">Te falta: {recipe.missingIngredients.join(', ')}</p>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="font-bold text-slate-700 text-sm">Pasos:</h4>
        <ol className="space-y-2">
          {recipe.steps.map((step, idx) => (
            <li key={idx} className="text-sm text-slate-600 flex gap-2">
              <span className="font-bold text-emerald-600">{idx + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {recipe.tips && (
        <div className="bg-emerald-50 rounded-lg p-3 text-sm text-emerald-800 border border-emerald-100 italic">
          <strong>💡 Tip:</strong> {recipe.tips}
        </div>
      )}
    </div>
  );
};

export default RecipeResult;
