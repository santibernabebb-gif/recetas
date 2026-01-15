
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Preferences } from "../types";

function cleanJson(text: string): string {
  if (!text) return "";
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

function processImageData(base64: string) {
  const parts = base64.split(",");
  const data = parts.length > 1 ? parts[1] : parts[0];
  const mimeMatch = base64.match(/data:([^;]+);/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
  return { mimeType, data };
}

export async function analyzeIngredients(base64Images: string[]): Promise<string[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const imageParts = base64Images.map(base64 => {
    const { mimeType, data } = processImageData(base64);
    return { inlineData: { data, mimeType } };
  });

  const prompt = `Analiza estas fotos de comida. Lista los ingredientes visibles de forma genérica. Responde exclusivamente con un objeto JSON: {"ingredients": ["nombre1", "nombre2"]}`;

  const response = await ai.models.generateContent({
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
  });

  const text = response.text || "{}";
  const data = JSON.parse(cleanJson(text));
  return data.ingredients || [];
}

export async function generateRecipes(ingredients: string[], prefs: Preferences): Promise<Recipe[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Actúa como chef experto. Sugiere 2 o 3 recetas usando estos ingredientes: ${ingredients.join(', ')}. 
  Comensales: ${prefs.servings}. Dieta: ${prefs.vegetarian ? 'Vegetariana' : 'Cualquiera'}. Alergias: ${prefs.allergies}.
  Responde estrictamente con un array JSON de recetas siguiendo el formato solicitado.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
  });

  const text = response.text || "[]";
  return JSON.parse(cleanJson(text));
}
