# Agentes — PuntualPago OS Multi-Agent System

Sistema de agentes especializados para el desarrollo y mantenimiento del CRM de administración de propiedades PuntualPago OS.
Cada agente tiene un rol, responsabilidades y reglas específicas para su dominio.

## Agentes disponibles

| Agente | Archivo | Dominio |
|--------|---------|---------|
| Frontend | `frontend-agent.md` | UI, componentes, mobile, dark mode, accesibilidad |
| Backend | `backend-agent.md` | Server Actions, API routes, DB, Resend, Twilio |
| CRM | `crm-agent.md` | Flujos de cobros, inquilinos, propietarios, contratos, riesgo |
| Security | `security-agent.md` | RLS, auth, portales externos, middleware |
| QA | `qa-agent.md` | Testing, bugs conocidos, checklist de deploy |

## Cómo usar este sistema

Cuando trabajas en una tarea, identifica qué agente(s) aplican:

- **Cambio de UI/componente** → lee `frontend-agent.md`
- **Nueva Server Action o API Route** → lee `backend-agent.md`
- **Cambio en flujo de cobros, contratos o inquilinos** → lee `crm-agent.md` + `backend-agent.md`
- **Cambio que toca portales externos o seguridad** → siempre consultar `security-agent.md`
- **Antes de deploy** → checklist en `qa-agent.md`

## Stack General

Next.js 14 (App Router) · Supabase (PostgreSQL + Auth + Storage + Realtime) · TailwindCSS · TypeScript · Resend (emails) · Twilio (WhatsApp) · Recharts
