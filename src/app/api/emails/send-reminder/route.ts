import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resend, FROM_EMAIL, REPLY_TO } from '@/lib/email/resend'
import { reminderEmailTemplate } from '@/lib/email/templates'
import { timingSafeEqual } from 'crypto'

function safeCompare(a: string, b: string): boolean {
  try { const ba = Buffer.from(a), bb = Buffer.from(b); return ba.length === bb.length && timingSafeEqual(ba, bb) } catch { return false }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    const allowed = ['super_admin', 'admin', 'gerente_operativo', 'equipo_cobros']
    const isCron = !!process.env.CRON_SECRET && safeCompare(req.headers.get('x-cron-secret') ?? '', process.env.CRON_SECRET)
    if (!isCron && (!profile || !allowed.includes(profile.role))) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { paymentId } = await req.json()

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId requerido' }, { status: 400 })
    }

    // Fetch payment with related data
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select(`
        *,
        tenant:tenants(id, full_name, email, phone, whatsapp),
        property:properties(id, name, address),
        owner:owners(id, full_name, email)
      `)
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    const tenant = payment.tenant as { id: string; full_name: string; email?: string; phone?: string; whatsapp?: string }
    const property = payment.property as { id: string; name: string; address: string }

    if (!tenant?.email) {
      return NextResponse.json({ error: 'El inquilino no tiene email registrado' }, { status: 422 })
    }

    const today = new Date()
    const dueDate = new Date(payment.due_date + 'T12:00:00')
    const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

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
    })

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to: [tenant.email],
      subject,
      html,
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json({ error: 'Error al enviar email', detail: emailError }, { status: 500 })
    }

    // user already fetched at the top of the handler

    // Log in communications table
    await supabase.from('communications').insert({
      channel: 'email',
      direction: 'outbound',
      subject,
      content: `Recordatorio de pago enviado a ${tenant.email}`,
      template_used: 'recordatorio_pago',
      tenant_id: tenant.id,
      property_id: property.id,
      payment_id: paymentId,
      sent_at: new Date().toISOString(),
      delivered: true,
      created_by: user?.id ?? null,
    })

    return NextResponse.json({ success: true, emailId: emailData?.id })
  } catch (err) {
    console.error('send-reminder error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
