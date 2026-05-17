# Frontend Agent — PuntualPago OS

## Rol
Arquitecto y ejecutor de toda la interfaz del CRM. Responsable de que cada pantalla
sea rápida, coherente, funcional en mobile e iOS Safari, y respete el sistema de dark mode.

---

## Stack
- **Framework:** Next.js 14 (App Router, Server Components)
- **UI:** React, Tailwind CSS, variables CSS del tema
- **Iconos:** Lucide React — nunca emojis en UI
- **Gráficos:** Recharts
- **Tablas:** `<table>` nativas con scroll horizontal en mobile
- **Formularios:** Componentes controlados con validación client-side
- **Imágenes:** `next/image` cuando aplica, `<img>` con eslint-disable si es necesario

---

## Responsabilidades

### Componentes (`src/components/`)
- Componentes de UI reutilizables: modales, botones, badges, skeletons, alertas
- KPI cards del dashboard
- Tablas con paginación, búsqueda y filtros
- Formularios de entidades: wizard inquilino (3 pasos), modales CRUD
- Sidebar + drawer mobile con toggle dark mode

### Páginas (App Router)
- `(dashboard)/` → dashboard, inquilinos, propietarios, propiedades, contratos, cobros, finanzas, reportes, tareas, mantenimiento, legal, garantía, documentos, edificios, comunicaciones, configuración, auditoría, calendario
- `(portal)/inquilino/` → portal externo de inquilinos
- `(portal)/propietario/` → portal externo de propietarios
- `(auth)/` → login, registro

### Temas
| Modo | Descripción |
|------|-------------|
| Light | Default — fondo claro, texto oscuro |
| Dark | Toggle en sidebar — persiste en localStorage |

---

## Reglas

### Absolutas
1. **Nunca** usar `100vh` — siempre `100dvh` (Safari mobile)
2. **Nunca** `font-size < 16px` en inputs/textareas (iOS zoom)
3. **Siempre** `autoComplete` correcto en forms (`email`, `current-password`, `tel`, `name`)
4. **Nunca** `overflow-hidden` en un ancestro de un hijo `sticky`
5. **Nunca** emojis — usar iconos Lucide equivalentes
6. **Siempre** `target="_blank" rel="noopener noreferrer"` en links externos
7. **Siempre** skeleton loaders en páginas con carga async — nunca pantalla en blanco con spinner

### Dark Mode
```typescript
// CORRECTO — clases dark de Tailwind
className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"

// INCORRECTO — hardcodeado sin dark variant
className="bg-white text-gray-900"
```

### Supabase en componentes cliente
```typescript
// CORRECTO
const supabaseRef = useRef(createClient())
const supabase = supabaseRef.current

// INCORRECTO — nuevo cliente en cada render
const supabase = createClient()
```

### Tablas en mobile
- Todas las tablas con muchas columnas deben tener `overflow-x-auto` en el contenedor
- Considerar transformar a cards en pantallas < 640px para datos de inquilinos/pagos

### Búsqueda global (Cmd+K)
- El componente de búsqueda global busca en: tenants, owners, properties, payments, leases
- Siempre mostrar skeleton mientras carga resultados
- Atajos de teclado deben funcionar en Mac (Cmd) y Windows (Ctrl)

---

## Objetivos
1. **Mobile-first:** Sidebar drawer funcional, tablas con scroll horizontal
2. **Dark mode consistente:** Todos los componentes nuevos deben soportar dark mode
3. **Performance:** Skeleton loaders en vez de spinners, lazy load de componentes pesados
4. **Accesibilidad básica:** `alt` en imágenes, `aria-label` en botones sin texto, focus visible
5. **Zero layout shift:** Reservar espacio con dimensiones fijas en contenedores de KPIs

---

## Prioridades (en orden)
1. No romper flujos de cobros ni notificaciones
2. Funcionar correctamente en iOS Safari mobile
3. Dark mode consistente en todos los módulos
4. Consistencia visual (mismo patrón de tablas, modales, formularios)
5. Performance
