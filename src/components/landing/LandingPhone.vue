<template>
  <!-- Celular de muestra para la landing. Se dibuja a 272px de ancho y `scale` lo agranda o achica
       (zoom: también cambia el espacio que ocupa). Todos los datos son de ejemplo. -->
  <div class="w-[272px] shrink-0" :style="{ zoom: scale }" aria-hidden="true">
    <div class="rounded-[42px] border border-line-strong/50 bg-[#0a0f1f] p-[7px] shadow-[0_30px_60px_rgba(3,8,28,0.6)]">
      <div class="relative flex h-[548px] flex-col gap-3 overflow-hidden rounded-[35px] bg-screen px-4 pt-3 font-sans text-ink">
        <!-- Barra de estado -->
        <div class="flex items-center justify-between px-1 text-[10px] font-semibold">
          <span>9:41</span>
          <span class="h-[18px] w-[76px] rounded-full bg-black" />
          <span class="flex items-center gap-1 [&_svg]:size-3"><Signal :stroke-width="2.5" /><Wifi :stroke-width="2.5" /><BatteryFull :stroke-width="2" /></span>
        </div>

        <!-- ===== Inicio ===== -->
        <template v-if="screen === 'home'">
          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-[11px] text-ink-muted">Hola, Laura</span>
              <span class="text-[15px] font-semibold">Tu plata hoy</span>
            </div>
            <span class="grid size-8 place-items-center rounded-full bg-primary-soft text-[11px] font-bold text-accent-light">LM</span>
          </div>
          <div class="flex flex-col">
            <span class="text-[11px] text-ink-muted">Disponible del mes</span>
            <span class="text-[26px]/8 font-semibold tracking-[-0.5px] tabular-nums">$ 1.240.000</span>
          </div>
          <div :class="[bankCardClass, 'relative [zoom:0.72]']"><BankCardFace :card="demoCard" /></div>
          <div class="grid grid-cols-4 gap-2">
            <span v-for="a in quick" :key="a.label" class="flex flex-col items-center gap-1 text-[10px] text-ink-muted">
              <span class="grid size-10 place-items-center rounded-full border border-line bg-surface-100 text-ink [&_svg]:size-4"><component :is="a.icon" :stroke-width="1.75" /></span>
              {{ a.label }}
            </span>
          </div>
          <span class="text-xs font-semibold">Últimos movimientos</span>
          <TxRows :rows="movements.slice(0, 2)" />
        </template>

        <!-- ===== Movimientos ===== -->
        <template v-else-if="screen === 'movements'">
          <span class="text-[17px] font-semibold">Movimientos</span>
          <div class="flex gap-1.5 text-[10px] font-medium">
            <span class="rounded-full bg-primary px-3 py-1 text-white">Todos</span>
            <span class="rounded-full border border-line px-3 py-1 text-ink-muted">Gastos</span>
            <span class="rounded-full border border-line px-3 py-1 text-ink-muted">Ingresos</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <span class="flex flex-col rounded-tile border border-line bg-surface-100 p-2.5">
              <span class="text-[10px] text-ink-muted">Ingresos</span><span class="text-[13px] font-semibold text-success tabular-nums">$ 3.200.000</span>
            </span>
            <span class="flex flex-col rounded-tile border border-line bg-surface-100 p-2.5">
              <span class="text-[10px] text-ink-muted">Gastos</span><span class="text-[13px] font-semibold tabular-nums">−$ 1.960.000</span>
            </span>
          </div>
          <span class="text-[11px] font-semibold text-ink-muted">Hoy</span>
          <TxRows :rows="movements.slice(0, 3)" />
          <span class="text-[11px] font-semibold text-ink-muted">Ayer</span>
          <TxRows :rows="movements.slice(3)" />
        </template>

        <!-- ===== Por confirmar ===== -->
        <template v-else-if="screen === 'inbox'">
          <div class="flex items-center justify-between">
            <span class="text-[17px] font-semibold">Por confirmar</span>
            <span class="rounded-full bg-primary-soft px-2.5 py-0.5 text-[10px] font-semibold text-accent-light">3 nuevos</span>
          </div>
          <span class="text-[11px] text-ink-muted">Llegaron de las notificaciones de tu banco.</span>
          <div v-for="p in pending" :key="p.text" class="flex flex-col gap-2.5 rounded-tile border border-line bg-surface-100 p-3">
            <div class="flex items-center gap-2.5">
              <BankBadge :bank="bankById(p.bank)" :size="26" />
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="truncate text-[12px] font-semibold">{{ p.text }}</span>
                <span class="text-[10px] text-ink-faint">{{ p.when }}</span>
              </span>
              <span class="text-[12px] font-semibold tabular-nums">{{ p.amount }}</span>
            </div>
            <div class="flex gap-1.5 text-[10px] font-medium">
              <span class="flex-1 rounded-full bg-primary py-1.5 text-center text-white">Confirmar</span>
              <span class="flex-1 rounded-full border border-line py-1.5 text-center text-ink-muted">Descartar</span>
            </div>
          </div>
        </template>

        <!-- ===== Presupuesto ===== -->
        <template v-else-if="screen === 'budget'">
          <span class="text-[17px] font-semibold">Presupuesto</span>
          <div class="flex flex-col gap-2 rounded-tile border border-line bg-surface-100 p-3">
            <span class="text-[10px] text-ink-muted">Plan del mes · te quedan</span>
            <span class="text-[22px]/7 font-semibold tabular-nums">$ 860.000</span>
            <span class="block h-1.5 overflow-hidden rounded-full bg-surface-300"><span class="block h-full w-[62%] rounded-full bg-accent-light" /></span>
            <span class="text-[10px] text-ink-faint">Llevas el 62 % de lo que planeaste gastar</span>
          </div>
          <span class="text-xs font-semibold">Metas de ahorro</span>
          <div v-for="g in goals" :key="g.name" class="flex items-center gap-3 rounded-tile border border-line bg-surface-100 p-3">
            <span class="grid size-9 place-items-center rounded-full bg-primary-soft text-accent-light [&_svg]:size-4"><component :is="g.icon" :stroke-width="1.75" /></span>
            <span class="flex min-w-0 flex-1 flex-col gap-1">
              <span class="flex justify-between text-[11px]"><span class="font-semibold">{{ g.name }}</span><span class="text-ink-muted">{{ g.pct }} %</span></span>
              <span class="block h-1 overflow-hidden rounded-full bg-surface-300"><span class="block h-full rounded-full bg-success" :style="{ width: `${g.pct}%` }" /></span>
              <span class="text-[10px] text-ink-faint">{{ g.note }}</span>
            </span>
          </div>
          <div class="flex gap-2.5 rounded-tile border border-warning/40 bg-warning/10 p-3 text-[10px]/[14px] text-ink-muted [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-warning">
            <Lightbulb :stroke-width="1.75" />
            <span>Vas rápido en <strong class="text-ink">Restaurantes</strong>: te quedan $ 45.000 hasta la quincena.</span>
          </div>
        </template>

        <!-- ===== Quincenas ===== -->
        <template v-else>
          <span class="text-[17px] font-semibold">Quincenas</span>
          <div v-for="q in paychecks" :key="q.title" class="flex flex-col gap-2 rounded-tile border border-line bg-surface-100 p-3">
            <div class="flex items-center justify-between">
              <span class="text-[12px] font-semibold">{{ q.title }}</span>
              <span class="text-[12px] font-semibold text-success tabular-nums">{{ q.income }}</span>
            </div>
            <div v-for="o in q.items" :key="o.name" class="flex items-center justify-between text-[11px]">
              <span class="flex items-center gap-1.5 text-ink-muted [&_svg]:size-3.5" :class="o.paid && '[&_svg]:text-success'">
                <component :is="o.paid ? CircleCheck : Circle" :stroke-width="2" />{{ o.name }}
              </span>
              <span class="tabular-nums">{{ o.amount }}</span>
            </div>
            <div class="flex justify-between border-t border-line pt-2 text-[11px]">
              <span class="text-ink-muted">Te queda libre</span><span class="font-semibold tabular-nums">{{ q.free }}</span>
            </div>
          </div>
        </template>

        <!-- Navegación flotante -->
        <div class="absolute inset-x-4 bottom-3 flex justify-around rounded-full border border-line bg-surface-100 py-2.5 shadow-float text-ink-faint [&_svg]:size-4">
          <component :is="n.icon" v-for="n in nav" :key="n.key" :stroke-width="1.75" :class="n.key === screen && 'text-accent-light'" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowDownLeft,
  ArrowUpRight,
  BatteryFull,
  Bell,
  Circle,
  CircleCheck,
  CreditCard,
  House,
  Lightbulb,
  List,
  MoreHorizontal,
  PiggyBank,
  Plane,
  ShieldCheck,
  Signal,
  Wallet,
  Wifi
} from 'lucide-vue-next'
import BankCardFace from '@/components/tp/BankCardFace.vue'
import BankBadge from '@/components/tp/BankBadge.vue'
import { bankById } from '@/components/tp/banks'
import { bankCardClass, type CardView } from '@/components/tp/cards'
import TxRows from './LandingTxRows.vue'

