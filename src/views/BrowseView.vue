<template>
  <div class="page-container">
    <!-- Header -->
    <div class="browse-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="$router.push('/')" circle />
        <div>
          <h1 class="browse-title">
            <el-icon><Reading /></el-icon>
            題庫瀏覽
          </h1>
          <p class="browse-sub">
            <span class="vol-label-main">{{ currentVolume }}</span>
            <span v-if="store.volumeSubjectMap[currentVolume]" class="vol-label-sub"> - {{ store.volumeSubjectMap[currentVolume] }}</span>
            ‧ 共 {{ filteredQuestions.length }} / {{ volumeQuestions.length }} 題
          </p>
        </div>
      </div>
      <div class="header-right">
        <el-tag :type="showAnswersGlobal ? 'success' : 'info'" effect="dark" size="large" class="answer-toggle-tag" @click="toggleGlobal" style="cursor:pointer">
          <el-icon style="margin-right:4px"><component :is="showAnswersGlobal ? Hide : View" /></el-icon>
          {{ showAnswersGlobal ? '隱藏答案' : '顯示答案' }}
        </el-tag>
      </div>
    </div>

    <!-- Volume Selector -->
    <div class="volume-selector-bar">
      <el-scrollbar>
        <div class="volume-tabs">
          <div
            v-for="vol in availableVolumes"
            :key="vol"
            class="vol-tab"
            :class="{ active: vol === currentVolume }"
            @click="switchVolume(vol)"
          >
            <span class="tab-vol">{{ vol }}</span>
            <span v-if="store.volumeSubjectMap[vol]" class="tab-sub">{{ store.volumeSubjectMap[vol] }}</span>
          </div>
        </div>
      </el-scrollbar>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <el-input
        v-model="searchKeyword"
        placeholder="🔍 搜尋關鍵字..."
        clearable
        class="search-input"
        @input="onSearch"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>

      <div class="toolbar-right">
        <span class="result-count">
          <template v-if="searchKeyword">篩選到 <strong>{{ filteredQuestions.length }}</strong> 題</template>
          <template v-else>共 <strong>{{ volumeQuestions.length }}</strong> 題</template>
        </span>
        <el-select v-model="pageSize" style="width: 100px" @change="currentPage = 1">
          <el-option label="每頁 20 題" :value="20" />
          <el-option label="每頁 30 題" :value="30" />
          <el-option label="每頁 50 題" :value="50" />
        </el-select>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="filteredQuestions.length === 0" class="empty-state">
      <el-icon size="64"><DocumentDelete /></el-icon>
      <p>{{ searchKeyword ? '找不到符合的題目' : '此冊尚無題目' }}</p>
      <el-button v-if="searchKeyword" @click="searchKeyword = ''" plain>清除搜尋</el-button>
    </div>

    <!-- Question List -->
    <div v-else class="question-list">
      <div
        v-for="(q, idx) in pagedQuestions"
        :key="q.id"
        class="question-card"
        :class="{ revealed: isAnswerVisible(q) }"
      >
        <div class="q-number">{{ globalIndex(idx) }}</div>
        <div class="q-body">
          <!-- Question text with search highlight -->
          <p class="q-text" v-html="highlight(q.question)"></p>

          <!-- Options -->
          <div class="q-options">
            <div
              v-for="(opt, oi) in q.options"
              :key="oi"
              class="q-option"
              :class="{
                'is-correct': isAnswerVisible(q) && (oi + 1) === normalizedAnswer(q.answer),
                'is-wrong': false,
              }"
            >
              <span class="opt-label">{{ optLabels[oi] }}</span>
              <span class="opt-text" v-html="highlight(opt)"></span>
              <el-icon v-if="isAnswerVisible(q) && (oi + 1) === normalizedAnswer(q.answer)" class="correct-icon"><CircleCheck /></el-icon>
            </div>
          </div>

          <!-- Explanation -->
          <div v-if="isAnswerVisible(q) && q.explanation" class="q-explanation">
            <el-icon><InfoFilled /></el-icon>
            {{ q.explanation }}
          </div>

          <!-- Actions -->
          <div class="q-actions">
            <el-tag size="small" type="info" effect="plain">{{ q.volume }}</el-tag>
            <el-button
              size="small"
              :type="isAnswerVisible(q) ? 'success' : 'default'"
              :icon="isAnswerVisible(q) ? Hide : View"
              plain
              @click="toggleReveal(q.id)"
            >
              {{ isAnswerVisible(q) ? '隱藏答案' : '看答案' }}
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="filteredQuestions.length > pageSize" class="pagination-bar">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="filteredQuestions.length"
        layout="prev, pager, next, jumper"
        @current-change="onPageChange"
        background
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useExamStore } from '../stores/examStore'
import { normalizeAnswer } from '../utils/questionHelper'
import {
  ArrowLeft, View, Hide, Search, CircleCheck, InfoFilled,
  Reading, DocumentDelete,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const store = useExamStore()

const optLabels = ['A', 'B', 'C', 'D', 'E']

// ── Volume State ─────────────────────────────────────
const currentVolume = ref(route.params.volume || store.availableVolumes[0])
const availableVolumes = computed(() => store.availableVolumes)

function switchVolume(vol) {
  currentVolume.value = vol
  router.replace({ name: 'browse', params: { volume: vol } })
  currentPage.value = 1
  // 清空搜尋（同時清 debounced 值與 timer，避免舊關鍵字仍在篩選）
  clearTimeout(searchTimer)
  searchKeyword.value = ''
  debouncedKeyword.value = ''
  revealedIds.value.clear()
}

// Sync from route param change
watch(() => route.params.volume, v => {
  if (v && v !== currentVolume.value) currentVolume.value = v
})

// ── Questions ─────────────────────────────────────────
const volumeQuestions = computed(() =>
  store.questionsByVolume[currentVolume.value] || []
)

// ── Search ─────────────────────────────────────────────
const searchKeyword = ref('')
const debouncedKeyword = ref('')
let searchTimer = null
function onSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedKeyword.value = searchKeyword.value
    currentPage.value = 1
  }, 300)
}

