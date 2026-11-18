import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const site = (loadEnv(mode, '.', 'VITE_').VITE_SITE_URL || '').replace(/\/$/, '');
  return {
    plugins: [react(), {
      // Share previews (WhatsApp, Facebook, X) need absolute URLs, so the site address goes into the page at build time.
      name: 'tgn-site-url',
      transformIndexHtml: (html: string) => html.replaceAll('__SITE__', site),
    }],
    server: { port: 5174 },
    preview: { port: 5174 },
  };
});
