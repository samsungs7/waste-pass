<template>
  <div class="page-container">
    <div class="mb-header">
      <div class="mb-title-row">
        <h1 class="mb-title">📒 錯題本</h1>
        <el-button
          v-if="store.examHistory.length"
          type="danger" plain size="small"
          @click="onClearAll"
        >清空全部記錄</el-button>
      </div>
      <p class="mb-subtitle" v-if="store.examHistory.length">
        共 <strong>{{ store.groupsWithHistory.length }}</strong> 個科目有練習記錄，
        待複習 <strong>{{ store.mistakeBook.length }}</strong> 題
      </p>
    </div>

    <!-- Empty State -->
    <div v-if="!store.examHistory.length" class="empty-state">
      <div class="empty-icon">📭</div>
      <p class="empty-title">尚無練習記錄</p>
      <p class="empty-hint">完成第一次考試後，錯題將自動收錄於此</p>
      <el-button type="primary" @click="$router.push('/')">回首頁開始練習</el-button>
    </div>

    <template v-else>
      <!-- 科目篩選 tabs -->
      <div class="subject-tabs">
        <button
          class="tab-btn"
          :class="{ active: selectedGroupId === null }"
          @click="selectedGroupId = null; selectedAttempt = 'all'"
        >
          全部
          <span class="tab-badge">{{ store.mistakeBook.length }}</span>
        </button>
        <button
          v-for="item in store.groupsWithHistory"
          :key="item.groupId"
          class="tab-btn"
          :class="{ active: selectedGroupId === item.groupId }"
          @click="selectGroup(item.groupId)"
        >
          <span class="tab-volume">{{ (item.volumes || []).join('、') }}</span>
          <span class="tab-subject">{{ item.groupName }}</span>
          <span class="tab-badge" v-if="activeMistakeCountByGroup[item.groupId]">
            {{ activeMistakeCountByGroup[item.groupId] }}
          </span>
        </button>
      </div>

      <!-- 全部總覽 -->
      <div v-if="selectedGroupId === null" class="overview-grid">
        <div
          v-for="item in store.groupsWithHistory"
          :key="item.groupId"
          class="overview-card"
          @click="selectGroup(item.groupId)"
        >
          <div class="ov-volume">{{ (item.volumes || []).join('、') }}</div>
          <div class="ov-subject">{{ item.groupName }}</div>
          <div class="ov-stats">
            <span class="ov-stat">
              🗂 {{ sessionsByGroup[item.groupId]?.length || 0 }} 次練習
            </span>
            <span class="ov-stat pending" v-if="activeMistakeCountByGroup[item.groupId]">
              ❌ 待複習 {{ activeMistakeCountByGroup[item.groupId] }} 題
            </span>
            <span class="ov-stat mastered" v-else>
              ✅ 全部學會！
            </span>
          </div>
          <div class="ov-arrow">→</div>
        </div>
      </div>

      <!-- 特定科目詳細 -->
      <div v-else class="subject-detail">
        <!-- 次別篩選 -->
        <div class="attempt-tabs">
          <button
            class="attempt-btn"
            :class="{ active: selectedAttempt === 'all' }"
            @click="selectedAttempt = 'all'"
          >
            歷次彙整
            <span class="tab-badge">{{ (store.activeMistakesByGroup[selectedGroupId] || []).length }}</span>
          </button>
          <button
            v-for="sess in sessionsByGroup[selectedGroupId]"
            :key="sess.sessionId"
            class="attempt-btn"
            :class="{ active: selectedAttempt === sess.sessionId }"
            @click="selectedAttempt = sess.sessionId"
          >
            第 {{ sess.attemptNo }} 次
            <span class="tab-badge secondary">{{ sess.mistakes.length }}</span>
          </button>
        </div>

        <!-- 歷次彙整 -->
        <template v-if="selectedAttempt === 'all'">
          <div
            v-if="!(store.activeMistakesByGroup[selectedGroupId]?.length)"
            class="all-mastered"
          >
            <div class="all-mastered-icon">🎉</div>
            <p>這個科目的錯題都已學會！</p>
          </div>
          <div v-else class="question-list">
            <div
              v-for="q in store.activeMistakesByGroup[selectedGroupId]"
              :key="q.id"
              class="question-card"
            >
              <div class="q-header">
                <span class="q-wrong-count" v-if="store.wrongCountById[q.id] > 1">
                  答錯 {{ store.wrongCountById[q.id] }} 次
                </span>
                <el-button
                  size="small" type="success" plain
                  @click="store.masterQuestion(q.id)"
                >已學會 ✓</el-button>
              </div>
              <QuestionReview :q="q" />
            </div>
          </div>
        </template>

        <!-- 特定次別 -->
        <template v-else>
          <div v-if="selectedSession" class="session-info">
            <span>📅 {{ formatDate(selectedSession.date) }}</span>
            <span>答錯 {{ selectedSession.mistakes.length }} 題</span>
            <el-button
              size="small" type="danger" plain
              @click="onClearSession(selectedSession)"
            >刪除此次記錄</el-button>
          </div>
          <div class="question-list" v-if="selectedSession">
            <div
              v-for="q in selectedSession.mistakes"
              :key="q.id"
              class="question-card"
              :class="{ 'is-mastered': store.masteredSet.has(q.id) }"
            >
              <div class="q-header">
                <span v-if="store.masteredSet.has(q.id)" class="mastered-tag">已學會</span>
                <el-button
                  v-else
                  size="small" type="success" plain
                  @click="store.masterQuestion(q.id)"
                >已學會 ✓</el-button>
              </div>
              <QuestionReview :q="q" />
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useExamStore } from '../stores/examStore'
import { ElMessageBox } from 'element-plus'
import QuestionReview from '../components/QuestionReview.vue'

