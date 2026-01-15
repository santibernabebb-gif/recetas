
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Preferences } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analiza las imágenes para detectar ingredientes de forma precisa.
 */
export async function analyzeIngredients(base64Images: string[]): Promise<string[]> {
  const model = 'gemini-3-flash-preview';
  
  const imageParts = base64Images.map(base64 => ({
    inlineData: {
      data: base64.split(',')[1],
      mimeType: 'image/jpeg',
    },
  }));

  const prompt = `Analiza detalladamente estas fotos de una nevera, despensa o encimera. 
  Identifica todos los ingredientes visibles (frutas, verduras, carnes, lácteos, sobras, etc.).
  Devuelve solo una lista de nombres de alimentos en español. 
  Sé muy específico: si ves algo cocinado, identifica qué plato parece ser.`;

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
 * Genera recetas estrictamente coherentes con los ingredientes detectados.
 */
export async function generateRecipes(ingredients: string[], prefs: Preferences): Promise<Recipe[]> {
  const model = 'gemini-3-pro-preview';
  
  const prompt = `Eres un chef experto en "cocina de realidad". Tengo estos ingredientes EXACTOS detectados en mis fotos: ${ingredients.join(', ')}.

  INSTRUCCIÓN DE COHERENCIA OBLIGATORIA:
  1. Crea recetas que utilicen como base PRINCIPAL los ingredientes mencionados.
  2. No inventes ingredientes complejos que no están en la lista (ej: no pidas aguacate si no se ve en las fotos).
  3. Puedes usar básicos: sal, aceite, azúcar, harina, agua, especias comunes.
  4. Si los ingredientes son muy pocos, sugiere preparaciones simples pero creativas.
  5. Ajusta a estas preferencias:
     - Comensales: ${prefs.servings}
     - Alergias: ${prefs.allergies || 'Ninguna'}
     - Rápida (<=20min): ${prefs.quick ? 'Sí' : 'No'}
     - Saludable: ${prefs.healthy ? 'Sí' : 'No'}
     - Sin horno: ${prefs.noOven ? 'Sí' : 'No'}
     - Vegetariano: ${prefs.vegetarian ? 'Sí' : 'No'}

  Responde solo con el JSON de las recetas.`;

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
