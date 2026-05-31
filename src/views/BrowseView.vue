<template>
  <div class="page-container study-browse-page">
    <!-- Header -->
    <div class="browse-header">
      <el-button :icon="ArrowLeft" @click="$router.push('/')" circle class="back-btn" />
      <div class="header-content">
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

    <!-- Sticky Toolbar Wrapper (Sticks to top) -->
    <div class="sticky-toolbar-wrapper">
      <!-- Volume Selector (Tabs on top of keywords) -->
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

      <!-- Keyword Search and Answer toggles -->
      <div class="toolbar">
        <el-input
          v-model="searchKeyword"
          placeholder="🔍 搜尋此冊題目關鍵字..."
          clearable
          class="search-input"
          @input="onSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

        <!-- Toggle All Answers next to search input -->
        <el-button
          :type="showAnswersGlobal ? 'success' : 'default'"
          class="answer-toggle-btn"
          @click="toggleGlobal"
        >
          <el-icon style="margin-right: 4px"><component :is="showAnswersGlobal ? Hide : View" /></el-icon>
          {{ showAnswersGlobal ? '隱藏答案' : '顯示答案' }}
        </el-button>

        <span class="result-count">
          <template v-if="searchKeyword">篩選到 <strong>{{ filteredQuestions.length }}</strong> 題</template>
          <template v-else>共 <strong>{{ volumeQuestions.length }}</strong> 題</template>
        </span>
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

    <!-- Pagination & Page Size selector in the same line -->
    <div v-if="filteredQuestions.length > 0" class="pagination-bar">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="filteredQuestions.length"
        layout="prev, pager, next, jumper"
        @current-change="onPageChange"
        background
      />
      <div class="page-size-selector">
        <span class="page-size-label">每頁顯示</span>
        <el-select v-model="pageSize" style="width: 100px" @change="currentPage = 1">
          <el-option label="20 題" :value="20" />
          <el-option label="30 題" :value="30" />
          <el-option label="50 題" :value="50" />
        </el-select>
      </div>
    </div>

    <!-- Floating Back-to-Top Button -->
    <transition name="fade">
      <el-button
        v-if="showBackToTop"
        type="primary"
        circle
        class="back-to-top-btn"
        :icon="CaretTop"
        @click="scrollToTop"
      />
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useExamStore } from '../stores/examStore'
import { normalizeAnswer } from '../utils/questionHelper'
import {
  ArrowLeft, View, Hide, Search, CircleCheck, InfoFilled,
  Reading, DocumentDelete, CaretTop
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const store = useExamStore()

const optLabels = ['A', 'B', 'C', 'D', 'E']

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

// ── Back to Top Floating Button ───────────────────────
const showBackToTop = ref(false)

function handleScroll() {
  showBackToTop.value = window.scrollY > 300
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'instant' })
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
/* ── Page Layout ── */
.study-browse-page {
  padding-bottom: 40px;
}

/* ── Header ── */
.browse-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
  padding: 8px 0;
}
.back-btn {
  flex-shrink: 0;
  margin-top: 4px;
}
.header-content {
  flex: 1;
  min-width: 0;
}
.browse-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.8rem;
  font-weight: 800;
  margin: 0 0 6px 0;
  color: var(--color-text);
}
.browse-sub {
  font-size: 0.88rem;
  color: var(--color-text-muted);
  margin: 0;
  line-height: 1.4;
}
.vol-label-main {
  font-weight: 700;
  color: var(--color-primary-light);
}
.vol-label-sub {
  color: var(--color-text-muted);
}

/* ── Sticky Toolbar Wrapper ── */
.sticky-toolbar-wrapper {
  position: relative;
  z-index: 98;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 16px 18px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(20px);
  transition: all 0.3s ease;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.search-input {
  flex: 1;
  min-width: 240px;
}
.answer-toggle-btn {
  font-weight: 600;
  border-radius: 8px;
  flex-shrink: 0;
}
.result-count {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  margin-left: auto;
}
.result-count strong {
  color: var(--color-primary-light);
  font-weight: 700;
}

/* ── Volume Selector inside Sticky Top Wrapper ── */
.volume-selector-bar {
  background: transparent;
  border: none;
  border-bottom: 1px dashed var(--color-border);
  padding: 0 0 12px 0;
  margin-bottom: 12px;
  box-shadow: none;
  border-radius: 0;
  backdrop-filter: none;
}
.volume-tabs {
  display: flex;
  gap: 10px;
  padding-bottom: 4px;
}
.vol-tab {
  flex-shrink: 0;
  padding: 8px 16px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
  min-width: 110px;
}
.tab-vol {
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.3;
}
.tab-sub {
  font-size: 0.68rem;
  font-weight: 400;
  opacity: 0.75;
  line-height: 1.2;
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.vol-tab:hover {
  background: rgba(79, 142, 247, 0.08);
  border-color: var(--color-primary-light);
  color: var(--color-primary-light);
}
.vol-tab.active {
  background: rgba(79, 142, 247, 0.15);
  border-color: var(--color-primary);
  color: var(--color-primary-light);
  box-shadow: 0 4px 12px rgba(79, 142, 247, 0.15);
}

/* ── Empty state ── */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--color-text-muted);
}
.empty-state .el-icon {
  opacity: 0.3;
  margin-bottom: 16px;
  display: block;
}

