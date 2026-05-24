<template>
  <div class="page-container">
    <!-- Sticky header: progress + timer -->
    <div class="exam-header">
      <div class="exam-meta">
        <el-tag type="info" effect="dark" size="large">{{ store.currentGroupName }}</el-tag>
        <span class="exam-progress-text">已作答 {{ answeredCount }} / {{ total }} 題</span>
      </div>
      <el-progress :percentage="progressPercent" :stroke-width="6" :show-text="false" style="margin: 10px 0 0" />
      <!-- 倒數計時器 -->
      <div v-if="config.timeLimitEnabled" class="timer-row">
        <el-icon><Timer /></el-icon>
        <span class="timer-text" :class="{ 'timer-warning': remainingSecs <= 300, 'timer-danger': remainingSecs <= 60 }">
          剩餘時間：{{ formattedTime }}
        </span>
      </div>
    </div>

    <!-- Question List -->
    <div class="question-list">
      <div
        v-for="(q, idx) in store.examQuestions"
        :key="q.id"
        :id="`q-${idx}`"
        class="question-card"
        :class="{
          answered: store.userAnswers[q.id],
          unanswered: highlightUnanswered && !store.userAnswers[q.id]
        }"
      >
        <div class="q-number">{{ idx + 1 }}</div>
        <div class="q-content">
          <p class="q-text">{{ q.question }}</p>
          <el-radio-group
            :model-value="store.userAnswers[q.id]"
            @update:model-value="(val) => store.setAnswer(q.id, val)"
            class="q-options"
          >
            <el-radio
              v-for="(opt, oi) in q.options"
              :key="oi"
              :label="String(oi + 1)"
              class="q-radio"
            >
              {{ formatOption(opt, oi) }}
            </el-radio>
          </el-radio-group>
        </div>
      </div>
    </div>

    <!-- Submit Bar -->
    <div class="submit-bar">
      <div class="submit-info">
        <span v-if="unansweredCount > 0" class="info-warning">
          <el-icon><Warning /></el-icon>
          尚有 <strong>{{ unansweredCount }}</strong> 題未作答
        </span>
        <span v-else class="info-success">
          <el-icon><CircleCheck /></el-icon> 全部作答完畢！
        </span>
      </div>
      <div class="submit-actions">
        <el-button @click="goHome">返回首頁</el-button>
        <el-button type="primary" size="large" :icon="Finished" @click="onClickSubmit">
          交卷結算
        </el-button>
      </div>
    </div>

    <!-- ── 防呆 Dialog：未完成作答 ─────────────────────────── -->
    <el-dialog
      v-model="showUnansweredDialog"
      title="⚠️ 尚有題目未作答"
      width="420px"
      :close-on-click-modal="false"
      class="submit-dialog"
      align-center
    >
      <div class="dialog-body">
        <div class="dialog-stat">
          <span class="stat-num warning-num">{{ unansweredCount }}</span>
          <span class="stat-label">題尚未作答</span>
        </div>
        <p class="dialog-hint">
          交卷後空白題目將計 <strong>0 分</strong>，確定要提交嗎？
          <br>
          你也可以先跳到第一題未作答繼續作答。
        </p>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button :icon="ArrowDown" type="warning" @click="scrollToFirstUnanswered">
            跳至第 {{ firstUnansweredIndex + 1 }} 題（未作答）
          </el-button>
          <el-button type="danger" @click="confirmSubmit">
            仍然交卷
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- ── 全部已作答：確認 Dialog ─────────────────────────── -->
    <el-dialog
      v-model="showConfirmDialog"
      title="確認交卷"
      width="360px"
      :close-on-click-modal="false"
      align-center
    >
      <div class="dialog-body">
        <div class="dialog-stat">
          <span class="stat-num success-num">{{ total }}</span>
          <span class="stat-label">題全部作答完畢</span>
        </div>
        <p class="dialog-hint">交卷後將無法修改答案，確定要提交嗎？</p>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showConfirmDialog = false">繼續作答</el-button>
          <el-button type="primary" :icon="Finished" @click="confirmSubmit">確認交卷</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useExamStore } from '../stores/examStore'
