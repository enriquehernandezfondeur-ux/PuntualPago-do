/**
 * WhatsApp message sender via Twilio WhatsApp Business API.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID   — Twilio account SID
 *   TWILIO_AUTH_TOKEN    — Twilio auth token
 *   TWILIO_WHATSAPP_FROM — e.g. "whatsapp:+14155238886"
 *
 * If vars are missing the endpoint returns 503 with instructions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_FROM  = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886'

// Payment reminder message template
function buildReminderMessage({
  tenantName, propertyName, balanceDue, currency, dueDate, daysUntilDue, paymentNumber,
}: {
  tenantName: string; propertyName: string; balanceDue: number; currency: string;
  dueDate: string; daysUntilDue: number; paymentNumber?: string
}): string {
  const amount = new Intl.NumberFormat('es-DO', {
    style: 'currency', currency: currency === 'USD' ? 'USD' : 'DOP', minimumFractionDigits: 0,
  }).format(balanceDue)

  const dateStr = new Date(dueDate + 'T12:00:00').toLocaleDateString('es-DO', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  if (daysUntilDue > 0) {
    return `Hola ${tenantName.split(' ')[0]} 👋\n\nTe recordamos que tu pago de renta está próximo a vencer:\n\n🏠 *${propertyName}*\n💰 *${amount}*\n📅 Vence: ${dateStr} (en ${daysUntilDue} día${daysUntilDue !== 1 ? 's' : ''})\n${paymentNumber ? `🔖 Ref: ${paymentNumber}\n` : ''}\nRecuerda pagar antes del día 5 del mes para evitar cargos por mora.\n\nSi ya realizaste el pago, puedes subir tu comprobante en: *puntualpago.com/portal/inquilino/comprobante*\n\n¡Gracias! 🙏`
  }

  const daysOverdue = Math.abs(daysUntilDue)
  return `Hola ${tenantName.split(' ')[0]} 👋\n\nTu pago de renta está *vencido*:\n\n🏠 *${propertyName}*\n💰 *${amount}*\n📅 Venció: ${dateStr} (hace ${daysOverdue} día${daysOverdue !== 1 ? 's' : ''})\n${paymentNumber ? `🔖 Ref: ${paymentNumber}\n` : ''}\n⚠️ Por favor regulariza tu situación a la brevedad posible para evitar cargos adicionales.\n\n¿Ya pagaste? Sube tu comprobante en: *puntualpago.com/portal/inquilino/comprobante*\n\nContacta con nosotros si tienes alguna duda. 📞`
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Verify user is authenticated and has staff role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  const staffRoles = ['super_admin','admin','gerente_operativo','equipo_cobros']
  if (!profile || !staffRoles.includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  // Check Twilio config
  if (!TWILIO_SID || !TWILIO_TOKEN) {
    return NextResponse.json({
      error: 'WhatsApp no configurado',
      message: 'Configura TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN en las variables de entorno.',
      docs: 'https://www.twilio.com/docs/whatsapp',
    }, { status: 503 })
  }

  const body = await req.json()
  const { paymentId } = body

  if (!paymentId) return NextResponse.json({ error: 'paymentId requerido' }, { status: 400 })

  // Fetch payment with tenant and property
  const { data: payment, error } = await supabase
    .from('payments')
    .select(`
      id, payment_number, due_date, balance_due, rent_amount, currency,
      period_month, period_year,
      tenant:tenants(id, full_name, whatsapp, phone),
      property:properties(id, name, address)
    `)
    .eq('id', paymentId)
    .single()

  if (error || !payment) return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })

  const tenant   = payment.tenant as unknown as { id: string; full_name: string; whatsapp?: string; phone?: string } | null
  const property = payment.property as unknown as { id: string; name: string; address: string } | null

  if (!tenant || !property) return NextResponse.json({ error: 'Inquilino o propiedad no encontrados' }, { status: 404 })

  // Resolve WhatsApp number
  const rawPhone = tenant.whatsapp || tenant.phone
  if (!rawPhone) {
    return NextResponse.json({ error: 'El inquilino no tiene número de WhatsApp registrado' }, { status: 422 })
  }

  // Normalize to E.164 (assume Dominican Republic +1-809/829/849 if 10 digits)
  let phone = rawPhone.replace(/\D/g, '')
  if (phone.length === 10) phone = '1' + phone
  if (!phone.startsWith('+')) phone = '+' + phone

  const dueDate      = new Date(payment.due_date + 'T12:00:00')
  const today        = new Date(); today.setHours(0, 0, 0, 0)
  const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const message = buildReminderMessage({
    tenantName:   tenant.full_name,
    propertyName: property.name,
    balanceDue:   payment.balance_due,
    currency:     payment.currency,
    dueDate:      payment.due_date,
    daysUntilDue,
    paymentNumber: payment.payment_number ?? undefined,
  })

  // Send via Twilio REST API
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`
  const twilioRes = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      From: TWILIO_FROM,
      To:   `whatsapp:${phone}`,
      Body: message,
    }),
  })

  const twilioData = await twilioRes.json()

  if (!twilioRes.ok) {
    console.error('Twilio error:', twilioData)
    return NextResponse.json({
      error: 'Error al enviar WhatsApp',
      detail: twilioData?.message ?? 'Error desconocido de Twilio',
    }, { status: 500 })
  }

  // Log to communications
  await supabase.from('communications').insert({
    channel:       'whatsapp',
    direction:     'outbound',
    subject:       `Recordatorio WhatsApp — ${tenant.full_name}`,
    content:       message,
    template_used: 'recordatorio_whatsapp',
    tenant_id:     tenant.id,
    property_id:   property.id,
    payment_id:    payment.id,
    sent_at:       new Date().toISOString(),
    delivered:     true,
    created_by:    user.id,
  })

  return NextResponse.json({
    success: true,
    to:      phone,
    sid:     twilioData.sid,
    message: `WhatsApp enviado a ${tenant.full_name} (${phone})`,
  })
}
