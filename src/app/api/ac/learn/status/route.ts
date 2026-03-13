import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

// GET /api/ac/learn/status?mac=XX — returns captured commands progress
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mac_address = searchParams.get('mac')

  if (!mac_address) {
    return NextResponse.json({ error: 'mac_address is required' }, { status: 400 })
  }

  const supabase = getSupabase()

  const [{ data: device }, { data: comandos }] = await Promise.all([
    supabase.from('dispositivos').select('*').eq('mac_address', mac_address).maybeSingle(),
    supabase.from('comandos_raw').select('*').eq('mac_address', mac_address),
  ])

  const captured = (comandos ?? []).reduce(
    (acc: Record<string, boolean>, c: any) => ({ ...acc, [c.nome_comando]: c.validado }),
    {}
  )

  return NextResponse.json({
    device,
    captured,
    total_captured: (comandos ?? []).filter((c: any) => c.validado).length,
  })
}
