// ─── Shared helpers ───────────────────────────────────────────────────────────

// PuntualPago Official Brand Colors
const BRAND_BLUE      = '#0B3C5D'   // Azul principal — institucional
const BRAND_SECONDARY = '#4A90E2'   // Azul secundario — CTAs, botones
const BRAND_LIGHT     = '#F2F4F6'   // Gris claro — fondos

function formatCurrencyEmail(amount: number, currency: 'DOP' | 'USD' = 'DOP') {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDateEmail(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-DO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function baseLayout(content: string, preheader = '') {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PuntualPago</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#f1f5f9;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_BLUE};border-radius:12px 12px 0 0;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td>
                    <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Puntual<span style="color:${BRAND_SECONDARY};">Pago</span></span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:#94a3b8;font-weight:500;text-transform:uppercase;letter-spacing:1px;">Gestión de Alquileres</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:${BRAND_LIGHT};border-radius:0 0 12px 12px;padding:20px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
                Este mensaje fue enviado por PuntualPago OS, la plataforma de gestión de alquileres.<br/>
                Si tiene alguna pregunta, contáctenos en <a href="mailto:cobros@puntualpago.com" style="color:${BRAND_BLUE};text-decoration:none;">cobros@puntualpago.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Template types ────────────────────────────────────────────────────────────

export interface ReminderData {
  tenantName: string
  propertyName: string
  propertyAddress: string
  rentAmount: number
  lateFee: number
  totalDue: number
  balanceDue: number
  currency: 'DOP' | 'USD'
  dueDate: string
  periodMonth: number
  periodYear: number
  daysUntilDue?: number   // positive = days left, negative = days overdue
  paymentNumber?: string
  ownerName?: string
  companyPhone?: string
  companyWhatsapp?: string
  siteUrl?: string
}

export interface PaymentConfirmData {
  tenantName: string
  propertyName: string
  amountPaid: number
  currency: 'DOP' | 'USD'
  paidDate: string
  paymentMethod?: string
  paymentReference?: string
  paymentNumber?: string
  ownerName?: string
}

export interface ContractExpirationData {
  ownerName: string
  tenantName: string
  propertyName: string
  propertyAddress: string
  endDate: string
  daysUntilExpiry: number
  contractNumber?: string
}

// ─── 1. Recordatorio de pago (antes del vencimiento) ─────────────────────────

export function reminderEmailTemplate(data: ReminderData) {
  const period = new Date(data.periodYear, data.periodMonth - 1)
    .toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })

  const isOverdue = (data.daysUntilDue ?? 0) < 0
  const daysOverdue = isOverdue ? Math.abs(data.daysUntilDue ?? 0) : 0
  const daysLeft = !isOverdue ? (data.daysUntilDue ?? 0) : 0

  const accentColor = isOverdue ? '#dc2626' : daysLeft <= 3 ? '#d97706' : BRAND_SECONDARY
  const statusBg    = isOverdue ? '#fef2f2' : daysLeft <= 3 ? '#fffbeb' : '#eff6ff'
  const statusText  = isOverdue
    ? `⚠️ Su pago tiene <strong>${daysOverdue} día${daysOverdue !== 1 ? 's' : ''} de retraso</strong>`
    : daysLeft === 0
    ? '📅 Su pago vence <strong>hoy</strong>'
    : `📅 Su pago vence en <strong>${daysLeft} día${daysLeft !== 1 ? 's' : ''}</strong>`

  const subject = isOverdue
    ? `Pago vencido - ${data.propertyName} - ${period}`
    : daysLeft === 0
    ? `Último día para pagar (día 5) - ${data.propertyName}`
    : daysLeft <= 3
    ? `Recordatorio: pago vence el día 5 - ${data.propertyName}`
    : `Recordatorio de pago (1 al 5) - ${period} - ${data.propertyName}`

  const html = baseLayout(`
    <!-- Status banner -->
    <div style="background-color:${statusBg};border:1px solid ${accentColor}30;border-radius:10px;padding:16px 20px;margin-bottom:28px;text-align:center;">
      <p style="margin:0;font-size:15px;color:${accentColor};">${statusText}</p>
    </div>

    <p style="margin:0 0 8px;font-size:16px;color:#1e293b;">Estimado/a <strong>${data.tenantName}</strong>,</p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      ${isOverdue
        ? `Le recordamos que tiene un pago pendiente correspondiente al mes de <strong>${period}</strong> para la propiedad <strong>${data.propertyName}</strong>.`
        : `Le recordamos que tiene próximo su pago de alquiler correspondiente al mes de <strong>${period}</strong> para la propiedad <strong>${data.propertyName}</strong>.`
      }
    </p>

    <!-- Payment breakdown -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Detalle del pago</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#475569;">Propiedad</td>
              <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">${data.propertyName}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#475569;">Período</td>
              <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;text-transform:capitalize;">${period}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#475569;">Fecha de vencimiento</td>
              <td style="padding:6px 0;font-size:14px;color:${isOverdue ? '#dc2626' : '#1e293b'};font-weight:600;text-align:right;">${formatDateEmail(data.dueDate)}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#475569;">Renta</td>
              <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">${formatCurrencyEmail(data.rentAmount, data.currency)}</td>
            </tr>
            ${data.lateFee > 0 ? `
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#dc2626;">Cargo por mora</td>
              <td style="padding:6px 0;font-size:14px;color:#dc2626;font-weight:600;text-align:right;">${formatCurrencyEmail(data.lateFee, data.currency)}</td>
            </tr>` : ''}
            <tr>
              <td colspan="2" style="padding:8px 0 0;border-top:1px solid #e2e8f0;"></td>
            </tr>
            <tr>
              <td style="padding:8px 0 0;font-size:16px;color:#1e293b;font-weight:700;">Total a pagar</td>
              <td style="padding:8px 0 0;font-size:18px;color:${accentColor};font-weight:800;text-align:right;">${formatCurrencyEmail(data.balanceDue, data.currency)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Payment window notice -->
    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="margin:0;font-size:14px;color:#166534;line-height:1.6;">
        📅 <strong>Ventana de pago:</strong> Del <strong>1 al 5 de cada mes</strong>.<br/>
        Los pagos recibidos después del día 5 generan cargo por mora.
      </p>
    </div>

    <!-- CTA -->
    <p style="margin:0 0 12px;font-size:14px;color:#475569;line-height:1.6;">
      Para realizar su pago o si tiene alguna consulta, contáctenos:
    </p>
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
      <tr>
        <td style="padding-right:8px;">
          ${data.companyWhatsapp ? `<a href="https://wa.me/${data.companyWhatsapp.replace(/\D/g,'')}" style="display:inline-block;background-color:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:8px;">WhatsApp</a>` : ''}
        </td>
        <td>
          ${data.companyPhone ? `<a href="tel:${data.companyPhone.replace(/\s/g,'')}" style="display:inline-block;background-color:#1e3a5f;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:8px;">Llamar</a>` : ''}
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:16px;">
      ${data.paymentNumber ? `Referencia: <strong style="color:#64748b;">${data.paymentNumber}</strong>` : ''}
      Gracias por su puntualidad.
    </p>
  `, isOverdue ? `Pago vencido - ${formatCurrencyEmail(data.balanceDue, data.currency)} pendiente` : `Recordatorio: pago de ${period} - ${formatCurrencyEmail(data.balanceDue, data.currency)}`)

  return { subject, html }
}

// ─── 2. Confirmación de pago recibido ────────────────────────────────────────

export function paymentConfirmTemplate(data: PaymentConfirmData) {
  const subject = `✅ Pago recibido - ${data.propertyName} - ${formatCurrencyEmail(data.amountPaid, data.currency)}`

  const html = baseLayout(`
    <!-- Success icon -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background-color:#dcfce7;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">✓</div>
    </div>

    <h2 style="margin:0 0 8px;font-size:22px;color:#166534;text-align:center;font-weight:800;">Pago confirmado</h2>
    <p style="margin:0 0 28px;font-size:15px;color:#475569;text-align:center;">Su pago ha sido registrado exitosamente.</p>

    <!-- Amount hero -->
    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:13px;color:#15803d;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Monto pagado</p>
      <p style="margin:0;font-size:36px;font-weight:800;color:#166534;">${formatCurrencyEmail(data.amountPaid, data.currency)}</p>
    </div>

    <!-- Details -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Detalle del recibo</p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#475569;">Inquilino</td>
              <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">${data.tenantName}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#475569;">Propiedad</td>
              <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">${data.propertyName}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#475569;">Fecha de pago</td>
              <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">${formatDateEmail(data.paidDate)}</td>
            </tr>
            ${data.paymentMethod ? `
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#475569;">Método</td>
              <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">${data.paymentMethod}</td>
            </tr>` : ''}
            ${data.paymentReference ? `
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#475569;">Referencia</td>
              <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">${data.paymentReference}</td>
            </tr>` : ''}
            ${data.paymentNumber ? `
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#475569;">N° de pago</td>
              <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">${data.paymentNumber}</td>
            </tr>` : ''}
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;text-align:center;">
      Gracias por su pago puntual, <strong>${data.tenantName}</strong>.<br/>
      Este correo es su comprobante oficial de pago.
    </p>
  `, `Pago de ${formatCurrencyEmail(data.amountPaid, data.currency)} confirmado para ${data.propertyName}`)

  return { subject, html }
}

// ─── 3. Reporte mensual a propietarios ───────────────────────────────────────

export interface MonthlyOwnerReportPropertyRow {
  propertyName: string
  tenantName: string
  rentCollected: number
  managementFee: number
  maintenanceDeductions: number
  netPayout: number
  currency: 'DOP' | 'USD'
  paid: boolean
}

export interface MonthlyOwnerReportData {
  ownerName: string
  periodMonth: number
  periodYear: number
  properties: MonthlyOwnerReportPropertyRow[]
  vacantProperties: string[]   // property names with no active tenant
  companyWhatsapp?: string
  siteUrl?: string
}

export function monthlyOwnerReportTemplate(data: MonthlyOwnerReportData) {
  const period = new Date(data.periodYear, data.periodMonth - 1)
    .toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })

  const totalNet     = data.properties.reduce((s, p) => s + p.netPayout, 0)
  const totalBruto   = data.properties.reduce((s, p) => s + p.rentCollected, 0)
  const totalComision = data.properties.reduce((s, p) => s + p.managementFee + p.maintenanceDeductions, 0)

  // Prefer DOP; fallback to first property's currency
  const mainCurrency = (data.properties[0]?.currency ?? 'DOP') as 'DOP' | 'USD'

  const subject = `Reporte mensual — ${period} — PuntualPago`

  const propertyRows = data.properties.map(p => `
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:#1e293b;border-bottom:1px solid #f1f5f9;">${p.propertyName}</td>
      <td style="padding:8px 12px;font-size:13px;color:#475569;border-bottom:1px solid #f1f5f9;">${p.tenantName}</td>
      <td style="padding:8px 12px;font-size:13px;color:#1e293b;text-align:right;border-bottom:1px solid #f1f5f9;">${formatCurrencyEmail(p.rentCollected, p.currency)}</td>
      <td style="padding:8px 12px;font-size:13px;color:#dc2626;text-align:right;border-bottom:1px solid #f1f5f9;">
        −${formatCurrencyEmail(p.managementFee, p.currency)}
        ${p.maintenanceDeductions > 0 ? `<br/><span style="font-size:11px;color:#ef4444;">Mtto: −${formatCurrencyEmail(p.maintenanceDeductions, p.currency)}</span>` : ''}
      </td>
      <td style="padding:8px 12px;font-size:13px;font-weight:700;color:${p.paid ? '#16a34a' : '#0B3C5D'};text-align:right;border-bottom:1px solid #f1f5f9;">${formatCurrencyEmail(p.netPayout, p.currency)}</td>
      <td style="padding:8px 12px;text-align:center;border-bottom:1px solid #f1f5f9;">
        ${p.paid
          ? '<span style="background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;">Pagado</span>'
          : '<span style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;">Pendiente</span>'
        }
      </td>
    </tr>`).join('')

  const vacantSection = data.vacantProperties.length > 0 ? `
    <div style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#92400e;">Propiedades vacantes este mes</p>
      <ul style="margin:0;padding-left:20px;">
        ${data.vacantProperties.map(v => `<li style="font-size:13px;color:#78350f;margin-bottom:4px;">${v}</li>`).join('')}
      </ul>
      <p style="margin:8px 0 0;font-size:12px;color:#a16207;">Contacta al equipo para coordinar nuevos arrendatarios.</p>
    </div>` : ''

  const html = baseLayout(`
    <p style="margin:0 0 8px;font-size:16px;color:#1e293b;">Estimado/a <strong>${data.ownerName.split(' ')[0]}</strong>,</p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Adjunto el reporte de liquidaciones correspondiente al mes de <strong style="text-transform:capitalize;">${period}</strong>.
      A continuación encontrará el detalle de cada propiedad.
    </p>

    <!-- Total hero -->
    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;color:#15803d;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Total neto del mes</p>
      <p style="margin:0;font-size:36px;font-weight:800;color:#166534;">${formatCurrencyEmail(totalNet, mainCurrency)}</p>
      <p style="margin:6px 0 0;font-size:12px;color:#4ade80;">
        Renta bruta ${formatCurrencyEmail(totalBruto, mainCurrency)} − Deducciones ${formatCurrencyEmail(totalComision, mainCurrency)}
      </p>
    </div>

    <!-- Properties table -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:24px;border-collapse:collapse;">
      <thead>
        <tr style="background-color:#f8fafc;">
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;text-align:left;border-bottom:1px solid #e2e8f0;">Propiedad</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;text-align:left;border-bottom:1px solid #e2e8f0;">Inquilino</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;text-align:right;border-bottom:1px solid #e2e8f0;">Renta cobrada</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;text-align:right;border-bottom:1px solid #e2e8f0;">Comisión</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;text-align:right;border-bottom:1px solid #e2e8f0;">Neto</th>
          <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;text-align:center;border-bottom:1px solid #e2e8f0;">Estado</th>
        </tr>
      </thead>
      <tbody>
        ${propertyRows}
        <!-- Totals row -->
        <tr style="background-color:#f8fafc;">
          <td colspan="2" style="padding:10px 12px;font-size:13px;font-weight:700;color:#1e293b;">Total</td>
          <td style="padding:10px 12px;font-size:13px;font-weight:700;color:#1e293b;text-align:right;">${formatCurrencyEmail(totalBruto, mainCurrency)}</td>
          <td style="padding:10px 12px;font-size:13px;font-weight:700;color:#dc2626;text-align:right;">−${formatCurrencyEmail(totalComision, mainCurrency)}</td>
          <td style="padding:10px 12px;font-size:14px;font-weight:800;color:#166534;text-align:right;">${formatCurrencyEmail(totalNet, mainCurrency)}</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    ${vacantSection}

    <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
      Las transferencias pendientes se procesan los primeros días de cada mes. Si tiene alguna pregunta, no dude en contactarnos.
    </p>

    <!-- CTA -->
    <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
      <tr>
        <td style="padding-right:8px;">
          <a href="${data.siteUrl ? data.siteUrl + '/portal/propietario' : '#'}" style="display:inline-block;background-color:${BRAND_BLUE};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:8px;">Ver mi portal</a>
        </td>
        <td>
          ${data.companyWhatsapp ? `<a href="https://wa.me/${data.companyWhatsapp.replace(/[^0-9]/g,'')}" style="display:inline-block;background-color:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:8px;">WhatsApp</a>` : ''}
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:16px;">
      Gracias por confiar en PuntualPago para la gestión de sus propiedades.
    </p>
  `, `Reporte mensual ${period} — Neto ${formatCurrencyEmail(totalNet, mainCurrency)}`)

  return { subject, html }
}

