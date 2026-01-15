
export interface Ingredient {
  id: string;
  name: string;
}

export interface Recipe {
  id: string;
  name: string;
  time: string;
  difficulty: 'fácil' | 'media';
  ingredients: { name: string; hasIt: boolean }[];
  missingIngredients: string[];
  steps: string[];
  tips?: string;
  servings: number;
}

export interface Preferences {
  quick: boolean;
  healthy: boolean;
  noOven: boolean;
  vegetarian: boolean;
  servings: number;
  allergies: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  ingredients: string[];
  recipes: Recipe[];
}
