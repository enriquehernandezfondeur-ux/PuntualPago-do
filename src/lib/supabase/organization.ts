import type { SupabaseClient } from '@supabase/supabase-js'
import type { Organization } from '@/types/database'

/**
 * Returns the full Organization record for the currently authenticated user.
 * Returns null if the user has no organization assigned or is not authenticated.
 */
export async function getCurrentOrganization(
  supabase: SupabaseClient
): Promise<Organization | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch the user's organization_id from the users table
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) return null

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.organization_id)
    .single()

  if (orgError || !org) return null

  return org as Organization
}

/**
 * Returns only the organization UUID for the currently authenticated user.
 * Returns null if the user has no organization assigned or is not authenticated.
 */
export async function getOrgId(supabase: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile, error } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (error || !profile?.organization_id) return null

  return profile.organization_id as string
}

export type { Organization }
