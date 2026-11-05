import { PRIVACY_VERSION, SITE_DOMAIN, TERMS_VERSION, legalOwner } from './legal'

// Textos legales. Borrador para revisar con un abogado antes de publicar en Google Play.
// Al cambiar un texto, cambiar su versión en legal.ts (la app pide aceptarlo de nuevo).

export interface LegalSection {
  title: string
  // Frase antes de la lista
  lead?: string
  bullets?: string[]
  // Párrafos (van después de la lista, si hay)
  paragraphs?: string[]
}

export interface LegalDocument {
  key: LegalDocKey
  title: string
  updated: string
  intro: string
  sections: LegalSection[]
}

export type LegalDocKey = 'terminos' | 'privacidad' | 'eliminar-cuenta'

const PRICE = '$ 50.000'
const pending = '[pendiente]'
const o = legalOwner

const longDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })

const contact = () => (o.email ? `al correo ${o.email}` : `al correo de soporte ${pending}`)

const ownerLine = () =>
  [
    `${o.name}${o.id ? `, identificado con ${o.id}` : ''}`,
    o.city ? `con domicilio en ${o.city}, Colombia` : 'con domicilio en Colombia',
    `correo ${o.email || pending}`,
    o.phone ? `teléfono ${o.phone}` : ''
  ]
    .filter(Boolean)
    .join(', ')

export function legalDocument(key: LegalDocKey): LegalDocument {
  if (key === 'terminos') return terms()
  if (key === 'privacidad') return privacy()
  return deletion()
}

// ───────────────────────────── Términos y condiciones ─────────────────────────────

