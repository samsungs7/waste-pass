/**
 * 將選項索引轉為 (1)(2)(3)(4) 前綴標籤
 * 同時相容舊格式（已有前綴）與新格式（純文字）
 */
export function formatOption(option, index) {
  if (/^\(\d+\)/.test(String(option))) return option   // 舊格式：已有前綴
  return `(${index + 1}) ${option}`                     // 新格式：自動加前綴
}

/**
 * 統一將 answer 轉為字串，支援數字（新格式）與字串（舊格式）
 */
export function normalizeAnswer(answer) {
  return String(answer)
}
