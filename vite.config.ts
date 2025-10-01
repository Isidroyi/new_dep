import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Allow Serveo subdomains (e.g., *.serveo.net) for reverse tunneling
    const serveoHost = env.SERVEO_HOST || '';
    const allowedHosts = [
      'localhost',
      '127.0.0.1',
      '::1',
      'serveo.net',
      '.serveo.net',
    ];
    if (serveoHost) allowedHosts.push(serveoHost);
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts,
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.AITUNNEL_API_KEY),
        'process.env.AITUNNEL_API_KEY': JSON.stringify(env.AITUNNEL_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
