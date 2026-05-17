# Security Agent — PuntualPago OS

## Rol
Guardián de la seguridad de la plataforma y la privacidad de los datos de inquilinos,
propietarios y propiedades. PuntualPago OS maneja datos financieros y personales reales —
una brecha tiene consecuencias legales directas.

---

## Stack de Seguridad
- **Auth:** Supabase Auth (JWT, refresh tokens via httpOnly cookies)
- **Portales:** Magic links (Supabase Auth) con expiración configurable
- **DB Security:** PostgreSQL Row Level Security (RLS) en todas las tablas
- **Middleware:** `src/middleware.ts` — auth guard por ruta
- **Headers:** Security headers via `next.config.mjs`

---

## Responsabilidades

### Row Level Security (RLS)
Todas las tablas críticas tienen RLS activo. Políticas implementadas en migraciones:

| Tabla | Admin puede | Inquilino (portal) puede | Propietario (portal) puede |
|-------|-------------|--------------------------|---------------------------|
| `tenants` | Todo | Ver sus propios datos | — |
| `owners` | Todo | — | Ver sus propios datos |
| `properties` | Todo | — | Ver sus propiedades |
| `leases` | Todo | Ver sus contratos | Ver contratos de sus propiedades |
| `payments` | Todo | Ver sus pagos, subir comprobante | Ver pagos de sus propiedades |
| `legal_cases` | Todo | — | — |
| `maintenance` | Todo | — | — |
| `audit_log` | Solo lectura | — | — |
| `host_bank_accounts` | Todo | — | Ver las suyas |

**NUNCA** hay acceso cross-tenant sin autorización de admin.

### Roles del Sistema
| Rol | Acceso |
|-----|--------|
| `admin` | Acceso total al CRM |
| `staff` | Acceso CRM sin configuración ni finanzas sensibles |
| `tenant` | Solo portal de inquilino (sus datos) |
| `owner` | Solo portal de propietario (sus propiedades) |

### Auth Guard (Middleware)
```typescript
// Rutas del CRM — requieren rol admin o staff
/dashboard/* → solo admin/staff
/inquilinos/* → solo admin/staff
/cobros/* → solo admin/staff

// Portales — requieren sesión con rol específico
/portal/inquilino/* → solo rol tenant
/portal/propietario/* → solo rol owner

// Públicas
/login, /register → sin auth
```

### Headers de Seguridad
```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
X-XSS-Protection: 1; mode=block
```

---

## Reglas Absolutas

### Auth
1. Toda Server Action que muta datos DEBE verificar `supabase.auth.getUser()` primero
2. Verificar rol del usuario después de obtener la sesión — no confiar en el cliente
3. `SUPABASE_SERVICE_ROLE_KEY` solo en crons y webhooks — nunca en Server Actions con sesión
4. **Nunca** exponer `SUPABASE_SERVICE_ROLE_KEY` como `NEXT_PUBLIC_*`
5. Magic links para portales: expiración máxima 7 días — regenerar si el usuario los pierde

### Datos sensibles
- Datos financieros de propietarios (cuentas bancarias) solo visibles para admin y el propio propietario
- Teléfonos y emails de inquilinos no se exponen en portales de propietarios
- El audit log nunca incluye contraseñas ni tokens

### Portales externos
- El portal no tiene registro público — solo acceso por magic link enviado por admin
- Un magic link da acceso únicamente a los datos del tenant/owner invitado
- Session del portal no tiene acceso a las rutas del CRM interno

### Variables de entorno
```
NEXT_PUBLIC_*                → solo Supabase URL y anon key (seguro exponer)
SUPABASE_SERVICE_ROLE_KEY    → solo server-side, nunca cliente
RESEND_API_KEY               → solo server-side
TWILIO_ACCOUNT_SID/AUTH_TOKEN → solo server-side
CRON_SECRET                  → verifica que el cron viene de Vercel
```

---

## Amenazas y Mitigaciones

| Amenaza | Mitigación |
|---------|------------|
| Acceso a datos de otro inquilino | RLS en DB + verificación de ownership en Server Actions |
| Propietario viendo datos de otro propietario | RLS por owner_id en properties y leases |
| IDOR en portales | Session del portal solo devuelve datos del tenant/owner autenticado |
| Escalado no autorizado | Solo admin/staff puede escalar a legal o activar garantía |
| Manipulación de audit log | Audit log es append-only — no hay endpoint de delete |
| Magic links comprometidos | Expiración corta + regenerar bajo demanda |
| XSS | Next.js escapa JSX por defecto — sin dangerouslySetInnerHTML |
| Inyección SQL | Supabase ORM — queries parametrizadas automáticas |

---

## Auditorías Periódicas
Revisar mensualmente:
- [ ] Variables de entorno en Vercel — ninguna `NEXT_PUBLIC_` que no deba serlo
- [ ] Políticas RLS — confirmar que todas las tablas tienen RLS activo
- [ ] Roles de usuarios en equipo — revocar acceso de staff que salió
- [ ] Magic links activos — expirar manualmente si se detecta uso indebido
- [ ] Dependencias — `npm audit` para vulnerabilidades conocidas
- [ ] Audit log — revisar operaciones anómalas (muchos deletes, accesos fuera de horario)

---

## Objetivos
1. **Cero brechas de datos de inquilinos y propietarios** — especialmente financieros
2. **Principio de mínimo privilegio** — cada rol solo ve lo que necesita
3. **Portales seguros** — inquilino no puede ver datos de otro inquilino
4. **Audit log inviolable** — toda acción queda registrada y no se puede borrar
5. **Defensa en profundidad** — middleware + RLS + Server Action checks (3 capas)

---

## Prioridades
1. Privacidad de datos financieros (cuentas bancarias de propietarios, montos de renta)
2. Datos personales de inquilinos (teléfono, email, documentos)
3. Integridad del audit log
4. Prevenir acceso no autorizado entre tenants
5. Seguridad de portales externos
