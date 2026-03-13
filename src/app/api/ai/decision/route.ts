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
    return NextResponse.json({ error: 'Supabase credentials are not configured.' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // ── 1. Fetch last 20 sensor readings for this ESP ──────────────────────────
    const { data: readings, error: sensorsError } = await supabase
      .from('telemetria')
      .select('temp, umid_ar, umid_solo, created_at')
      .eq('mac_address', mac_address)
      .order('created_at', { ascending: false })
      .limit(20)

    if (sensorsError) throw sensorsError

    if (!readings || readings.length < 5) {
      return NextResponse.json({
        action: 'STANDBY',
        confidence: 0,
        reason: 'Dados insuficientes para o modelo de IA.',
      })
    }

    // ── 2. Fetch real weather data from OpenWeatherMap ─────────────────────────
    let weatherData: any = null
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

      const weatherRes = await fetch(`${baseUrl}/api/weather`, { cache: 'no-store' })
      if (weatherRes.ok) {
        weatherData = await weatherRes.json()
      }
    } catch {
      // Weather is optional — AI degrades gracefully
    }

    // ── 3. Compute sensor trend metrics ────────────────────────────────────────
    const latest = readings[0]
    const oldest = readings[readings.length - 1]

    const timeDiffMinutes =
      (new Date(latest.created_at).getTime() - new Date(oldest.created_at).getTime()) / (1000 * 60)

    if (timeDiffMinutes <= 0) {
      return NextResponse.json({ action: 'STANDBY', reason: 'Delta de tempo inválido nos registros.' })
    }

    const umidDropRate = (oldest.umid_solo - latest.umid_solo) / timeDiffMinutes
    const tempIncreaseRate = (latest.temp - oldest.temp) / timeDiffMinutes

    // ── 4. AI Decision Logic (sensor + weather combined) ───────────────────────
    let action = 'STANDBY'
    let reason = 'Condições estáveis. Nenhuma ação necessária.'
    let confidence = 85

    const soilDry = latest.umid_solo < 30
    const soilDroppingFast = umidDropRate > 0.5
    const rainExpected = (weatherData?.rain_1h ?? 0) > 0.5 // mm/h
    const externalHot = (weatherData?.temp_ext ?? 0) > 32
    const airDry = latest.umid_ar < 40
    const tempCritical = latest.temp > 35 && tempIncreaseRate > 0.2
    const windCalm = (weatherData?.wind_speed ?? 10) < 2

    if (soilDry && rainExpected) {
      // Soil is dry but rain is coming — save water, wait
      action = 'STANDBY'
      reason = `Solo seco (${latest.umid_solo}%), porém chuva prevista (${weatherData?.rain_1h?.toFixed(1)} mm/h). Aguardando irrigação natural.`
      confidence = 78
    } else if (soilDry || soilDroppingFast) {
      // Soil is dry and no rain — activate pump
      action = 'ACTIVATE_WATER_PUMP'
      reason = `Solo com umidade crítica (${latest.umid_solo}%) e ressecando ${umidDropRate > 0 ? `(${umidDropRate.toFixed(2)}%/min)` : ''}. Sem chuva prevista.`
      confidence = 94
    } else if (tempCritical && externalHot && windCalm) {
      // Very hot inside and outside, no wind — ventilate
      action = 'ACTIVATE_VENTILATION'
      reason = `Temperatura elevada internamente (${latest.temp}°C, +${tempIncreaseRate.toFixed(2)}°C/min) e calor externo (${weatherData?.temp_ext}°C). Ventilação recomendada.`
      confidence = 89
    } else if (airDry && !rainExpected) {
      // Air humidity is very low — recommend misting
      action = 'MIST_SPRAY'
      reason = `Umidade do ar baixa (${latest.umid_ar}%) e clima seco (${weatherData?.weather_description ?? 'sem dados climáticos'}). Nebulização recomendada.`
      confidence = 82
    }

    // ── 5. Save decision to ai_decisions table ─────────────────────────────────
    await supabase.from('ai_decisions').insert({
      mac_address,
      action,
      confidence,
      reason,
      sensor_data: {
        temp: latest.temp,
        umid_ar: latest.umid_ar,
        umid_solo: latest.umid_solo,
        umid_drop_rate: parseFloat(umidDropRate.toFixed(3)),
        temp_increase_rate: parseFloat(tempIncreaseRate.toFixed(3)),
        metrics_analyzed: readings.length,
      },
      weather_data: weatherData,
    })

    // ── 6. If action is not STANDBY, queue command for the device ──────────────
    if (action !== 'STANDBY') {
      await supabase.from('device_commands').insert({
        mac_address,
        command: action,
        payload: {
          reason,
          confidence,
          weather: weatherData
            ? {
                temp_ext: weatherData.temp_ext,
                rain_1h: weatherData.rain_1h,
                condition: weatherData.weather_main,
              }
            : null,
        },
        status: 'PENDING',
      })
    }

    // ── 7. Return enriched response ────────────────────────────────────────────
    return NextResponse.json({
      mac_address,
      timestamp: new Date().toISOString(),
      weather: weatherData,
      decision: {
        action,
        confidence,
        reason,
        metrics_analyzed: readings.length,
        current_trends: {
          soil_moisture_drop_rate_per_min: umidDropRate.toFixed(3),
          temperature_increase_rate_per_min: tempIncreaseRate.toFixed(3),
        },
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
