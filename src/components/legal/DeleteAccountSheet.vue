<template>
  <!-- Eliminar la cuenta y todos sus datos (Google Play y Ley 1581: supresión) -->
  <TpSheet title="Eliminar mi cuenta" @close="!busy && emit('close')">
    <div class="flex gap-3 rounded-tile border border-danger/40 bg-danger/10 p-4 text-sm/[21px] text-ink-muted [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-danger">
      <TriangleAlert :stroke-width="1.75" aria-hidden="true" />
      <span><strong class="text-ink">No se puede deshacer.</strong> Se borra todo y no hay forma de recuperarlo.</span>
    </div>
    <div class="flex flex-col gap-2 text-sm/[21px] text-ink-muted">
      <span class="font-semibold text-ink">Se borra:</span>
      <ul class="m-0 flex list-disc flex-col gap-1.5 pl-5">
        <li>Tu perfil, tu PIN y tus autorizaciones.</li>
        <li>Cuentas, tarjetas, movimientos, categorías, quincenas, presupuestos, metas, gastos automáticos y lo pendiente por confirmar.</li>
        <li>Tu usuario para iniciar sesión{{ hasFullPlan ? ', y con él tu plan Completo' : '' }}.</li>
      </ul>
      <span class="text-xs/[17px] text-ink-faint">
        Solo se conservan los registros de pago (sin datos de tarjeta), como exige la ley contable.
      </span>
    </div>

    <PasswordField v-if="method === 'password'" v-model="password" label="Tu contraseña, para confirmar" autocomplete="current-password" />
    <p v-else-if="method === 'google'" class="m-0 text-[13px]/[19px] text-ink-muted">Para confirmar te pediremos entrar de nuevo con Google.</p>

    <label class="flex cursor-pointer items-start gap-3 text-sm/5 text-ink">
      <input v-model="understood" type="checkbox" class="mt-0.5 size-4 shrink-0 accent-primary" />
      Entiendo que mi cuenta y mis datos se borran para siempre.
    </label>
    <p v-if="error" role="alert" class="m-0 text-sm text-danger">{{ error }}</p>

    <template #footer>
      <div class="hidden lg:block"><TpButton variant="ghost" :disabled="busy" @click="emit('close')">Cancelar</TpButton></div>
      <TpButton variant="danger" block class="lg:w-auto lg:min-w-44" :disabled="busy || !canDelete" @click="remove">
        {{ busy ? 'Eliminando…' : 'Eliminar mi cuenta' }}
      </TpButton>
    </template>
  </TpSheet>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import TpSheet from '@/components/tp/TpSheet.vue'
import TpButton from '@/components/tp/TpButton.vue'
import PasswordField from '@/components/security/PasswordField.vue'
import { deleteAccount, deletionMethod } from '@/services/accountDeletion.service'
import { authErrorMessage } from '@/services/auth.service'
import { hasFullPlan } from '@/services/plan.service'

const emit = defineEmits<{ close: [] }>()

const method = deletionMethod()
const password = ref('')
const understood = ref(false)
const busy = ref(false)
const error = ref('')
const canDelete = computed(() => understood.value && (method !== 'password' || !!password.value))

async function remove() {
  busy.value = true
  error.value = ''
  try {
    await deleteAccount(password.value)
    // Sin usuario la app vuelve sola al inicio (landing en la web, acceso en Android)
  } catch (e) {
    const code = (e as { code?: string }).code
    error.value =
      code === 'auth/requires-recent-login'
        ? 'Por seguridad, cierra sesión, vuelve a entrar y elimina la cuenta enseguida.'
        : code === 'auth/popup-closed-by-user'
          ? 'Cancelaste la confirmación con Google.'
          : authErrorMessage(e)
  } finally {
    busy.value = false
  }
}
</script>
