"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wind, AlertTriangle } from "lucide-react"

interface AQIData {
  aqi: number
  category: string
  color: string
  healthImplication: string
  alertaAtivo: boolean
  dominantPollutant: string
  station: string
}

export function AQIWidget() {
  const [data, setData] = useState<AQIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const doFetch = async () => {
      try {
        const res = await fetch('/api/waqi')
        if (!res.ok) {
          const err = await res.json()
          setError(err.error)
        } else {
          setData(await res.json())
        }
      } catch {
        setError('Falha ao conectar com WAQI')
      } finally {
        setLoading(false)
      }
    }
    doFetch()
    const interval = setInterval(doFetch, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card className="rounded-none border border-zinc-800 bg-black shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono tracking-widest text-zinc-500">QUALIDADE DO AR — MANAUS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse flex flex-col gap-2">
            <div className="h-8 bg-zinc-900 w-16 rounded-none" />
            <div className="h-3 bg-zinc-900 w-32 rounded-none" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="rounded-none border border-zinc-800 bg-black shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono tracking-widest text-zinc-500">QUALIDADE DO AR — MANAUS</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[10px] text-zinc-600 font-mono">{error}</p>
          <p className="text-[9px] text-zinc-700 mt-1 font-mono">Adicione WAQI_API_KEY no .env.local</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card className="rounded-none border border-zinc-800 bg-black shadow-none hover:border-zinc-600 transition-colors duration-300 overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ backgroundColor: data.color }} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-mono tracking-widest text-zinc-500">QUALIDADE DO AR — EXTERNO</CardTitle>
        <Wind className="h-4 w-4 text-zinc-400" strokeWidth={1.2} />
      </CardHeader>
      <CardContent>
        {/* Alerta de saúde */}
        {data.alertaAtivo && (
          <div className="flex items-center gap-2 mb-3 px-2 py-1.5 border border-orange-900/50 bg-orange-950/20">
            <AlertTriangle className="h-3 w-3 text-orange-400 flex-shrink-0" strokeWidth={1.2} />
            <p className="text-[10px] font-mono text-orange-400 tracking-wide">ALERTA DE SAÚDE — Reduza ventilação externa</p>
          </div>
        )}

        {/* AQI Value */}
        <div className="flex items-end gap-3">
          <div className="text-4xl font-black text-white tracking-tighter">{data.aqi}</div>
          <div
            className="pb-1 px-2 py-0.5 text-[10px] font-mono tracking-widest rounded-none mb-1"
            style={{ color: data.color, backgroundColor: data.color + '15', border: `1px solid ${data.color}30` }}
          >
            {data.category.toUpperCase()}
          </div>
        </div>

        <p className="text-[10px] text-zinc-500 mt-1 font-mono">{data.healthImplication}</p>

        {/* Details */}
        <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-zinc-600 font-mono uppercase">Poluente Principal</p>
            <p className="text-xs font-bold text-white uppercase font-mono">{data.dominantPollutant}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-600 font-mono uppercase">Estação</p>
            <p className="text-[10px] text-zinc-400 font-mono">{data.station}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Export just the alert for use in the dashboard header
export function AQIAlert() {
  const [alertaAtivo, setAlertaAtivo] = useState(false)
  const [aqi, setAqi] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/waqi')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.alertaAtivo) { setAlertaAtivo(true); setAqi(d.aqi) }
      })
      .catch(() => {})
  }, [])

  if (!alertaAtivo || aqi === null) return null

  return (
    <div className="w-full flex items-center gap-3 px-4 py-2 border-b border-orange-900/40 bg-orange-950/10">
      <AlertTriangle className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" strokeWidth={1.2} />
      <p className="text-[11px] font-mono text-orange-400 tracking-wider">
        ALERTA DE SAÚDE — AQI Manaus: {aqi} — Qualidade do ar externa prejudicial. Reduza ventilação cruzada.
      </p>
    </div>
  )
}
