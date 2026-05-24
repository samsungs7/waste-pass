<template>
  <div class="page-container">
    <h1 class="page-title"><el-icon><Setting /></el-icon> 考試設定</h1>
    <p class="page-subtitle">所有設定即時生效並自動儲存於本機瀏覽器</p>

    <div class="settings-grid">

      <!-- 主題 -->
      <div class="settings-card">
        <div class="card-heading">
          <el-icon size="20"><Brush /></el-icon>
          <span>介面主題</span>
        </div>
        <p class="card-desc">選擇深色或淺色介面風格</p>
        <div class="theme-selector">
          <div
            class="theme-option"
            :class="{ active: config.theme === 'dark' }"
            @click="config.setTheme('dark')"
          >
            <div class="theme-preview dark-preview">
              <div class="preview-nav"></div>
              <div class="preview-content">
                <div class="preview-card"></div>
                <div class="preview-card"></div>
              </div>
            </div>
            <span>深色模式</span>
            <el-icon v-if="config.theme === 'dark'" class="check-icon"><CircleCheck /></el-icon>
          </div>
          <div
            class="theme-option"
            :class="{ active: config.theme === 'light' }"
            @click="config.setTheme('light')"
          >
            <div class="theme-preview light-preview">
              <div class="preview-nav"></div>
              <div class="preview-content">
                <div class="preview-card"></div>
                <div class="preview-card"></div>
              </div>
            </div>
            <span>淺色模式</span>
            <el-icon v-if="config.theme === 'light'" class="check-icon"><CircleCheck /></el-icon>
          </div>
        </div>
      </div>

      <!-- 考試題數 -->
      <div class="settings-card">
        <div class="card-heading">
          <el-icon size="20"><Document /></el-icon>
          <span>每次考試題數</span>
        </div>
        <p class="card-desc">每科測驗隨機抽出的題目數量（5–100）</p>
        <div class="setting-row">
          <el-slider
            v-model="questionCount"
            :min="5" :max="100" :step="5"
            show-input
            @change="config.setExamQuestionCount(questionCount)"
            style="flex: 1"
          />
        </div>
        <el-tag type="info" effect="plain" size="small" style="margin-top: 10px">
          目前設定：每次抽 {{ config.examQuestionCount }} 題，滿分 {{ config.examQuestionCount * 2 }} 分
        </el-tag>
      </div>

      <!-- 作答時限 -->
      <div class="settings-card time-limit-card">
        <div class="card-heading">
          <el-icon size="20"><Timer /></el-icon>
          <span>作答時限設定</span>
        </div>
        <p class="card-desc">自訂各冊作答時限或套用全域預設時間，時間到自動交卷</p>

        <div class="switch-row">
          <span class="switch-label">啟用倒數計時</span>
          <el-switch
            v-model="timeLimitEnabled"
            @change="config.setTimeLimitEnabled(timeLimitEnabled)"
            active-color="var(--color-primary)"
          />
        </div>

        <div v-if="timeLimitEnabled" class="time-inputs">
          <div class="setting-section-title">全域預設時限</div>
          <div class="setting-row">
            <el-slider
              v-model="defaultTimeLimitMinutes"
              :min="10" :max="180" :step="5"
              show-input
              @change="config.setDefaultTimeLimitMinutes(defaultTimeLimitMinutes)"
              style="flex: 1"
            />
          </div>
          <div class="setting-hint">
            預設時限：{{ config.defaultTimeLimitMinutes }} 分鐘（{{ formatSeconds(config.defaultTimeLimitMinutes * 60) }}）
          </div>

          <el-divider style="margin: 20px 0 16px" />

          <div class="volume-limits-header">
            <span class="section-sub-title">分冊自訂時限 (非必填)</span>
            <el-tag type="warning" size="small">有設定的冊別優先採用</el-tag>
          </div>

          <div class="volume-limits-list">
            <div
              v-for="vol in examStore.availableVolumes"
              :key="vol"
              class="vol-limit-item"
            >
              <div class="vol-info">
                <span class="vol-name">{{ vol }}</span>
                <span class="vol-desc">
                  {{ config.volumeTimeLimits[vol] ? `獨立時限：${config.volumeTimeLimits[vol]} 分鐘` : `套用預設：${config.defaultTimeLimitMinutes} 分鐘` }}
                </span>
              </div>
              <div class="vol-action">
                <el-switch
                  :model-value="!!config.volumeTimeLimits[vol]"
                  @change="(val) => onToggleVolumeCustom(vol, val)"
                  active-text="自訂"
                  inactive-text="預設"
                  inline-prompt
                  style="margin-right: 8px;"
                />
                <el-input-number
                  v-if="config.volumeTimeLimits[vol]"
                  :model-value="config.volumeTimeLimits[vol]"
                  @change="(val) => config.setVolumeTimeLimit(vol, val)"
                  :min="10" :max="180" :step="5"
                  size="small"
                  controls-position="right"
                  style="width: 100px;"
                />
              </div>
            </div>
          </div>
        </div>
        <el-tag v-else type="info" effect="plain" size="small" style="margin-top: 16px">
          目前設定：無時間限制
        </el-tag>
      </div>

      <!-- 當前設定摘要 -->
      <div class="settings-card summary-card">
        <div class="card-heading">
          <el-icon size="20"><InfoFilled /></el-icon>
          <span>當前設定摘要</span>
        </div>
        <div class="summary-list">
          <div class="summary-item">
            <span class="si-label">主題模式</span>
            <el-tag size="small" effect="dark">{{ config.theme === 'dark' ? '深色模式' : '淺色模式' }}</el-tag>
          </div>
          <div class="summary-item">
            <span class="si-label">每次題數</span>
            <el-tag size="small" type="primary" effect="dark">{{ config.examQuestionCount }} 題</el-tag>
          </div>
          <div class="summary-item">
            <span class="si-label">預設計時</span>
            <el-tag size="small" :type="config.timeLimitEnabled ? 'warning' : 'info'" effect="dark">
              {{ config.timeLimitEnabled ? config.defaultTimeLimitMinutes + ' 分鐘' : '無限制' }}
            </el-tag>
          </div>
          <div class="summary-item">
            <span class="si-label">獨立時限冊數</span>
            <el-tag size="small" type="success" effect="dark">
              {{ Object.keys(config.volumeTimeLimits).length }} 冊
            </el-tag>
          </div>
          <div class="summary-item">
            <span class="si-label">滿分設定</span>
            <el-tag size="small" type="success" effect="dark">{{ config.examQuestionCount * 2 }} 分</el-tag>
          </div>
        </div>

        <el-divider style="margin: 18px 0 14px" />
        <el-button type="danger" plain size="small" :icon="RefreshLeft" @click="resetConfig">
          還原預設設定
        </el-button>
      </div>

    </div>

    <div style="text-align:center; margin-top: 32px;">
      <el-button type="primary" size="large" @click="$router.push('/')">
        完成設定，回首頁
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useConfigStore } from '../stores/configStore'
import { useExamStore } from '../stores/examStore'
import { ElMessageBox } from 'element-plus'
import {
  Setting, Brush, Document, Timer, InfoFilled,
  CircleCheck, RefreshLeft,
} from '@element-plus/icons-vue'

