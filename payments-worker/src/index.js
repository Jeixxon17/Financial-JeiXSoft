// ─────────────────────────────────────────────────────────────────────────────
// Servicio de pagos de TuPlataAlDia (Cloudflare Workers, plan gratis).
//
// POST /checkout       La app pide el enlace de pago. Verifica la sesión de
//                      Firebase, arma la referencia TP-<uid>-<fecha> y firma el
//                      enlace de Wompi con el secreto de integridad.
// POST /wompi/events   Wompi avisa cómo quedó cada transacción. Se verifica la
//                      firma del evento y, si quedó APROBADA por el monto del
//                      plan, se escribe users/{uid}.plan = 'completo' en Firestore
//                      con la cuenta de servicio (las reglas no dejan que el
//                      usuario lo escriba).
//
// Los secretos van con `wrangler secret put` (ver README.md), nunca en el código.
// ─────────────────────────────────────────────────────────────────────────────

const PLAN_AMOUNT_IN_CENTS = 5_000_000 // $ 50.000
const CURRENCY = 'COP'
const REFERENCE = /^TP-([A-Za-z0-9]{10,64})-(\d{10,})$/

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const cors = corsHeaders(request, env)

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })

    try {
      if (request.method === 'POST' && url.pathname === '/checkout') return await checkout(request, env, cors)
      if (request.method === 'POST' && url.pathname === '/wompi/events') return await wompiEvent(request, env)
      return json({ error: 'not-found' }, 404, cors)
    } catch (error) {
      console.error(error)
      return json({ error: 'server-error' }, 500, cors)
    }
  }
}

// ───────────────────────────── Enlace de pago ─────────────────────────────

async function checkout(request, env, cors) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  const uid = token && (await firebaseUid(token, env))
  if (!uid) return json({ error: 'unauthorized' }, 401, cors)

  const body = await request.json().catch(() => ({}))
  const reference = `TP-${uid}-${Date.now()}`
  const signature = await sha256(`${reference}${PLAN_AMOUNT_IN_CENTS}${CURRENCY}${env.WOMPI_INTEGRITY_SECRET}`)

  const params = new URLSearchParams({
    'public-key': env.WOMPI_PUBLIC_KEY,
    currency: CURRENCY,
    'amount-in-cents': String(PLAN_AMOUNT_IN_CENTS),
    reference,
    'signature:integrity': signature
  })
  const redirect = safeRedirect(body.redirectUrl, env)
  if (redirect) params.set('redirect-url', redirect)
  return json({ url: `https://checkout.wompi.co/p/?${params}`, reference, redirect: !!redirect }, 200, cors)
}

// Solo se vuelve a direcciones de la app (evita redirecciones abiertas) y públicas:
// Wompi bloquea (403) el pago si la dirección de regreso es localhost. Sin dirección,
// Wompi muestra su propio resultado y la app se desbloquea igual con el evento.
function safeRedirect(value, env) {
  const usable = url => {
    try {
      const u = new URL(url)
      return u.protocol === 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ? url : ''
    } catch {
      return ''
    }
  }
  const fallback = env.APP_URL ? usable(`${env.APP_URL.replace(/\/$/, '')}/#/plan`) : ''
  if (typeof value !== 'string') return fallback
  try {
    const origin = new URL(value).origin
    return allowedOrigins(env).includes(origin) ? usable(value) || fallback : fallback
  } catch {
    return fallback
  }
}

// La sesión de Firebase: se pregunta a Identity Toolkit de quién es el token
async function firebaseUid(idToken, env) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.users?.[0]?.localId || null
}

// ───────────────────────────── Eventos de Wompi ─────────────────────────────

async function wompiEvent(request, env) {
  const event = await request.json().catch(() => null)
  if (!event?.signature?.properties || !event.data?.transaction) return new Response('bad-request', { status: 400 })

  // Firma: SHA256(valores de signature.properties + timestamp + secreto de eventos)
  const values = event.signature.properties.map(path => path.split('.').reduce((obj, key) => obj?.[key], event.data))
  const checksum = await sha256(`${values.join('')}${event.timestamp}${env.WOMPI_EVENTS_SECRET}`)
  if (checksum.toLowerCase() !== String(event.signature.checksum).toLowerCase()) {
    return new Response('invalid-signature', { status: 401 })
  }

  const tx = event.data.transaction
  const match = REFERENCE.exec(tx.reference || '')
  // Wompi reintenta si no recibe 200: lo que no es del plan se responde 200 y se ignora
  if (event.event !== 'transaction.updated' || !match) return new Response('ignored')
  if (tx.status !== 'APPROVED' || tx.amount_in_cents !== PLAN_AMOUNT_IN_CENTS || tx.currency !== CURRENCY) {
    return new Response('ignored')
  }

  const uid = match[1]
  console.log(`Pago aprobado ${tx.id} · ${tx.reference} · ${tx.payment_method_type || ''} · ${event.environment || ''}`)
  const accessToken = await googleAccessToken(env)
  const paidAt = new Date().toISOString()

  // Registro del pago (solo lo ve el dueño desde Firebase Console)
  await firestorePatch(env, accessToken, `payments/${tx.id}`, {
    uid: str(uid),
    reference: str(tx.reference),
    amount: int(tx.amount_in_cents / 100),
    method: str(tx.payment_method_type || ''),
    status: str(tx.status),
    environment: str(event.environment || ''),
    paidAt: str(paidAt)
  })

  // Desbloquea el plan del usuario
  await firestorePatch(env, accessToken, `users/${uid}`, {
    plan: str('completo'),
    planInfo: {
      mapValue: {
        fields: {
          paidAt: str(paidAt),
          reference: str(tx.reference),
          amount: int(tx.amount_in_cents / 100),
          method: str(tx.payment_method_type || ''),
          transactionId: str(tx.id)
        }
      }
    }
  })

  return new Response('ok')
}

// ───────────────────────────── Firestore (REST) ─────────────────────────────

const str = value => ({ stringValue: String(value) })
const int = value => ({ integerValue: String(Math.round(value)) })

// Escribe solo los campos dados (los demás del documento no se tocan)
async function firestorePatch(env, accessToken, path, fields) {
  const mask = Object.keys(fields)
    .map(f => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join('&')
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}?${mask}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  })
  if (!res.ok) throw new Error(`Firestore ${res.status}: ${await res.text()}`)
}

// Token de Google para la cuenta de servicio (JWT firmado con RS256)
async function googleAccessToken(env) {
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT)
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600
    })
  )

  const pem = account.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const key = await crypto.subtle.importKey(
    'pkcs8',
    Uint8Array.from(atob(pem), c => c.charCodeAt(0)),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`))
  const jwt = `${header}.${claims}.${base64url(signature)}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  })
  if (!res.ok) throw new Error(`Google token ${res.status}: ${await res.text()}`)
  return (await res.json()).access_token
}

// ───────────────────────────── Utilidades ─────────────────────────────

async function sha256(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function base64url(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const allowedOrigins = env =>
  (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || ''
  const headers = { 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type' }
  if (allowedOrigins(env).includes(origin)) headers['Access-Control-Allow-Origin'] = origin
  return headers
}

function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, 'Content-Type': 'application/json' } })
}
