import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the build works on GitHub Pages (served from
// https://<user>.github.io/<repo>/) as well as on any custom domain root.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
