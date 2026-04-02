import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim()
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

const SYSTEM_PROMPT = `Você é a I.A. de Gestão e UX do sistema A.R.B.O. 
Sua missão é atuar como o juiz ambiental de uma sala comercial, decidindo autonomamente sobre o desligamento do Ar-Condicionado para gerar economia e escolher uma "emocão" para a Tela OLED inteligente.

Regras Ambientais:
1. Se "presenca" for false por muito tempo (15m+) E você acreditar que o Ar está desperdiçando energia: A ação deve ser AC_OFF. A emoção deve ser OLED_ANGRY (A IA está irritada com o desperdício de energia).
2. Se "presenca" for true E temperatura > 26°C: A ação deve ser AC_COOL. A emoção deve ser OLED_HAPPY ou OLED_NORMAL.
3. Se "presenca" for false há muito tempo, e a variação da temperatura mostrar que o Ar JÁ ESTÁ desligado: A ação deve ser STANDBY. Emoção: OLED_SLEEP.

IMPORTANTE: Responda obrigatoriamente APENAS E EXCLUSIVAMENTE com um JSON estruturado:
{
  "acao_mecanica": "AC_OFF" | "AC_COOL" | "STANDBY",
  "expressao_oled": "OLED_ANGRY" | "OLED_HAPPY" | "OLED_SLEEP" | "OLED_NORMAL" | "OLED_SAD",
  "motivo": "Explique em menos de 10 palavras a razão da emoção / ação escolhida.",
  "economia_estimada": 1.50
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

  // 1. Puxa as últimas 20 telemetrias com a nova estrutura de dados (temperatura, umidade)
  const { data: readings, error: readErr } = await supabase
    .from('telemetria')
    .select('temperatura, umidade, umid_solo, presenca, created_at')
    .eq('mac_address', mac_address)
    .order('created_at', { ascending: false })
    .limit(20)

  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
  if (!readings || readings.length < 3) {
    return NextResponse.json({ acao_mecanica: 'STANDBY', expressao_oled: 'OLED_NORMAL', motivo: 'A.R.B.O. calibrando sensores.', economia_estimada: 0 })
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
      minutesSincePresence = 999 
    }
  }

  // 3. Build prompt context
  const tempValues = readings.slice(0, 5).map((r) => r.temperatura || 0)
  const tempVariation = Math.max(...tempValues) - Math.min(...tempValues)

  const contextMessage = `
Últimas leituras do dispositivo ${mac_address}:
- Temperatura atual: ${latest.temperatura}°C
- Variação de temperatura nas últimas 5 leituras: ${tempVariation.toFixed(2)}°C
- Presença detectada no ambiente: ${latest.presenca ? 'SIM' : 'NÃO'}
- Há quanto tempo sem bater presença: ${latest.presenca ? '0' : minutesSincePresence} minutos
- Umidade do ar: ${latest.umidade}%
`.trim()

  // 4. API Request to Gemini
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
        maxOutputTokens: 300,
        responseMimeType: "application/json"
      },
    }),
  })

  if (!geminiResponse.ok) {
    const err = await geminiResponse.text()
    return NextResponse.json({ error: `Gemini error: ${err}` }, { status: 500 })
  }

  const geminiData = await geminiResponse.json()
  const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  // 5. Extração e Parse do Payload JSON
  let decision: { acao_mecanica: string; expressao_oled: string; motivo: string; economia_estimada: number }
  try {
    const clean = rawText.replace(/```json?/g, '').replace(/```/g, '').trim()
    decision = JSON.parse(clean)
  } catch (err) {
    console.error("Falha no Parse do Gemini", rawText)
    return NextResponse.json({ error: 'Quebra no formato JSON da IA', raw: rawText }, { status: 500 })
  }

  // Sanitize defaults
  if (!decision.acao_mecanica) decision.acao_mecanica = 'STANDBY'
  if (!decision.expressao_oled) decision.expressao_oled = 'OLED_NORMAL'

  const orgaoIdFetch = await supabase.from('dispositivos').select('org_id').eq('mac_address', mac_address).single()
  const org_id = orgaoIdFetch.data?.org_id || null

  // 6. Grava log para o painel Front-End (Tabela `ai_logs`)
  await supabase.from('ai_logs').insert({
    org_id,
    mac_address,
    mensagem: `[Decisão A.R.B.O] ${decision.motivo}. Ação: ${decision.acao_mecanica} & ${decision.expressao_oled}`,
    estado_anterior: { temperatura: latest.temperatura, presenca: latest.presenca },
    novo_estado: { acao_mecanica: decision.acao_mecanica, expressao_oled: decision.expressao_oled },
    economia_estimada: decision.economia_estimada || 0.00
  })

  // 7. Salva o Payload direto em `device_commands` estruturado para a Placa ESP32
  if (decision.acao_mecanica !== 'STANDBY' || decision.expressao_oled) {
    await supabase.from('device_commands').insert({
      org_id,
      mac_address,
      command: "AI_DECISION",
      payload: {
        acao_mecanica: decision.acao_mecanica,
        expressao_oled: decision.expressao_oled,
        motivo: decision.motivo
      },
      status: 'PENDING',
    })
  }

  return NextResponse.json({ ...decision, timestamp: new Date().toISOString() })
}
