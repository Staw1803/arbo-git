"use client"

import { useEffect, useState } from "react"
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, Thermometer, CloudLightning, CloudDrizzle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"

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
      <Card className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-sky-500/60" />
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold tracking-wider text-gray-400">CLIMA EXTERNO</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse flex flex-col gap-2">
            <div className="h-8 bg-white/10 rounded w-24" />
            <div className="h-3 bg-white/10 rounded w-32" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !weather) {
    return (
      <Card className="rounded-2xl border border-red-500/20 bg-red-950/20 backdrop-blur-lg shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-500/40" />
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-semibold tracking-wider text-red-400">CLIMA EXTERNO</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-red-400/80 font-mono">{error ?? 'API Key não configurada'}</p>
          <p className="text-[10px] text-gray-600 mt-1">Adicione OPENWEATHERMAP_API_KEY no .env.local</p>
        </CardContent>
      </Card>
    )
  }

  const isRaining = weather.rain_1h > 0
  const accentColor = isRaining ? 'bg-blue-500/60' : weather.weather_main === 'Clear' ? 'bg-yellow-500/60' : 'bg-sky-500/60'
  const iconColor = isRaining ? 'text-blue-400' : weather.weather_main === 'Clear' ? 'text-yellow-400' : 'text-sky-400'

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="h-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg hover:bg-white/[0.07] transition-colors shadow-2xl overflow-hidden relative">
        <div className={`absolute top-0 left-0 right-0 h-[2px] ${accentColor}`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-semibold tracking-wider text-gray-400">
            CLIMA — {weather.city}, {weather.country}
          </CardTitle>
          <WeatherIcon main={weather.weather_main} className={`h-4 w-4 ${iconColor}`} />
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="text-4xl font-black text-white tracking-tighter">{weather.temp_ext.toFixed(1)}°C</div>
            <WeatherIcon main={weather.weather_main} className={`h-7 w-7 mb-1 ${iconColor}`} />
          </div>

          <p className="text-xs text-gray-400 mt-1 capitalize font-medium">{weather.weather_description}</p>

          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
            <div className="flex flex-col items-center gap-1">
              <Droplets className="h-3 w-3 text-blue-400" />
              <span className="text-xs font-bold text-white">{weather.humidity_ext}%</span>
              <span className="text-[9px] text-gray-500 uppercase">Umidade</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CloudRain className="h-3 w-3 text-sky-400" />
              <span className="text-xs font-bold text-white">{weather.rain_1h.toFixed(1)} mm</span>
              <span className="text-[9px] text-gray-500 uppercase">Chuva/h</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Wind className="h-3 w-3 text-gray-400" />
              <span className="text-xs font-bold text-white">{weather.wind_speed.toFixed(1)} m/s</span>
              <span className="text-[9px] text-gray-500 uppercase">Vento</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
