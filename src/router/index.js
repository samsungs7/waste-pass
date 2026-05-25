import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ExamView from '../views/ExamView.vue'
import ResultView from '../views/ResultView.vue'
import MistakeBookView from '../views/MistakeBookView.vue'
import SettingsView from '../views/SettingsView.vue'
import BrowseView from '../views/BrowseView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/exam/:groupId', name: 'exam', component: ExamView },
  { path: '/result', name: 'result', component: ResultView },
  { path: '/mistakes', name: 'mistakes', component: MistakeBookView },
  { path: '/settings', name: 'settings', component: SettingsView },
  { path: '/browse/:volume', name: 'browse', component: BrowseView },
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})
