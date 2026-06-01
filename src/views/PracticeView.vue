<template>
  <div class="page-container practice-page">
    <!-- Header -->
    <div class="practice-header">
      <el-button :icon="ArrowLeft" @click="$router.push('/')" circle class="back-btn" />
      <div class="header-content">
        <h1 class="practice-title">
          <el-icon><EditPen /></el-icon>
          練習題
        </h1>
        <p class="practice-sub">
          <span class="vol-label-main">{{ currentVolume }}</span>
          <span v-if="currentSubject" class="vol-label-sub"> - {{ currentSubject }}</span>
          ‧ 共 {{ filteredQuestions.length }} / {{ volumeQuestions.length }} 題
        </p>
      </div>
    </div>

    <!-- Sticky Toolbar -->
    <div class="sticky-toolbar-wrapper">
      <!-- Volume Tabs -->
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
              <span v-if="practiceVolumeSubjectMap[vol]" class="tab-sub">{{ practiceVolumeSubjectMap[vol] }}</span>
            </div>
          </div>
        </el-scrollbar>
      </div>

      <!-- Search + Toggle -->
      <div class="toolbar">
        <el-input
          v-model="searchKeyword"
          placeholder="🔍 搜尋練習題關鍵字..."
          clearable
          class="search-input"
          @input="onSearch"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>

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
      <p>{{ searchKeyword ? '找不到符合的題目' : '此冊尚無練習題' }}</p>
      <el-button v-if="searchKeyword" @click="searchKeyword = ''" plain>清除搜尋</el-button>
    </div>

    <!-- Chapter groups (grouped by chapter only) -->
    <div v-else class="question-groups">
      <div v-for="group in pagedGroups" :key="group.chapter" class="chapter-block">
        <!-- Chapter header (clickable to collapse) -->
        <div class="chapter-header" @click="toggleChapter(group.chapter)">
          <div class="chapter-badge">
            <el-icon><Collection /></el-icon>
          </div>
          <div class="chapter-info">
            <h2 class="chapter-title">{{ group.chapter }}</h2>
          </div>
          <span class="chapter-count">{{ group.questions.length }} 題</span>
          <el-icon class="chapter-toggle-icon" :class="{ collapsed: collapsedChapters.has(group.chapter) }">
            <ArrowDown />
          </el-icon>
        </div>

        <!-- Collapsible content -->
        <transition name="collapse">
          <div v-if="!collapsedChapters.has(group.chapter)" class="chapter-content">
            <template v-for="(q, idx) in group.questions" :key="q.id">
              <!-- Section sub-header (show when section changes) -->
              <div
                v-if="q.section && (idx === 0 || q.section !== group.questions[idx - 1].section)"
                class="section-divider"
              >
                <span class="section-label">{{ q.section }}</span>
              </div>

              <!-- Question card -->
              <div
                class="question-card"
                :class="{ revealed: isAnswerVisible(q) }"
              >
                <div class="q-number">{{ q._globalIdx }}</div>
                <div class="q-body">
                  <p class="q-text" v-html="highlight(q.question)"></p>

                  <transition name="answer-slide">
                    <div v-if="isAnswerVisible(q)" class="q-answer">
                      <div class="answer-content" v-html="formatAnswer(highlight(q.answer))"></div>
                    </div>
                  </transition>

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
            </template>
          </div>
        </transition>
      </div>
    </div>

    <!-- Pagination -->
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

    <!-- Back to Top -->
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
import {
  ArrowLeft, ArrowDown, View, Hide, Search, EditPen,
  DocumentDelete, CaretTop, Collection,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

// ── Load practice data ─────────────────────────────────
const practiceModules = import.meta.glob('../data/practice/*.json', { eager: true })
const allPracticeQuestions = Object.values(practiceModules).flatMap(m =>
  Array.isArray(m.default) ? m.default : []
)

const practiceVolumeSubjectMap = computed(() => {
  const map = {}
  allPracticeQuestions.forEach(q => {
    if (q.volume && q.subject && !map[q.volume]) map[q.volume] = q.subject
  })
  return map
})

function volOrder(v) {
  const m = v.match(/第(\d+)冊/)
  return m ? parseInt(m[1]) : 999
}
const availableVolumes = computed(() => {
  const seen = new Set(allPracticeQuestions.map(q => q.volume).filter(Boolean))
  return [...seen].sort((a, b) => volOrder(a) - volOrder(b))
})

// ── Current volume ─────────────────────────────────────
const firstVol = availableVolumes.value[0] || ''
const currentVolume = ref(route.params.volume || firstVol)
const currentSubject = computed(() => practiceVolumeSubjectMap.value[currentVolume.value] || '')

watch(() => route.params.volume, v => {
  if (v && v !== currentVolume.value) currentVolume.value = v
})

function switchVolume(vol) {
  currentVolume.value = vol
  router.replace({ name: 'practice', params: { volume: vol } })
  currentPage.value = 1
  clearTimeout(searchTimer)
  searchKeyword.value = ''
  debouncedKeyword.value = ''
  revealedIds.value = new Set()
  hiddenIds.value = new Set()
  collapsedChapters.value = new Set()
}

// ── Questions ──────────────────────────────────────────
const volumeQuestions = computed(() =>
  allPracticeQuestions.filter(q => q.volume === currentVolume.value)
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
    q.answer.toLowerCase().includes(kw)
  )
})

