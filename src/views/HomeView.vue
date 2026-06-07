<template>
  <div class="page-container">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-badge">
        <el-icon><Trophy /></el-icon>
        乙級廢棄物處理專業技術人員
      </div>
      <h1 class="page-title">考照練習<span class="gradient-text">系統</span></h1>
      <div class="hero-stats">
        <div class="stat-item">
          <span class="stat-value">{{ totalQ }}</span>
          <span class="stat-label">題庫總題數</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <span class="stat-value">{{ examGroups.length }}</span>
          <span class="stat-label">考試科目</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <span class="stat-value">{{ availableVolumes.length }}</span>
          <span class="stat-label">冊別</span>
        </div>
        <div class="stat-divider" />
        <div class="stat-item">
          <span class="stat-value">{{ mistakeCount }}</span>
          <span class="stat-label">待複習錯題</span>
        </div>
      </div>
    </section>

    <!-- Mode Tabs -->
    <div class="mode-tabs">
      <div
        class="mode-tab"
        :class="{ active: mode === 'practice' }"
        @click="mode = 'practice'"
      >
        <el-icon><Memo /></el-icon>
        練習題
      </div>
      <div
        class="mode-tab"
        :class="{ active: mode === 'browse' }"
        @click="mode = 'browse'"
      >
        <el-icon><Reading /></el-icon>
        題庫瀏覽
      </div>
      <div
        class="mode-tab"
        :class="{ active: mode === 'exam' }"
        @click="mode = 'exam'"
      >
        <el-icon><EditPen /></el-icon>
        模擬考試
      </div>
    </div>

    <!-- ═══ EXAM MODE ═══ -->
    <section v-if="mode === 'exam'">
      <div class="section-header">
        <h2 class="section-title">
          <el-icon><Files /></el-icon> 選擇科目開始模擬考試
        </h2>
        <p class="section-desc">每次從選定科目的冊別中隨機抽 {{ config.examQuestionCount }} 題‧60 分及格</p>
      </div>
      <el-row :gutter="20">
        <el-col
          v-for="(group, idx) in examGroups"
          :key="group.id"
          :xs="24" :sm="12" :md="8"
          style="margin-bottom: 20px"
        >
          <div
            class="exam-card"
            :class="{ 'has-mistake': mistakeByGroup[group.id] }"
            @click="goToExam(group)"
          >
            <div class="ec-accent" :style="{ background: accentColors[idx % accentColors.length] }"></div>
            <div class="ec-body">
              <div class="ec-top">
                <div class="ec-icon" :style="{ background: iconBg[idx % iconBg.length] }">
                  <el-icon size="20"><component :is="examIcons[idx % examIcons.length]" /></el-icon>
                </div>
                <div class="ec-meta">
                  <span class="ec-timer">
                    <el-icon><Timer /></el-icon>
                    {{ config.timeLimitEnabled ? group.timeLimitMinutes + ' 分鐘' : '無限制' }}
                  </span>
                </div>
              </div>
              <h3 class="ec-title">{{ group.name }}</h3>
              <div class="ec-volumes">
                <div
                  v-for="vol in group.volumes"
                  :key="vol"
                  class="vol-chip"
                >
                  <span class="vol-chip-name">{{ vol }}</span>
                  <span v-if="store.volumeSubjectMap[vol]" class="vol-chip-sub">{{ store.volumeSubjectMap[vol] }}</span>
                </div>
              </div>
              <div class="ec-footer">
                <span class="ec-count">{{ groupQuestionCount(group) }} 題</span>
                <el-tag v-if="mistakeByGroup[group.id]" size="small" type="danger" effect="dark">
                  錯 {{ mistakeByGroup[group.id] }} 題
                </el-tag>
              </div>
            </div>
            <el-icon class="ec-arrow"><ArrowRight /></el-icon>
          </div>
        </el-col>
      </el-row>
    </section>

    <!-- ═══ BROWSE MODE ═══ -->
    <section v-else-if="mode === 'browse'">
      <div class="section-header">
        <h2 class="section-title">
          <el-icon><Reading /></el-icon> 選擇冊別瀏覽題庫
        </h2>
        <p class="section-desc">逐題閱讀‧可切換顯示或隱藏答案‧支援關鍵字搜尋</p>
      </div>
      <el-row :gutter="20">
        <el-col
          v-for="(vol, idx) in availableVolumes"
          :key="vol"
          :xs="12" :sm="8" :md="6"
          style="margin-bottom: 16px"
        >
          <div class="browse-card" @click="goToBrowse(vol)">
            <div class="bc-icon" :style="{ background: iconBg[idx % iconBg.length] }">
              <el-icon size="22"><Document /></el-icon>
            </div>
            <div class="bc-body">
              <h3 class="bc-title">{{ vol }}</h3>
              <p v-if="store.volumeSubjectMap[vol]" class="bc-subject">{{ store.volumeSubjectMap[vol] }}</p>
              <p class="bc-count">{{ volumeCount[vol] || 0 }} 題</p>
            </div>
            <el-icon class="bc-arrow"><ArrowRight /></el-icon>
          </div>
        </el-col>
      </el-row>
    </section>

    <!-- ═══ PRACTICE MODE ═══ -->
    <section v-else-if="mode === 'practice'">
      <div class="section-header">
        <h2 class="section-title">
          <el-icon><Memo /></el-icon> 選擇冊別練習簡答題
        </h2>
        <p class="section-desc">依章節分組‧預設顯示答案‧支援關鍵字搜尋</p>
      </div>
      <div v-if="practiceVolumes.length === 0" class="practice-empty">
        <el-icon size="48"><DocumentDelete /></el-icon>
        <p>尚無練習題資料</p>
      </div>
      <el-row v-else :gutter="20">
        <el-col
          v-for="(vol, idx) in practiceVolumes"
          :key="vol"
          :xs="12" :sm="8" :md="6"
          style="margin-bottom: 16px"
        >
          <div class="practice-card" @click="goToPractice(vol)">
            <div class="pc-icon" :style="{ background: practiceIconBg[idx % practiceIconBg.length] }">
              <el-icon size="22"><Memo /></el-icon>
            </div>
            <div class="bc-body">
              <h3 class="bc-title">{{ vol }}</h3>
              <p v-if="practiceSubjectMap[vol]" class="bc-subject">{{ practiceSubjectMap[vol] }}</p>
              <p class="bc-count">{{ practiceCount[vol] || 0 }} 題</p>
            </div>
            <el-icon class="bc-arrow"><ArrowRight /></el-icon>
          </div>
        </el-col>
      </el-row>
    </section>

    <!-- Bottom CTA -->
    <el-divider />
    <div class="cta-row">
      <el-button
        v-if="mistakeCount > 0"
        type="warning" size="large" round
        :icon="Collection" @click="$router.push('/mistakes')"
      >
        錯題本複習（{{ mistakeCount }} 題）
      </el-button>
      <el-button size="large" round :icon="Setting" @click="$router.push('/settings')">
        考試設定
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useExamStore } from '../stores/examStore'
import { useConfigStore } from '../stores/configStore'
import {
  Trophy, Files, ArrowRight, Collection, Setting,
  Document, Timer, EditPen, Reading, Memo, DocumentDelete,
  DataAnalysis, Cpu, Odometer, MagicStick,
  Notebook, Connection, Monitor, Histogram, Warning,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// ── Load practice data ──────────────────────────────────
const practiceModules = import.meta.glob('../data/practice/*.json', { eager: true })
const allPracticeQuestions = Object.values(practiceModules).flatMap(m =>
  Array.isArray(m.default) ? m.default : []
)

const router = useRouter()
const store = useExamStore()
const config = useConfigStore()

const mode = ref('practice')

// ── Data ─────────────────────────────────────────────
const examGroups = computed(() => config.examGroups)
const availableVolumes = computed(() => store.availableVolumes)

const totalQ = computed(() =>
  Object.values(store.subjectCount).reduce((s, a) => s + a.length, 0)
)
const mistakeCount = computed(() => store.mistakeBook.length)

const volumeCount = computed(() => {
  const map = {}
  availableVolumes.value.forEach(v => {
    map[v] = (store.questionsByVolume[v] || []).length
  })
  return map
})

function groupQuestionCount(group) {
  return group.volumes.reduce((s, v) => s + (store.questionsByVolume[v]?.length || 0), 0)
}

const mistakeByGroup = computed(() => {
  const map = {}
  store.mistakeBook.forEach(q => {
    // Find which group this question belongs to
    const group = examGroups.value.find(g => g.volumes.includes(q.volume))
    if (group) map[group.id] = (map[group.id] || 0) + 1
  })
  return map
})

// ── Navigation ───────────────────────────────────────
function goToExam(group) {
  const pool = group.volumes.reduce((s, v) => s + (store.questionsByVolume[v]?.length || 0), 0)
  if (pool === 0) {
    ElMessage.warning(`${group.name} 的題庫尚無題目，請先確認相關冊別已載入`)
    return
  }
  store.startExamByGroup(group.id)
  router.push({ name: 'exam', params: { groupId: group.id } })
}

function goToBrowse(volume) {
  router.push({ name: 'browse', params: { volume } })
}

function goToPractice(volume) {
  router.push({ name: 'practice', params: { volume } })
}

// ── Practice data computed ──────────────────────────────
const zhNum = { 一:1, 二:2, 三:3, 四:4, 五:5, 六:6, 七:7, 八:8, 九:9, 十:10,
  十一:11, 十二:12, 十三:13, 十四:14, 十五:15, 十六:16, 十七:17, 十八:18, 十九:19, 二十:20 }
function volOrder(v) {
  // 先試阿拉伯數字：第1冊、第12冊
  const mArab = v.match(/第(\d+)冊/)
  if (mArab) return parseInt(mArab[1])
  // 再試中文數字：第一冊、第十三冊
  const mZh = v.match(/第(.+)冊/)
  if (mZh) return zhNum[mZh[1]] ?? 999
  return 999
}

const practiceVolumes = computed(() => {
  const seen = new Set(allPracticeQuestions.map(q => q.volume).filter(Boolean))
  return [...seen].sort((a, b) => volOrder(a) - volOrder(b))
})

const practiceSubjectMap = computed(() => {
  const map = {}
  allPracticeQuestions.forEach(q => {
    if (q.volume && q.subject && !map[q.volume]) map[q.volume] = q.subject
  })
  return map
})

const practiceCount = computed(() => {
  const map = {}
  allPracticeQuestions.forEach(q => {
    if (q.volume) map[q.volume] = (map[q.volume] || 0) + 1
  })
  return map
})

// ── Style helpers ────────────────────────────────────
const accentColors = [
  'linear-gradient(135deg,#4f8ef7,#7c3aed)',
  'linear-gradient(135deg,#34d399,#0ea5e9)',
  'linear-gradient(135deg,#f97316,#ef4444)',
  'linear-gradient(135deg,#a855f7,#ec4899)',
  'linear-gradient(135deg,#06b6d4,#3b82f6)',
  'linear-gradient(135deg,#fbbf24,#f97316)',
  'linear-gradient(135deg,#10b981,#14b8a6)',
  'linear-gradient(135deg,#6366f1,#8b5cf6)',
  'linear-gradient(135deg,#ef4444,#f97316)',
  'linear-gradient(135deg,#84cc16,#10b981)',
  'linear-gradient(135deg,#0ea5e9,#6366f1)',
]
const iconBg = [
  'rgba(79,142,247,0.15)', 'rgba(52,211,153,0.15)', 'rgba(249,115,22,0.15)',
  'rgba(168,85,247,0.15)', 'rgba(6,182,212,0.15)', 'rgba(251,191,36,0.15)',
  'rgba(16,185,129,0.15)', 'rgba(99,102,241,0.15)', 'rgba(239,68,68,0.15)',
  'rgba(132,204,22,0.15)', 'rgba(14,165,233,0.15)',
]
const practiceIconBg = [
  'rgba(167,139,250,0.18)', 'rgba(167,139,250,0.12)', 'rgba(139,92,246,0.15)',
  'rgba(196,181,253,0.18)', 'rgba(124,58,237,0.12)', 'rgba(167,139,250,0.2)',
  'rgba(139,92,246,0.18)', 'rgba(167,139,250,0.14)', 'rgba(196,181,253,0.15)',
  'rgba(124,58,237,0.18)', 'rgba(167,139,250,0.16)',
]
const examIcons = [
  DataAnalysis, Cpu, Odometer, MagicStick,
  Notebook, Connection, Monitor, Histogram, Warning, Document, Setting,
]
</script>

<style scoped>
/* Hero */
.hero { text-align: center; padding: 48px 20px 36px; }
.hero-badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(79,142,247,0.1); border: 1px solid rgba(79,142,247,0.22);
  color: var(--color-primary-light);
  padding: 6px 16px; border-radius: 99px;
  font-size: 0.82rem; font-weight: 600; margin-bottom: 18px;
}
.page-title { font-size: 2.6rem; font-weight: 800; margin-bottom: 24px; letter-spacing: -1px; }
.hero-stats {
  display: inline-flex; align-items: center;
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 16px; padding: 16px 28px; flex-wrap: wrap; gap: 0;
}
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 0 18px; }
.stat-value { font-size: 1.7rem; font-weight: 800; color: var(--color-primary-light); line-height: 1; }
.stat-label { font-size: 0.72rem; color: var(--color-text-muted); }
.stat-divider { width: 1px; height: 32px; background: var(--color-border); }

