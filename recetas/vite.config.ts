import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // No uses process.env.* en cliente. En Vite se usa import.meta.env.VITE_*
  server: {
    port: 3000
  }
});