function terms(): LegalDocument {
  return {
    key: 'terminos',
    title: 'Términos y condiciones',
    updated: longDate(TERMS_VERSION),
    intro:
      `Estos términos regulan el uso de TuPlataAlDia (la app para Android y su versión web en ${SITE_DOMAIN}). Al crear tu cuenta y usar la app aceptas estos términos y la Política de tratamiento de datos personales.`,
    sections: [
      {
        title: '1. Quién presta el servicio',
        paragraphs: [`TuPlataAlDia es desarrollada y ofrecida por ${ownerLine()}. Puedes escribirnos ${contact()} para cualquier petición, queja o reclamo.`]
      },
      {
        title: '2. Qué es TuPlataAlDia',
        lead: 'Es una herramienta para organizar tus finanzas personales: registrar cuentas, tarjetas, movimientos, quincenas, presupuestos y metas de ahorro.',
        bullets: [
          'No es un banco ni una entidad financiera: no guarda, mueve ni transfiere dinero, y no se conecta a tus cuentas bancarias.',
          'No es asesoría financiera, contable, tributaria ni legal. Los avisos y consejos del asesor son cálculos automáticos con los datos que tú registras y son solo informativos.',
          'Los saldos, cupos, mínimos e intereses que muestra la app son estimados. Siempre revisa los valores oficiales con tu banco.',
          'No tenemos relación con Bancolombia, Nu ni ningún otro banco. Sus nombres solo se usan para identificar tus cuentas y sus marcas pertenecen a sus dueños.'
        ]
      },
      {
        title: '3. Tu cuenta',
        bullets: [
          'Debes ser mayor de 18 años y dar datos verdaderos.',
          'Eres responsable de cuidar tu correo, tu contraseña y tu PIN. El PIN bloquea la app en tu dispositivo.',
          'La cuenta es personal: no la compartas ni la uses para administrar el dinero de otras personas sin su autorización.',
          'Puedes eliminar tu cuenta cuando quieras desde Perfil > Privacidad y datos.'
        ]
      },
      {
        title: '4. Planes y precio',
        bullets: [
          'Plan Gratis: Inicio, Movimientos, Cuentas y tarjetas, registrar gastos, ingresos y pagos, Quincenas y Categorías. No tiene costo.',
          `Plan Completo: ${PRICE} pesos colombianos en un solo pago. Es el precio total e incluye los impuestos que apliquen. No es una suscripción: no hay cobros mensuales ni renovaciones.`,
          'El plan Completo agrega: gastos que llegan solos (notificaciones y SMS del banco), presupuesto, metas y asesor, gastos automáticos, extractos y cuadrar con el banco, y estadísticas.',
          'El plan queda asociado a tu cuenta y no se puede transferir. Si eliminas tu cuenta, pierdes el plan.',
          'Podemos cambiar los precios para compras futuras. Quien ya pagó conserva su plan.'
        ]
      },
      {
        title: '5. Pagos',
        bullets: [
          'El pago lo procesa Wompi (pasarela de pagos del Grupo Bancolombia) con Nequi, PSE, tarjeta o Botón Bancolombia. Tus datos de pago los recibe Wompi; nosotros no vemos ni guardamos números de tarjeta o de cuenta.',
          'El plan se activa apenas Wompi confirma que el pago fue aprobado.',
          'Recibimos de Wompi la referencia, el valor, el medio de pago (por ejemplo "Nequi"), el estado y la fecha, para activar tu plan y llevar la contabilidad.'
        ]
      },
      {
        title: '6. Retracto, reversión y devoluciones',
        bullets: [
          'El plan Completo se activa y empieza a funcionar en el momento del pago, con tu aceptación. Por eso, una vez activado no aplica el derecho de retracto, según el numeral 1 del artículo 47 de la Ley 1480 de 2011 (servicios cuya prestación comenzó con el acuerdo del consumidor).',
          'Si pagaste y el plan no se activó, si te cobraron dos veces o si el pago no fue autorizado por ti, escríbenos y te devolvemos el dinero o activamos el plan.',
          'También puedes pedir la reversión del pago según el artículo 51 de la Ley 1480 de 2011 y el Decreto 587 de 2016, cuando se cumplan sus condiciones (fraude, operación no solicitada o servicio no prestado), dentro de los 5 días hábiles siguientes a que te enteres.'
        ]
      },
      {
        title: '7. Funciones de Android',
        bullets: [
          'Leer las notificaciones del banco y buscar SMS son funciones opcionales. Solo se activan si las autorizas en la app y das el permiso en Android.',
          'Leer extractos en PDF también es opcional y pide tu autorización la primera vez. El PDF se lee en tu dispositivo.',
          'Puedes quitar los permisos en los ajustes de Android y retirar las autorizaciones en Perfil.'
        ]
      },
      {
        title: '8. Uso permitido',
        bullets: [
          'Usa la app solo para organizar tus propias finanzas, de forma legal.',
          'No intentes acceder a datos de otros usuarios, alterar el funcionamiento de la app o del servicio de pagos, ni copiar, descompilar o revender la app.',
          'Podemos suspender cuentas que incumplan estos términos o pongan en riesgo el servicio, avisándote cuando sea posible.'
        ]
      },
      {
        title: '9. Disponibilidad y responsabilidad',
        bullets: [
          'Trabajamos para que la app funcione bien, pero puede tener fallas, interrupciones o errores al leer notificaciones, SMS o extractos (por ejemplo, si el banco cambia sus mensajes).',
          'Revisa lo que la app registra automáticamente antes de confirmarlo. Las decisiones sobre tu dinero son tuyas.',
          'No respondemos por pérdidas que vengan de datos mal registrados, de decisiones tomadas con base en los cálculos de la app o de fallas de servicios de terceros (Google, Wompi, tu banco o tu operador), salvo en lo que la ley colombiana no permita limitar.'
        ]
      },
      {
        title: '10. Propiedad intelectual',
        paragraphs: [
          'La app, su diseño, nombre, logo y código pertenecen a JeiXSoft. Tus datos son tuyos: solo los usamos para prestarte el servicio, como explica la Política de tratamiento de datos.'
        ]
      },
      {
        title: '11. Cambios a estos términos',
        paragraphs: [
          'Si cambiamos estos términos, la app te mostrará la nueva versión y te pedirá aceptarla para seguir usándola. La fecha de la última actualización está arriba.'
        ]
      },
      {
        title: '12. Ley aplicable y reclamos',
        paragraphs: [
          `Estos términos se rigen por las leyes de Colombia. Si tienes un reclamo escríbenos ${contact()}; respondemos en máximo 15 días hábiles. También puedes acudir a la Superintendencia de Industria y Comercio (www.sic.gov.co).`
        ]
      }
    ]
  }
}

// ───────────────────────────── Tratamiento de datos ─────────────────────────────

