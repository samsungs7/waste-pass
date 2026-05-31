import { defineStore } from 'pinia'
import { normalizeAnswer } from '../utils/questionHelper'
import { useConfigStore, VOLUME_ORDER } from './configStore'

const HISTORY_KEY = 'waste_pass_exam_history'
const MASTERED_KEY = 'waste_pass_mastered'

// 動態載入 src/data/topic/ 底下所有 .json 題庫
const modules = import.meta.glob('../data/topic/*.json', { eager: true })
const allQuestions = Object.values(modules).flatMap(m =>
  Array.isArray(m.default) ? m.default : []
)

// 舊格式 session 相容升級（有 subject 無 groupId）
function migrateHistory(sessions) {
  return sessions.map(s => {
    if (s.groupId) return s
    return {
      ...s,
      groupId: `legacy-${s.subject}`,
      groupName: s.subject,
      volumes: s.volume ? [s.volume] : [],
    }
  })
}

export const useExamStore = defineStore('exam', {
  state: () => ({
    currentGroupId: null,
    currentGroupName: null,
    currentGroupVolumes: [],
    examQuestions: [],
    userAnswers: {},
    submitted: false,
    score: 0,
    wrongQuestions: [],
    examHistory: migrateHistory(JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')),
    masteredIds: JSON.parse(localStorage.getItem(MASTERED_KEY) || '[]'),
  }),

  getters: {
    // ── 題庫基礎 getters ──────────────────────────────────────────────
    // 取得所有題目（供 BrowseView 使用）
    allQuestions: () => allQuestions,

    // 依冊別分組題目
    questionsByVolume: () => {
      const map = {}
      allQuestions.forEach(q => {
        if (!map[q.volume]) map[q.volume] = []
        map[q.volume].push(q)
      })
      return map
    },

    // 可用冊別（依順序）
    availableVolumes: () => {
      const seen = new Set(allQuestions.map(q => q.volume).filter(Boolean))
      return VOLUME_ORDER.filter(v => seen.has(v))
    },

    // 冊別 → 科目名稱對照（從題目 subject 欄位自動推導）
    // e.g. { '第五冊': '廢棄物清理許可及申報實務', ... }
    volumeSubjectMap: () => {
      const map = {}
      allQuestions.forEach(q => {
        if (q.volume && q.subject && !map[q.volume]) map[q.volume] = q.subject
      })
      return map
    },

    // 回傳 "第五冊 - 廢棄物清理許可及申報實務" 格式的標籤
    volumeLabel: (s) => (volume) => {
      const subject = s.volumeSubjectMap[volume]
      return subject ? `${volume} - ${subject}` : volume
    },

    // ── 科目相容 getters（供舊元件過渡用） ───────────────────────────
    subjects: () => {
      const map = {}
      allQuestions.forEach(q => {
        if (!map[q.subject]) map[q.subject] = []
        map[q.subject].push(q)
      })
      return map
    },
    subjectList() { return Object.keys(this.subjects) },
    subjectCount() { return this.subjects },

    // volume → subject 對照
    subjectToVolume: () => {
      const map = {}
      allQuestions.forEach(q => { if (q.subject && q.volume) map[q.subject] = q.volume })
      return map
    },

    // ── 目前考試 getters ───────────────────────────────────────────────
    totalQuestions: s => s.examQuestions.length,
    answeredCount: s => Object.keys(s.userAnswers).length,
    isPassed: s => s.score >= 60,

    currentExamTimeLimitMinutes() {
      const config = useConfigStore()
      return config.timeLimitForGroup(this.currentGroupId)
    },

    // ── 錯題本 getters ─────────────────────────────────────────────────
    masteredSet: s => new Set(s.masteredIds),

    mistakeBook() {
      const seen = new Map()
      ;[...this.examHistory].reverse().forEach(sess =>
        sess.mistakes.forEach(q => {
          if (!this.masteredSet.has(q.id)) seen.set(q.id, q)
        })
      )
      return [...seen.values()]
    },

    groupsWithHistory: s => {
      const map = new Map()
      s.examHistory.forEach(sess => {
        if (!map.has(sess.groupId))
          map.set(sess.groupId, {
            groupId: sess.groupId,
            groupName: sess.groupName,
            volumes: sess.volumes || [],
          })
      })
      return [...map.values()]
    },

    sessionsByGroup: s => {
      const map = {}
      s.examHistory.forEach(sess => {
        if (!map[sess.groupId]) map[sess.groupId] = []
        map[sess.groupId].push(sess)
      })
      return map
    },

    activeMistakesByGroup() {
      const result = {}
      ;[...this.examHistory].reverse().forEach(sess => {
        if (!result[sess.groupId]) result[sess.groupId] = new Map()
        sess.mistakes.forEach(q => {
          if (!this.masteredSet.has(q.id))
            result[sess.groupId].set(q.id, q)
        })
      })
      const final = {}
      Object.entries(result).forEach(([gid, map]) => { final[gid] = [...map.values()] })
      return final
    },

    wrongCountById: s => {
      const counts = {}
      s.examHistory.forEach(sess =>
        sess.mistakes.forEach(q => { counts[q.id] = (counts[q.id] || 0) + 1 })
      )
      return counts
    },
  },

  actions: {
    // 依考試群組開始考試（新主要入口）
    startExamByGroup(groupId) {
      const config = useConfigStore()
      const group = config.examGroups.find(g => g.id === groupId)
      if (!group) return false

      this.currentGroupId = groupId
      this.currentGroupName = group.name
      this.currentGroupVolumes = group.volumes
      this.userAnswers = {}
      this.submitted = false
      this.score = 0
      this.wrongQuestions = []

      const pool = allQuestions.filter(q => group.volumes.includes(q.volume))
      const shuffled = [...pool].sort(() => Math.random() - 0.5)
      this.examQuestions = shuffled.slice(0, Math.min(config.examQuestionCount, shuffled.length))
      return true
    },

    setAnswer(questionId, answer) {
      this.userAnswers[questionId] = answer
    },

    submitExam() {
      let correct = 0
      this.wrongQuestions = []
      this.examQuestions.forEach(q => {
        const userAns = this.userAnswers[q.id]
        if (userAns === normalizeAnswer(q.answer)) {
          correct++
        } else {
          this.wrongQuestions.push({ ...q, userAnswer: userAns || null })
        }
      })
      this.score = correct * 2
      this.submitted = true
      this._saveSession()
    },

    _saveSession() {
      if (this.wrongQuestions.length === 0) return
      const attemptNo = (this.sessionsByGroup[this.currentGroupId]?.length || 0) + 1
      const session = {
        sessionId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        groupId: this.currentGroupId,
        groupName: this.currentGroupName,
        volumes: this.currentGroupVolumes,
        date: new Date().toISOString(),
        attemptNo,
        mistakes: this.wrongQuestions.map(q => ({ ...q })),
      }
      this.examHistory = [...this.examHistory, session]
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.examHistory))
    },

    masterQuestion(questionId) {
      if (!this.masteredIds.includes(questionId)) {
        this.masteredIds = [...this.masteredIds, questionId]
        localStorage.setItem(MASTERED_KEY, JSON.stringify(this.masteredIds))
      }
    },
    unMasterQuestion(questionId) {
      this.masteredIds = this.masteredIds.filter(id => id !== questionId)
      localStorage.setItem(MASTERED_KEY, JSON.stringify(this.masteredIds))
    },
    removeMistake(questionId) { this.masterQuestion(questionId) },

    clearGroupHistory(groupId) {
      this.examHistory = this.examHistory.filter(s => s.groupId !== groupId)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(this.examHistory))
    },
    clearAllMistakes() {
      this.examHistory = []
      this.masteredIds = []
      localStorage.removeItem(HISTORY_KEY)
      localStorage.removeItem(MASTERED_KEY)
    },
  },
})
