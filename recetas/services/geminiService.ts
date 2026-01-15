
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Recipe, Preferences } from "../types";

// Helper to extract clean base64 data and mimeType from data URL
function processImageData(base64: string) {
  const parts = base64.split(",");
  const data = parts.length > 1 ? parts[1] : parts[0];
  const mimeMatch = base64.match(/data:([^;]+);/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
  return { mimeType, data };
}

// Named parameter initialization directly from environment
function getAiClient() {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Falta VITE_API_KEY en el entorno. Verifica la configuración en Cloudflare.");
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Utility to retry API calls on 503 Overloaded errors
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isOverloaded = error?.message?.includes('503') || error?.status === 503;
    if (isOverloaded && retries > 0) {
      console.warn(`Modelo sobrecargado. Reintentando en ${delay}ms... (${retries} intentos restantes)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function analyzeIngredients(base64Images: string[]): Promise<string[]> {
  const ai = getAiClient();
  
  const imageParts = base64Images.map(base64 => {
    const { mimeType, data } = processImageData(base64);
    return { inlineData: { data, mimeType } };
  });

  const prompt = "Analiza estas imágenes de cocina e identifica ingredientes. Responde exclusivamente JSON: {\"ingredients\": [\"nombre\", ...]}";

  // Fixed: Explicitly typed response as GenerateContentResponse to fix property access on 'unknown'
  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
  }));

  const text = response.text?.trim() || "{}";
  const data = JSON.parse(text);
  return data.ingredients || [];
}

export async function generateRecipes(ingredients: string[], prefs: Preferences): Promise<Recipe[]> {
  const ai = getAiClient();
  
  const prompt = `Como chef profesional de Santisystems, crea 3 recetas creativas usando estos ingredientes: ${ingredients.join(', ')}. 
  Comensales: ${prefs.servings}. Dieta: ${prefs.vegetarian ? 'Vegetariana' : 'Libre'}. Alergias: ${prefs.allergies || 'Ninguna'}.
  Asegúrate de que los pasos sean detallados y añade un tip de cocina único.`;

  // Fixed: Explicitly typed response as GenerateContentResponse to fix property access on 'unknown'
  const response: GenerateContentResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
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
  }));

  const text = response.text?.trim() || "[]";
  return JSON.parse(text);
}