/* Mode Tabs */
.mode-tabs {
  display: flex; gap: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px; padding: 5px;
  margin-bottom: 32px; width: fit-content;
}
.mode-tab {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 28px; border-radius: 10px;
  cursor: pointer; font-weight: 600; font-size: 0.95rem;
  color: var(--color-text-muted);
  transition: all 0.2s;
  white-space: nowrap;
}
.mode-tab:hover { color: var(--color-primary-light); }
.mode-tab.active {
  background: rgba(79,142,247,0.12);
  color: var(--color-primary-light);
  border: 1px solid rgba(79,142,247,0.25);
}

/* Section headers */
.section-header { margin-bottom: 20px; }
.section-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 1.15rem; font-weight: 700; color: var(--color-text); margin-bottom: 4px;
}
.section-desc { font-size: 0.84rem; color: var(--color-text-muted); margin: 0; }

/* Exam Card */
.exam-card {
  position: relative; overflow: hidden;
  display: flex; align-items: center; gap: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  cursor: pointer; height: 100%;
  transition: border-color 0.22s, transform 0.22s, box-shadow 0.22s;
}
.exam-card:hover { border-color: rgba(79,142,247,0.45); transform: translateY(-3px); box-shadow: 0 12px 36px rgba(0,0,0,0.18); }
.exam-card.has-mistake { border-color: rgba(239,68,68,0.25); }

