
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Preferences } from "../types";

function cleanJson(text: string): string {
  if (!text) return "";
  // Elimina bloques de código markdown si los hay
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
  // Inicialización directa tal cual se requiere en el entorno
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const imageParts = base64Images.map(base64 => {
    const { mimeType, data } = processImageData(base64);
    return { inlineData: { data, mimeType } };
  });

  const prompt = "Analiza estas imágenes de cocina. Identifica todos los ingredientes individuales que veas. Responde exclusivamente en formato JSON con la estructura: {\"ingredients\": [\"nombre\", ...]}";

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
  
  const prompt = `Como chef profesional de Santisystems, crea 3 recetas creativas usando estos ingredientes: ${ingredients.join(', ')}. 
  Para ${prefs.servings} personas. Dieta: ${prefs.vegetarian ? 'Vegetariana' : 'Libre'}. Alergias: ${prefs.allergies || 'Ninguna'}.
  Asegúrate de que los pasos sean claros y añade un tip de cocina útil.`;

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
