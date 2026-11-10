import type { Component } from 'vue'
import { BriefcaseBusiness, Car, Hammer, Heart, MapPin, Music, PartyPopper, Plane, Tent, TreePalm, Trophy, UtensilsCrossed } from 'lucide-vue-next'

// Íconos de los viajes y eventos (se guarda la clave, no el componente)
export const eventIcons: { key: string; icon: Component; label: string }[] = [
  { key: 'map-pin', icon: MapPin, label: 'Lugar' },
  { key: 'plane', icon: Plane, label: 'Viaje' },
  { key: 'palm', icon: TreePalm, label: 'Vacaciones' },
  { key: 'car', icon: Car, label: 'Paseo en carro' },
  { key: 'tent', icon: Tent, label: 'Camping' },
  { key: 'party', icon: PartyPopper, label: 'Fiesta' },
  { key: 'heart', icon: Heart, label: 'Boda o pareja' },
  { key: 'music', icon: Music, label: 'Concierto' },
  { key: 'trophy', icon: Trophy, label: 'Partido' },
  { key: 'food', icon: UtensilsCrossed, label: 'Comida' },
  { key: 'work', icon: BriefcaseBusiness, label: 'Trabajo' },
  { key: 'hammer', icon: Hammer, label: 'Arreglos' }
]

export const eventIcon = (key?: string): Component => eventIcons.find(i => i.key === key)?.icon || MapPin

// Colores que se ven bien sobre el fondo noche (los mismos de las categorías)
export const eventColors = ['#5f7fe8', '#7cc7ff', '#7ee6e6', '#4ade96', '#f5bd4f', '#ffb38a', '#ff9ac4', '#c5b4ff']
