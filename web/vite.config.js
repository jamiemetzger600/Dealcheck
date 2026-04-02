import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
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
    plugins: [react(), versionPlugin()],
    server: {
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