export type LandingScreen = 'home' | 'movements' | 'inbox' | 'budget' | 'paychecks'

withDefaults(defineProps<{ screen: LandingScreen; scale?: number }>(), { scale: 1 })

const demoCard: CardView = {
  id: 'demo',
  bank: bankById('nu'),
  name: 'Nu',
  kind: 'Crédito',
  number: '•••• 4526',
  labelA: 'Pago mínimo',
  valueA: '$ 310.000',
  labelB: 'Fecha límite',
  valueB: '18 nov',
  rows: []
}

const quick = [
  { label: 'Gasto', icon: ArrowUpRight },
  { label: 'Ingreso', icon: ArrowDownLeft },
  { label: 'Pagar', icon: CreditCard },
  { label: 'Más', icon: MoreHorizontal }
]

const movements = [
  { name: 'Mercado', note: 'Bancolombia · Débito', amount: '−$ 86.400', bank: 'bancolombia' },
  { name: 'Sueldo', note: 'Bancolombia · Ahorros', amount: '$ 1.600.000', bank: 'bancolombia', income: true },
  { name: 'Restaurante', note: 'Nu · Crédito', amount: '−$ 42.000', bank: 'nu' },
  { name: 'Transporte', note: 'Nequi', amount: '−$ 12.500', bank: 'nequi' },
  { name: 'Plan celular', note: 'Nu · Crédito', amount: '−$ 55.000', bank: 'nu' }
]

