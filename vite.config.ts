import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

declare const process: {
  env: Record<string, string | undefined>;
};

const defaultPagesBase = "/writing-register-diagnostic-tool/";

export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/" : (process.env.VITE_BASE_PATH ?? defaultPagesBase),
  plugins: [react()],
}));
