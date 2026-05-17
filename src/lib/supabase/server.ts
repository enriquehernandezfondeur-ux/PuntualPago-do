import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {}
        },
      },
    }
  )
}

/**
 * Obtiene el organization_id del usuario actual.
 * Hace una sola query SELECT de users (la misma que getUser no devuelve).
 * super_admin retorna null → ve todo sin filtro de org.
 *
 * En la mayoría de páginas, createClient().auth.getUser() ya fue llamado
 * y Supabase SSR cachea el resultado dentro del mismo request — sin round-trip extra.
 */
export async function getOrgFilter(supabase?: SupabaseClient): Promise<string | null> {
  const client = supabase ?? await createClient()

  const { data: { user } } = await client.auth.getUser()
  if (!user) return null

  // Supabase SSR deduplica queries iguales en el mismo request
  const { data: profile } = await client
    .from('users')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  // super_admin ve todo sin filtro
  if (profile?.role === 'super_admin') return null
  // Usuarios sin org asignada no deben ver datos de otras orgs
  if (!profile?.organization_id) return 'NO_ORG'
  return profile.organization_id
}

/**
 * Aplica .eq('organization_id', orgId) si orgId no es null.
 * Si es null (super_admin), retorna el query sin modificar.
 */
export function withOrg<T>(query: T, orgId: string | null): T {
  if (!orgId) return query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (query as any).eq('organization_id', orgId) as T
}
