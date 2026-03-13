"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { BrainCircuit, Cpu, ThermometerSun, DropletOff, CloudRain, Terminal, Clock, CheckCircle2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface AIInferenceData {
  mac_address: string
  timestamp: string
  weather: {
    temp_ext: number
    humidity_ext: number
    rain_1h: number
    weather_main: string
    weather_description: string
    wind_speed: number
    city: string
    country: string
  } | null
  decision: {
    action: string
    confidence: number
    reason: string
    metrics_analyzed: number
    current_trends: {
      soil_moisture_drop_rate_per_min: string
      temperature_increase_rate_per_min: string
    }
  }
}

interface AuditDecision {
  id: string
  created_at: string
  action: string
  confidence: number
  reason: string
}

interface DeviceCommand {
  id: string
  created_at: string
  command: string
  status: string
}

const ACTION_COLOR: Record<string, string> = {
  STANDBY: "text-green-400",
  ACTIVATE_WATER_PUMP: "text-blue-400",
  ACTIVATE_VENTILATION: "text-orange-400",
  MIST_SPRAY: "text-cyan-400",
}

const ACTION_LABEL: Record<string, string> = {
  STANDBY: "Em Standby",
  ACTIVATE_WATER_PUMP: "Bomba D'água",
  ACTIVATE_VENTILATION: "Ventilação",
  MIST_SPRAY: "Nebulização",
}

