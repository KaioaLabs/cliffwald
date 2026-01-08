import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  base: './',
  root: './src/client',
  publicDir: '../../assets', // Serve assets from root assets folder
  build: {
    outDir: path.resolve(process.cwd(), 'dist-client'),
    emptyOutDir: true
  },
  server: {
    port: 3000,
    proxy: {
        '/api': 'http://localhost:2568',
        '/colyseus': {
            target: 'ws://localhost:2568',
            ws: true
        }
    }
  },
  esbuild: {
    target: 'es2020',
    // This is crucial for Colyseus schema decorators to work in Vite
    keepNames: true,
    tsconfigRaw: {
        compilerOptions: {
            experimentalDecorators: true,
            useDefineForClassFields: false
        }
    }
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared')
    }
  }
});