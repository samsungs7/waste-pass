<template>
  <div class="page-container">
    <h1 class="page-title"><el-icon><Setting /></el-icon> 考試設定</h1>
    <p class="page-subtitle">所有設定即時生效並自動儲存於本機瀏覽器</p>

    <div class="settings-grid">

      <!-- 主題 -->
      <div class="settings-card">
        <div class="card-heading"><el-icon size="20"><Brush /></el-icon><span>介面主題</span></div>
        <p class="card-desc">選擇深色或淺色介面風格</p>
        <div class="theme-selector">
          <div class="theme-option" :class="{ active: config.theme === 'dark' }" @click="config.setTheme('dark')">
            <div class="theme-preview dark-preview">
              <div class="preview-nav"></div>
              <div class="preview-content"><div class="preview-card"></div><div class="preview-card"></div></div>
            </div>
            <span>深色模式</span>
            <el-icon v-if="config.theme === 'dark'" class="check-icon"><CircleCheck /></el-icon>
          </div>
          <div class="theme-option" :class="{ active: config.theme === 'light' }" @click="config.setTheme('light')">
            <div class="theme-preview light-preview">
              <div class="preview-nav"></div>
              <div class="preview-content"><div class="preview-card"></div><div class="preview-card"></div></div>
            </div>
            <span>淺色模式</span>
            <el-icon v-if="config.theme === 'light'" class="check-icon"><CircleCheck /></el-icon>
          </div>
        </div>
      </div>

      <!-- 考試題數 -->
      <div class="settings-card">
        <div class="card-heading"><el-icon size="20"><Document /></el-icon><span>每次考試題數</span></div>
        <p class="card-desc">每科測驗隨機抽出的題目數量（5–100）</p>
        <div class="setting-row">
          <el-slider v-model="questionCount" :min="5" :max="100" :step="5" show-input
            @change="config.setExamQuestionCount(questionCount)" style="flex:1" />
        </div>
        <el-tag type="info" effect="plain" size="small" style="margin-top:10px">
          目前設定：每次抽 {{ config.examQuestionCount }} 題，滿分 {{ config.examQuestionCount * 2 }} 分
        </el-tag>
      </div>

      <!-- 全域預設時限 -->
      <div class="settings-card">
        <div class="card-heading"><el-icon size="20"><Timer /></el-icon><span>全域預設時限</span></div>
        <p class="card-desc">未個別設定的科目套用此時限；也可關閉計時</p>
        <div class="switch-row">
          <span class="switch-label">啟用倒數計時</span>
          <el-switch v-model="timeLimitEnabled" @change="config.setTimeLimitEnabled(timeLimitEnabled)" active-color="var(--color-primary)" />
        </div>
        <div v-if="timeLimitEnabled" style="margin-top:12px">
          <div class="setting-row">
            <el-slider v-model="defaultTimeLimitMinutes" :min="10" :max="180" :step="5" show-input
              @change="config.setDefaultTimeLimitMinutes(defaultTimeLimitMinutes)" style="flex:1" />
          </div>
          <div class="setting-hint">預設時限：{{ config.defaultTimeLimitMinutes }} 分鐘</div>
        </div>
        <el-tag v-else type="info" effect="plain" size="small" style="margin-top:12px">目前設定：無時間限制</el-tag>
      </div>

    </div>

    <!-- 考試科目管理 (full width) -->
    <div class="settings-card group-card" style="margin-top:20px">
      <div class="card-heading-row">
        <div class="card-heading" style="margin-bottom:0">
          <el-icon size="20"><Files /></el-icon><span>考試科目管理</span>
        </div>
        <div class="group-actions">
          <el-button size="small" :icon="RefreshLeft" plain @click="resetGroups">還原預設科目</el-button>
          <el-button size="small" type="primary" :icon="Plus" @click="config.addGroup()">新增科目</el-button>
        </div>
      </div>
      <p class="card-desc" style="margin-top:6px">設定各科目名稱、考試時限，以及涵蓋哪幾冊的題目一起考</p>

      <div class="group-list">
        <div v-for="(group, idx) in config.examGroups" :key="group.id" class="group-item">
          <!-- 序號 & 刪除 -->
          <div class="gi-index">{{ idx + 1 }}</div>

          <!-- 科目名稱 -->
          <div class="gi-name">
            <div class="field-label">科目名稱</div>
            <el-input
              :model-value="group.name"
              @change="(v) => config.setGroupName(group.id, v)"
              placeholder="科目名稱"
              size="small"
            />
          </div>

          <!-- 時限 -->
          <div class="gi-time">
            <div class="field-label">
              <el-icon><Timer /></el-icon>
              時限（分鐘）
            </div>
            <el-input-number
              :model-value="group.timeLimitMinutes"
              @change="(v) => config.setGroupTimeLimit(group.id, v)"
              :min="10" :max="180" :step="5"
              controls-position="right"
              size="small"
              style="width:110px"
            />
          </div>

          <!-- 涵蓋冊別 -->
          <div class="gi-volumes">
            <div class="field-label"><el-icon><Collection /></el-icon> 涵蓋冊別</div>
            <el-popover placement="bottom-start" :width="340" trigger="click">
              <template #reference>
                <div class="vol-trigger">
                  <el-tag
                    v-for="vol in group.volumes" :key="vol"
                    size="small" type="info" effect="plain" class="vol-chip"
                  >{{ vol }}</el-tag>
                  <span v-if="group.volumes.length === 0" class="vol-empty">點擊選擇冊別</span>
                  <el-icon class="vol-edit-icon"><EditPen /></el-icon>
                </div>
              </template>
              <div class="vol-picker">
                <div class="vol-picker-title">選擇涵蓋冊別</div>
                <el-checkbox-group
                  :model-value="group.volumes"
                  @change="(v) => config.setGroupVolumes(group.id, v)"
                >
                  <el-checkbox
                    v-for="vol in availableVolumes"
                    :key="vol"
                    :value="vol"
                    :label="vol"
                    class="vol-checkbox"
                  >
                    <span class="vol-cb-name">{{ vol }}</span>
                    <span v-if="examStore.volumeSubjectMap[vol]" class="vol-cb-sub">{{ examStore.volumeSubjectMap[vol] }}</span>
                  </el-checkbox>
                </el-checkbox-group>
              </div>
            </el-popover>
          </div>

          <!-- 刪除按鈕 -->
          <el-button
            size="small" type="danger" plain circle :icon="Delete"
            @click="removeGroup(group.id)"
            :disabled="config.examGroups.length <= 1"
            class="gi-delete"
          />
        </div>
      </div>
    </div>

    <!-- 摘要 -->
    <div class="settings-card summary-card" style="margin-top:20px">
      <div class="card-heading"><el-icon size="20"><InfoFilled /></el-icon><span>當前設定摘要</span></div>
      <div class="summary-list">
        <div class="summary-item"><span class="si-label">主題模式</span><el-tag size="small" effect="dark">{{ config.theme === 'dark' ? '深色模式' : '淺色模式' }}</el-tag></div>
        <div class="summary-item"><span class="si-label">每次題數</span><el-tag size="small" type="primary" effect="dark">{{ config.examQuestionCount }} 題</el-tag></div>
        <div class="summary-item"><span class="si-label">預設計時</span>
          <el-tag size="small" :type="config.timeLimitEnabled ? 'warning' : 'info'" effect="dark">
            {{ config.timeLimitEnabled ? config.defaultTimeLimitMinutes + ' 分鐘' : '無限制' }}
          </el-tag>
        </div>
        <div class="summary-item"><span class="si-label">科目數量</span><el-tag size="small" type="success" effect="dark">{{ config.examGroups.length }} 科</el-tag></div>
        <div class="summary-item"><span class="si-label">滿分設定</span><el-tag size="small" type="success" effect="dark">{{ config.examQuestionCount * 2 }} 分</el-tag></div>
      </div>
      <el-divider style="margin:18px 0 14px" />
      <el-button type="danger" plain size="small" :icon="RefreshLeft" @click="resetConfig">還原所有預設設定</el-button>
    </div>

    <div style="text-align:center;margin-top:32px">
      <el-button type="primary" size="large" @click="$router.push('/')">完成設定，回首頁</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useConfigStore } from '../stores/configStore'
