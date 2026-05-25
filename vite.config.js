import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/waste-pass/', // 為了搭配乾淨網址 (History 模式)，必須明確指定 GitHub 的專案名稱
  plugins: [vue()],
})