const router = useRouter()
const store = useExamStore()

const selectedGroupId = ref(null)
const selectedAttempt = ref('all')

const activeMistakeCountByGroup = computed(() => {
  const result = {}
  Object.entries(store.activeMistakesByGroup).forEach(([gid, list]) => {
    result[gid] = list.length
  })
  return result
})

const sessionsByGroup = computed(() => store.sessionsByGroup)

const selectedSession = computed(() =>
  selectedAttempt.value === 'all'
    ? null
    : store.examHistory.find(s => s.sessionId === selectedAttempt.value)
)

function selectGroup(groupId) {
  selectedGroupId.value = groupId
  selectedAttempt.value = 'all'
}

function formatDate(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

async function onClearAll() {
  await ElMessageBox.confirm(
    '確定要清空所有練習記錄與錯題嗎？此操作無法復原。',
    '清空全部',
    { type: 'warning', confirmButtonText: '確定清空', cancelButtonText: '取消', confirmButtonClass: 'el-button--danger' }
  )
  store.clearAllMistakes()
  selectedGroupId.value = null
  selectedAttempt.value = 'all'
}

async function onClearSession(sess) {
  await ElMessageBox.confirm(
    `確定要刪除「第 ${sess.attemptNo} 次練習」的記錄嗎？`,
    '刪除記錄',
    { type: 'warning', confirmButtonText: '刪除', cancelButtonText: '取消' }
  ).then(() => {
    store.examHistory = store.examHistory.filter(s => s.sessionId !== sess.sessionId)
    localStorage.setItem('waste_pass_exam_history', JSON.stringify(store.examHistory))
    selectedAttempt.value = 'all'
  }).catch(() => {})
}
</script>

<style scoped>
.mb-header { margin-bottom: 20px; }
.mb-title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.mb-title { font-size: 1.5rem; font-weight: 800; color: var(--color-text); margin: 0; }
.mb-subtitle { font-size: 0.9rem; color: var(--color-text-muted); margin: 6px 0 0; }

/* Empty state */
.empty-state { text-align: center; padding: 80px 20px; }
.empty-icon { font-size: 4rem; margin-bottom: 16px; }
.empty-title { font-size: 1.2rem; font-weight: 700; color: var(--color-text); margin: 0 0 8px; }
.empty-hint { color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 24px; }

/* Subject tabs */
.subject-tabs {
  display: flex; gap: 8px; flex-wrap: wrap;
  margin-bottom: 20px; padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}
.tab-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface); color: var(--color-text);
  font-size: 0.85rem; cursor: pointer;
  transition: all 0.18s; flex-direction: column; text-align: left;
}
.tab-btn:hover { border-color: var(--color-primary-light); }
.tab-btn.active {
  background: var(--color-primary-light);
  border-color: var(--color-primary-light); color: #fff;
}
.tab-volume { font-size: 0.7rem; opacity: 0.75; font-weight: 500; }
.tab-subject { font-size: 0.83rem; font-weight: 600; }
.tab-badge {
  background: rgba(245,108,108,0.85); color: #fff;
  border-radius: 20px; padding: 1px 7px; font-size: 0.72rem;
  font-weight: 700; min-width: 20px; text-align: center; align-self: flex-end;
}
.tab-btn.active .tab-badge { background: rgba(255,255,255,0.3); }

