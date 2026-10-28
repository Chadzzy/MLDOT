import { flightDevServer } from "./scripts/flight-dev-server.mjs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react(), flightDevServer()],
  build: { assetsInlineLimit: 10000000 },
});
