import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
const appVersion = pkg.version || '0.0.0';

function versionPlugin() {
  let buildOutDir = 'dist';
  return {
    name: 'version-json',
    apply: 'build',
    configResolved(config) {
      buildOutDir = join(config.root, config.build.outDir);
    },
    writeBundle(outputOptions) {
      const outDir = outputOptions.dir || buildOutDir;
      writeFileSync(
        join(outDir, 'version.json'),
        JSON.stringify({ version: appVersion }) + '\n',
        'utf8'
      );
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const apiProxyTarget = env.VITE_API_PROXY || process.env.VITE_API_PROXY || 'http://localhost:3001';

  return {
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion)
    },
    plugins: [
      react(),
      versionPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        // Keep public/manifest.json as the source of truth
        manifest: false,
        includeAssets: ['vettr-logo.png', 'icons/icon-192.png', 'icons/icon-512.png'],
        workbox: {
          navigateFallback: '/index.html',
          // Never let the service worker touch API traffic. The market feed uses
          // conditional (ETag / If-None-Match) requests; if the SW serves a cached
          // or 304 response the app treats it as "not modified" and the deal list
          // stays empty in the installed PWA. API GETs must always hit the network.
          navigateFallbackDenylist: [/^\/api/],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}']
        }
      })
    ],
    server: {
      // Listen on all local interfaces so http://127.0.0.1:5173 and http://localhost:5173 both work
      // (Node/Vite sometimes bound ::1-only on macOS, which breaks 127.0.0.1 bookmarks and some tools.)
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: true
    }
  };
});
