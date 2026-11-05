<template>
  <!-- Landing de la web: la app es para Android (Google Play). Desde aquí se descarga,
       y "Iniciar sesión" abre la versión web para quien ya tiene cuenta. -->
  <div class="min-h-dvh overflow-x-clip bg-bg-base font-sans text-ink antialiased">
    <!-- ===================== Portada ===================== -->
    <header class="relative overflow-hidden bg-desk pb-16 lg:pb-40">
      <!-- Resplandores y franja de luz (decoración) -->
      <span class="pointer-events-none absolute -top-48 right-[-15%] size-[720px] rounded-full bg-accent-glow/40 blur-[140px]" aria-hidden="true" />
      <span class="pointer-events-none absolute top-[30%] left-[-20%] size-[520px] rounded-full bg-primary/30 blur-[120px]" aria-hidden="true" />
      <span
        class="pointer-events-none absolute top-[45%] right-[-10%] h-56 w-[110%] -rotate-12 bg-linear-to-r from-transparent via-accent-glow/55 to-primary/30 blur-3xl"
        aria-hidden="true"
      />

      <!-- Barra superior -->
      <nav class="relative mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 pt-[calc(20px+env(safe-area-inset-top))] sm:px-8">
        <div class="flex items-center gap-2.5 text-xl font-extrabold tracking-[-0.4px]">
          <img :src="appIcon" alt="" width="36" height="36" class="size-9 rounded-chip" />
          <span>TuPlata<span class="text-accent-light">AlDia</span></span>
        </div>
        <div class="hidden items-center gap-1 lg:flex">
          <button v-for="l in links" :key="l.id" type="button" :class="navLink" @click="scrollTo(l.id)">{{ l.label }}</button>
        </div>
        <div class="flex items-center gap-2">
          <TpButton variant="ghost" size="sm" @click="emit('enter')"><LogIn :stroke-width="1.75" aria-hidden="true" />Iniciar sesión</TpButton>
          <div class="hidden sm:block">
            <TpButton size="sm" @click="scrollTo('descargar')"><Download :stroke-width="1.75" aria-hidden="true" />Descargar</TpButton>
          </div>
        </div>
      </nav>

      <!-- Título y celulares -->
      <div class="relative mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)] items-center gap-14 px-4 pt-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:pt-20">
        <div class="flex flex-col items-start gap-6">
          <span class="inline-flex items-center gap-2 rounded-full border border-line bg-surface-100/70 px-3.5 py-1.5 text-[13px] font-medium text-accent-light [&_svg]:size-4">
            <Smartphone :stroke-width="1.75" aria-hidden="true" />App para Android
          </span>
          <h1 class="m-0 font-sans text-[38px]/[44px] font-bold tracking-[-1px] sm:text-[52px]/[58px]">
            Tu plata al día,<br />sin anotar cada gasto
          </h1>
          <p class="m-0 max-w-[480px] text-[17px]/7 text-ink-muted">
            Cuentas, tarjetas, quincenas y metas en un solo lugar. La app lee las notificaciones de tu banco y te deja
            los gastos listos para confirmar.
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <StoreButton />
            <button type="button" class="cursor-pointer p-2 text-[15px] font-medium text-accent-light hover:text-ink" @click="scrollTo('funciones')">
              Ver qué hace →
            </button>
          </div>
        </div>
        <div class="relative mx-auto flex h-[430px] w-full max-w-[520px] justify-center sm:h-[600px]">
          <div class="absolute top-10 left-[4%] -rotate-6 opacity-90 motion-safe:animate-float sm:left-[6%]">
            <LandingPhone screen="movements" :scale="phoneSmall" />
          </div>
          <div class="absolute top-0 right-[4%] rotate-3 motion-safe:animate-float motion-safe:[animation-delay:-3s] sm:right-[6%]">
            <LandingPhone screen="home" :scale="phoneBig" />
          </div>
        </div>
      </div>

      <!-- Ola que corta la portada -->
      <svg class="absolute inset-x-0 bottom-0 h-20 w-full fill-bg-base lg:h-28" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 70 C 240 130, 480 10, 760 50 S 1220 120, 1440 40 L1440 120 L0 120 Z" />
      </svg>
    </header>

    <main>
      <!-- ===================== Por qué ===================== -->
      <section id="por-que" class="mx-auto flex max-w-[1240px] scroll-mt-6 flex-col items-center gap-10 px-4 py-16 sm:px-8">
        <div class="flex flex-col items-center gap-3 text-center">
          <span :class="eyebrow">Por qué TuPlataAlDia</span>
          <h2 :class="h2">Hecha para la plata en Colombia</h2>
          <p :class="lead">Pesos sin decimales, quincenas, tarjetas con corte y cuotas, y los bancos que usas todos los días.</p>
        </div>
        <div class="grid w-full grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="h in highlights" :key="h.label" class="flex flex-col items-center gap-3 rounded-card border border-line bg-surface-100 px-5 py-7 text-center">
            <span class="grid size-14 place-items-center rounded-full bg-primary-soft text-accent-light [&_svg]:size-6"><component :is="h.icon" :stroke-width="1.75" aria-hidden="true" /></span>
            <span class="text-[28px]/9 font-bold tracking-[-0.5px] tabular-nums">{{ h.value }}</span>
            <span class="text-sm text-ink-muted">{{ h.label }}</span>
          </div>
        </div>
      </section>

      <!-- ===================== Funciones ===================== -->
      <section id="funciones" class="mx-auto flex max-w-[1240px] scroll-mt-6 flex-col gap-24 px-4 py-16 sm:px-8">
        <div
          v-for="(f, i) in features"
          :key="f.title"
          class="grid grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
        >
          <div class="flex flex-col items-start gap-5" :class="i % 2 === 1 && 'lg:order-2'">
            <span :class="eyebrow">{{ f.eyebrow }}</span>
            <h2 :class="[h2, 'text-left']">{{ f.title }}</h2>
            <p :class="[lead, 'text-left']">{{ f.text }}</p>
            <ul class="m-0 flex list-none flex-col gap-4 p-0">
              <li v-for="p in f.points" :key="p.title" class="flex gap-3.5">
                <span class="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-accent-light [&_svg]:size-5"><component :is="p.icon" :stroke-width="1.75" aria-hidden="true" /></span>
                <span class="flex flex-col gap-0.5">
                  <strong class="text-[15px] font-semibold">{{ p.title }}</strong>
                  <span class="text-sm text-ink-muted">{{ p.text }}</span>
                </span>
              </li>
            </ul>
          </div>
          <!-- Celulares sobre un bloque de luz -->
          <div class="relative mx-auto flex w-full max-w-[520px] justify-center py-6">
            <span class="absolute inset-y-[12%] right-0 left-[12%] rounded-sheet bg-linear-135 from-primary to-accent-glow/40 opacity-60 blur-[2px]" aria-hidden="true" />
            <div class="relative flex items-start gap-4">
              <LandingPhone :screen="f.phones[0]" :scale="phoneSmall" />
              <div class="mt-12"><LandingPhone :screen="f.phones[1]" :scale="phoneSmall" /></div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===================== Pantallas ===================== -->
      <section id="pantallas" class="flex scroll-mt-6 flex-col items-center gap-10 py-16">
        <div class="flex flex-col items-center gap-3 px-4 text-center">
          <span :class="eyebrow">Así se ve</span>
          <h2 :class="h2">Mira la app por dentro</h2>
        </div>
        <div class="flex w-full snap-x snap-mandatory items-center gap-5 overflow-x-auto px-[max(16px,calc(50%-560px))] pt-4 pb-6 lg:justify-center lg:overflow-visible">
          <div
            v-for="(s, i) in gallery"
            :key="s"
            class="snap-center transition-transform"
            :class="i === 2 ? 'lg:-translate-y-4' : 'lg:opacity-70'"
          >
            <LandingPhone :screen="s" :scale="i === 2 ? 0.86 : 0.74" />
          </div>
        </div>
      </section>

      <!-- ===================== Planes ===================== -->
      <section id="planes" class="mx-auto flex max-w-[1000px] scroll-mt-6 flex-col items-center gap-10 px-4 py-16 sm:px-8">
        <div class="flex flex-col items-center gap-3 text-center">
          <span :class="eyebrow">Planes</span>
          <h2 :class="h2">Empieza gratis. Paga una sola vez si quieres todo.</h2>
          <p :class="lead">Sin mensualidades ni renovaciones. El pago se hace dentro de la app con Nequi, PSE, tarjeta o Botón Bancolombia.</p>
        </div>
        <div class="grid w-full grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-2">
          <div v-for="p in plans" :key="p.name" class="relative flex flex-col gap-5 rounded-sheet border p-7" :class="p.featured ? 'border-primary bg-linear-160 from-primary-soft to-surface-100 shadow-icon' : 'border-line bg-surface-100'">
            <span v-if="p.featured" class="absolute top-6 right-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">Recomendado</span>
            <div class="flex flex-col gap-1">
              <span class="text-lg font-semibold">{{ p.name }}</span>
              <span class="text-sm text-ink-muted">{{ p.text }}</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="text-[40px]/[44px] font-bold tracking-[-1px] tabular-nums">{{ p.price }}</span>
              <span class="text-sm text-ink-muted">{{ p.note }}</span>
            </div>
            <ul class="m-0 flex list-none flex-col gap-3 p-0">
              <li v-for="item in p.items" :key="item" class="flex items-start gap-2.5 text-sm [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-success">
                <Check :stroke-width="2.25" aria-hidden="true" />{{ item }}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- ===================== Descargar ===================== -->
      <section id="descargar" class="mx-auto max-w-[1240px] scroll-mt-6 px-4 py-16 sm:px-8">
        <div class="relative grid grid-cols-[minmax(0,1fr)] items-center gap-8 overflow-hidden rounded-sheet border border-line bg-desk px-7 py-12 sm:px-12 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
          <span class="pointer-events-none absolute -right-24 -bottom-40 size-[420px] rounded-full bg-accent-glow/30 blur-[100px]" aria-hidden="true" />
          <img :src="appIcon" alt="" width="88" height="88" class="relative size-[88px] rounded-card shadow-icon" />
          <div class="relative flex flex-col gap-2">
            <h2 :class="[h2, 'text-left']">Descarga TuPlataAlDia</h2>
            <p :class="[lead, 'text-left']">Crea tu cuenta gratis en el celular. Si ya tienes una, también puedes entrar desde aquí.</p>
          </div>
          <div class="relative flex flex-wrap items-center gap-3">
            <StoreButton />
            <TpButton variant="secondary" @click="emit('enter')">Entrar en la web</TpButton>
          </div>
        </div>
      </section>
    </main>

    <footer class="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-3 border-t border-line px-4 py-8 text-[13px] text-ink-faint sm:flex-row sm:px-8">
      <span>© {{ year }} TuPlataAlDia · v{{ appVersion }}</span>
      <span class="flex flex-wrap justify-center gap-x-4 gap-y-1">
        <RouterLink v-for="l in legalLinks" :key="l.to" :to="l.to" class="text-ink-faint no-underline hover:text-ink">{{ l.label }}</RouterLink>
      </span>
      <span>Desarrollado por <strong class="font-semibold text-ink-muted">JeiXSoft</strong></span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, type Component } from 'vue'