// ─── 4. Vencimiento de contrato (para propietario) ───────────────────────────

export function contractExpirationTemplate(data: ContractExpirationData) {
  const urgency = data.daysUntilExpiry <= 15 ? 'urgente' : data.daysUntilExpiry <= 30 ? 'pronto' : 'próximo'
  const accentColor = data.daysUntilExpiry <= 15 ? '#dc2626' : data.daysUntilExpiry <= 30 ? '#d97706' : BRAND_SECONDARY
  const subject = `Contrato vence en ${data.daysUntilExpiry} días - ${data.propertyName}`

  const html = baseLayout(`
    <p style="margin:0 0 8px;font-size:16px;color:#1e293b;">Estimado/a <strong>${data.ownerName}</strong>,</p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Le informamos que el contrato de arrendamiento para su propiedad <strong>${data.propertyName}</strong> vencerá ${urgency}.
    </p>

    <!-- Days countdown -->
    <div style="background-color:#fef9c3;border:1px solid ${accentColor}40;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:13px;color:#92400e;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Días restantes</p>
      <p style="margin:0;font-size:48px;font-weight:800;color:${accentColor};">${data.daysUntilExpiry}</p>
      <p style="margin:4px 0 0;font-size:14px;color:#92400e;">Vence el ${formatDateEmail(data.endDate)}</p>
    </div>

    <!-- Details -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:24px;">
      <tr>
        <td style="padding:20px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#475569;">Propiedad</td>
              <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">${data.propertyName}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#475569;">Dirección</td>
              <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">${data.propertyAddress}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#475569;">Inquilino</td>
              <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">${data.tenantName}</td>
            </tr>
            ${data.contractNumber ? `
            <tr>
              <td style="padding:6px 0;font-size:14px;color:#475569;">N° de contrato</td>
              <td style="padding:6px 0;font-size:14px;color:#1e293b;font-weight:600;text-align:right;">${data.contractNumber}</td>
            </tr>` : ''}
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
      Por favor comuníquese con nosotros para coordinar la renovación o terminación del contrato.<br/>
      Nuestro equipo está disponible para asistirle.
    </p>
  `, `Su contrato para ${data.propertyName} vence en ${data.daysUntilExpiry} días`)

  return { subject, html }
}
