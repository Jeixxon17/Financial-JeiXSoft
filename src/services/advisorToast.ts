// Aviso del asesor que aparece justo después de registrar un gasto
import { reactive } from 'vue'
import type { Advice } from '@/utils/plan'

export const advisorToast = reactive({
  tips: [] as Advice[],
  visible: false
})

let timer: ReturnType<typeof setTimeout> | undefined

export function showAdvice(tips: Advice[]) {
  if (!tips.length) return
  advisorToast.tips = tips.slice(0, 3)
  advisorToast.visible = true
  clearTimeout(timer)
  // Las alertas importantes se quedan más tiempo
  const serious = tips.some(t => t.level === 'danger' || t.level === 'warn')
  timer = setTimeout(hideAdvice, serious ? 12000 : 6000)
}

export function hideAdvice() {
  advisorToast.visible = false
  clearTimeout(timer)
}