import { useExamStore } from '../stores/examStore'
import { ElMessageBox } from 'element-plus'
import {
  Setting, Brush, Document, Timer, InfoFilled, Files, Collection,
  CircleCheck, RefreshLeft, Plus, Delete, EditPen,
} from '@element-plus/icons-vue'

const config = useConfigStore()
const examStore = useExamStore()

const availableVolumes = computed(() => examStore.availableVolumes)

const questionCount = ref(config.examQuestionCount)
const defaultTimeLimitMinutes = ref(config.defaultTimeLimitMinutes)
const timeLimitEnabled = ref(config.timeLimitEnabled)

watch(() => config.examQuestionCount, v => { questionCount.value = v })
watch(() => config.defaultTimeLimitMinutes, v => { defaultTimeLimitMinutes.value = v })
watch(() => config.timeLimitEnabled, v => { timeLimitEnabled.value = v })

async function removeGroup(id) {
  try {
    await ElMessageBox.confirm('確定要刪除此科目？', '刪除科目', {
      confirmButtonText: '確認刪除', cancelButtonText: '取消', type: 'warning',
    })
    config.removeGroup(id)
  } catch { /* cancelled */ }
}

async function resetGroups() {
  try {
    await ElMessageBox.confirm('確定要還原所有科目為官方預設 11 科？', '還原科目', {
      confirmButtonText: '確認還原', cancelButtonText: '取消', type: 'warning',
    })
    config.resetGroupsToDefault()
  } catch { /* cancelled */ }
}

