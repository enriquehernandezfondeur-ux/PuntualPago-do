import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resend, FROM_EMAIL, REPLY_TO } from '@/lib/email/resend'
import { paymentConfirmTemplate } from '@/lib/email/templates'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const isCron = req.headers.get('x-cron-secret') === process.env.CRON_SECRET
    if (!user && !isCron) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { paymentId } = await req.json()

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId requerido' }, { status: 400 })
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        tenant:tenants(id, full_name, email),
        property:properties(id, name, address),
        owner:owners(id, full_name, email)
      `)
      .eq('id', paymentId)
      .single()

    if (error || !payment) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    const tenant = payment.tenant as { id: string; full_name: string; email?: string }
    const property = payment.property as { id: string; name: string; address: string }
    const owner = payment.owner as { id: string; full_name: string; email?: string }

    const recipients: string[] = []
    if (tenant?.email) recipients.push(tenant.email)
    if (owner?.email) recipients.push(owner.email)

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No hay destinatarios con email registrado' }, { status: 422 })
    }

    const { subject, html } = paymentConfirmTemplate({
      tenantName: tenant.full_name,
      propertyName: property.name,
      amountPaid: payment.amount_paid,
      currency: payment.currency,
      paidDate: payment.paid_date ?? new Date().toISOString().split('T')[0],
      paymentMethod: payment.payment_method ?? undefined,
      paymentReference: payment.payment_reference ?? undefined,
      paymentNumber: payment.payment_number ?? undefined,
    })

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO,
      to: recipients,
      subject,
      html,
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json({ error: 'Error al enviar email', detail: emailError }, { status: 500 })
    }

    await supabase.from('communications').insert({
      channel: 'email',
      direction: 'outbound',
      subject,
      content: `Confirmación de pago enviada a ${recipients.join(', ')}`,
      template_used: 'confirmacion_pago',
      tenant_id: tenant.id,
      property_id: property.id,
      payment_id: paymentId,
      owner_id: owner?.id ?? null,
      sent_at: new Date().toISOString(),
      delivered: true,
      created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    })

    return NextResponse.json({ success: true, emailId: emailData?.id, recipients })
  } catch (err) {
    console.error('send-confirmation error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