const config = useConfigStore()
const examStore = useExamStore()

// 本地響應式值（與 store 同步）
const questionCount = ref(config.examQuestionCount)
const defaultTimeLimitMinutes = ref(config.defaultTimeLimitMinutes)
const timeLimitEnabled = ref(config.timeLimitEnabled)

// 若其他地方修改 config，同步更新本地值
watch(() => config.examQuestionCount, v => { questionCount.value = v })
watch(() => config.defaultTimeLimitMinutes, v => { defaultTimeLimitMinutes.value = v })
watch(() => config.timeLimitEnabled, v => { timeLimitEnabled.value = v })

function formatSeconds(totalSec) {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  return h > 0 ? `${h} 小時 ${m} 分` : `${m} 分`
}

function onToggleVolumeCustom(volume, customEnabled) {
  if (customEnabled) {
    // 啟用自訂，預設為當前 defaultTimeLimitMinutes
    config.setVolumeTimeLimit(volume, config.defaultTimeLimitMinutes)
  } else {
    // 停用自訂，回復套用預設值
    config.clearVolumeTimeLimit(volume)
  }
}

async function resetConfig() {
  try {
    await ElMessageBox.confirm('確定要還原所有設定為預設值嗎？包含各冊自訂時限。', '還原預設', {
      confirmButtonText: '確認還原', cancelButtonText: '取消', type: 'warning',
    })
    config.resetToDefault()
    questionCount.value = config.examQuestionCount
    defaultTimeLimitMinutes.value = config.defaultTimeLimitMinutes
    timeLimitEnabled.value = config.timeLimitEnabled
  } catch { /* cancelled */ }
}
</script>