.ec-accent {
  width: 5px; align-self: stretch; flex-shrink: 0;
  border-radius: 16px 0 0 16px;
}
.ec-body { flex: 1; padding: 18px 16px 16px; min-width: 0; }
.ec-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.ec-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: var(--color-primary-light);
}
.ec-meta { display: flex; align-items: center; gap: 6px; }
.ec-timer {
  display: flex; align-items: center; gap: 4px;
  font-size: 0.75rem; color: var(--color-text-muted); font-weight: 500;
}
.ec-title { font-size: 0.88rem; font-weight: 700; color: var(--color-text); margin-bottom: 10px; line-height: 1.4; }
.ec-volumes { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px; }
.vol-chip {
  display: inline-flex; flex-direction: column; gap: 1px;
  padding: 3px 8px; border-radius: 6px;
  border: 1px solid var(--color-border);
  background: rgba(79,142,247,0.06);
}
.vol-chip-name { font-size: 0.72rem; font-weight: 700; color: var(--color-primary-light); line-height: 1.3; }
.vol-chip-sub { font-size: 0.62rem; color: var(--color-text-muted); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 110px; }
.ec-footer { display: flex; align-items: center; gap: 8px; }
.ec-count { font-size: 0.78rem; color: var(--color-text-muted); font-weight: 600; }
.ec-arrow { color: var(--color-text-muted); opacity: 0.35; flex-shrink: 0; margin-right: 14px; transition: all 0.2s; }
.exam-card:hover .ec-arrow { opacity: 1; transform: translateX(3px); color: var(--color-primary-light); }

