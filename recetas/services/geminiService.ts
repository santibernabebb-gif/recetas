
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Preferences } from "../types";

/**
 * Obtiene la API KEY de forma segura comprobando diferentes posibles ubicaciones.
 */
function getApiKey(): string {
  // 1. Intentar desde process.env (inyectado por build tools)
  if (typeof process !== 'undefined' && process.env?.API_KEY) {
    return process.env.API_KEY;
  }
  // 2. Intentar desde window.process (algunos entornos de desarrollo)
  if (typeof window !== 'undefined' && (window as any).process?.env?.API_KEY) {
    return (window as any).process.env.API_KEY;
  }
  return "";
}

function cleanJson(text: string): string {
  if (!text) return "";
  // Elimina bloques de código markdown y espacios extra
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
    throw new Error("Configuración incompleta: No se detecta la API_KEY en el entorno de ejecución.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-flash-preview';
  
  const imageParts = base64Images.map(base64 => {
    const { mimeType, data } = processImageData(base64);
    return {
      inlineData: { data, mimeType },
    };
  });

  const prompt = `Analiza estas fotos. Lista los ingredientes comestibles que veas. 
  Responde exclusivamente con un JSON: {"ingredients": ["ingrediente1", "ingrediente2"]}`;

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
    throw new Error("No se pudo analizar la imagen. Verifica tu conexión y la validez de la clave API.");
  }
}

export async function generateRecipes(ingredients: string[], prefs: Preferences): Promise<Recipe[]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY no detectada.");

  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-flash-preview'; // Usamos Flash también aquí para mayor velocidad
  
  const prompt = `Actúa como chef. Crea 2 o 3 recetas con: ${ingredients.join(', ')}.
  Servicios: ${prefs.servings}. Vegetariano: ${prefs.vegetarian}.
  Responde solo el JSON.`;

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
    throw new Error("Error al crear las recetas.");
  }
}
