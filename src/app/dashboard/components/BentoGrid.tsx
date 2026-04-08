"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Thermometer, Activity, Waves } from "lucide-react"
import { WeatherWidget } from "./WeatherWidget"
import { AneelWidget } from "./AneelWidget"
import { AQIWidget } from "./AQIWidget"
import { ESGWidgets } from "./ESGWidgets"

interface SensorProps {
    temperatura: number;
    umidade: number;
    presenca: boolean;
    isOccupied?: boolean;
}

function MetricBar({ value, max, color }: { value: number, max: number, color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="w-full h-[1px] bg-zinc-800 mt-3">
      <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function BentoGrid({ data }: { data: SensorProps | null }) {
    if (!data) {
        return (
            <div className="grid gap-4 md:grid-cols-1 transition-all duration-300">
                <Card className="rounded-none border border-zinc-800 bg-black flex items-center justify-center h-32 shadow-none">
                    <p className="text-zinc-600 font-mono text-xs animate-pulse tracking-widest">
                        AGUARDANDO SINAL DO DISPOSITIVO...
                    </p>
                </Card>
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 transition-all duration-300">
            {/* Temperatura Interna */}
            <Card className="h-full rounded-none border border-zinc-800 bg-black hover:border-zinc-600 transition-colors duration-300 shadow-none overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/30" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-mono tracking-widest text-zinc-500">TEMPERATURA</CardTitle>
                    <Thermometer className="h-4 w-4 text-zinc-400" strokeWidth={1.2} />
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-black text-white tracking-tighter">{data.temperatura?.toFixed(1) ?? '--'}°C</div>
                    <p className="text-xs text-zinc-500 mt-2 font-mono">INTERNA</p>
                    <MetricBar value={data.temperatura} max={45} color="bg-white/60" />
                </CardContent>
            </Card>

            {/* Umidade do Ar */}
            <Card className="h-full rounded-none border border-zinc-800 bg-black hover:border-zinc-600 transition-colors duration-300 shadow-none overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-zinc-500/40" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-mono tracking-widest text-zinc-500">UMIDADE</CardTitle>
                    <Waves className="h-4 w-4 text-zinc-400" strokeWidth={1.2} />
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-black text-white tracking-tighter">{data.umidade?.toFixed(1) ?? '--'}%</div>
                    <p className="text-xs text-zinc-500 mt-2 font-mono">RELATIVA DO AR</p>
                    <MetricBar value={data.umidade} max={100} color="bg-zinc-400/50" />
                </CardContent>
            </Card>

            {/* Ocupação */}
            <Card className="h-full rounded-none border border-zinc-800 bg-black hover:border-zinc-600 transition-colors duration-300 shadow-none overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-zinc-600/30" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-mono tracking-widest text-zinc-500">SENSOR DE PRESENÇA</CardTitle>
                    <Activity className="h-4 w-4 text-zinc-400" strokeWidth={1.2} />
                </CardHeader>
                <CardContent>
                   <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 flex-shrink-0 rounded-none ${data.isOccupied ? 'bg-white' : 'bg-zinc-700'}`} />
                      <div className="text-3xl font-black text-white tracking-tighter">{data.isOccupied ? 'SALA OCUPADA' : 'VAZIA'}</div>
                   </div>
                   <p className="text-xs text-zinc-500 mt-2 font-mono">SENSOR PIR</p>
                   <div className="w-full h-[1px] bg-zinc-800 mt-3">
                     <div className={`h-full transition-all duration-700 ${data.isOccupied ? 'bg-white/60 w-full' : 'w-0'}`} />
                   </div>
                </CardContent>
            </Card>

            {/* Bandeira Tarifária ANEEL */}
            <AneelWidget />

            {/* Clima Externo — spans 2 cols */}
            <div className="lg:col-span-2">
                <WeatherWidget />
            </div>

            {/* AQI Qualidade do Ar — spans 2 cols */}
            <div className="lg:col-span-2">
                <AQIWidget />
            </div>

            {/* Governança A.R.B.O. ESG */}
            <ESGWidgets />
        </div>
    )
}