const filteredQuestions = computed(() => {
  const kw = debouncedKeyword.value.trim().toLowerCase()
  if (!kw) return volumeQuestions.value
  return volumeQuestions.value.filter(q =>
    q.question.toLowerCase().includes(kw) ||
    q.options.some(o => o.toLowerCase().includes(kw))
  )
})

// ── Pagination ─────────────────────────────────────────
const pageSize = ref(30)
const currentPage = ref(1)

const pagedQuestions = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredQuestions.value.slice(start, start + pageSize.value)
})

function globalIndex(localIdx) {
  return (currentPage.value - 1) * pageSize.value + localIdx + 1
}

function onPageChange() {
  window.scrollTo({ top: 0, behavior: 'instant' })
}

// ── Answer Reveal ─────────────────────────────────────
// showAnswersGlobal: 全域開關
// revealedIds: global=OFF 時，個別「已顯示」的題目
// hiddenIds:   global=ON  時，個別「已隱藏」的題目
// 兩組 Set 互不干擾，切換 global 時雙方清空
const showAnswersGlobal = ref(false)
const revealedIds = ref(new Set())
const hiddenIds = ref(new Set())

function isAnswerVisible(q) {
  return showAnswersGlobal.value
    ? !hiddenIds.value.has(q.id)
    : revealedIds.value.has(q.id)
}

function toggleGlobal() {
  showAnswersGlobal.value = !showAnswersGlobal.value
  // 切換時清空雙方，避免殘留狀態互相干擾
  revealedIds.value = new Set()
  hiddenIds.value = new Set()
}

function toggleReveal(id) {
  if (showAnswersGlobal.value) {
    // Global ON：操作 hiddenIds（個別隱藏 / 取消隱藏）
    const s = new Set(hiddenIds.value)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    hiddenIds.value = s
  } else {
    // Global OFF：操作 revealedIds（個別顯示 / 取消顯示）
    const s = new Set(revealedIds.value)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    revealedIds.value = s
  }
}

// 切換冊時清空所有狀態
watch(currentVolume, () => {
  revealedIds.value = new Set()
  hiddenIds.value = new Set()
})

// ── Helpers ───────────────────────────────────────────
function normalizedAnswer(answer) {
  return parseInt(normalizeAnswer(answer))
}

function highlight(text) {
  const kw = debouncedKeyword.value.trim()
  if (!kw || !text) return text
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(escaped, 'gi'), m => `<mark class="kw-highlight">${m}</mark>`)
}
</script>

