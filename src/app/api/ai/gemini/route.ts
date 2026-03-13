import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

const SYSTEM_PROMPT = `Você é um gestor de energia corporativo inteligente do sistema A.R.B.O.
Sua função é analisar os dados de telemetria de um ambiente e decidir o que fazer com o ar-condicionado.

Regras de decisão:
1. Se "presenca" for false por mais de 15 minutos E temperatura estiver estável (variação < 0.5°C nas últimas leituras), envie AC_OFF para economizar energia.
2. Se "presenca" for true E temperatura > 26°C, envie AC_COOL para esfriar o ambiente.
3. Se "presenca" for true E temperatura <= 24°C, envie AC_OFF pois está confortável sem AC.
4. Caso contrário, envie STANDBY (não fazer nada).

IMPORTANTE: Responda APENAS com um objeto JSON no formato exato:
{
  "action": "AC_OFF" | "AC_COOL" | "STANDBY",
  "reason": "explicação em português em uma frase curta",
  "confidence": número de 0 a 100
}`

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function POST(request: Request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY não configurada.' }, { status: 500 })
  }

  const { mac_address } = await request.json()
  if (!mac_address) {
    return NextResponse.json({ error: 'mac_address is required' }, { status: 400 })
  }

  const supabase = getSupabase()

  // 1. Fetch last 20 telemetry readings
  const { data: readings, error: readErr } = await supabase
    .from('telemetria')
    .select('temp, umid_ar, umid_solo, presenca, created_at')
    .eq('mac_address', mac_address)
    .order('created_at', { ascending: false })
    .limit(20)

  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
  if (!readings || readings.length < 3) {
    return NextResponse.json({ action: 'STANDBY', reason: 'Dados insuficientes para a IA.', confidence: 0 })
  }

  // 2. Compute how long presence has been false
  const latest = readings[0]
  let minutesSincePresence = 0
  if (!latest.presenca) {
    const firstWithPresence = readings.find((r) => r.presenca)
    if (firstWithPresence) {
      minutesSincePresence = Math.round(
        (new Date(latest.created_at).getTime() - new Date(firstWithPresence.created_at).getTime()) / 60000
      )
    } else {
      minutesSincePresence = 999 // presence never seen in last 20 readings
    }
  }

  // 3. Build prompt context
  const tempValues = readings.slice(0, 5).map((r) => r.temp)
  const tempVariation = Math.max(...tempValues) - Math.min(...tempValues)

  const contextMessage = `
Últimas leituras do vaso ${mac_address}:
- Temperatura atual: ${latest.temp}°C
- Variação de temperatura nas últimas ${readings.length} leituras: ${tempVariation.toFixed(2)}°C
- Presença detectada: ${latest.presenca ? 'Sim' : 'Não'}
- Há quanto tempo sem presença: ${latest.presenca ? '0' : minutesSincePresence} minutos
- Umidade do ar: ${latest.umid_ar}%
- Umidade do solo: ${latest.umid_solo}%
`.trim()

  // 4. Call Gemini 1.5 Flash
  const geminiResponse = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: `${SYSTEM_PROMPT}\n\n${contextMessage}` }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 200,
      },
    }),
  })

  if (!geminiResponse.ok) {
    const err = await geminiResponse.text()
    return NextResponse.json({ error: `Gemini error: ${err}` }, { status: 500 })
  }

  const geminiData = await geminiResponse.json()
  const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  // 5. Parse JSON from Gemini response (strip markdown fences if present)
  let decision: { action: string; reason: string; confidence: number }
  try {
    const clean = rawText.replace(/```json?/g, '').replace(/```/g, '').trim()
    decision = JSON.parse(clean)
  } catch {
    return NextResponse.json({ error: 'Gemini retornou resposta inválida.', raw: rawText }, { status: 500 })
  }

  const validActions = ['AC_OFF', 'AC_COOL', 'STANDBY']
  if (!validActions.includes(decision.action)) {
    decision.action = 'STANDBY'
  }

  // 6. Save to ai_decisions
  await supabase.from('ai_decisions').insert({
    mac_address,
    action: decision.action,
    confidence: decision.confidence,
    reason: `[Gemini] ${decision.reason}`,
    sensor_data: {
      temp: latest.temp,
      presenca: latest.presenca,
      minutes_without_presence: minutesSincePresence,
      temp_variation: tempVariation,
    },
    weather_data: null,
  })

  // 7. If action is not STANDBY, fetch IR code and queue command
  if (decision.action !== 'STANDBY') {
    const { data: irCmd } = await supabase
      .from('comandos_raw')
      .select('codigo_ir, nome_comando')
      .eq('mac_address', mac_address)
      .eq('nome_comando', decision.action)
      .eq('validado', true)
      .maybeSingle()

    await supabase.from('device_commands').insert({
      mac_address,
      command: decision.action,
      payload: {
        reason: decision.reason,
        confidence: decision.confidence,
        ir_code: irCmd?.codigo_ir ?? null,
        source: 'GEMINI',
      },
      status: 'PENDING',
    })
  }

  return NextResponse.json({
    mac_address,
    timestamp: new Date().toISOString(),
    source: 'GEMINI_1.5_FLASH',
    decision,
  })
}