async function resetConfig() {
  try {
    await ElMessageBox.confirm('確定要還原所有設定為預設值？（含科目設定）', '還原預設', {
      confirmButtonText: '確認還原', cancelButtonText: '取消', type: 'warning',
    })
    config.resetToDefault()
    config.resetGroupsToDefault()
    questionCount.value = config.examQuestionCount
    defaultTimeLimitMinutes.value = config.defaultTimeLimitMinutes
    timeLimitEnabled.value = config.timeLimitEnabled
  } catch { /* cancelled */ }
}
</script>

<style scoped>
.page-title { display:flex; align-items:center; gap:10px; font-size:2rem; font-weight:800; margin-bottom:8px; }
.page-subtitle { color:var(--color-text-muted); font-size:0.95rem; margin-bottom:32px; }

.settings-grid {
  display:grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap:20px;
}

.settings-card {
  background:var(--color-surface);
  border:1px solid var(--color-border);
  border-radius:16px;
  padding:24px;
  transition:background 0.3s, border-color 0.3s;
}

.card-heading {
  display:flex; align-items:center; gap:8px;
  font-size:1.05rem; font-weight:700;
  color:var(--color-text); margin-bottom:6px;
}
.card-heading .el-icon { color:var(--color-primary-light); }
.card-desc { font-size:0.85rem; color:var(--color-text-muted); margin-bottom:18px; }

