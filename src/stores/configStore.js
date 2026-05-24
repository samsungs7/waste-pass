import { defineStore } from 'pinia'

const CONFIG_KEY = 'waste_pass_config'
const GROUPS_KEY = 'waste_pass_exam_groups'

export const DEFAULT_EXAM_GROUPS = [
  { id: 'eg-1',  name: '廢棄物管理、回收再利用概論與工作倫理', volumes: ['第一冊','第二冊','第三冊'], timeLimitMinutes: 40 },
  { id: 'eg-2',  name: '廢棄物與資源循環相關法規',                volumes: ['第四冊'],               timeLimitMinutes: 50 },
  { id: 'eg-3',  name: '廢棄物清理許可及申報實務',                volumes: ['第五冊'],               timeLimitMinutes: 40 },
  { id: 'eg-4',  name: '廢棄物產源特性及減廢',                    volumes: ['第六冊'],               timeLimitMinutes: 40 },
  { id: 'eg-5',  name: '廢棄物採樣檢測及特性分析',                volumes: ['第七冊'],               timeLimitMinutes: 40 },
  { id: 'eg-6',  name: '廢棄物貯存清除技術',                      volumes: ['第八冊'],               timeLimitMinutes: 40 },
  { id: 'eg-7',  name: '廢棄物理化生物及熱處理技術',              volumes: ['第九冊','第十冊'],      timeLimitMinutes: 40 },
  { id: 'eg-8',  name: '廢棄物最終處置與資源化再利用技術',        volumes: ['第十一冊','第十二冊'],  timeLimitMinutes: 40 },
  { id: 'eg-9',  name: '廢棄物貯存清除設備操作維護管理',          volumes: ['第十三冊'],             timeLimitMinutes: 50 },
  { id: 'eg-10', name: '廢棄物處理設施操作維護及營運管理',        volumes: ['第十四冊'],             timeLimitMinutes: 40 },
  { id: 'eg-11', name: '作業安全衛生及緊急應變',                  volumes: ['第十五冊'],             timeLimitMinutes: 40 },
]

export const VOLUME_ORDER = [
  '第一冊','第二冊','第三冊','第四冊','第五冊','第六冊','第七冊',
  '第八冊','第九冊','第十冊','第十一冊','第十二冊','第十三冊','第十四冊','第十五冊',
]

export const DEFAULT_CONFIG = {
  examQuestionCount: 50,
  defaultTimeLimitMinutes: 100,
  timeLimitEnabled: true,
  theme: 'dark',
}

export const useConfigStore = defineStore('config', {
  state: () => {
    const saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null')
    const savedGroups = JSON.parse(localStorage.getItem(GROUPS_KEY) || 'null')
    const merged = { ...DEFAULT_CONFIG, ...(saved || {}) }
    // migrate legacy key
    if (saved?.examTimeLimitMinutes && !merged.defaultTimeLimitMinutes)
      merged.defaultTimeLimitMinutes = saved.examTimeLimitMinutes
    return {
      ...merged,
      examGroups: savedGroups || DEFAULT_EXAM_GROUPS.map(g => ({ ...g })),
    }
  },

  getters: {
    timeLimitForGroup: (s) => (groupId) => {
      const g = s.examGroups.find(g => g.id === groupId)
      return g?.timeLimitMinutes ?? s.defaultTimeLimitMinutes
    },
    volumeOrder: () => VOLUME_ORDER,
  },

  actions: {
    _persist() {
      const { examGroups, ...rest } = this.$state
      localStorage.setItem(CONFIG_KEY, JSON.stringify(rest))
      localStorage.setItem(GROUPS_KEY, JSON.stringify(examGroups))
    },

    applyTheme() {
      document.documentElement.setAttribute('data-theme', this.theme)
    },
    setTheme(t) { this.theme = t; this.applyTheme(); this._persist() },
    setExamQuestionCount(n) { this.examQuestionCount = Math.max(1, parseInt(n) || 50); this._persist() },
    setDefaultTimeLimitMinutes(m) { this.defaultTimeLimitMinutes = Math.max(1, parseInt(m) || 40); this._persist() },
    setTimeLimitEnabled(v) { this.timeLimitEnabled = !!v; this._persist() },

    // Group CRUD
    setGroupName(id, name) {
      const g = this.examGroups.find(g => g.id === id)
      if (g) { g.name = name; this._persist() }
    },
    setGroupVolumes(id, volumes) {
      const g = this.examGroups.find(g => g.id === id)
      if (g) { g.volumes = volumes; this._persist() }
    },
    setGroupTimeLimit(id, minutes) {
      const g = this.examGroups.find(g => g.id === id)
      if (g) { g.timeLimitMinutes = Math.max(1, parseInt(minutes) || 40); this._persist() }
    },
    addGroup() {
      this.examGroups.push({ id: `eg-${Date.now()}`, name: '新科目', volumes: [], timeLimitMinutes: 40 })
      this._persist()
    },
    removeGroup(id) {
      this.examGroups = this.examGroups.filter(g => g.id !== id)
      this._persist()
    },
    resetGroupsToDefault() {
      this.examGroups = DEFAULT_EXAM_GROUPS.map(g => ({ ...g }))
      this._persist()
    },
    resetToDefault() {
      Object.assign(this, DEFAULT_CONFIG)
      this.applyTheme()
      this._persist()
    },
  },
})
