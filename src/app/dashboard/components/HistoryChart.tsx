"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend
} from 'recharts'
import { format } from "date-fns"
import { useEffect, useState } from "react"

interface TelemetryData {
    created_at: string;
    temperatura: number;
    umidade: number;
    presenca: boolean;
}

// AC: 12000 BTU = 1.4 kW — tarifa ANEEL Verde: R$0.826/kWh
const AC_POTENCIA_KW = 1.4
const TARIFA_POR_KWH = 0.826

function calcCustoHora(entry: TelemetryData): number {
  // AC ativo se ocupação ativa e temperatura acima de 23°C
  const acAtivo = entry.presenca || entry.temperatura > 26
  if (!acAtivo) return 0
  // Fator de intensidade: 100% se temp > 28, 60% se entre 23-28
  const fator = entry.temperatura > 28 ? 1.0 : 0.6
  return parseFloat((AC_POTENCIA_KW * TARIFA_POR_KWH * fator).toFixed(4))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-black border border-zinc-800 px-3 py-2 font-mono text-xs">
      <p className="text-zinc-500 mb-1">{label}</p>
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export function HistoryChart({ data }: { data: TelemetryData[] }) {
    const [mounted, setMounted] = useState(false)
    
    useEffect(() => { setMounted(true) }, [])
    if (!mounted) return null
    if (!data || !Array.isArray(data)) return <div className="h-[380px] flex items-center justify-center text-zinc-500 font-mono text-sm">Sincronizando log...</div>
    if (data.length === 0) return <div className="h-[380px] flex items-center justify-center text-zinc-500 font-mono text-sm">Sistema inativo. Sem leituras recentes.</div>
    
    const sortedData = [...data]
      .sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const formattedData = sortedData.map(d => ({
        time: format(new Date(d.created_at), 'HH:mm'),
        temperatura: parseFloat(d.temperatura?.toFixed(1)),
        custo: calcCustoHora(d),
    }))

    return (
        <Card className="rounded-none border border-zinc-800 bg-black w-full shadow-none hover:border-zinc-600 transition-colors duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-mono tracking-widest text-zinc-500">TELEMETRIA ENERGÉTICA</CardTitle>
                <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-600">
                  <span className="flex items-center gap-1"><span className="inline-block w-4 h-px bg-white" /> TEMP °C</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-4 border-t border-dashed border-zinc-500" /> CUSTO R$/h</span>
                </div>
            </CardHeader>
            <CardContent>
                <div className="w-full mt-2 min-h-[380px]" style={{ height: 380 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formattedData} margin={{ top: 5, right: 40, bottom: 5, left: 0 }}>
                            <XAxis 
                                dataKey="time" 
                                stroke="#444"
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={30}
                                fontFamily="monospace"
                            />
                            {/* Left Y-axis: Temperature */}
                            <YAxis
                                yAxisId="temp"
                                orientation="left"
                                stroke="#444"
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `${v}°`}
                                domain={['auto', 'auto']}
                                fontFamily="monospace"
                            />
                            {/* Right Y-axis: Energy cost */}
                            <YAxis
                                yAxisId="custo"
                                orientation="right"
                                stroke="#444"
                                fontSize={9}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `R$${v}`}
                                domain={[0, 'auto']}
                                fontFamily="monospace"
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                              wrapperStyle={{ display: 'none' }}
                            />
                            {/* Internal temperature — solid white */}
                            <Line
                                yAxisId="temp"
                                type="monotone"
                                dataKey="temperatura"
                                stroke="#ffffff"
                                strokeWidth={1.5}
                                dot={false}
                                name="Temp (°C)"
                            />
                            {/* Energy cost — dashed zinc */}
                            <Line
                                yAxisId="custo"
                                type="monotone"
                                dataKey="custo"
                                stroke="#71717a"
                                strokeWidth={1.5}
                                strokeDasharray="5 5"
                                dot={false}
                                name="Custo (R$/h)"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
