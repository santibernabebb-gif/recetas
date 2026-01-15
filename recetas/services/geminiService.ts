
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe, Preferences } from "../types";

/**
 * Utility to clean potential Markdown blocks from the model's response.
 */
function cleanJson(text: string): string {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

/**
 * Extracts the MIME type and data from a base64 string.
 */
function parseBase64(base64: string) {
  const match = base64.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!match) return { mimeType: 'image/jpeg', data: base64 };
  return { mimeType: match[1], data: match[2] };
}

export async function analyzeIngredients(base64Images: string[]): Promise<string[]> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY no encontrada");
  
  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-flash-preview';
  
  const imageParts = base64Images.map(base64 => {
    const { mimeType, data } = parseBase64(base64);
    return {
      inlineData: { data, mimeType },
    };
  });

  const prompt = `Analiza estas fotos. Identifica todos los ingredientes de cocina visibles (frutas, verduras, carnes, lácteos, etc.). 
  Devuelve una lista limpia en español. 
  Responde ÚNICAMENTE con el JSON solicitado.`;

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

    const cleanedText = cleanJson(response.text || '{"ingredients":[]}');
    const data = JSON.parse(cleanedText);
    return data.ingredients || [];
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}

export async function generateRecipes(ingredients: string[], prefs: Preferences): Promise<Recipe[]> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY no encontrada");

  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-pro-preview';
  
  const prompt = `Chef experto. Tengo estos ingredientes: ${ingredients.join(', ')}.
  
  Genera 2 o 3 recetas REALISTAS.
  - Usa los ingredientes detectados.
  - Puedes añadir básicos: sal, aceite, agua, pimienta, harina, azúcar.
  - Ajustes: ${prefs.servings} personas, ${prefs.vegetarian ? 'Vegetariano' : 'Cualquier dieta'}.
  - Excluir: ${prefs.allergies || 'ninguno'}.
  
  Responde solo con el JSON.`;

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

    const cleanedText = cleanJson(response.text || '[]');
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
}