/* Overview grid */
.overview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
.overview-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px; padding: 18px 20px;
  cursor: pointer; position: relative;
  transition: transform 0.18s, border-color 0.18s, box-shadow 0.18s;
}
.overview-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-primary-light);
  box-shadow: 0 4px 20px rgba(79,142,247,0.12);
}
.ov-volume { font-size: 0.72rem; color: var(--color-text-muted); font-weight: 600; margin-bottom: 4px; }
.ov-subject { font-size: 1rem; font-weight: 700; color: var(--color-text); margin-bottom: 12px; }
.ov-stats { display: flex; flex-direction: column; gap: 4px; }
.ov-stat { font-size: 0.83rem; color: var(--color-text-muted); }
.ov-stat.pending { color: var(--color-danger); font-weight: 600; }
.ov-stat.mastered { color: var(--color-success); font-weight: 600; }
.ov-arrow {
  position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
  font-size: 1.2rem; color: var(--color-text-muted); opacity: 0.4;
}

/* Subject detail */
.attempt-tabs {
  display: flex; gap: 8px; flex-wrap: wrap;
  margin-bottom: 16px;
}
.attempt-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 20px;
  border: 1px solid var(--color-border);
  background: var(--color-surface); color: var(--color-text);
  font-size: 0.85rem; cursor: pointer;
  transition: all 0.18s;
}
.attempt-btn:hover { border-color: var(--color-primary-light); }
.attempt-btn.active {
  background: var(--color-primary-light);
  border-color: var(--color-primary-light); color: #fff;
}
.tab-badge.secondary { background: var(--color-text-muted); }

.session-info {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  padding: 10px 14px; border-radius: 10px;
  background: var(--color-surface); border: 1px solid var(--color-border);
  font-size: 0.88rem; color: var(--color-text-muted);
  margin-bottom: 16px;
}

/* Question list & card */
.question-list { display: flex; flex-direction: column; gap: 14px; }
.question-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 14px; padding: 18px 20px;
  transition: opacity 0.3s;
}
.question-card.is-mastered { opacity: 0.45; }

.q-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px; flex-wrap: wrap; gap: 8px;
}
.q-wrong-count {
  font-size: 0.8rem; background: rgba(245,108,108,0.12);
  color: var(--color-danger); border-radius: 6px;
  padding: 2px 10px; font-weight: 700;
}
.mastered-tag {
  font-size: 0.8rem; background: rgba(103,194,58,0.12);
  color: var(--color-success); border-radius: 6px;
  padding: 2px 10px; font-weight: 700;
}

.all-mastered { text-align: center; padding: 60px 20px; }
.all-mastered-icon { font-size: 3.5rem; margin-bottom: 12px; }
.all-mastered p { font-size: 1.1rem; color: var(--color-text-muted); font-weight: 600; }
</style>
