/**
 * Cron endpoint for automatic payment reminders.
 * Call daily at 9:00 AM with: GET /api/emails/cron-reminders
 * Secure with CRON_SECRET header.
 *
 * Trigger via Supabase pg_cron, Vercel Cron, or external scheduler.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resend, FROM_EMAIL, REPLY_TO } from '@/lib/email/resend'
import { reminderEmailTemplate } from '@/lib/email/templates'

// Defaults — sobreescribibles desde la tabla settings
const DEFAULT_DAYS_BEFORE = [5, 1]
const DEFAULT_DAYS_AFTER  = [1, 3, 7, 15, 30]

function parseDaysList(raw: string | undefined, defaults: number[]): number[] {
  if (!raw) return defaults
  const parsed = raw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0)
  return parsed.length > 0 ? parsed : defaults
}

export async function GET(req: NextRequest) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  // External schedulers can use x-cron-secret header
  const authHeader   = req.headers.get('authorization') ?? ''
  const cronHeader   = req.headers.get('x-cron-secret') ?? ''
  const expectedBearer = `Bearer ${process.env.CRON_SECRET}`
  const validVercel  = process.env.CRON_SECRET && authHeader === expectedBearer
  const validCustom  = process.env.CRON_SECRET && cronHeader === process.env.CRON_SECRET

  if (!validVercel && !validCustom) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Detectar CRON_SECRET placeholder
  if (!process.env.CRON_SECRET || process.env.CRON_SECRET === 'change-me-to-a-strong-random-secret') {
    console.error('[cron-reminders] CRON_SECRET no configurado — establece un secreto seguro en las variables de entorno')
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 })
  }

  const supabase = await createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Leer días de recordatorio y datos de la empresa desde settings
  const [
    { data: beforeSetting }, { data: afterSetting },
    { data: phoneSetting }, { data: waSetting }, { data: siteUrlSetting },
  ] = await Promise.all([
    supabase.from('settings').select('value').eq('key', 'reminder_days_before').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'reminder_days_after').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'company_phone').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'company_whatsapp').maybeSingle(),
    supabase.from('settings').select('value').eq('key', 'site_url').maybeSingle(),
  ])
  const REMINDER_DAYS_BEFORE = parseDaysList(beforeSetting?.value, DEFAULT_DAYS_BEFORE)
  const REMINDER_DAYS_AFTER  = parseDaysList(afterSetting?.value, DEFAULT_DAYS_AFTER)
  const companyPhone     = phoneSetting?.value ?? undefined
  const companyWhatsapp  = waSetting?.value ?? undefined
  const siteUrl          = siteUrlSetting?.value ?? process.env.NEXT_PUBLIC_SITE_URL ?? undefined

  const results = { sent: 0, skipped: 0, errors: 0, details: [] as string[] }

  try {
    // Fetch all non-paid, non-legal payments with tenant emails
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        id, payment_number, due_date, balance_due, rent_amount, late_fee,
        total_due, currency, period_month, period_year,
        tenant:tenants(id, full_name, email),
        property:properties(id, name, address)
      `)
      .in('status', ['al_dia', 'vence_pronto', 'vencido', 'en_mora'])
      .gt('balance_due', 0)

    if (error) throw error

    for (const payment of payments ?? []) {
      const tenant = payment.tenant as unknown as { id: string; full_name: string; email?: string } | null
      const property = payment.property as unknown as { id: string; name: string; address: string } | null

      if (!tenant?.email || !property) {
        results.skipped++
        continue
      }

      const dueDate = new Date(payment.due_date + 'T12:00:00')
      const diffMs = dueDate.getTime() - today.getTime()
      const daysUntilDue = Math.round(diffMs / (1000 * 60 * 60 * 24))

      // Check if today is a reminder day
      const shouldSendBefore = daysUntilDue > 0 && REMINDER_DAYS_BEFORE.includes(daysUntilDue)
      const shouldSendAfter  = daysUntilDue <= 0 && REMINDER_DAYS_AFTER.includes(Math.abs(daysUntilDue))

      if (!shouldSendBefore && !shouldSendAfter) {
        results.skipped++
        continue
      }

      // Check if we already sent a reminder today for this payment
      const { count } = await supabase
        .from('communications')
        .select('id', { count: 'exact', head: true })
        .eq('payment_id', payment.id)
        .eq('channel', 'email')
        .gte('sent_at', today.toISOString())

      if ((count ?? 0) > 0) {
        results.skipped++
        continue
      }

      const { subject, html } = reminderEmailTemplate({
        tenantName: tenant.full_name,
        propertyName: property.name,
        propertyAddress: property.address ?? '',
        rentAmount: payment.rent_amount,
        lateFee: payment.late_fee ?? 0,
        totalDue: payment.total_due,
        balanceDue: payment.balance_due,
        currency: payment.currency,
        dueDate: payment.due_date,
        periodMonth: payment.period_month,
        periodYear: payment.period_year,
        daysUntilDue,
        paymentNumber: payment.payment_number ?? undefined,
        companyPhone,
        companyWhatsapp,
        siteUrl,
      })

      const { error: emailError } = await resend.emails.send({
        from: FROM_EMAIL,
        replyTo: REPLY_TO,
        to: [tenant.email],
        subject,
        html,
      })

      if (emailError) {
        results.errors++
        results.details.push(`Error ${payment.id}: ${emailError.message}`)
        continue
      }

      await supabase.from('communications').insert({
        channel: 'email',
        direction: 'outbound',
        subject,
        content: `Recordatorio automático D${daysUntilDue >= 0 ? `-${daysUntilDue}` : `+${Math.abs(daysUntilDue)}`} enviado a ${tenant.email}`,
        template_used: 'recordatorio_pago_auto',
        tenant_id: tenant.id,
        property_id: property.id,
        payment_id: payment.id,
        sent_at: new Date().toISOString(),
        delivered: true,
        created_by: null,
      })

      results.sent++
      results.details.push(`✓ Recordatorio enviado a ${tenant.full_name} (${tenant.email}) — D${daysUntilDue >= 0 ? `-${daysUntilDue}` : `+${Math.abs(daysUntilDue)}`}`)
    }

    // Notify admins about payments 30+ days overdue
    const criticalPayments = (payments ?? []).filter((p: any) => {
      const dueMs = new Date(p.due_date + 'T12:00:00').getTime()
      const days  = Math.round((today.getTime() - dueMs) / (1000 * 60 * 60 * 24))
      return days === 30 // only on day 30, not every day
    })
    if (criticalPayments.length > 0) {
      await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/notifications/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roles: ['equipo_cobros', 'admin', 'super_admin', 'gerente_operativo'],
          title: `${criticalPayments.length} pago${criticalPayments.length !== 1 ? 's' : ''} con 30 días de mora`,
          message: 'Considerar escalado a proceso legal',
          type: 'payment',
        }),
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      date: today.toISOString().split('T')[0],
      ...results,
    })
  } catch (err) {
    console.error('cron-reminders error:', err)
    return NextResponse.json({ error: 'Error en el proceso de recordatorios', detail: String(err) }, { status: 500 })
  }
}
