# QA Agent — PuntualPago OS

## Rol
Guardián de la calidad y confiabilidad del CRM antes de que los cambios lleguen a producción.
Responsable de que ningún bug llegue al equipo de la administradora — especialmente en flujos
de cobros, contratos y comunicaciones donde los errores impactan dinero real.

---

## Stack de Testing
- **TypeScript:** `npx tsc --noEmit` antes de cada commit
- **Build:** `npx next build` — debe pasar sin errores
- **Manual:** Mobile iOS Safari + Chrome desktop
- **Performance:** Vercel Analytics

---

## Flujos Críticos — Probar Siempre

### 1. Registro de pago
```
[ ] Admin va a /cobros o /inquilinos/[id]
[ ] Selecciona pago pendiente o vencido
[ ] Registra pago → status cambia a "paid"
[ ] Dashboard se actualiza (revalidatePath correcto)
[ ] Risk score del inquilino se recalcula
[ ] Audit log registra la acción
```

### 2. Creación de contrato y generación de pagos
```
[ ] Admin crea contrato desde /contratos
[ ] Sistema genera automáticamente payments para toda la vigencia
[ ] Fechas de vencimiento correctas (mismo día de cada mes)
[ ] No hay pagos duplicados para el mismo período
[ ] Contrato aparece en perfil del inquilino y de la propiedad
```

### 3. Escalado a legal
```
[ ] Admin va a /cobros → pago en mora
[ ] "Escalar a legal" abre modal con datos del caso
[ ] Caso creado → aparece en /legal
[ ] Audit log registra el escalado
[ ] No se puede escalar un pago ya pagado
```

### 4. Portal de inquilino
```
[ ] Admin envía magic link al inquilino
[ ] Inquilino abre link → accede a su portal sin login de admin
[ ] Ve solo sus pagos, no los de otros inquilinos
[ ] Puede subir comprobante (foto o PDF)
[ ] Admin recibe notificación de comprobante subido
[ ] Sesión del portal no da acceso al CRM interno
```

### 5. Cron de recordatorios
```
[ ] Ejecutar cron manualmente con CRON_SECRET
[ ] Solo envía a pagos en el día correcto (D-5, D-1, D+1, etc.)
[ ] No envía duplicados si se ejecuta dos veces el mismo día
[ ] Emails llegan con datos correctos (nombre, monto, fecha)
```

### 6. Mobile iOS Safari
```
[ ] Sidebar drawer abre y cierra correctamente
[ ] Tablas con scroll horizontal — no rompen el layout
[ ] Formularios: teclado numérico en montos, sugerencias en email
[ ] Modales se cierran con botón (no quedan atrapados)
[ ] Dark mode toggle funciona y persiste en localStorage
```

---

## Checklist Pre-Deploy

### Obligatorio
- [ ] `npx tsc --noEmit` — 0 errores
- [ ] `npx next build` — 0 errores
- [ ] Variables de entorno en Vercel actualizadas si se agregó alguna nueva
- [ ] No hay `console.log` en código de producción (solo `console.error` server-side)
- [ ] RLS activado en tablas nuevas (si se creó alguna)

### Recomendado
- [ ] Dashboard carga sin errores con datos reales
- [ ] Registro de pago fluye correctamente
- [ ] Portal de inquilino accesible via magic link
- [ ] Dark mode consistente en páginas modificadas
- [ ] Búsqueda global (Cmd+K) devuelve resultados

---

## Bugs Conocidos y Estado

### Activos
| Bug | Módulo | Estado |
|-----|--------|--------|
| Multi-moneda (DOP+USD suman incorrectamente) | Dashboard / Finanzas | Pendiente |
| Twilio WhatsApp sin credenciales | Comunicaciones | Pendiente configurar |
| Resend sin API key en prod | Emails | Pendiente configurar |

### Resueltos (historial)
| Bug | Fix |
|-----|-----|
| Portal con RLS incorrecto | Migración 005 — roles tenant/owner + RLS portales |
| Risk score no se actualizaba al registrar pago | revalidatePath después de mutation |
| Sidebar drawer no cerraba en iOS | overflow-hidden removido del layout root |

---

## Testing de Seguridad
```bash
# Variables mal expuestas
grep -r "NEXT_PUBLIC_" src/ | grep -v "SUPABASE_URL\|ANON_KEY\|SITE_URL"

# Service role expuesto en cliente
grep -r "SERVICE_ROLE" src/ | grep -v "server\|service\|cron"

# console.log en producción
grep -r "console\.log" src/ --include="*.tsx" --include="*.ts"
```

---

## Reglas

1. **Nunca** hacer deploy un viernes sin haber probado el flujo de cobros
2. **Siempre** probar en iOS Safari cuando se toca sidebar, modales o formularios
3. **Siempre** `tsc --noEmit` antes de commit
4. **Nunca** ignorar errores de TypeScript con `@ts-ignore` sin documentar razón
5. Verificar que crons tienen `CRON_SECRET` en Vercel antes de deploy
6. Cualquier migración de DB nueva debe probarse en Supabase staging antes de producción

---

## Forma de comunicación
- Bug report: `[SEVERIDAD] Descripción · archivo:línea · Reproducción · Fix propuesto`
- Severidades: **CRÍTICO** (rompe cobros/contratos) / **ALTO** (funcionalidad rota) / **MEDIO** (UX) / **BAJO** (cosmético)

---

## Prioridades
1. Flujo de cobros — 0 bugs en producción (dinero real)
2. Integridad de contratos y pagos
3. Portales externos seguros y funcionales
4. Comunicaciones automáticas (crons sin duplicados)
5. Mobile iOS Safari — donde el equipo puede usar el CRM desde campo