/* Theme */
.theme-selector { display:flex; gap:12px; flex-wrap:wrap; }
.theme-option {
  display:flex; flex-direction:column; align-items:center; gap:8px;
  cursor:pointer; border-radius:12px; padding:12px 16px;
  border:2px solid var(--color-border);
  transition:border-color 0.2s, background 0.2s;
  position:relative; flex:1; min-width:120px;
  color:var(--color-text-muted); font-size:0.88rem; font-weight:500;
}
.theme-option.active { border-color:var(--color-primary); background:rgba(79,142,247,0.07); color:var(--color-primary-light); }
.theme-option:hover { border-color:var(--color-primary-light); }
.check-icon { color:var(--color-primary-light); position:absolute; top:8px; right:8px; }
.theme-preview { width:100%; height:60px; border-radius:8px; overflow:hidden; display:flex; flex-direction:column; }
.dark-preview { background:#0f1117; }
.dark-preview .preview-nav { height:14px; background:#1a1d27; border-bottom:1px solid rgba(255,255,255,0.06); }
.dark-preview .preview-content { display:flex; gap:4px; padding:6px; }
.dark-preview .preview-card { flex:1; height:28px; background:#1a1d27; border-radius:4px; border:1px solid rgba(255,255,255,0.06); }
.light-preview { background:#f0f4f8; }
.light-preview .preview-nav { height:14px; background:#ffffff; border-bottom:1px solid rgba(0,0,0,0.07); }
.light-preview .preview-content { display:flex; gap:4px; padding:6px; }
.light-preview .preview-card { flex:1; height:28px; background:#ffffff; border-radius:4px; border:1px solid rgba(0,0,0,0.07); }

/* Setting rows */
.setting-row { display:flex; align-items:center; gap:16px; }
.setting-hint { font-size:0.78rem; color:var(--color-text-muted); margin-top:4px; }
.switch-row { display:flex; align-items:center; justify-content:space-between; padding:10px 0; }
.switch-label { font-size:0.9rem; color:var(--color-text); font-weight:500; }

/* Group card */
.group-card { }
.card-heading-row {
  display:flex; align-items:center; justify-content:space-between;
  flex-wrap:wrap; gap:10px; margin-bottom:4px;
}
.group-actions { display:flex; gap:8px; flex-wrap:wrap; }

.group-list {
  display:flex; flex-direction:column; gap:12px; margin-top:4px;
}
.group-item {
  display:flex; align-items:flex-start; gap:12px; flex-wrap:wrap;
  padding:16px; border-radius:12px;
  background:var(--color-surface-2);
  border:1px solid var(--color-border);
  transition:border-color 0.2s;
}
.group-item:hover { border-color:rgba(79,142,247,0.3); }

.gi-index {
  width:28px; height:28px; border-radius:50%;
  background:rgba(79,142,247,0.15);
  color:var(--color-primary-light);
  font-size:0.8rem; font-weight:700;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0; margin-top:20px;
}
.gi-name { flex:2; min-width:180px; }
.gi-time { flex:0 0 auto; }
.gi-volumes { flex:3; min-width:220px; }
.gi-delete { flex-shrink:0; margin-top:20px; }

.field-label {
  font-size:0.75rem; color:var(--color-text-muted); font-weight:600;
  margin-bottom:6px; display:flex; align-items:center; gap:4px;
}

/* Volume trigger */
.vol-trigger {
  display:flex; align-items:center; flex-wrap:wrap; gap:4px;
  min-height:32px; padding:4px 8px; border-radius:8px;
  border:1px solid var(--color-border); background:var(--color-surface);
  cursor:pointer; transition:border-color 0.2s;
}
.vol-trigger:hover { border-color:var(--color-primary-light); }
.vol-chip { font-size:0.7rem !important; }
.vol-empty { font-size:0.8rem; color:var(--color-text-muted); }
.vol-edit-icon { color:var(--color-text-muted); font-size:13px; margin-left:auto; flex-shrink:0; }

/* Volume picker popover content */
.vol-picker { padding:4px 0; }
.vol-picker-title { font-size:0.85rem; font-weight:700; color:var(--color-text); margin-bottom:12px; }
.vol-checkbox { display:block; margin-bottom:10px; }
.vol-cb-name { font-size:0.85rem; font-weight:600; }
.vol-cb-sub { font-size:0.72rem; color:var(--color-text-muted); margin-left:6px; }

/* Summary */
.summary-card { }
.summary-list { display:flex; gap:12px; flex-wrap:wrap; }
.summary-item { display:flex; align-items:center; gap:8px; }
.si-label { font-size:0.85rem; color:var(--color-text-muted); }

:deep(.el-slider__input) { background:var(--color-surface-2) !important; }
:deep(.el-checkbox-group) { display:flex; flex-wrap:wrap; gap:4px 16px; }
</style>
