
# Santisystems - Recetas

Una aplicación inteligente impulsada por IA (Gemini) para detectar ingredientes mediante fotografías y generar recetas realistas y personalizadas.

## 🚀 Instrucciones de Ejecución

1.  **Instalar dependencias:**
    ```bash
    npm install
    ```

2.  **Configurar API Key:**
    - Crea un archivo `.env` basado en `.env.example`.
    - Añade tu clave de API de Gemini (consíguela en [Google AI Studio](https://aistudio.google.com/)).

3.  **Lanzar en desarrollo:**
    ```bash
    npm run dev
    ```

## 🏗️ Arquitectura y Flujo de Datos

1.  **Captura:** El usuario sube hasta 5 imágenes.
2.  **Análisis (/analyze):** Se envían las imágenes a Gemini (modelo `gemini-3-flash-preview`) para extraer una lista JSON de ingredientes.
3.  **Ajuste:** El usuario puede editar la lista y configurar filtros (tiempo, salud, alergias, etc.).
4.  **Generación (/recipes):** Se genera un JSON con 2-3 recetas estructuradas con pasos, tips e ingredientes faltantes.
5.  **Persistencia:** Las búsquedas se guardan en el `localStorage` del navegador para acceso rápido posterior.

## 📱 Ejemplo de Salidas JSON (Simuladas)

### /analyze
```json
{
  "ingredients": ["huevos", "chorizo", "cebolla", "patatas", "pimiento rojo"]
}
```

### /recipes
```json
[
  {
    "id": "receta_001",
    "name": "Tortilla de Patatas con Chorizo",
    "time": "30 min",
    "difficulty": "fácil",
    "servings": 2,
    "ingredients": [
      {"name": "4 huevos", "hasIt": true},
      {"name": "2 patatas grandes", "hasIt": true},
      {"name": "1/2 cebolla", "hasIt": true},
      {"name": "50g de chorizo", "hasIt": true},
      {"name": "Aceite de oliva", "hasIt": false}
    ],
    "missingIngredients": ["Aceite de oliva"],
    "steps": [
      "Pelar y picar las patatas y la cebolla.",
      "Freír en abundante aceite (o sustituir por un poco de mantequilla si no hay).",
      "Batir los huevos y mezclar con el chorizo picado...",
      "Cuajar la tortilla en la sartén."
    ],
    "tips": "Si no tienes aceite de oliva, puedes usar aceite de girasol o mantequilla para un sabor más suave."
  }
]
```

## 🌐 Despliegue

### Vercel (Recomendado)
1. Instala la CLI de Vercel o conecta tu repositorio de GitHub.
2. Añade la variable de entorno `API_KEY`.
3. El comando de build es `npm run build` y el directorio es `dist`.

### Cloudflare Pages
1. Sube el repositorio a GitHub.
2. En Cloudflare Dashboard, crea un nuevo proyecto de Pages.
3. Configura `API_KEY` en la sección de Variables de Entorno.
4. Selecciona el framework "Vite".
