import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // 確保靜態資源在 GitHub Pages 或是子路徑下能正確載入
  plugins: [vue()],
})
