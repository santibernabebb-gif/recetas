
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Preferences } from "../types";

// Helper to extract clean base64 data and mimeType from data URL
function processImageData(base64: string) {
  const parts = base64.split(",");
  const data = parts.length > 1 ? parts[1] : parts[0];
  const mimeMatch = base64.match(/data:([^;]+);/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
  return { mimeType, data };
}

// Follow guidelines: initialize with named parameter directly from process.env.API_KEY
function getAiClient() {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export async function analyzeIngredients(base64Images: string[]): Promise<string[]> {
  const ai = getAiClient();
  
  const imageParts = base64Images.map(base64 => {
    const { mimeType, data } = processImageData(base64);
    return { inlineData: { data, mimeType } };
  });

  const prompt = "Analiza estas imágenes de cocina e identifica ingredientes. Responde exclusivamente JSON: {\"ingredients\": [\"nombre\", ...]}";

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

  // Correct: access .text property directly (not as a function) and trim it
  const text = response.text?.trim() || "{}";
  const data = JSON.parse(text);
  return data.ingredients || [];
}

export async function generateRecipes(ingredients: string[], prefs: Preferences): Promise<Recipe[]> {
  const ai = getAiClient();
  
  const prompt = `Como chef profesional, crea 3 recetas usando estos ingredientes: ${ingredients.join(', ')}. 
  Comensales: ${prefs.servings}. Dieta: ${prefs.vegetarian ? 'Vegetariana' : 'Libre'}. Alergias: ${prefs.allergies || 'Ninguna'}.`;

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

  // Correct: access .text property directly and trim it
  const text = response.text?.trim() || "[]";
  return JSON.parse(text);
}
