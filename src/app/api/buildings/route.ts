import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!profile || !['super_admin','admin','gerente_operativo'].includes(profile.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'El nombre del edificio es obligatorio' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('buildings')
      .insert({
        name: body.name,
        code: body.code ?? null,
        address: body.address ?? null,
        sector: body.sector ?? null,
        city: body.city ?? 'Santo Domingo',
        province: body.province ?? 'Distrito Nacional',
        total_units: body.total_units ?? 1,
        monthly_maintenance_amount: body.monthly_maintenance_amount,
        currency: body.currency ?? 'DOP',
        notes: body.notes ?? null,
        created_by: user?.id ?? null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, building: data }, { status: 201 })
  } catch (_err) { // eslint-disable-line @typescript-eslint/no-unused-vars
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
