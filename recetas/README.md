
# Santisystems - Recetas

## 🚀 Despliegue en Cloudflare Pages

Para que la aplicación funcione en Cloudflare Pages, sigue estos pasos:

1.  **Framework Preset**: Selecciona `Vite`.
2.  **Build Command**: `npm ci && npm run build`
3.  **Build Output Directory**: `dist`
4.  **Root Directory**: (Dejar vacío o poner `recetas` si es un subdirectorio).
5.  **Environment Variables**:
    - Ve a `Settings` > `Environment Variables`.
    - Añade una variable llamada **`VITE_API_KEY`** con tu valor de Google AI Studio.
    - Asegúrate de añadirla tanto en **Production** como en **Preview**.

> **Importante**: Tras añadir la variable de entorno, debes realizar un nuevo despliegue (Redeploy) para que Vite inyecte la clave en el código.
