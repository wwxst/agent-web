import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const demoRoot = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig({
  // Electron file:// needs relative JS/CSS chunks in the built renderer.
  base: "./",
  root: demoRoot,
  server: { host: "127.0.0.1", port: 5173, strictPort: true, fs: { allow: [packageRoot] } },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
  build: { outDir: fileURLToPath(new URL("../demo-dist", import.meta.url)), emptyOutDir: true },
});
