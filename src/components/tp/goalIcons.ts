import type { Component } from 'vue'
import {
  Bike, Car, Gamepad2, Gem, Gift, GraduationCap, House, Laptop, LifeBuoy, PiggyBank, Plane, TreePalm, Trophy
} from 'lucide-vue-next'

// Las metas guardan su ícono como emoji (datos de la v1). En pantalla se muestra
// el ícono de trazo equivalente: el design system no usa emojis.
export const goalIcons: { key: string; icon: Component; label: string }[] = [
  { key: '✈️', icon: Plane, label: 'Viaje' },
  { key: '🏝️', icon: TreePalm, label: 'Vacaciones' },
  { key: '⚽', icon: Trophy, label: 'Evento' },
  { key: '🛟', icon: LifeBuoy, label: 'Emergencias' },
  { key: '🏍️', icon: Bike, label: 'Moto' },
  { key: '🚗', icon: Car, label: 'Carro' },
  { key: '🏠', icon: House, label: 'Casa' },
  { key: '🎓', icon: GraduationCap, label: 'Estudio' },
  { key: '💍', icon: Gem, label: 'Joya' },
  { key: '🎮', icon: Gamepad2, label: 'Juegos' },
  { key: '💻', icon: Laptop, label: 'Tecnología' },
  { key: '🎁', icon: Gift, label: 'Regalo' }
]

export const goalIcon = (key?: string): Component => goalIcons.find(g => g.key === key)?.icon || PiggyBank
