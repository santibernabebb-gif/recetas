
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Preferences } from "../types";

/**
 * Limpia bloques de código Markdown si el modelo los incluye por error.
 */
function cleanJson(text: string): string {
  if (!text) return "";
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

/**
 * Procesa un string Base64 para extraer el MIME type y los datos puros.
 */
function processImageData(base64: string) {
  // Manejo robusto de esquemas data:image/xxx;base64,
  const parts = base64.split(",");
  const data = parts.length > 1 ? parts[1] : parts[0];
  const mimeMatch = base64.match(/data:([^;]+);/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
  return { mimeType, data };
}

export async function analyzeIngredients(base64Images: string[]): Promise<string[]> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("CRÍTICO: API_KEY no configurada en el entorno.");
    throw new Error("API_KEY no encontrada");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-flash-preview';
  
  const imageParts = base64Images.map(base64 => {
    const { mimeType, data } = processImageData(base64);
    return {
      inlineData: { data, mimeType },
    };
  });

  const prompt = `Analiza estas fotos de ingredientes. Identifica todos los alimentos visibles (frutas, verduras, carnes, lácteos, sobras, etc.). 
  Devuelve una lista simple en español. 
  Responde estrictamente en formato JSON con la estructura: {"ingredients": ["nombre1", "nombre2"]}.`;

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

    const rawText = response.text;
    console.log("Gemini Response (Analysis):", rawText);
    const cleanedText = cleanJson(rawText || '{"ingredients":[]}');
    const data = JSON.parse(cleanedText);
    return data.ingredients || [];
  } catch (error: any) {
    console.error("Error en analyzeIngredients:", error);
    // Si es un error de cuota o clave, lo registramos específicamente
    if (error.message?.includes("API key not valid")) {
      console.error("La API KEY proporcionada no es válida.");
    }
    throw error;
  }
}

export async function generateRecipes(ingredients: string[], prefs: Preferences): Promise<Recipe[]> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY no encontrada");

  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-pro-preview';
  
  const prompt = `Como chef profesional, crea 2 o 3 recetas usando estos ingredientes: ${ingredients.join(', ')}.
  
  REGLAS:
  - Prioriza los ingredientes de la lista.
  - Puedes asumir básicos: sal, aceite, agua, pimienta.
  - Personas: ${prefs.servings}.
  - Preferencias: ${prefs.vegetarian ? 'Vegetariano' : 'Cualquiera'}.
  - Alergias/Exclusiones: ${prefs.allergies || 'Ninguna'}.
  
  Responde solo con el JSON de las recetas.`;

  try {
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

    const rawText = response.text;
    console.log("Gemini Response (Recipes):", rawText);
    const cleanedText = cleanJson(rawText || '[]');
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Error en generateRecipes:", error);
    throw error;
  }
}
