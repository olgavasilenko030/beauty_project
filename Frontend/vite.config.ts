import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  // ИСПРАВЛЕНО: Указали базовый путь к твоему репозиторию на GitHub с маленькой буквы, как в ссылке!
  base: "/beauty_project/",
  plugins: [react()],
});