/* ── Question List ── */
.question-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}

.question-card {
  display: flex;
  gap: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 22px 24px;
  transition: all 0.25s ease;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
}
.question-card.revealed {
  border-color: rgba(52, 211, 153, 0.35);
  background: rgba(52, 211, 153, 0.02);
  box-shadow: 0 4px 18px rgba(52, 211, 153, 0.05);
}

.q-number {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--color-primary-light);
  background: rgba(79, 142, 247, 0.1);
  border-radius: 10px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.q-body {
  flex: 1;
  min-width: 0;
}
.q-text {
  font-size: 1rem;
  font-weight: 500;
  line-height: 1.75;
  margin: 0 0 16px 0;
  color: var(--color-text);
}

.q-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}
.q-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  transition: all 0.2s ease;
}
.q-option.is-correct {
  border-color: rgba(52, 211, 153, 0.5) !important;
  background: rgba(52, 211, 153, 0.08) !important;
}
.opt-label {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--color-primary-light);
  background: rgba(79, 142, 247, 0.12);
  border-radius: 6px;
  padding: 2px 8px;
  flex-shrink: 0;
  margin-top: 1px;
}
.q-option.is-correct .opt-label {
  color: #34d399;
  background: rgba(52, 211, 153, 0.15);
}
.opt-text {
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--color-text);
  flex: 1;
}
.correct-icon {
  color: #34d399;
  flex-shrink: 0;
  margin-top: 3px;
  font-size: 16px;
}

.q-explanation {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: rgba(251, 146, 60, 0.08);
  border: 1px solid rgba(251, 146, 60, 0.25);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 0.88rem;
  color: var(--color-text-muted);
  line-height: 1.6;
  margin-bottom: 16px;
}
.q-explanation .el-icon {
  color: rgba(251, 146, 60, 0.8);
  flex-shrink: 0;
  margin-top: 2px;
}

.q-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* ── Pagination Bar ── */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
  padding: 24px 0 40px 0;
  border-top: 1px dashed var(--color-border);
  margin-top: 20px;
}
.page-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  color: var(--color-text-muted);
}
.page-size-label {
  white-space: nowrap;
}

/* ── Floating Back to Top ── */
.back-to-top-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 100;
  width: 48px;
  height: 48px;
  box-shadow: 0 4px 20px rgba(79, 142, 247, 0.4);
  background: var(--color-primary) !important;
  border-color: var(--color-primary) !important;
  color: #fff !important;
  font-size: 20px;
  transition: all 0.2s ease;
}
.back-to-top-btn:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 24px rgba(79, 142, 247, 0.5);
}

/* ── Search highlight ── */
:global(.kw-highlight) {
  background: rgba(251, 211, 10, 0.4);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}

/* ── Media Queries (Mobile optimizations) ── */
@media (max-width: 768px) {
  .browse-title {
    font-size: 1.4rem;
  }
  .browse-sub {
    font-size: 0.8rem;
  }
  .sticky-toolbar-wrapper {
    position: relative; /* already set globally; ensure no sticky override */
    top: 0;             /* remove sticky offset */
    padding: 10px 12px;
    border-radius: 12px;
  }
  .toolbar {
    gap: 10px;
  }
  .search-input {
    min-width: 100%;
  }
  .answer-toggle-btn {
    flex: 1;
    text-align: center;
  }
  .result-count {
    margin-left: 0;
    width: 100%;
    text-align: right;
  }
  .pagination-bar {
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .back-to-top-btn {
    bottom: 24px;
    right: 16px;
    width: 42px;
    height: 42px;
    font-size: 18px;
  }
}
</style>