import {
  BadgeCheck,
  Bell,
  CalendarClock,
  Check,
  CreditCard,
  Download,
  FileText,
  Landmark,
  Lightbulb,
  LogIn,
  ShieldCheck,
  Smartphone,
  Target,
  Wallet
} from 'lucide-vue-next'
import TpButton from '@/components/tp/TpButton.vue'
import LandingPhone, { type LandingScreen } from '@/components/landing/LandingPhone.vue'
import StoreButton from '@/components/landing/StoreButton.vue'
import { money } from '@/components/tp/format'
import { PLAN_PRICE } from '@/services/plan.service'
import { legalLinks } from '@/legal/links'
import appIcon from '@/assets/brand/tuplata-app-icon.svg'

const emit = defineEmits<{ enter: [] }>()

const appVersion = __APP_VERSION__
const year = new Date().getFullYear()

const eyebrow = 'text-[13px] font-semibold tracking-[0.5px] text-accent-light uppercase'
const h2 = 'm-0 max-w-[640px] text-center font-sans text-[30px]/[38px] font-bold tracking-[-0.6px] sm:text-[38px]/[46px]'
const lead = 'm-0 max-w-[560px] text-center text-base/7 text-ink-muted'
const navLink = 'cursor-pointer rounded-full px-4 py-2 text-[15px] font-medium text-ink-muted transition-colors hover:bg-surface-100 hover:text-ink'

