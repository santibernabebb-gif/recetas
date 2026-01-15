
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Preferences } from "../types";

/**
 * Intenta obtener la API KEY del entorno de la manera más compatible posible.
 */
function getApiKey(): string {
  // En entornos modernos de despliegue, process.env.API_KEY suele estar disponible
  // o ser reemplazado durante el proceso de build.
  try {
    const key = process.env.API_KEY;
    if (key && key.length > 5) return key;
  } catch (e) {}

  // Intento alternativo en window
  try {
    const winKey = (window as any).process?.env?.API_KEY;
    if (winKey && winKey.length > 5) return winKey;
  } catch (e) {}

  return "";
}

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
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.error("DEBUG: La API_KEY no se encontró en process.env");
    throw new Error("API_KEY_MISSING");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-flash-preview';
  
  const imageParts = base64Images.map(base64 => {
    const { mimeType, data } = processImageData(base64);
    return { inlineData: { data, mimeType } };
  });

  const prompt = `Analiza estas fotos de comida. Lista los ingredientes visibles de forma genérica (ej: "tomate", "pollo"). Responde SOLO un JSON: {"ingredients": ["nombre1", "nombre2"]}`;

  try {
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

    const data = JSON.parse(cleanJson(response.text));
    return data.ingredients || [];
  } catch (error: any) {
    console.error("Error en analyzeIngredients:", error);
    throw new Error("Error al analizar la imagen. Verifica tu conexión y configuración.");
  }
}

export async function generateRecipes(ingredients: string[], prefs: Preferences): Promise<Recipe[]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-flash-preview';
  
  const prompt = `Como chef, sugiere 2 recetas con estos ingredientes: ${ingredients.join(', ')}. 
  Comensales: ${prefs.servings}. Vegetariano: ${prefs.vegetarian}. Alergias: ${prefs.allergies}.
  Responde SOLO el JSON de las recetas siguiendo el esquema definido.`;

  try {
    const response = await ai.models.generateContent({
      model,
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

    return JSON.parse(cleanJson(response.text));
  } catch (error) {
    console.error("Error en generateRecipes:", error);
    throw new Error("Error al generar recetas.");
  }
}
