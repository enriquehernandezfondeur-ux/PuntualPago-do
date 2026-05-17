/**
 * Daily cron: envía recordatorios de pago por WhatsApp.
 * GET /api/cron/whatsapp-reminders
 *
 * Misma lógica de días que el cron de email (D-5, D-1, D+1, D+3, D+7)
 * pero por WhatsApp vía Twilio. Solo envía si Twilio está configurado.
 *
 * Cron schedule: 0 15 * * * (3pm hora RD = 19:00 UTC) — 1 hora después que el email
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { timingSafeEqual } from 'crypto'

function safeCompare(a: string, b: string): boolean {
  try { const ba = Buffer.from(a), bb = Buffer.from(b); return ba.length === bb.length && timingSafeEqual(ba, bb) } catch { return false }
}

const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_FROM  = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886'

const DEFAULT_DAYS_BEFORE = [5, 1]
const DEFAULT_DAYS_AFTER  = [1, 3, 7]

function parseDaysList(raw: string | undefined, defaults: number[]): number[] {
  if (!raw) return defaults
  const parsed = raw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0)
  return parsed.length > 0 ? parsed : defaults
}

function buildMessage(tenantName: string, propertyName: string, amount: string, dueDate: string, daysUntilDue: number, companyWhatsapp: string): string {
  const dateStr = new Date(dueDate + 'T12:00:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'long' })
  const firstName = tenantName.split(' ')[0]

  if (daysUntilDue > 0) {
    return `Hola ${firstName} 👋\n\nRecordatorio de pago:\n🏠 *${propertyName}*\n💰 *${amount}*\n📅 Vence: ${dateStr} (${daysUntilDue}d)\n\nSube tu comprobante en puntualpago.com/portal\n\n¿Dudas? Escríbenos al ${companyWhatsapp}`
  }

  const d = Math.abs(daysUntilDue)
  return `Hola ${firstName} 👋\n\nTu pago está *vencido hace ${d} día${d !== 1 ? 's' : ''}*:\n🏠 *${propertyName}*\n💰 *${amount}*\n\nPor favor regulariza para evitar cargos adicionales.\nSube tu comprobante: puntualpago.com/portal\n\n📞 ${companyWhatsapp}`
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const cronHeader = req.headers.get('x-cron-secret') ?? ''

  if (!process.env.CRON_SECRET || process.env.CRON_SECRET === 'change-me-to-a-strong-random-secret') {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 })
  }
  if (!safeCompare(authHeader, `Bearer ${process.env.CRON_SECRET}`) && !safeCompare(cronHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  if (!TWILIO_SID || !TWILIO_TOKEN) {
    return NextResponse.json({ skipped: true, reason: 'Twilio no configurado — agrega TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN' })
  }

  const supabase = await createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Leer días y número de la empresa desde settings
  const [{ data: beforeSetting }, { data: afterSetting }, { data: waNumber }] = await Promise.all([
    supabase.from('settings').select('value').eq('key', 'reminder_days_before').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'reminder_days_after').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'company_whatsapp').maybeSingle(),
  ])

  const DAYS_BEFORE    = parseDaysList(beforeSetting?.value, DEFAULT_DAYS_BEFORE)
  const DAYS_AFTER     = parseDaysList(afterSetting?.value, DEFAULT_DAYS_AFTER)
  const companyWA      = waNumber?.value ? `+${waNumber.value.replace(/\D/g, '')}` : '+18095550000'

  const { data: payments } = await supabase
    .from('payments')
    .select('id, payment_number, due_date, balance_due, rent_amount, currency, period_month, period_year, tenant_id, property_id, tenant:tenants(full_name, whatsapp, phone), property:properties(name)')
    .in('status', ['al_dia', 'vence_pronto', 'vencido', 'en_mora'])
    .gt('balance_due', 0)

  const results = { sent: 0, skipped: 0, errors: 0 }

  for (const payment of payments ?? []) {
    const tenant   = payment.tenant as unknown as { full_name: string; whatsapp?: string; phone?: string } | null
    const property = payment.property as unknown as { name: string } | null

    const rawPhone = tenant?.whatsapp || tenant?.phone
    if (!rawPhone || !tenant || !property) { results.skipped++; continue }

    const dueDate = new Date(payment.due_date + 'T12:00:00')
    const diffMs  = dueDate.getTime() - today.getTime()
    const daysUntilDue = Math.round(diffMs / (1000 * 60 * 60 * 24))

    const shouldSend = (daysUntilDue > 0 && DAYS_BEFORE.includes(daysUntilDue))
      || (daysUntilDue <= 0 && DAYS_AFTER.includes(Math.abs(daysUntilDue)))

    if (!shouldSend) { results.skipped++; continue }

    // Verificar si ya se envió WhatsApp hoy para este pago
    const { count } = await supabase
      .from('communications')
      .select('id', { count: 'exact', head: true })
      .eq('payment_id', payment.id)
      .eq('channel', 'whatsapp')
      .gte('sent_at', today.toISOString())

    if ((count ?? 0) > 0) { results.skipped++; continue }

    // Normalizar número
    let phone = rawPhone.replace(/\D/g, '')
    if (phone.length === 10) phone = '1' + phone
    if (!phone.startsWith('+')) phone = '+' + phone

    const amountStr = new Intl.NumberFormat('es-DO', {
      style: 'currency', currency: payment.currency === 'USD' ? 'USD' : 'DOP', maximumFractionDigits: 0,
    }).format(payment.balance_due)

    const message = buildMessage(tenant.full_name, property.name, amountStr, payment.due_date, daysUntilDue, companyWA)

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`
    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: TWILIO_FROM, To: `whatsapp:${phone}`, Body: message }),
    })

    if (!twilioRes.ok) { results.errors++; continue }

    await supabase.from('communications').insert({
      channel:       'whatsapp',
      direction:     'outbound',
      subject:       `Recordatorio WhatsApp automático`,
      content:       message,
      template_used: 'recordatorio_whatsapp_auto',
      tenant_id:     payment.tenant_id,
      property_id:   payment.property_id,
      payment_id:    payment.id,
      sent_at:       new Date().toISOString(),
      delivered:     true,
      created_by:    null,
    })

    results.sent++
  }

  return NextResponse.json({ success: true, date: today.toISOString().split('T')[0], ...results })
}
