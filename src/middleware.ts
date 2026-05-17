import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ── In-memory rate limiter ────────────────────────────────────────────────────
// Runs per-instance (serverless), but effective against casual abuse.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

interface RateRule { windowMs: number; max: number }

const RATE_RULES: Record<string, RateRule> = {
  '/api/whatsapp':                       { windowMs: 60_000,   max: 10  },
  '/api/search':                         { windowMs: 60_000,   max: 60  },
  '/api/emails/send':                    { windowMs: 60_000,   max: 20  },
  '/api/payments/register':              { windowMs: 60_000,   max: 60  },
  // Cada cron con su propio límite — no compiten entre sí
  '/api/cron/update-overdue':            { windowMs: 300_000,  max: 3   },
  '/api/cron/whatsapp-reminders':        { windowMs: 300_000,  max: 3   },
  '/api/cron/monthly-owner-report':      { windowMs: 86_400_000, max: 3 }, // 3 por día
  '/api/emails/cron-reminders':          { windowMs: 300_000,  max: 3   },
  '/api/payouts/generate-monthly':       { windowMs: 86_400_000, max: 3 },
}

function checkRateLimit(ip: string, path: string): boolean {
  for (const [prefix, rule] of Object.entries(RATE_RULES)) {
    if (!path.startsWith(prefix)) continue
    const key  = `${ip}:${prefix}`
    const now  = Date.now()
    const entry = rateLimitStore.get(key)
    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + rule.windowMs })
      return true
    }
    if (entry.count >= rule.max) return false
    entry.count++
    return true
  }
  return true
}

export async function middleware(request: NextRequest) {
  // ── Rate limiting check (before auth) ──────────────────────────────────────
  const path = request.nextUrl.pathname
  if (path.startsWith('/api/')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    if (!checkRateLimit(ip, path)) {
      return NextResponse.json({ error: 'Demasiadas solicitudes. Intenta en un momento.' }, { status: 429 })
    }
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isLogin    = path.startsWith('/login')
  const isRegistro = path.startsWith('/registro')
  const isPublic   = path === '/' || isRegistro || path.startsWith('/forgot-password') || path.startsWith('/reset-password')

  // Unauthenticated: redirect to login
  if (!user && !isLogin && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Leer perfil una sola vez para todos los checks de auth y org.
  // Se usa cache de Supabase — la misma query en la misma request no hace round-trip doble.
  let profile: { role: string; organization_id: string | null } | null = null
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()
    profile = data ?? null
  }

  // Authenticated user hitting login or registro: redirect to their home
  if (user && (isLogin || isRegistro)) {
    const url = request.nextUrl.clone()
    if (profile?.role === 'inquilino') {
      url.pathname = '/portal/inquilino'
    } else if (profile?.role === 'propietario') {
      url.pathname = '/portal/propietario'
    } else {
      url.pathname = '/dashboard'
    }
    return NextResponse.redirect(url)
  }

  // Portal routes: only accessible to portal roles
  if (user && path.startsWith('/portal/inquilino')) {
    if (!profile || !['inquilino','super_admin','admin'].includes(profile.role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  if (user && path.startsWith('/portal/propietario')) {
    if (!profile || !['propietario','super_admin','admin'].includes(profile.role)) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Dashboard routes: block portal-only users from accessing admin
  if (user && (path.startsWith('/dashboard') || (!path.startsWith('/portal') && !isLogin && !isPublic))) {
    const isPortalPath = path.startsWith('/portal')
    if (!isPortalPath) {
      if (profile?.role === 'inquilino') {
        const url = request.nextUrl.clone()
        url.pathname = '/portal/inquilino'
        return NextResponse.redirect(url)
      }
      if (profile?.role === 'propietario') {
        const url = request.nextUrl.clone()
        url.pathname = '/portal/propietario'
        return NextResponse.redirect(url)
      }
    }
  }

  // Pasar x-org-id en el response header — el middleware lo lee en cada request
  // sin que las páginas necesiten hacer query adicional a la DB.
  if (user && profile?.organization_id) {
    supabaseResponse.headers.set('x-org-id', profile.organization_id)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
