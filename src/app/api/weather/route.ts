import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export interface WeatherData {
  temp_ext: number
  humidity_ext: number
  weather_main: string
  weather_description: string
  weather_icon: string
  rain_1h: number
  wind_speed: number
  city: string
  country: string
  fetched_at: string
}

export async function GET() {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY
  const city = process.env.OPENWEATHERMAP_CITY || 'São Paulo,BR'

  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENWEATHERMAP_API_KEY não configurada.' },
      { status: 500 }
    )
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=pt_br`
    const res = await fetch(url, { next: { revalidate: 600 } }) // cache 10 min

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json(
        { error: `OpenWeatherMap error: ${err.message}` },
        { status: res.status }
      )
    }

    const raw = await res.json()

    const weather: WeatherData = {
      temp_ext: raw.main.temp,
      humidity_ext: raw.main.humidity,
      weather_main: raw.weather[0]?.main ?? 'Unknown',
      weather_description: raw.weather[0]?.description ?? '',
      weather_icon: raw.weather[0]?.icon ?? '01d',
      rain_1h: raw.rain?.['1h'] ?? 0,
      wind_speed: raw.wind?.speed ?? 0,
      city: raw.name,
      country: raw.sys?.country ?? '',
      fetched_at: new Date().toISOString(),
    }

    return NextResponse.json(weather)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
