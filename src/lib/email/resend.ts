import { Resend } from 'resend'

const key = process.env.RESEND_API_KEY

if (!key || key.startsWith('re_xxxx')) {
  console.warn('[PuntualPago] RESEND_API_KEY no configurado — los emails de invitación y recordatorio no se enviarán. Configura la variable en .env.local o en Vercel.')
}

export const resend = new Resend(key)

export const FROM_EMAIL = 'PuntualPago <notificaciones@puntualpago.com>'
export const REPLY_TO   = 'cobros@puntualpago.com'

/** Devuelve true si Resend está configurado y puede enviar emails */
export const isEmailConfigured = !!key && !key.startsWith('re_xxxx')