// ── Pagination ─────────────────────────────────────────
const pageSize = ref(30)
const currentPage = ref(1)

const pagedQuestions = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredQuestions.value
    .slice(start, start + pageSize.value)
    .map((q, i) => ({ ...q, _globalIdx: start + i + 1 }))
})

// Group by chapter only; sections become inline dividers
const pagedGroups = computed(() => {
  const groups = []
  const groupMap = new Map()
  pagedQuestions.value.forEach(q => {
    const key = q.chapter
    if (!groupMap.has(key)) {
      const g = { chapter: q.chapter, questions: [] }
      groupMap.set(key, g)
      groups.push(g)
    }
    groupMap.get(key).questions.push(q)
  })
  return groups
})

function onPageChange() {
  window.scrollTo({ top: 0, behavior: 'instant' })
}

// ── Collapse ───────────────────────────────────────────
const collapsedChapters = ref(new Set())

function toggleChapter(chapter) {
  const s = new Set(collapsedChapters.value)
  if (s.has(chapter)) s.delete(chapter)
  else s.add(chapter)
  collapsedChapters.value = s
}

// ── Answer Reveal (default: show all) ─────────────────
const showAnswersGlobal = ref(true)
const revealedIds = ref(new Set())
const hiddenIds = ref(new Set())

function isAnswerVisible(q) {
  return showAnswersGlobal.value
    ? !hiddenIds.value.has(q.id)
    : revealedIds.value.has(q.id)
}

function toggleGlobal() {
  showAnswersGlobal.value = !showAnswersGlobal.value
  revealedIds.value = new Set()
  hiddenIds.value = new Set()
}

function toggleReveal(id) {
  if (showAnswersGlobal.value) {
    const s = new Set(hiddenIds.value)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    hiddenIds.value = s
  } else {
    const s = new Set(revealedIds.value)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    revealedIds.value = s
  }
}

watch(currentVolume, () => {
  revealedIds.value = new Set()
  hiddenIds.value = new Set()
  collapsedChapters.value = new Set()
})

// ── Helpers ────────────────────────────────────────────
function highlight(text) {
  const kw = debouncedKeyword.value.trim()
  if (!kw || !text) return text
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(escaped, 'gi'), m => `<mark class="kw-highlight">${m}</mark>`)
}

function formatAnswer(text) {
  if (!text) return text
  return text
    .replace(/\n/g, '<br>')
    .replace(/(\d+\.\s)/g, '<br><strong>$1</strong>')
    .replace(/^<br>/, '')
}

// ── Back to Top ────────────────────────────────────────
const showBackToTop = ref(false)
function handleScroll() { showBackToTop.value = window.scrollY > 300 }
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'instant' }) }

onMounted(() => window.addEventListener('scroll', handleScroll))
onUnmounted(() => window.removeEventListener('scroll', handleScroll))
</script>