<style scoped>
.page-title { display: flex; align-items: center; gap: 10px; font-size: 2rem; font-weight: 800; margin-bottom: 8px; }
.page-subtitle { color: var(--color-text-muted); font-size: 0.95rem; margin-bottom: 32px; }

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
  margin-bottom: 16px;
}

.settings-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 24px;
  transition: background 0.3s, border-color 0.3s;
}
/* 作答時限 Card 佔用兩欄，更寬敞 */
.time-limit-card {
  grid-column: span 2;
}
@media (max-width: 768px) {
  .time-limit-card {
    grid-column: span 1;
  }
}

.card-heading {
  display: flex; align-items: center; gap: 8px;
  font-size: 1.05rem; font-weight: 700;
  color: var(--color-text);
  margin-bottom: 6px;
}
.card-heading .el-icon { color: var(--color-primary-light); }
.card-desc { font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 18px; }

/* Theme selector */
.theme-selector { display: flex; gap: 12px; flex-wrap: wrap; }
.theme-option {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  cursor: pointer; border-radius: 12px; padding: 12px 16px;
  border: 2px solid var(--color-border);
  transition: border-color 0.2s, background 0.2s;
  position: relative; flex: 1; min-width: 120px;
  color: var(--color-text-muted); font-size: 0.88rem; font-weight: 500;
}
.theme-option.active { border-color: var(--color-primary); background: rgba(79,142,247,0.07); color: var(--color-primary-light); }
.theme-option:hover { border-color: var(--color-primary-light); }
.check-icon { color: var(--color-primary-light); position: absolute; top: 8px; right: 8px; }

/* Theme previews */
.theme-preview { width: 100%; height: 60px; border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
.dark-preview { background: #0f1117; }
.dark-preview .preview-nav { height: 14px; background: #1a1d27; border-bottom: 1px solid rgba(255,255,255,0.06); }
.dark-preview .preview-content { display: flex; gap: 4px; padding: 6px; }
.dark-preview .preview-card { flex: 1; height: 28px; background: #1a1d27; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06); }
.light-preview { background: #f0f4f8; }
.light-preview .preview-nav { height: 14px; background: #ffffff; border-bottom: 1px solid rgba(0,0,0,0.07); }
.light-preview .preview-content { display: flex; gap: 4px; padding: 6px; }
.light-preview .preview-card { flex: 1; height: 28px; background: #ffffff; border-radius: 4px; border: 1px solid rgba(0,0,0,0.07); }

/* Setting rows */
.setting-row { display: flex; align-items: center; gap: 16px; }
.setting-section-title { font-size: 0.9rem; font-weight: 600; margin-top: 16px; margin-bottom: 8px; color: var(--color-text); }
.setting-hint { font-size: 0.78rem; color: var(--color-text-muted); margin-top: 4px; }
.switch-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; }
.switch-label { font-size: 0.9rem; color: var(--color-text); font-weight: 500; }

/* Volume limit section */
.volume-limits-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
}
.section-sub-title { font-size: 0.9rem; font-weight: 600; color: var(--color-text); }
.volume-limits-list {
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--color-surface-2);
}
.vol-limit-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--color-border);
}
.vol-limit-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.vol-info { display: flex; flex-direction: column; gap: 2px; }
.vol-name { font-weight: 600; font-size: 0.88rem; color: var(--color-text); }
.vol-desc { font-size: 0.75rem; color: var(--color-text-muted); }
.vol-action { display: flex; align-items: center; gap: 6px; }

/* Summary */
.summary-card { grid-column: 1 / -1; }
.summary-list { display: flex; gap: 12px; flex-wrap: wrap; }
.summary-item { display: flex; align-items: center; gap: 8px; }
.si-label { font-size: 0.85rem; color: var(--color-text-muted); }

:deep(.el-slider__input) { background: var(--color-surface-2) !important; }
</style>