function privacy(): LegalDocument {
  return {
    key: 'privacidad',
    title: 'Política de tratamiento de datos personales',
    updated: longDate(PRIVACY_VERSION),
    intro:
      'Esta política explica qué datos tuyos trata TuPlataAlDia, para qué, con quién se comparten y cómo ejercer tus derechos, según la Ley 1581 de 2012 y el Decreto 1074 de 2015.',
    sections: [
      {
        title: '1. Responsable del tratamiento',
        paragraphs: [`El responsable es ${ownerLine()}.`]
      },
      {
        title: '2. Qué datos tratamos',
        bullets: [
          'Cuenta: nombre, correo, el método con que entras (correo o Google) y un identificador de usuario.',
          'Tu información financiera, la que tú registras: cuentas y tarjetas (nombre, banco, últimos dígitos si los escribes), saldos, cupos, movimientos, categorías, quincenas, ingresos, presupuestos, metas de ahorro y gastos automáticos.',
          'Notificaciones del banco (solo Android, plan Completo y si lo autorizas): el texto, la hora y el banco de las notificaciones de las apps de Bancolombia y Nu y de los SMS que mencionan a esos bancos. Las demás notificaciones se descartan en el celular y no se guardan.',
          'SMS del banco (solo si usas "Buscar SMS" y lo autorizas): texto, fecha y remitente de los SMS de las fechas que elijas que mencionan a esos bancos.',
          'Extractos en PDF (si lo autorizas): el archivo y su contraseña se procesan solo en tu dispositivo y no se envían ni se guardan. Se guardan solo los movimientos y valores que confirmas.',
          'PIN de bloqueo: se guarda cifrado (derivación PBKDF2 con sal); nunca en texto.',
          'Pagos del plan Completo: referencia, valor, medio de pago (tipo), estado, fecha e identificador de la transacción. Los datos de tu tarjeta o cuenta los recibe solo Wompi.',
          'Datos técnicos que generan los servicios que usamos (por ejemplo, Google Firebase registra la dirección IP y el dispositivo al iniciar sesión, por seguridad).'
        ],
        paragraphs: [
          'La información financiera no es un dato sensible según la ley, pero la tratamos con el mismo cuidado. No pedimos datos sensibles (salud, origen, creencias, biométricos). La huella del celular, si la usas, la valida Android y nunca llega a nosotros.'
        ]
      },
      {
        title: '3. Para qué los usamos',
        bullets: [
          'Prestarte el servicio: guardar tu información, calcular saldos, cupos, mínimos y planes, y mostrarte avisos.',
          'Crear y proteger tu cuenta: inicio de sesión, PIN, bloqueo automático y prevención de fraude.',
          'Procesar el pago del plan Completo y activarlo.',
          'Responder tus peticiones, quejas y reclamos.',
          'Cumplir obligaciones legales, contables y tributarias.'
        ],
        paragraphs: [
          'No vendemos tus datos, no los usamos para publicidad, no hacemos perfiles para terceros y no los usamos para estudios de crédito.'
        ]
      },
      {
        title: '4. Con quién se comparten',
        bullets: [
          'Google (Firebase Authentication y Cloud Firestore) guarda tu cuenta y tus datos. Actúa como encargado, con sus propias medidas de seguridad.',
          'Cloudflare ejecuta el servicio que recibe la confirmación de pago de Wompi y activa tu plan.',
          'Wompi (Grupo Bancolombia) procesa los pagos como responsable de los datos de pago que le das.',
          'Google Play distribuye la app.',
          'Autoridades, solo cuando la ley lo exija.'
        ],
        paragraphs: [
          'Los servidores de Google y Cloudflare pueden estar fuera de Colombia (por ejemplo, en Estados Unidos). Al aceptar esta política autorizas esa transferencia o transmisión internacional (artículo 26 de la Ley 1581 de 2012). Esos proveedores tienen niveles de protección reconocidos y solo usan los datos para prestar su servicio.'
        ]
      },
      {
        title: '5. Tus derechos',
        bullets: [
          'Conocer, actualizar y rectificar tus datos. Puedes hacerlo en la misma app.',
          'Pedir prueba de la autorización que nos diste.',
          'Saber cómo hemos usado tus datos.',
          'Presentar quejas ante la Superintendencia de Industria y Comercio, después de hacer tu reclamo con nosotros.',
          'Retirar tu autorización y pedir que borremos tus datos, cuando no exista un deber legal de conservarlos.',
          'Acceder gratis a tus datos.'
        ]
      },
      {
        title: '6. Cómo ejercerlos',
        bullets: [
          'En la app: Perfil > Privacidad y datos (ver y retirar autorizaciones, eliminar tu cuenta).',
          `Por correo: escríbenos ${contact()} con tu nombre, el correo de tu cuenta y lo que pides.`,
          'Consultas: respondemos en máximo 10 días hábiles (prorrogables 5 días más, avisándote).',
          'Reclamos (corregir, actualizar, borrar o revocar): respondemos en máximo 15 días hábiles (prorrogables 8 días más, avisándote).'
        ]
      },
      {
        title: '7. Autorizaciones',
        paragraphs: [
          'Te pedimos autorización al crear tu cuenta y, aparte, antes de leer extractos, notificaciones o SMS. Guardamos cada autorización con la fecha y la versión del texto que aceptaste. Puedes retirarlas en Perfil > Privacidad y datos.'
        ]
      },
      {
        title: '8. Seguridad',
        bullets: [
          'Los datos viajan cifrados (HTTPS) y cada usuario solo puede leer y escribir lo suyo (reglas de acceso de la base de datos).',
          'El plan y los pagos solo los puede escribir el servicio de pagos, no la app.',
          'La app se bloquea con tu PIN al abrirla y después de 5 minutos en segundo plano.',
          'Ningún sistema es 100 % seguro. Si ocurre un incidente que afecte tus datos te avisaremos y lo reportaremos a la Superintendencia de Industria y Comercio como exige la ley.'
        ]
      },
      {
        title: '9. Cuánto tiempo los guardamos',
        bullets: [
          'Mientras tengas tu cuenta.',
          'Si eliminas tu cuenta, se borran tu perfil y toda tu información financiera.',
          'Los registros de pago (referencia, valor, fecha y medio, sin datos de tarjeta) se conservan el tiempo que exigen las normas contables y tributarias.'
        ]
      },
      {
        title: '10. Menores de edad',
        paragraphs: ['TuPlataAlDia no está dirigida a menores de 18 años y no tratamos sus datos a sabiendas.']
      },
      {
        title: '11. Cambios y vigencia',
        paragraphs: [
          'Esta política rige desde la fecha de actualización indicada arriba. Si la cambiamos de forma importante, te lo avisaremos en la app y te pediremos aceptarla de nuevo.'
        ]
      }
    ]
  }
}