<style scoped>
.practice-page { padding-bottom: 40px; }

/* Header */
.practice-header {
  display: flex; align-items: flex-start; gap: 16px;
  margin-bottom: 20px; padding: 8px 0;
}
.back-btn { flex-shrink: 0; margin-top: 4px; }
.header-content { flex: 1; min-width: 0; }
.practice-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 1.8rem; font-weight: 800; margin: 0 0 6px 0;
  color: var(--color-text);
}
.practice-sub { font-size: 0.88rem; color: var(--color-text-muted); margin: 0; line-height: 1.4; }
.vol-label-main { font-weight: 700; color: #a78bfa; }
.vol-label-sub { color: var(--color-text-muted); }

/* Toolbar */
.sticky-toolbar-wrapper {
  position: relative; z-index: 98;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px; padding: 16px 18px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  backdrop-filter: blur(20px);
}
.toolbar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.search-input { flex: 1; min-width: 240px; }
.answer-toggle-btn { font-weight: 600; border-radius: 8px; flex-shrink: 0; }
.result-count { font-size: 0.85rem; color: var(--color-text-muted); white-space: nowrap; margin-left: auto; }
.result-count strong { color: #a78bfa; font-weight: 700; }

/* Volume Tabs */
.volume-selector-bar {
  border-bottom: 1px dashed var(--color-border);
  padding: 0 0 12px 0; margin-bottom: 12px;
}
.volume-tabs { display: flex; gap: 10px; padding-bottom: 4px; }
.vol-tab {
  flex-shrink: 0; padding: 8px 16px; border-radius: 10px;
  cursor: pointer; color: var(--color-text-muted);
  border: 1px solid var(--color-border);
  background: var(--color-surface-2);
  transition: all 0.2s ease; white-space: nowrap;
  display: flex; flex-direction: column; gap: 2px;
  align-items: flex-start; min-width: 110px;
}
.tab-vol { font-size: 0.85rem; font-weight: 700; line-height: 1.3; }
.tab-sub { font-size: 0.68rem; font-weight: 400; opacity: 0.75; line-height: 1.2; max-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vol-tab:hover { background: rgba(167,139,250,0.08); border-color: #a78bfa; color: #a78bfa; }
.vol-tab.active { background: rgba(167,139,250,0.15); border-color: #a78bfa; color: #a78bfa; box-shadow: 0 4px 12px rgba(167,139,250,0.2); }

/* Empty */
.empty-state { text-align: center; padding: 80px 20px; color: var(--color-text-muted); }
.empty-state .el-icon { opacity: 0.3; margin-bottom: 16px; display: block; }

/* Chapter groups */
.question-groups { display: flex; flex-direction: column; gap: 20px; margin-bottom: 32px; }

.chapter-block {
  border-radius: 16px; overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  box-shadow: 0 2px 16px rgba(0,0,0,0.04);
}

.chapter-header {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(167,139,250,0.08), rgba(79,142,247,0.04));
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}
.chapter-header:hover { background: linear-gradient(135deg, rgba(167,139,250,0.14), rgba(79,142,247,0.08)); }

.chapter-badge {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(167,139,250,0.15); color: #a78bfa;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; font-size: 16px;
}
.chapter-info { flex: 1; min-width: 0; }
.chapter-title { font-size: 0.98rem; font-weight: 800; color: var(--color-text); margin: 0; line-height: 1.4; }
.chapter-count {
  font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted);
  background: var(--color-surface-2); border: 1px solid var(--color-border);
  border-radius: 20px; padding: 2px 10px; white-space: nowrap; flex-shrink: 0;
}
.chapter-toggle-icon {
  color: var(--color-text-muted); flex-shrink: 0;
  transition: transform 0.25s ease;
}
.chapter-toggle-icon.collapsed { transform: rotate(-90deg); }

/* Collapse transition */
.collapse-enter-active { transition: all 0.28s ease; }
.collapse-leave-active { transition: all 0.22s ease; }
.collapse-enter-from { opacity: 0; max-height: 0; }
.collapse-enter-to { opacity: 1; max-height: 9999px; }
.collapse-leave-from { opacity: 1; max-height: 9999px; }
.collapse-leave-to { opacity: 0; max-height: 0; }

/* Section divider (inline within chapter) */
.section-divider {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 20px 6px;
  border-top: 1px dashed var(--color-border);
}
.section-divider:first-child { border-top: none; }
.section-label {
  font-size: 0.78rem; font-weight: 700; color: #a78bfa;
  background: rgba(167,139,250,0.1);
  border-radius: 6px; padding: 2px 10px;
  white-space: nowrap;
}

/* Questions */
.question-card {
  display: flex; gap: 14px;
  padding: 18px 20px;
  border-top: 1px solid var(--color-border);
  transition: background 0.2s;
}
.question-card:first-child { border-top: none; }
.question-card.revealed { background: rgba(167,139,250,0.025); }
.question-card:hover { background: rgba(79,142,247,0.02); }

.q-number {
  font-size: 0.7rem; font-weight: 800; color: #a78bfa;
  background: rgba(167,139,250,0.12); border-radius: 8px;
  width: 28px; height: 28px; display: flex; align-items: center;
  justify-content: center; flex-shrink: 0; margin-top: 2px;
}
.q-body { flex: 1; min-width: 0; }
.q-text {
  font-size: 0.97rem; font-weight: 600; line-height: 1.75;
  margin: 0 0 12px 0; color: var(--color-text);
}

/* Answer */
.q-answer {
  background: linear-gradient(135deg, rgba(52,211,153,0.06), rgba(16,185,129,0.03));
  border: 1px solid rgba(52,211,153,0.28);
  border-radius: 10px; padding: 12px 16px;
  margin-bottom: 12px; overflow: hidden;
}
.answer-content { font-size: 0.9rem; line-height: 1.8; color: var(--color-text); }
.answer-content :deep(strong) { color: var(--color-primary-light); font-weight: 700; }

/* Answer animation */
.answer-slide-enter-active { transition: all 0.25s ease; }
.answer-slide-leave-active { transition: all 0.18s ease; }
.answer-slide-enter-from { opacity: 0; max-height: 0; transform: translateY(-6px); }
.answer-slide-enter-to { opacity: 1; max-height: 600px; transform: translateY(0); }
.answer-slide-leave-from { opacity: 1; max-height: 600px; }
.answer-slide-leave-to { opacity: 0; max-height: 0; }

/* Actions */
.q-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

/* Pagination */
.pagination-bar {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 20px; padding: 24px 0 40px 0;
  border-top: 1px dashed var(--color-border); margin-top: 20px;
}
.page-size-selector { display: flex; align-items: center; gap: 8px; font-size: 0.88rem; color: var(--color-text-muted); }
.page-size-label { white-space: nowrap; }

/* Back to top */
.back-to-top-btn {
  position: fixed; bottom: 24px; right: 24px; z-index: 100;
  width: 48px; height: 48px;
  box-shadow: 0 4px 20px rgba(167,139,250,0.4);
  background: #a78bfa !important; border-color: #a78bfa !important;
  color: #fff !important; transition: all 0.2s ease;
}
.back-to-top-btn:hover { transform: translateY(-4px); box-shadow: 0 6px 24px rgba(167,139,250,0.5); }

/* Fade */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Highlight */
:global(.kw-highlight) {
  background: rgba(251,211,10,0.4); color: inherit;
  border-radius: 2px; padding: 0 1px;
}

/* Mobile */
@media (max-width: 768px) {
  .practice-title { font-size: 1.4rem; }
  .sticky-toolbar-wrapper { padding: 10px 12px; border-radius: 12px; }
  .toolbar { gap: 10px; }
  .search-input { min-width: 100%; }
  .answer-toggle-btn { flex: 1; text-align: center; }
  .result-count { margin-left: 0; width: 100%; text-align: right; }
  .chapter-header { padding: 14px 16px; gap: 10px; }
  .question-card { padding: 14px 16px; gap: 10px; }
  .pagination-bar { flex-direction: column; align-items: center; gap: 16px; }
  .back-to-top-btn { bottom: 24px; right: 16px; width: 42px; height: 42px; }
}
</style>
