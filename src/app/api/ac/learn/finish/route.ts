import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

// POST /api/ac/learn/finish — mark device as ACTIVE and ac_configured=true
export async function POST(request: Request) {
  const { mac_address } = await request.json()

  if (!mac_address) {
    return NextResponse.json({ error: 'mac_address is required' }, { status: 400 })
  }

  const supabase = getSupabase()

  const { error } = await supabase
    .from('dispositivos')
    .update({ status: 'ACTIVE', modo: 'NORMAL', ac_configured: true })
    .eq('mac_address', mac_address)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, status: 'ACTIVE' })
}
