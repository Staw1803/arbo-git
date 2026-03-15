import { NextResponse } from 'next/server'

const WAQI_TOKEN = process.env.WAQI_API_KEY
const WAQI_STATION = 'manaus' // estação de Manaus

function getAQICategory(aqi: number): { category: string; color: string; healthImplication: string } {
  if (aqi <= 50)  return { category: 'Boa',         color: '#22c55e', healthImplication: 'Qualidade do ar satisfatória.' }
  if (aqi <= 100) return { category: 'Moderada',    color: '#eab308', healthImplication: 'Qualidade aceitável para a maioria.' }
  if (aqi <= 150) return { category: 'Insalubre',   color: '#f97316', healthImplication: 'Grupos sensíveis podem sofrer efeitos.' }
  if (aqi <= 200) return { category: 'Muito Ruim',  color: '#ef4444', healthImplication: 'Toda a população pode sofrer efeitos.' }
  return               { category: 'Perigosa',      color: '#7c3aed', healthImplication: 'Risco de emergência de saúde.' }
}

export async function GET() {
  if (!WAQI_TOKEN) {
    return NextResponse.json(
      { error: 'WAQI_API_KEY não configurada. Obtenha em https://aqicn.org/data-platform/token/' },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(
      `https://api.waqi.info/feed/${WAQI_STATION}/?token=${WAQI_TOKEN}`,
      { next: { revalidate: 600 } } // cache 10 min
    )
    const json = await res.json()

    if (json.status !== 'ok') {
      return NextResponse.json({ error: 'Estação WAQI indisponível.' }, { status: 502 })
    }

    const aqi = json.data.aqi as number
    const { category, color, healthImplication } = getAQICategory(aqi)
    const alertaAtivo = aqi > 100

    return NextResponse.json({
      aqi,
      category,
      color,
      healthImplication,
      alertaAtivo,
      dominantPollutant: json.data.dominentpol ?? 'pm25',
      station: json.data.city?.name ?? 'Manaus',
      fetched_at: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json({ error: 'Falha ao consultar WAQI.' }, { status: 500 })
  }
}
