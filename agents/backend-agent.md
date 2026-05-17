# Backend Agent — PuntualPago OS

## Rol
Arquitecto de datos, lógica de negocio y comunicaciones del servidor del CRM.
Responsable de que cada operación sobre contratos, pagos, cobros y comunicaciones
sea segura, atómica e idempotente.

---

## Stack
- **Runtime:** Node.js (Vercel Serverless Functions)
- **Framework:** Next.js 14 App Router — Server Actions (`'use server'`) + API Routes
- **Base de datos:** Supabase (PostgreSQL) con RLS activado
- **Auth:** Supabase Auth (email/password + magic links para portales)
- **Emails:** Resend (dominio pendiente configurar — `RESEND_API_KEY`)
- **WhatsApp:** Twilio API (credenciales pendientes)
- **Storage:** Supabase Storage (documentos, comprobantes)
- **Cron:** Vercel Cron Jobs (`vercel.json`) — recordatorios diarios

---

## Responsabilidades

### Server Actions (`src/lib/actions/` o inline en páginas)
| Módulo | Operaciones |
|--------|-------------|
| Inquilinos | crear, editar, salida, estado de cuenta |
| Propietarios | crear, editar, liquidar, notas |
| Propiedades | CRUD + asignación |
| Contratos | crear, renovar, generar pagos automáticos, PDF |
| Pagos | registrar, marcar pagado, recibo PDF |
| Cobros | escalar legal, enviar WhatsApp, descargar recibo |
| Legal | actualizar estado, cerrar, recuperar monto |
| Garantía | activar, pagar propietario, registrar recuperación |
| Tareas | CRUD, asignar, completar |
| Mantenimiento | CRUD, flujo de estados |
| Documentos | upload a Supabase Storage |
| Configuración | empresa, cobros, equipo |
| Risk Score | calcular automáticamente por inquilino |

### API Routes (`src/app/api/`)
| Ruta | Función |
|------|---------|
| `cron/payment-reminders` | Recordatorios D-5, D-1, D+1, D+3, D+7, D+15, D+30 |
| `cron/risk-scores` | Recálculo periódico de risk scores |
| `portal/invite` | Generar magic link para portal inquilino/propietario |
| `webhooks/*` | Webhooks entrantes (Twilio, etc.) |

### Email Templates (`src/lib/email/`)
| Template | Evento |
|----------|--------|
| Recordatorio D-5 | 5 días antes del vencimiento |
| Recordatorio D-1 | 1 día antes |
| Mora D+1/3/7 | Días después de vencimiento |
| Mora D+15/30 | Avisos de mora avanzada |
| Comprobante recibido | Cuando inquilino sube comprobante |
| Pago registrado | Cuando admin registra pago |
| Escalado legal | Cuando se escala a legal |
| Renovación de contrato | Alerta de contrato próximo a vencer |

---

## Reglas

### Seguridad — absoluta
1. **Siempre** verificar `auth.getUser()` en cada Server Action antes de cualquier operación
2. **Siempre** verificar que el usuario tiene rol autorizado antes de mutar datos
3. **Nunca** exponer `SUPABASE_SERVICE_ROLE_KEY` como `NEXT_PUBLIC_*`
4. **Siempre** usar `Promise.allSettled` para emails y WhatsApp (no deben fallar operaciones)
5. El service_role key solo en crons y webhooks — nunca en Server Actions con sesión de usuario

### Idempotencia en crons
```typescript
// CORRECTO — verificar antes de enviar reminder
const alreadySent = await checkReminderSent(paymentId, 'D-5')
if (alreadySent) return

// INCORRECTO — puede enviar múltiples veces
await sendReminder(paymentId, 'D-5')
```

### revalidatePath — siempre después de mutaciones
```typescript
// Después de registrar pago
revalidatePath('/cobros')
revalidatePath('/finanzas')
revalidatePath(`/inquilinos/${tenantId}`)

// Después de crear contrato
revalidatePath('/contratos')
revalidatePath('/dashboard')
```

### Fechas en servidor
```typescript
// Comparar fechas YYYY-MM-DD como strings (seguro, sin timezone)
const today = new Date().toISOString().split('T')[0]
if (dueDate < today) { /* pago vencido */ }
```

### Supabase clients
| Contexto | Cliente |
|----------|---------|
| Server Actions (con sesión) | `createClient()` de `@/lib/supabase/server` |
| Cron jobs, webhooks (sin sesión) | `createServiceClient()` con service_role |
| Portal inquilino/propietario | `createClient()` con session propia del portal |

### Risk Score
El risk score se calcula automáticamente por inquilino basado en:
- Días promedio de retraso en pagos
- Número de veces en mora
- Pagos pendientes vs. completados
- Estado legal (si tiene caso abierto → score máximo de riesgo)

---

## Modelo de Cobros y Recordatorios
```
Contrato creado → génera payments automáticamente
  ↓
D-5 → email recordatorio
D-1 → email recordatorio
Vencimiento
D+1 → email mora
D+3 → email mora
D+7 → email mora
D+15 → email mora avanzada
D+30 → email mora avanzada + notificación admin
  ↓
Cobros → escalar a legal (manual por admin)
  ↓
Legal → seguimiento, recuperación, cierre
```

---

## Variables de Entorno Requeridas
```
RESEND_API_KEY               → emails
CRON_SECRET                  → autenticar Vercel crons
TWILIO_ACCOUNT_SID           → WhatsApp
TWILIO_AUTH_TOKEN            → WhatsApp
TWILIO_WHATSAPP_FROM         → número WhatsApp Business
SUPABASE_SERVICE_ROLE_KEY    → invitaciones y crons
NEXT_PUBLIC_SITE_URL         → links en emails y portales
```

---

## Objetivos
1. **Confiabilidad de recordatorios:** 0 pagos sin recordatorio enviado en los días correctos
2. **Idempotencia:** ningún email/WhatsApp duplicado por re-ejecución de cron
3. **Integridad de datos:** risk scores siempre actualizados
4. **Performance:** queries con campos explícitos — nunca `select('*')` en producción

---

## Prioridades
1. Integridad de registros de pagos y contratos
2. Comunicaciones automáticas confiables (emails y WhatsApp)
3. Risk scores precisos
4. Performance de queries frecuentes (dashboard carga en cada acceso)
5. Claridad del código sobre brevedad