export function AIEnginePanel({ mac = "ESP-TEST-01" }: { mac?: string }) {
  const [inference, setInference] = useState<AIInferenceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [decisions, setDecisions] = useState<AuditDecision[]>([])
  const [commands, setCommands] = useState<DeviceCommand[]>([])
  const [supabase] = useState(() => createClient())

  // Fetch AI inference
  useEffect(() => {
    const fetchInference = async () => {
      try {
        const response = await fetch(`/api/ai/decision?mac=${mac}`)
        if (response.ok) {
          setInference(await response.json())
        }
      } catch (error) {
        console.error("Erro ao buscar inferência A.I.", error)
      } finally {
        setLoading(false)
      }
    }
    fetchInference()
    const interval = setInterval(fetchInference, 15000)
    return () => clearInterval(interval)
  }, [mac])

  // Fetch decision history + command history from Supabase
  useEffect(() => {
    const fetchHistory = async () => {
      const [{ data: dec }, { data: cmd }] = await Promise.all([
        supabase
          .from("ai_decisions")
          .select("id, created_at, action, confidence, reason")
          .eq("mac_address", mac)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("device_commands")
          .select("id, created_at, command, status")
          .eq("mac_address", mac)
          .order("created_at", { ascending: false })
          .limit(6),
      ])
      if (dec) setDecisions(dec)
      if (cmd) setCommands(cmd)
    }
    fetchHistory()

    // Realtime subscription for new decisions
    const channel = supabase
      .channel("ai_decisions_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_decisions" }, () => {
        fetchHistory()
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "device_commands" }, () => {
        fetchHistory()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [mac, supabase])

  if (loading) {
    return (
      <Card className="rounded-2xl border border-green-500/20 bg-green-950/20 backdrop-blur-md flex items-center justify-center shadow-2xl h-[400px]">
        <div className="flex flex-col items-center">
          <BrainCircuit className="h-10 w-10 text-green-500 animate-pulse mb-4" />
          <p className="text-green-400 font-mono text-sm animate-pulse">Conectando ao Motor de Inferência...</p>
        </div>
      </Card>
    )
  }

  if (!inference || !inference.decision) {
    return (
      <Card className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-center shadow-2xl h-[400px]">
        <p className="text-gray-500 font-mono text-sm">Dados insuficientes para Machine Learning desta placa.</p>
      </Card>
    )
  }

  const { decision, weather } = inference
  const isCritical = decision.action !== "STANDBY"
  const actionColor = ACTION_COLOR[decision.action] ?? "text-white"

  return (
    <div className="space-y-6">
      {/* ── Row 1: Main decision + Weather ───────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Main AI diagnosis card */}
        <Card className={`rounded-2xl border backdrop-blur-md shadow-2xl ${isCritical ? "border-orange-500/30 bg-orange-950/20" : "border-green-500/30 bg-green-950/20"}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className={`text-sm font-bold tracking-widest ${isCritical ? "text-orange-400" : "text-green-400"}`}>
              DIAGNÓSTICO A.I.
            </CardTitle>
            <BrainCircuit className={`h-5 w-5 ${isCritical ? "text-orange-400 animate-pulse" : "text-green-400"}`} />
          </CardHeader>
          <CardContent>
            <div className="mt-2 flex flex-col gap-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Ação Autônoma</p>
                <div className={`text-2xl font-black tracking-tight ${actionColor}`}>
                  {ACTION_LABEL[decision.action] ?? decision.action}
                </div>
                <div className="text-[10px] font-mono text-gray-600 mt-0.5">{decision.action}</div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Diagnóstico</p>
                <p className="text-sm text-gray-300 leading-relaxed">{decision.reason}</p>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <div>
                  <p className="text-[10px] uppercase text-gray-500 block mb-1">Confiança</p>
                  <span className="text-xl font-bold text-white">{decision.confidence}%</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase text-gray-500 block mb-1">Amostras</p>
                  <span className="text-xl font-bold text-white">{decision.metrics_analyzed} logs</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics + Weather column */}
        <div className="space-y-4">
          {/* Sensor trends */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-[10px] font-bold tracking-widest text-gray-400 flex items-center gap-1.5">
                  <DropletOff className="h-3 w-3 text-blue-400" /> SOLO/MIN
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-black text-white">
                  {decision.current_trends?.soil_moisture_drop_rate_per_min ?? "0.000"}
                  <span className="text-xs text-gray-500 font-normal ml-1">%/min</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-[10px] font-bold tracking-widest text-gray-400 flex items-center gap-1.5">
                  <ThermometerSun className="h-3 w-3 text-orange-400" /> TEMP/MIN
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-black text-white">
                  {decision.current_trends?.temperature_increase_rate_per_min ?? "0.000"}
                  <span className="text-xs text-gray-500 font-normal ml-1">°C/min</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Weather influence card */}
          {weather ? (
            <Card className="rounded-2xl border border-sky-500/20 bg-sky-950/20 backdrop-blur-md shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                <CardTitle className="text-[10px] font-bold tracking-widest text-sky-400 flex items-center gap-1.5">
                  <CloudRain className="h-3 w-3" /> CLIMA EXTERNO (IA USOU ESSES DADOS)
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">{weather.temp_ext.toFixed(1)}°C</span>
                    <span className="text-[9px] text-gray-500 uppercase">Ext.</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">{weather.rain_1h.toFixed(1)} mm</span>
                    <span className="text-[9px] text-gray-500 uppercase">Chuva/h</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">{weather.humidity_ext}%</span>
                    <span className="text-[9px] text-gray-500 uppercase">Umidade</span>
                  </div>
                </div>
                <p className="text-[10px] text-sky-300/60 capitalize mt-2">{weather.weather_description} — {weather.city}</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border border-dashed border-white/10 bg-transparent flex items-center justify-center p-4">
              <p className="text-xs text-gray-600 font-mono text-center">OpenWeatherMap não configurado.<br />Adicione OPENWEATHERMAP_API_KEY no .env.local</p>
            </Card>
          )}

          {/* Governance label */}
          <Card className="rounded-2xl border border-dashed border-white/20 bg-transparent flex items-center justify-center p-4">
            <div className="text-center">
              <Cpu className="h-5 w-5 text-gray-600 mx-auto mb-1.5" />
              <p className="text-[10px] text-gray-500 font-mono">A.R.B.O. Cloud — "{mac}" sob governança autônoma</p>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Row 2: Decision history + Command queue ───────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Decision history */}
        <Card className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <CardTitle className="text-xs font-bold tracking-widest text-gray-400">HISTÓRICO DE DECISÕES A.I.</CardTitle>
          </CardHeader>
          <CardContent>
            {decisions.length === 0 ? (
              <p className="text-xs text-gray-600 font-mono py-4 text-center">Nenhuma decisão registrada ainda.</p>
            ) : (
              <div className="space-y-2">
                {decisions.map((d) => (
                  <div key={d.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-none">
                    <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${d.action === "STANDBY" ? "bg-green-500" : "bg-orange-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${ACTION_COLOR[d.action] ?? "text-white"}`}>
                          {ACTION_LABEL[d.action] ?? d.action}
                        </span>
                        <span className="text-[10px] text-gray-600 flex-shrink-0 ml-2">
                          {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate">{d.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Command queue */}
        <Card className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Terminal className="h-4 w-4 text-gray-400" />
            <CardTitle className="text-xs font-bold tracking-widest text-gray-400">FILA DE COMANDOS AO VASO</CardTitle>
          </CardHeader>
          <CardContent>
            {commands.length === 0 ? (
              <p className="text-xs text-gray-600 font-mono py-4 text-center">Nenhum comando enviado ainda.</p>
            ) : (
              <div className="space-y-2">
                {commands.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-none">
                    {c.status === "EXECUTED" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                    ) : (
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-orange-400 flex-shrink-0 animate-pulse" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-mono font-bold ${c.status === "EXECUTED" ? "text-gray-400" : "text-orange-300"}`}>
                          {c.command}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold ml-2 flex-shrink-0 ${
                          c.status === "EXECUTED" ? "bg-green-900/50 text-green-400" : "bg-orange-900/50 text-orange-400"
                        }`}>
                          {c.status === "EXECUTED" ? "executado" : "pendente"}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-0.5">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
