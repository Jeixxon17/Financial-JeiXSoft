import type { Component } from 'vue'
import {
  Baby, Banknote, Bike, BookOpen, Briefcase, Bus, Car, Clapperboard, Coffee, CreditCard, Dog, Dumbbell, Fuel, Gamepad2,
  Gift, GraduationCap, HandCoins, HeartPulse, House, Landmark, Laptop, Lightbulb, Music, Package, ParkingSquare, PiggyBank,
  Pill, Plane, Receipt, Repeat, Scissors, Shirt, ShoppingBag, ShoppingCart, Smartphone, Tag, TrendingUp, Utensils, Wifi, Wrench
} from 'lucide-vue-next'

// Las categorías guardan su ícono como emoji (datos de la v1). En pantalla se usa
// el ícono de trazo equivalente: el design system no usa emojis.
const byEmoji: Record<string, Component> = {
  '🍔': Utensils, '🍕': Utensils, '🍽️': Utensils, '☕': Coffee,
  '🛒': ShoppingCart, '🛍️': ShoppingBag,
  '🚗': Car, '🚕': Car, '🚌': Bus, '⛽': Fuel, '🏍️': Bike, '🛵': Bike, '🅿️': ParkingSquare,
  '🏠': House, '💡': Lightbulb, '🌐': Wifi, '📱': Smartphone, '💻': Laptop, '🧑‍💻': Laptop,
  '🎮': Gamepad2, '🎬': Clapperboard, '🎵': Music, '📺': Clapperboard,
  '🏥': HeartPulse, '💊': Pill, '🏋️': Dumbbell,
  '📚': BookOpen, '🎓': GraduationCap,
  '👕': Shirt, '👟': Shirt, '💇': Scissors,
  '✈️': Plane, '🐶': Dog, '👶': Baby, '🎁': Gift,
  '💳': CreditCard, '🏦': Landmark, '💼': Briefcase, '💰': Banknote, '💵': Banknote, '📈': TrendingUp,
  '🔁': Repeat, '🧾': Receipt, '🔧': Wrench, '🐷': PiggyBank, '🤝': HandCoins,
  '📦': Package, '🏷️': Tag
}

// Si el emoji no está en la lista, se adivina por el nombre
const byName: [RegExp, Component][] = [
  [/comida|restaur|almuerzo|domicilio|desayuno/i, Utensils],
  [/caf[eé]/i, Coffee],
  [/mercado|supermerc/i, ShoppingCart],
  [/compra|ropa|tienda/i, ShoppingBag],
  [/transporte|bus|taxi|uber|metro/i, Bus],
  [/gasolina|combustible/i, Fuel],
  [/moto/i, Bike],
  [/carro|veh[ií]culo/i, Car],
  [/parque/i, ParkingSquare],
  [/casa|arriendo|hogar|madre/i, House],
  [/servicio|luz|agua|gas/i, Lightbulb],
  [/internet|celular|plan/i, Smartphone],
  [/suscrip|netflix|spotify|stream/i, Clapperboard],
  [/salud|m[eé]dic|droguer/i, HeartPulse],
  [/gimnasio|deporte/i, Dumbbell],
  [/educaci|estudio|curso|universidad/i, GraduationCap],
  [/viaje|vuelo/i, Plane],
  [/mascota|perro|gato/i, Dog],
  [/regalo/i, Gift],
  [/salario|n[oó]mina|sueldo/i, Briefcase],
  [/inter[eé]s|comisi|banco/i, Landmark],
  [/tarjeta|deuda|cr[eé]dito|cuota/i, CreditCard],
  [/ahorro|meta/i, PiggyBank],
  [/inversi/i, TrendingUp],
  [/salida|ocio|diversi|juego/i, Gamepad2]
]

export function categoryIcon(cat?: { icon?: string; name?: string }): Component {
  if (!cat) return Tag
  if (cat.icon && byEmoji[cat.icon]) return byEmoji[cat.icon]
  const hit = byName.find(([re]) => re.test(cat.name || ''))
  return hit ? hit[1] : Tag
}
