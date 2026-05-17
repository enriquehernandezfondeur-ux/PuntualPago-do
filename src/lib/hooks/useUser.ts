'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types/database'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (authUser) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        setUser(data)
      }
      setLoading(false)
    })
  }, [])

  return { user, loading }
}

export function hasPermission(userRole: User['role'] | undefined, allowedRoles: User['role'][]): boolean {
  if (!userRole) return false
  return allowedRoles.includes(userRole)
}

export const ROLE_LABELS: Record<User['role'], string> = {
  super_admin:         'Super Admin',
  admin:               'Administrador',
  gerente_operativo:   'Gerente Operativo',
  equipo_cobros:       'Equipo de Cobros',
  equipo_legal:        'Equipo Legal',
  equipo_mantenimiento:'Equipo Mantenimiento',
  contabilidad:        'Contabilidad',
  solo_lectura:        'Solo Lectura',
  inquilino:           'Inquilino',
  propietario:         'Propietario',
}

export const PORTAL_ROLES: User['role'][] = ['inquilino', 'propietario']
export const STAFF_ROLES:  User['role'][] = [
  'super_admin','admin','gerente_operativo','equipo_cobros',
  'equipo_legal','equipo_mantenimiento','contabilidad','solo_lectura',
]