// ───────────────────────────── Eliminar la cuenta ─────────────────────────────
// Página pública que pide Google Play (enlace web para eliminar la cuenta)

function deletion(): LegalDocument {
  return {
    key: 'eliminar-cuenta',
    title: 'Eliminar tu cuenta de TuPlataAlDia',
    updated: longDate(PRIVACY_VERSION),
    intro: 'Puedes eliminar tu cuenta y tus datos cuando quieras, desde la app o desde esta página web.',
    sections: [
      {
        title: 'Desde la app (Android o web)',
        bullets: [
          'Entra a tu cuenta.',
          'Ve a Perfil > Privacidad y datos > Eliminar mi cuenta.',
          'Confirma. Por seguridad te pediremos tu contraseña o volver a entrar con Google.'
        ]
      },
      {
        title: 'Desde el navegador, sin instalar la app',
        bullets: [
          `Entra a ${SITE_DOMAIN}, toca "Iniciar sesión" y entra con tu correo o Google.`,
          'Sigue los mismos pasos: Perfil > Privacidad y datos > Eliminar mi cuenta.'
        ]
      },
      {
        title: 'Por correo',
        paragraphs: [
          `Si no puedes entrar, escríbenos ${contact()} desde el correo de tu cuenta con el asunto "Eliminar mi cuenta". La eliminamos en máximo 15 días hábiles y te confirmamos.`
        ]
      },
      {
        title: 'Qué se borra',
        bullets: [
          'Tu perfil, tu PIN cifrado y tus autorizaciones.',
          'Toda tu información financiera: cuentas, tarjetas, movimientos, categorías, quincenas, presupuestos, metas, gastos automáticos y lo pendiente por confirmar.',
          'Tu usuario de inicio de sesión.'
        ]
      },
      {
        title: 'Qué se conserva',
        bullets: [
          'Los registros de pago del plan Completo (referencia, valor, fecha y medio de pago, sin datos de tarjeta), por el tiempo que exigen las normas contables y tributarias.',
          'Al eliminar la cuenta pierdes el plan Completo y no se puede recuperar.'
        ]
      }
    ]
  }
}
