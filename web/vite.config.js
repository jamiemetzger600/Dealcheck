import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
const appVersion = pkg.version || '0.0.0';

function versionPlugin() {
  return {
    name: 'version-json',
    apply: 'build',
    writeBundle(options) {
      const outDir = options.dir || join(process.cwd(), 'dist');
      writeFileSync(
        join(outDir, 'version.json'),
        JSON.stringify({ version: appVersion }) + '\n',
        'utf8'
      );
    }
  };
}

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion)
  },
  plugins: [react(), versionPlugin()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