const links = [
  { id: 'funciones', label: 'Funciones' },
  { id: 'pantallas', label: 'La app' },
  { id: 'planes', label: 'Planes' },
  { id: 'descargar', label: 'Descargar' }
]

// La app usa el hash para sus rutas: los enlaces de la landing desplazan sin tocarlo
const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

// Los celulares de la portada se achican en pantallas angostas
const phoneBig = ref(1)
const phoneSmall = ref(0.86)
const media = window.matchMedia('(min-width: 640px)')
const sizePhones = () => {
  phoneBig.value = media.matches ? 1 : 0.74
  phoneSmall.value = media.matches ? 0.86 : 0.64
}
onMounted(() => {
  sizePhones()
  media.addEventListener('change', sizePhones)
})
onBeforeUnmount(() => media.removeEventListener('change', sizePhones))

const highlights = [
  { icon: Wallet, value: '$ 0', label: 'para empezar, sin tarjeta' },
  { icon: Landmark, value: 'Bancolombia y Nu', label: 'leídos desde las notificaciones' },
  { icon: ShieldCheck, value: '100 %', label: 'de tus extractos se leen en el celular' },
  { icon: BadgeCheck, value: '1 pago', label: 'para tener todo, para siempre' }
]

const features: { eyebrow: string; title: string; text: string; phones: [LandingScreen, LandingScreen]; points: { icon: Component; title: string; text: string }[] }[] = [
  {
    eyebrow: 'Sin escribir nada',
    title: 'Tus gastos llegan solos',
    text: 'Cada compra que te avisa el banco queda en "Por confirmar". Le das un toque y ya está en tus movimientos, con su cuenta y categoría.',
    phones: ['inbox', 'movements'],
    points: [
      { icon: Bell, title: 'Notificaciones y SMS del banco', text: 'Bancolombia y Nu, sin copiar nada.' },
      { icon: CreditCard, title: 'Tarjetas cuadradas con el banco', text: 'Sube el extracto en PDF: mínimo, cupo y deuda iguales.' },
      { icon: FileText, title: 'Tu extracto no sale del celular', text: 'El PDF y su clave se leen en el teléfono.' }
    ]
  },
  {
    eyebrow: 'Mes a mes',
    title: 'Sabe cuánto te queda hasta la quincena',
    text: 'Organiza lo que pagas en cada quincena, ahorra para lo que quieres y recibe un aviso antes de pasarte.',
    phones: ['budget', 'paychecks'],
    points: [
      { icon: CalendarClock, title: 'Quincenas', text: 'Arriendo, tarjetas y servicios en su fecha.' },
      { icon: Target, title: 'Metas de ahorro', text: 'Cuánto separar por quincena para llegar.' },
      { icon: Lightbulb, title: 'Un asesor que te avisa', text: 'Si un gasto se sale del plan, te lo dice.' }
    ]
  }
]

const gallery: LandingScreen[] = ['paychecks', 'movements', 'home', 'inbox', 'budget']

const plans = [
  {
    name: 'Gratis',
    text: 'Para llevar tus cuentas al día.',
    price: '$ 0',
    note: 'siempre',
    featured: false,
    items: ['Inicio con tu saldo del mes', 'Movimientos, cuentas y tarjetas', 'Registrar gastos, ingresos y pagos', 'Quincenas y categorías']
  },
  {
    name: 'Completo',
    text: 'Todo lo de Gratis, y que la app trabaje por ti.',
    price: money(PLAN_PRICE),
    note: 'pago único',
    featured: true,
    items: [
      'Gastos que llegan solos (notificaciones y SMS)',
      'Presupuesto, metas de ahorro y asesor',
      'Gastos automáticos y suscripciones',
      'Extractos en PDF y cuadrar con el banco',
      'Estadísticas mes a mes'
    ]
  }
]
</script>
