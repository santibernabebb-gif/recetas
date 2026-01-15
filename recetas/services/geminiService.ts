
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Preferences } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes images to detect food ingredients.
 */
export async function analyzeIngredients(base64Images: string[]): Promise<string[]> {
  const model = 'gemini-3-flash-preview';
  
  const imageParts = base64Images.map(base64 => ({
    inlineData: {
      data: base64.split(',')[1],
      mimeType: 'image/jpeg',
    },
  }));

  const prompt = `Analiza estas fotos de una nevera o despensa. Identifica todos los ingredientes de comida visibles de forma individual. 
  Devuelve una lista limpia de ingredientes en español. Ignora marcas, céntrate solo en el alimento.
  Sé preciso: si ves sobras en un tupper, intenta identificar qué son (ej: arroz cocido, pollo asado).`;

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [...imageParts, { text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          ingredients: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["ingredients"]
      }
    }
  });

  const data = JSON.parse(response.text);
  return data.ingredients || [];
}

/**
 * Generates 2-3 recipes based on ingredients and preferences.
 * Uses Gemini 3 Pro for advanced reasoning and coherence.
 */
export async function generateRecipes(ingredients: string[], prefs: Preferences): Promise<Recipe[]> {
  const model = 'gemini-3-pro-preview';
  
  const prompt = `Eres un chef experto en "cocina de aprovechamiento" y gastronomía mediterránea. 
  Tu misión es crear recetas COHERENTES y REALISTAS utilizando EXCLUSIVAMENTE o PRIORITARIAMENTE estos ingredientes: ${ingredients.join(', ')}.

  REGLAS CRÍTICAS DE COHERENCIA:
  1. Si los ingredientes son limitados (ej: solo huevos y pan), sugiere platos lógicos (ej: tostadas francesas, huevos pasados por agua).
  2. No sugieras recetas que requieran ingredientes principales que NO están en la lista.
  3. Puedes asumir básicos de despensa: sal, pimienta, aceite, agua.
  4. Ajusta las recetas a estas preferencias: 
     - Comensales: ${prefs.servings}
     - Alergias: ${prefs.allergies || 'Ninguna'}
     - Rápida (<=20min): ${prefs.quick ? 'Sí' : 'No'}
     - Saludable: ${prefs.healthy ? 'Sí' : 'No'}
     - Sin horno: ${prefs.noOven ? 'Sí' : 'No'}
     - Vegetariano: ${prefs.vegetarian ? 'Sí' : 'No'}

  Devuelve entre 2 y 3 opciones en formato JSON.`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 4000 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            time: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: ["fácil", "media"] },
            servings: { type: Type.NUMBER },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  hasIt: { type: Type.BOOLEAN }
                },
                required: ["name", "hasIt"]
              }
            },
            missingIngredients: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            steps: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            tips: { type: Type.STRING }
          },
          required: ["id", "name", "time", "difficulty", "servings", "ingredients", "missingIngredients", "steps"]
        }
      }
    }
  });

  return JSON.parse(response.text);
}
