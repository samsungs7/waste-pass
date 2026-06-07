<template>
  <div id="app-root">
    <nav class="app-nav">
      <div class="nav-inner">
        <router-link to="/" class="nav-logo">
          <el-icon size="22"><Cpu /></el-icon>
          <span>廢棄物處理題庫</span>
        </router-link>
        <div class="nav-links">
          <router-link to="/" class="nav-link">
            <el-icon><House /></el-icon> 首頁
          </router-link>
          <router-link to="/mistakes" class="nav-link">
            <el-icon><Collection /></el-icon> 錯題本
          </router-link>
          <router-link to="/settings" class="nav-link">
            <el-icon><Setting /></el-icon> 設定
          </router-link>
          <!-- 主題切換按鈕 -->
          <button class="theme-toggle" @click="toggleTheme" :title="isDark ? '切換為淺色主題' : '切換為深色主題'">
            <el-icon size="18"><component :is="isDark ? Sunny : Moon" /></el-icon>
          </button>
        </div>
      </div>
    </nav>

    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="app-footer">
      <p>乙級廢棄物處理專業技術人員 ‧ 考照練習系統</p>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useConfigStore } from './stores/configStore'
import { Cpu, House, Collection, Setting, Sunny, Moon } from '@element-plus/icons-vue'

const config = useConfigStore()
const isDark = computed(() => config.theme === 'dark')

function toggleTheme() {
  config.setTheme(isDark.value ? 'light' : 'dark')
}

// 頁面載入時套用已儲存的主題
onMounted(() => {
  config.applyTheme()
})
</script>

<style scoped>
.app-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--nav-bg);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--color-border);
  transition: background 0.3s;
}
.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-primary-light);
  transition: opacity 0.2s;
  white-space: nowrap;
}
.nav-logo:hover { opacity: 0.8; }
.nav-links { display: flex; gap: 4px; align-items: center; }
.nav-link {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--color-text-muted);
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
}
.nav-link:hover,
.nav-link.router-link-active {
  background: rgba(79, 142, 247, 0.1);
  color: var(--color-primary-light);
}

/* 主題切換按鈕 */
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  margin-left: 4px;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
  flex-shrink: 0;
}
.theme-toggle:hover {
  background: var(--color-surface-2);
  color: var(--color-primary-light);
  border-color: var(--color-primary);
}

@media (max-width: 480px) {
  .nav-inner {
    padding: 0 12px;
  }

  .nav-logo {
    gap: 6px;
    font-size: 0.9rem;
  }

  .nav-links {
    gap: 2px;
  }

  .nav-link {
    gap: 3px;
    padding: 6px 7px;
    font-size: 0.8rem;
  }

  .theme-toggle {
    width: 32px;
    height: 32px;
    margin-left: 2px;
  }
}

.app-main { flex: 1; }
.app-footer {
  text-align: center;
  padding: 20px;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  border-top: 1px solid var(--color-border);
}

/* Page transitions */
.page-fade-enter-active,
.page-fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.page-fade-enter-from { opacity: 0; transform: translateY(8px); }
.page-fade-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
