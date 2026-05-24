<template>
  <div>
    <p class="q-text">{{ q.question }}</p>
    <div class="q-options">
      <div
        v-for="(opt, oi) in q.options"
        :key="oi"
        class="q-option"
        :class="{
          'is-correct': isCorrectOption(oi),
          'is-wrong': isWrongOption(oi),
        }"
      >
        <span class="opt-marker">
          <span v-if="isCorrectOption(oi)">✓</span>
          <span v-else-if="isWrongOption(oi)">✗</span>
          <span v-else>{{ oi + 1 }}</span>
        </span>
        {{ formatOption(opt, oi) }}
      </div>
    </div>
    <div class="q-answer-row">
      <span class="answer-badge correct">
        正確答案：{{ formatOption(q.options[correctIndex], correctIndex) }}
      </span>
      <span v-if="q.userAnswer" class="answer-badge wrong">
        你的答案：{{ formatOption(q.options[wrongIndex], wrongIndex) }}
      </span>
      <span v-else class="answer-badge empty">未作答</span>
    </div>
    <div v-if="q.explanation" class="q-explanation">
      💡 {{ q.explanation }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatOption, normalizeAnswer } from '../utils/questionHelper'

const props = defineProps({ q: { type: Object, required: true } })

const correctIndex = computed(() => Number(normalizeAnswer(props.q.answer)) - 1)
const wrongIndex = computed(() =>
  props.q.userAnswer ? Number(props.q.userAnswer) - 1 : -1
)

function isCorrectOption(oi) { return oi === correctIndex.value }
function isWrongOption(oi) {
  return oi === wrongIndex.value && wrongIndex.value !== correctIndex.value
}
</script>

<style scoped>
.q-text {
  font-size: 0.97rem; font-weight: 500; line-height: 1.7;
  color: var(--color-text); margin-bottom: 12px;
}
.q-options { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.q-option {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 8px 12px; border-radius: 8px; font-size: 0.9rem;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted); line-height: 1.6;
  transition: background 0.15s;
}
.q-option.is-correct {
  background: rgba(103,194,58,0.1); border-color: rgba(103,194,58,0.4);
  color: var(--color-text); font-weight: 600;
}
.q-option.is-wrong {
  background: rgba(245,108,108,0.1); border-color: rgba(245,108,108,0.4);
  color: var(--color-danger); text-decoration: line-through;
}
.opt-marker {
  flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 800;
  background: rgba(79,142,247,0.1); color: var(--color-primary-light);
}
.is-correct .opt-marker { background: rgba(103,194,58,0.2); color: var(--color-success); }
.is-wrong .opt-marker { background: rgba(245,108,108,0.2); color: var(--color-danger); }

.q-answer-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.answer-badge {
  font-size: 0.8rem; font-weight: 700; border-radius: 6px; padding: 3px 10px;
}
.answer-badge.correct { background: rgba(103,194,58,0.12); color: var(--color-success); }
.answer-badge.wrong { background: rgba(245,108,108,0.12); color: var(--color-danger); }
.answer-badge.empty { background: rgba(144,147,153,0.12); color: var(--color-text-muted); }

.q-explanation {
  font-size: 0.85rem; color: var(--color-text-muted);
  background: rgba(79,142,247,0.06); border-left: 3px solid var(--color-primary-light);
  padding: 8px 12px; border-radius: 0 8px 8px 0; line-height: 1.6;
}
</style>
