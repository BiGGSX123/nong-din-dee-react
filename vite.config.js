import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // LIFF's Endpoint URL must be HTTPS even for local dev — basicSsl() serves
  // a self-signed cert on localhost so LINE's OAuth redirect actually lands
  // on a page the browser can load (accept the cert warning once)
  plugins: [react(), basicSsl()],
  server: {
    proxy: {
      // keeps the frontend and API calls same-origin under https://localhost —
      // avoids the browser blocking http://localhost:8787 fetches as mixed content
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
})
