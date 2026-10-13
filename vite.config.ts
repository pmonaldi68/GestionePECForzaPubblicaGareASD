import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'sheet-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.startsWith('/api/fetch-sheet')) {
              try {
                const urlParams = new URL(req.url, 'http://localhost:3000');
                const targetUrl = urlParams.searchParams.get('url');
                if (!targetUrl) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing target url parameter' }));
                  return;
                }
                const fetchRes = await fetch(targetUrl, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  },
                });
                if (!fetchRes.ok) {
                  res.statusCode = fetchRes.status;
                  res.end(JSON.stringify({ error: `Fetch failed: ${fetchRes.statusText}` }));
                  return;
                }
                const text = await fetchRes.text();
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.end(text);
              } catch (err: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err?.message || 'Server error proxying sheet' }));
              }
              return;
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
