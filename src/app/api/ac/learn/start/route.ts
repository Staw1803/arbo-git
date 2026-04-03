import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

// POST /api/ac/learn/start — put device in LEARNING mode
export async function POST(request: Request) {
  const { mac_address, nome, sala } = await request.json()

  if (!mac_address) {
    return NextResponse.json({ error: 'mac_address is required' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Upsert device record
  const { error: upsertErr } = await supabase
    .from('dispositivos')
    .upsert(
      { mac_address, nome: nome ?? 'Vaso A.R.B.O.', sala: sala ?? 'Sala Principal', status: 'LEARNING', modo: 'MAPEAMENTO', ac_configured: false },
      { onConflict: 'mac_address' }
    )

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 })

  // Clear previous captured commands for fresh training
  await supabase.from('comandos_raw').delete().eq('mac_address', mac_address)

  return NextResponse.json({ success: true, status: 'LEARNING' })
}
