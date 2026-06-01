import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// Anchor + web3.js expect Node globals (Buffer/process) in the browser.
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({ globals: { Buffer: true, global: true, process: true } }),
  ],
  server: { port: 5173 },
});
