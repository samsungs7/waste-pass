<template>
  <div class="page-container">
    <!-- Score Card -->
    <div class="score-section">
      <div class="score-ring" :class="store.isPassed ? 'pass' : 'fail'">
        <div class="score-inner">
          <span class="score-num">{{ store.score }}</span>
          <span class="score-unit">分</span>
        </div>
      </div>
      <div class="score-info">
        <el-alert
          :type="store.isPassed ? 'success' : 'error'"
          :title="store.isPassed ? '🎉 恭喜通過！' : '❌ 未達及格標準'"
          :description="store.isPassed
            ? `您的成績 ${store.score} 分，已達到 60 分及格門檻，繼續保持！`
            : `您的成績 ${store.score} 分，未達 60 分及格標準，建議加強練習。`"
          show-icon :closable="false" style="margin-bottom: 16px"
        />
        <div class="result-stats">
          <div class="rs-item">
            <span class="rs-val">{{ correctCount }}</span>
            <span class="rs-label">答對</span>
          </div>
          <div class="rs-item wrong">
            <span class="rs-val">{{ store.wrongQuestions.length }}</span>
            <span class="rs-label">答錯</span>
          </div>
          <div class="rs-item">
            <span class="rs-val">{{ store.totalQuestions }}</span>
            <span class="rs-label">總題數</span>
          </div>
          <div class="rs-item">
            <span class="rs-val">{{ store.score }}</span>
            <span class="rs-label">總分</span>
          </div>
        </div>
      </div>
    </div>

    <div class="result-actions">
      <el-button @click="$router.push('/')" :icon="House" size="large">返回首頁</el-button>
      <el-button type="primary" @click="retakeExam" :icon="Refresh" size="large">重新測驗</el-button>
      <el-button type="warning" @click="$router.push('/mistakes')" :icon="Collection" size="large">前往錯題本</el-button>
    </div>

    <el-divider>
      <el-icon><WarningFilled /></el-icon>
      答錯題目詳解（共 {{ store.wrongQuestions.length }} 題）
    </el-divider>

    <div v-if="store.wrongQuestions.length === 0" class="no-wrong">
      <el-icon size="48"><CircleCheck /></el-icon>
      <p>本次測驗全部答對！太厲害了！</p>
    </div>

    <div v-else class="wrong-list">
      <div v-for="(q, idx) in store.wrongQuestions" :key="q.id" class="wrong-card">
        <div class="wc-header">
          <span class="wc-index">第 {{ idx + 1 }} 題</span>
          <el-tag size="small" type="info" effect="dark">{{ q.subject }}</el-tag>
          <el-tag size="small" effect="dark">{{ q.volume }}</el-tag>
        </div>
        <p class="wc-question">{{ q.question }}</p>
        <div class="wc-options">
          <div
            v-for="(opt, oi) in q.options"
            :key="oi"
            class="wc-opt"
            :class="{
              correct: String(oi + 1) === String(q.answer),
              wrong: String(oi + 1) === q.userAnswer && q.userAnswer !== String(q.answer),
            }"
          >
            <el-icon v-if="String(oi + 1) === String(q.answer)"><CircleCheck /></el-icon>
            <el-icon v-else-if="String(oi + 1) === q.userAnswer"><CircleClose /></el-icon>
            <span v-else class="opt-dot" />
            {{ formatOption(opt, oi) }}
          </div>
        </div>
        <div v-if="!q.userAnswer" class="wc-skipped">
          <el-tag type="warning" effect="dark" size="small">未作答</el-tag>
        </div>
        <div v-if="q.explanation" class="wc-explanation">
          <el-icon><Promotion /></el-icon>
          <span>{{ q.explanation }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useExamStore } from '../stores/examStore'
import { formatOption } from '../utils/questionHelper'
import { House, Refresh, Collection, WarningFilled, CircleCheck, CircleClose, Promotion } from '@element-plus/icons-vue'

const router = useRouter()
const store = useExamStore()
const correctCount = computed(() => store.totalQuestions - store.wrongQuestions.length)

onMounted(() => { if (!store.submitted) router.replace('/') })

function retakeExam() {
  if (store.currentSubject) {
    store.startExam(store.currentSubject)
    router.push({ name: 'exam', params: { subject: store.currentSubject } })
  } else {
    router.push('/')
  }
}
</script>

<style scoped>
.score-section { display: flex; gap: 28px; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; }
.score-ring {
  width: 130px; height: 130px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.score-ring.pass { background: conic-gradient(#67c23a 0%, rgba(103,194,58,0.12) 100%); box-shadow: 0 0 36px rgba(103,194,58,0.28); }
.score-ring.fail { background: conic-gradient(#f56c6c 0%, rgba(245,108,108,0.12) 100%); box-shadow: 0 0 36px rgba(245,108,108,0.22); }
.score-inner { width: 108px; height: 108px; border-radius: 50%; background: var(--color-bg); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.score-num { font-size: 2.8rem; font-weight: 900; line-height: 1; color: var(--color-text); }
.score-unit { font-size: 0.82rem; color: var(--color-text-muted); }
.score-info { flex: 1; min-width: 240px; }
.result-stats { display: flex; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden; }
.rs-item { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 14px 8px; border-right: 1px solid var(--color-border); }
.rs-item:last-child { border-right: none; }
.rs-val { font-size: 1.7rem; font-weight: 800; color: var(--color-primary-light); }
.rs-item.wrong .rs-val { color: var(--color-danger); }
.rs-label { font-size: 0.73rem; color: var(--color-text-muted); margin-top: 2px; }
.result-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 22px; }
.no-wrong { text-align: center; padding: 56px; color: var(--color-success); font-size: 1.1rem; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.wrong-list { display: flex; flex-direction: column; gap: 14px; }
.wrong-card { background: var(--color-surface); border: 1px solid var(--wrong-card-border); border-radius: 14px; padding: 20px 22px; }
.wc-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.wc-index { font-weight: 700; color: var(--color-danger); font-size: 0.87rem; }
.wc-question { font-size: 0.98rem; font-weight: 500; line-height: 1.7; margin-bottom: 12px; color: var(--color-text); }
.wc-options { display: flex; flex-direction: column; gap: 7px; margin-bottom: 10px; }
.wc-opt { display: flex; align-items: flex-start; gap: 8px; padding: 9px 12px; border-radius: 8px; font-size: 0.9rem; border: 1px solid transparent; color: var(--color-text-muted); line-height: 1.5; }
.wc-opt.correct { background: rgba(103,194,58,0.1); border-color: rgba(103,194,58,0.3); color: #67c23a; }
.wc-opt.wrong { background: rgba(245,108,108,0.1); border-color: rgba(245,108,108,0.28); color: var(--color-danger); }
.opt-dot { width: 16px; height: 16px; flex-shrink: 0; display: inline-block; }
.wc-skipped { margin-bottom: 10px; }
.wc-explanation { display: flex; align-items: flex-start; gap: 8px; background: var(--expl-bg); border: 1px solid var(--expl-border); border-radius: 8px; padding: 11px 13px; font-size: 0.87rem; color: var(--color-text-muted); line-height: 1.7; }
.wc-explanation .el-icon { color: var(--color-primary-light); margin-top: 2px; flex-shrink: 0; }
</style>
