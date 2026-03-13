import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mac_address = searchParams.get('mac')

  if (!mac_address) {
    return NextResponse.json({ error: 'MAC address is required' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Supabase credentials not configured.' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Fetch the oldest PENDING command for this device
    const { data: command, error } = await supabase
      .from('device_commands')
      .select('*')
      .eq('mac_address', mac_address)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) throw error

    if (!command) {
      return NextResponse.json({
        mac_address,
        command: 'STANDBY',
        payload: null,
        message: 'No pending commands.',
      })
    }

    // If this is an AC command and payload doesn't have ir_code yet, fetch it now
    const acCommands = ['AC_OFF', 'AC_COOL', 'AC_TEMP_UP', 'AC_TEMP_DOWN']
    let irCode = command.payload?.ir_code ?? null

    if (acCommands.includes(command.command) && !irCode) {
      const { data: irData } = await supabase
        .from('comandos_raw')
        .select('codigo_ir')
        .eq('mac_address', mac_address)
        .eq('nome_comando', command.command)
        .eq('validado', true)
        .maybeSingle()

      irCode = irData?.codigo_ir ?? null
    }

    // Mark it as EXECUTED
    await supabase
      .from('device_commands')
      .update({ status: 'EXECUTED', executed_at: new Date().toISOString() })
      .eq('id', command.id)

    return NextResponse.json({
      mac_address,
      command_id: command.id,
      command: command.command,
      ir_code: irCode,
      payload: { ...command.payload, ir_code: irCode },
      issued_at: command.created_at,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