/* Browse Card */
.browse-card {
  display: flex; align-items: center; gap: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px; padding: 16px;
  cursor: pointer;
  transition: border-color 0.22s, transform 0.22s, box-shadow 0.22s;
}
.browse-card:hover { border-color: rgba(79,142,247,0.4); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.14); }
.bc-icon {
  width: 42px; height: 42px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--color-primary-light);
}
.bc-body { flex: 1; min-width: 0; }
.bc-title { font-size: 0.92rem; font-weight: 700; color: var(--color-text); margin-bottom: 1px; }
.bc-subject { font-size: 0.72rem; color: var(--color-text-muted); margin: 0 0 2px; line-height: 1.3; }
.bc-count { font-size: 0.78rem; color: var(--color-text-muted); margin: 0; }
.bc-arrow { color: var(--color-text-muted); opacity: 0.3; transition: all 0.2s; }
.browse-card:hover .bc-arrow { opacity: 1; transform: translateX(3px); color: var(--color-primary-light); }

/* CTA */
.cta-row { text-align: center; padding: 8px 0 24px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

/* Practice Card */
.practice-card {
  display: flex; align-items: center; gap: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px; padding: 16px;
  cursor: pointer;
  transition: border-color 0.22s, transform 0.22s, box-shadow 0.22s;
}
.practice-card:hover { border-color: rgba(167,139,250,0.5); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(167,139,250,0.15); }
.pc-icon {
  width: 42px; height: 42px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: #a78bfa;
}
.practice-card:hover .bc-arrow { opacity: 1; transform: translateX(3px); color: #a78bfa; }

/* Practice empty */
.practice-empty {
  text-align: center; padding: 60px 20px;
  color: var(--color-text-muted);
  display: flex; flex-direction: column; align-items: center; gap: 12px;
}

@media (max-width: 480px) {
  .mode-tabs {
    width: 100%;
  }

  .mode-tab {
    flex: 1;
    justify-content: center;
    gap: 4px;
    padding: 10px 8px;
    font-size: 0.84rem;
  }

  :deep(.el-col-xs-12) {
    flex: 0 0 100%;
    max-width: 100%;
  }

  .practice-card,
  .browse-card {
    min-height: 96px;
  }
}

</style>
