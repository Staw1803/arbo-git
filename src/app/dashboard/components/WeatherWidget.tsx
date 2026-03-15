"use client"

import { useEffect, useState } from "react"
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, CloudLightning, CloudDrizzle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface WeatherData {
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

function WeatherIcon({ main, className }: { main: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    Clear: <Sun className={className} />,
    Clouds: <Cloud className={className} />,
    Rain: <CloudRain className={className} />,
    Drizzle: <CloudDrizzle className={className} />,
    Thunderstorm: <CloudLightning className={className} />,
    Snow: <CloudSnow className={className} />,
    Wind: <Wind className={className} />,
  }
  return <>{icons[main] ?? <Cloud className={className} />}</>
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await window.fetch('/api/weather')
        if (res.ok) {
          setWeather(await res.json())
          setError(null)
        } else {
          const e = await res.json()
          setError(e.error ?? 'Erro desconhecido')
        }
      } catch {
        setError('Falha ao conectar com OpenWeatherMap')
      } finally {
        setLoading(false)
      }
    }
    fetch()
    const interval = setInterval(fetch, 10 * 60 * 1000) // refresh every 10 min
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card className="rounded-none border border-zinc-800 bg-black shadow-none h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono tracking-widest text-zinc-500">CLIMA EXTERNO</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse flex flex-col gap-2">
            <div className="h-8 bg-zinc-900 w-24 rounded-none" />
            <div className="h-3 bg-zinc-900 w-32 rounded-none" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !weather) {
    return (
      <Card className="rounded-none border border-zinc-800 bg-black shadow-none h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono tracking-widest text-zinc-500">CLIMA EXTERNO</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[10px] text-zinc-600 font-mono">{error ?? 'API Key não configurada'}</p>
          <p className="text-[9px] text-zinc-700 mt-1 font-mono">Adicione OPENWEATHERMAP_API_KEY no .env.local</p>
        </CardContent>
      </Card>
    )
  }

  const iconColor = weather.weather_main === 'Clear' ? 'text-zinc-300' : 'text-zinc-400'

  return (
    <div>
      <Card className="h-full rounded-none border border-zinc-800 bg-black hover:border-zinc-600 transition-colors duration-300 shadow-none overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-zinc-700/40" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-mono tracking-widest text-zinc-500">
            CLIMA — {weather.city}
          </CardTitle>
          <WeatherIcon main={weather.weather_main} className={`h-4 w-4 ${iconColor}`} />
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="text-4xl font-black text-white tracking-tighter">{weather.temp_ext.toFixed(1)}°C</div>
          </div>

          <p className="text-xs text-zinc-500 mt-1 capitalize font-mono">{weather.weather_description}</p>

          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-zinc-800 pt-3">
            <div className="flex flex-col items-center gap-1">
              <Droplets className="h-3 w-3 text-zinc-400" strokeWidth={1.2} />
              <span className="text-xs font-bold text-white font-mono">{weather.humidity_ext}%</span>
              <span className="text-[9px] text-zinc-600 uppercase font-mono">Umidade</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CloudRain className="h-3 w-3 text-zinc-400" strokeWidth={1.2} />
              <span className="text-xs font-bold text-white font-mono">{weather.rain_1h.toFixed(1)}mm</span>
              <span className="text-[9px] text-zinc-600 uppercase font-mono">Chuva/h</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Wind className="h-3 w-3 text-zinc-400" strokeWidth={1.2} />
              <span className="text-xs font-bold text-white font-mono">{weather.wind_speed.toFixed(1)}m/s</span>
              <span className="text-[9px] text-zinc-600 uppercase font-mono">Vento</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