const pending = [
  { bank: 'bancolombia', text: 'Compra en Supermercado', when: 'Hace 5 min', amount: '$ 64.300' },
  { bank: 'nu', text: 'Compra en Farmacia', when: 'Hoy, 8:12 a. m.', amount: '$ 23.900' },
  { bank: 'bancolombia', text: 'Transferencia recibida', when: 'Ayer', amount: '$ 150.000' }
]

const goals = [
  { name: 'Viaje a la costa', pct: 48, note: '$ 120.000 por quincena', icon: Plane },
  { name: 'Fondo de emergencia', pct: 30, note: '3 meses de sueldo', icon: ShieldCheck }
]

const paychecks = [
  {
    title: 'Quincena del 15',
    income: '$ 1.600.000',
    free: '$ 690.000',
    items: [
      { name: 'Arriendo', amount: '$ 650.000', paid: true },
      { name: 'Tarjeta Nu', amount: '$ 260.000', paid: true }
    ]
  },
  {
    title: 'Quincena del 30',
    income: '$ 1.600.000',
    free: '$ 1.025.000',
    items: [
      { name: 'Servicios', amount: '$ 210.000', paid: false },
      { name: 'Ahorro viaje', amount: '$ 120.000', paid: false },
      { name: 'Plan celular', amount: '$ 55.000', paid: false }
    ]
  }
]

const nav = [
  { key: 'home', icon: House },
  { key: 'movements', icon: List },
  { key: 'accounts', icon: Wallet },
  { key: 'budget', icon: PiggyBank },
  { key: 'inbox', icon: Bell }
]
</script>