import { useConfigStore } from '../stores/configStore'
import { formatOption } from '../utils/questionHelper'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Warning, CircleCheck, Finished, Timer, ArrowDown } from '@element-plus/icons-vue'

const router = useRouter()
const store = useExamStore()
const config = useConfigStore()

const total = computed(() => store.examQuestions.length)
const answeredCount = computed(() => store.answeredCount)
const unansweredCount = computed(() => total.value - answeredCount.value)
const progressPercent = computed(() =>
  total.value ? Math.round((answeredCount.value / total.value) * 100) : 0
)

// 第一題未作答的 index
const firstUnansweredIndex = computed(() =>
  store.examQuestions.findIndex(q => !store.userAnswers[q.id])
)

// 高亮未作答題目（點擊跳至後開啟）
const highlightUnanswered = ref(false)

// Dialog 狀態
const showUnansweredDialog = ref(false)
const showConfirmDialog = ref(false)

// ── 倒數計時 ────────────────────────────────────
const remainingSecs = ref(store.currentExamTimeLimitMinutes * 60)
let timerHandle = null

const formattedTime = computed(() => {
  const m = Math.floor(remainingSecs.value / 60)
  const s = remainingSecs.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

function startTimer() {
  if (!config.timeLimitEnabled || store.currentExamTimeLimitMinutes <= 0) return
  remainingSecs.value = store.currentExamTimeLimitMinutes * 60
  timerHandle = setInterval(() => {
    remainingSecs.value--
    if (remainingSecs.value <= 0) {
      clearInterval(timerHandle)
      timerExpiredSubmit()  // 時間到 → 強制交卷
    }
  }, 1000)
}

// 時間到：強制交卷，顯示通知
function timerExpiredSubmit() {
  ElMessage({
    type: 'warning',
    message: `⏰ 作答時間已到！自動交卷，未作答 ${unansweredCount.value} 題計 0 分。`,
    duration: 4000,
    showClose: true,
  })
  doSubmit()
}

// 點擊交卷按鈕 → 防呆判斷
function onClickSubmit() {
  if (unansweredCount.value > 0) {
    showUnansweredDialog.value = true
  } else {
    showConfirmDialog.value = true
  }
}

// 跳至第一題未作答 + 開啟高亮
function scrollToFirstUnanswered() {
  showUnansweredDialog.value = false
  highlightUnanswered.value = true

  nextTick(() => {
    const el = document.getElementById(`q-${firstUnansweredIndex.value}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // 高亮 2.5 秒後自動取消
      setTimeout(() => { highlightUnanswered.value = false }, 2500)
    }
  })
}

// Dialog 內確認交卷
function confirmSubmit() {
  showUnansweredDialog.value = false
  showConfirmDialog.value = false
  doSubmit()
}

// 實際送出
function doSubmit() {
  if (timerHandle) clearInterval(timerHandle)
  store.submitExam()
  router.push({ name: 'result' })
}

// 返回首頁：有作答時需確認
function goHome() {
  if (answeredCount.value > 0) {
    ElMessageBox.confirm(
      `已作答 ${answeredCount.value} 題，離開後作答進度將會消失，確定要返回首頁嗎？`,
      '確定離開？',
      {
        type: 'warning',
        confirmButtonText: '離開',
        cancelButtonText: '繼續作答',
        confirmButtonClass: 'el-button--danger',
      }
    ).then(() => {
      if (timerHandle) clearInterval(timerHandle)
      router.push('/')
    }).catch(() => {})
  } else {
    if (timerHandle) clearInterval(timerHandle)
    router.push('/')
  }
}

onMounted(() => {
  if (!store.examQuestions.length) { router.replace('/'); return }
  startTimer()
})

onUnmounted(() => { if (timerHandle) clearInterval(timerHandle) })
</script>

<style scoped>
.exam-header {
  position: sticky;
  top: 60px;
  z-index: 50;
  background: var(--exam-header-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 14px 20px;
  margin-bottom: 24px;
}
.exam-meta {
  display: flex; align-items: center; justify-content: space-between;
}
.exam-progress-text { font-size: 0.88rem; color: var(--color-text-muted); font-weight: 500; }
.timer-row {
  display: flex; align-items: center; gap: 6px;
  margin-top: 8px;
  font-size: 0.88rem; font-weight: 600;
  color: var(--color-text-muted);
}
.timer-text { transition: color 0.3s; }
.timer-warning { color: var(--color-warning) !important; }
.timer-danger { color: var(--color-danger) !important; animation: pulse 1s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }

.question-list { display: flex; flex-direction: column; gap: 14px; margin-bottom: 100px; }
.question-card {
  display: flex; gap: 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px; padding: 20px 22px;
  transition: border-color 0.3s, background 0.3s, box-shadow 0.3s;
}
.question-card.answered {
  border-color: rgba(79,142,247,0.3);
  background: rgba(79,142,247,0.03);
}
/* 高亮未作答題目 */
.question-card.unanswered {
  border-color: rgba(245, 108, 108, 0.5) !important;
  background: rgba(245, 108, 108, 0.05) !important;
  box-shadow: 0 0 0 3px rgba(245, 108, 108, 0.15);
  animation: highlight-pulse 0.6s ease-in-out 3;
}
@keyframes highlight-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(245,108,108,0.15); }
  50% { box-shadow: 0 0 0 6px rgba(245,108,108,0.28); }
}

.q-number {
  font-size: 0.75rem; font-weight: 800;
  color: var(--color-primary-light);
  background: rgba(79,142,247,0.1);
  border-radius: 8px; width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 3px;
}
.question-card.unanswered .q-number {
  color: var(--color-danger);
  background: rgba(245,108,108,0.12);
}
.q-content { flex: 1; }
.q-text { font-size: 1rem; font-weight: 500; line-height: 1.7; margin-bottom: 14px; color: var(--color-text); }
.q-options { display: flex !important; flex-direction: column !important; gap: 8px !important; }
.q-radio {
  display: flex; align-items: flex-start;
  padding: 10px 14px; border-radius: 10px;
  border: 1px solid var(--color-border);
  transition: background 0.18s, border-color 0.18s;
  margin-right: 0 !important; width: 100%; height: auto !important;
}
.q-radio:hover { background: var(--opt-hover-bg); border-color: var(--opt-hover-border); }
:deep(.el-radio.is-checked) { background: rgba(79,142,247,0.1) !important; border-color: rgba(79,142,247,0.4) !important; }
:deep(.el-radio__input) { margin-top: 2px; }
:deep(.el-radio__label) { white-space: normal !important; line-height: 1.6 !important; color: var(--color-text) !important; }

.submit-bar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
  background: var(--submit-bar-bg);
  backdrop-filter: blur(16px);
  border-top: 1px solid var(--color-border);
  padding: 12px 24px;
  display: flex; align-items: center; justify-content: space-between;
}
.submit-info { display: flex; align-items: center; gap: 6px; font-size: 0.9rem; font-weight: 500; }
.info-warning { display: flex; align-items: center; gap: 6px; color: var(--color-warning); }
.info-success { display: flex; align-items: center; gap: 6px; color: var(--color-success); }
.submit-actions { display: flex; gap: 10px; align-items: center; }

/* Dialog styles */
.dialog-body { text-align: center; padding: 8px 0 16px; }
.dialog-stat { display: flex; align-items: baseline; justify-content: center; gap: 8px; margin-bottom: 12px; }
.stat-num { font-size: 3rem; font-weight: 900; line-height: 1; }
.warning-num { color: var(--color-warning); }
.success-num { color: var(--color-primary-light); }
.stat-label { font-size: 1rem; color: var(--color-text-muted); font-weight: 500; }
.dialog-hint { font-size: 0.9rem; color: var(--color-text-muted); line-height: 1.7; }
.dialog-footer { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
</style>
