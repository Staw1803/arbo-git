import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mac_address = searchParams.get('mac_address')
  const versao_atual_str = searchParams.get('versao_atual')

  if (!mac_address || !versao_atual_str) {
    return NextResponse.json({ error: 'Parâmetros mac_address e versao_atual são obrigatórios' }, { status: 400 })
  }

  const versao_atual = parseFloat(versao_atual_str)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Busca a atualização mais recente que seja global
    // Se no futuro você quiser direcionar ota por mac_address basta adicionar essa lógica
    const { data: update, error } = await supabase
      .from('firmware_updates')
      .select('version, url, is_global')
      .eq('is_global', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!update) {
      return NextResponse.json({ update_available: false, message: 'Nenhuma atualização disponível.' })
    }

    if (update.version > versao_atual) {
      return NextResponse.json({
        update_available: true,
        latest_version: update.version,
        url: update.url
      })
    } else {
      return NextResponse.json({
        update_available: false,
        message: 'A placa já está na versão mais recente.'
      })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
