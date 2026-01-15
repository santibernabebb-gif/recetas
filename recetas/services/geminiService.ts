
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Preferences } from "../types";

/**
 * Analiza las imágenes para detectar ingredientes de forma precisa.
 */
export async function analyzeIngredients(base64Images: string[]): Promise<string[]> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY no configurada");
  
  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-flash-preview';
  
  const imageParts = base64Images.map(base64 => ({
    inlineData: {
      data: base64.split(',')[1],
      mimeType: 'image/jpeg',
    },
  }));

  const prompt = `Analiza estas fotos de ingredientes. 
  Identifica los alimentos de forma individual. 
  Devuelve una lista limpia en español. 
  Sé preciso con lo que ves (ej: si ves medio limón, pon 'limón').`;

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

  const data = JSON.parse(response.text || '{"ingredients":[]}');
  return data.ingredients || [];
}

/**
 * Genera recetas estrictamente coherentes con los ingredientes detectados.
 */
export async function generateRecipes(ingredients: string[], prefs: Preferences): Promise<Recipe[]> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY no configurada");

  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-pro-preview';
  
  const prompt = `Actúa como un chef creativo. Tengo estos ingredientes: ${ingredients.join(', ')}.
  
  REGLAS DE ORO:
  1. Las recetas DEBEN basarse en estos ingredientes. No pidas ingredientes extra que no sean básicos (sal, aceite, agua).
  2. Sé coherente: si solo tengo pan y tomate, sugiere pan con tomate o similares, no una lasaña.
  3. Adapta a: ${prefs.servings} comensales, ${prefs.vegetarian ? 'dieta vegetariana' : 'cualquier dieta'}.
  4. Considera estas exclusiones: ${prefs.allergies || 'ninguna'}.
  5. Dificultad: fácil/media.
  
  Devuelve un array JSON de 2-3 objetos de receta.`;

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

  return JSON.parse(response.text || '[]');
}