<style scoped>
/* ── Header ── */
.browse-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px; gap: 16px; flex-wrap: wrap;
}
.header-left { display: flex; align-items: center; gap: 14px; }
.browse-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 1.8rem; font-weight: 800; margin-bottom: 2px;
}
.browse-sub { font-size: 0.85rem; color: var(--color-text-muted); margin: 0; }
.answer-toggle-tag { font-size: 0.9rem; padding: 8px 16px !important; border-radius: 99px; }

/* ── Volume Selector ── */
.volume-selector-bar {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 8px 16px;
  margin-bottom: 16px;
}
.volume-tabs { display: flex; gap: 8px; padding-bottom: 2px; }
.vol-tab {
  flex-shrink: 0;
  padding: 6px 14px; border-radius: 8px;
  cursor: pointer; color: var(--color-text-muted);
  border: 1px solid transparent;
  transition: all 0.18s;
  white-space: nowrap;
  display: flex; flex-direction: column; gap: 1px; align-items: flex-start;
}
.tab-vol { font-size: 0.82rem; font-weight: 700; line-height: 1.3; }
.tab-sub { font-size: 0.68rem; font-weight: 400; opacity: 0.75; line-height: 1.2; max-width: 120px; white-space: normal; }
.vol-tab:hover { background: rgba(79,142,247,0.08); color: var(--color-primary-light); }
.vol-tab.active { background: rgba(79,142,247,0.15); border-color: rgba(79,142,247,0.35); color: var(--color-primary-light); }
.vol-label-main { font-weight: 700; }
.vol-label-sub { color: var(--color-text-muted); }

/* ── Toolbar ── */
.toolbar {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 20px; flex-wrap: wrap;
}
.search-input { flex: 1; min-width: 200px; }
.toolbar-right { display: flex; align-items: center; gap: 12px; }
.result-count { font-size: 0.85rem; color: var(--color-text-muted); white-space: nowrap; }
.result-count strong { color: var(--color-primary-light); }

/* ── Empty state ── */
.empty-state {
  text-align: center; padding: 80px 20px;
  color: var(--color-text-muted);
}
.empty-state .el-icon { opacity: 0.3; margin-bottom: 16px; display: block; }

/* ── Question List ── */
.question-list { display: flex; flex-direction: column; gap: 14px; margin-bottom: 32px; }

.question-card {
  display: flex; gap: 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px; padding: 20px 22px;
  transition: border-color 0.25s;
}
.question-card.revealed {
  border-color: rgba(52, 211, 153, 0.3);
  background: rgba(52, 211, 153, 0.02);
}

.q-number {
  font-size: 0.72rem; font-weight: 800;
  color: var(--color-primary-light);
  background: rgba(79,142,247,0.1);
  border-radius: 8px; min-width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 3px;
}

.q-body { flex: 1; min-width: 0; }
.q-text {
  font-size: 0.97rem; font-weight: 500; line-height: 1.75;
  margin-bottom: 14px; color: var(--color-text);
}

.q-options { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.q-option {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 14px; border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-2, var(--color-surface));
  transition: background 0.2s, border-color 0.2s;
  position: relative;
}
.q-option.is-correct {
  border-color: rgba(52, 211, 153, 0.5) !important;
  background: rgba(52, 211, 153, 0.08) !important;
}
.opt-label {
  font-size: 0.8rem; font-weight: 700;
  color: var(--color-primary-light);
  background: rgba(79,142,247,0.12);
  border-radius: 4px; padding: 1px 7px;
  flex-shrink: 0; margin-top: 1px;
}
.q-option.is-correct .opt-label {
  color: #34d399; background: rgba(52,211,153,0.15);
}
.opt-text { font-size: 0.9rem; line-height: 1.6; color: var(--color-text); flex: 1; }
.correct-icon { color: #34d399; flex-shrink: 0; margin-top: 2px; }

.q-explanation {
  display: flex; align-items: flex-start; gap: 8px;
  background: rgba(251,146,60,0.08);
  border: 1px solid rgba(251,146,60,0.25);
  border-radius: 10px; padding: 10px 14px;
  font-size: 0.85rem; color: var(--color-text-muted); line-height: 1.6;
  margin-bottom: 12px;
}
.q-explanation .el-icon { color: rgba(251,146,60,0.8); flex-shrink: 0; margin-top: 2px; }

.q-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* ── Pagination ── */
.pagination-bar {
  display: flex; justify-content: center; padding: 16px 0 32px;
}

/* ── Search highlight ── */
:global(.kw-highlight) {
  background: rgba(251, 211, 10, 0.4);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}
</style>
