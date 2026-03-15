"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, TrendingDown } from "lucide-react"

interface AneelData {
  bandeira: {
    codigo: string
    nome: string
    cor: string
    descricao: string
    acrescimo: number
  }
  tarifa: {
    base: number
    total: number
    unidade: string
  }
  ac: {
    potencia_kw: number
    custo_por_hora: number
    economia_modo_eco_por_hora: number
  }
}

export function AneelWidget() {
  const [data, setData] = useState<AneelData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/aneel')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card className="rounded-none border border-zinc-800 bg-black shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-mono tracking-widest text-zinc-500">BANDEIRA TARIFÁRIA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse flex flex-col gap-2">
            <div className="h-6 bg-zinc-900 w-24 rounded-none" />
            <div className="h-3 bg-zinc-900 w-40 rounded-none" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  return (
    <Card className="rounded-none border border-zinc-800 bg-black shadow-none hover:border-zinc-600 transition-colors duration-300 overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ backgroundColor: data.bandeira.cor }} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-mono tracking-widest text-zinc-500">BANDEIRA TARIFÁRIA</CardTitle>
        <Zap className="h-4 w-4 text-zinc-400" strokeWidth={1.2} />
      </CardHeader>
      <CardContent>
        {/* Badge da bandeira */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="px-2 py-0.5 text-[10px] font-mono tracking-widest rounded-none"
            style={{ backgroundColor: data.bandeira.cor + '20', color: data.bandeira.cor, border: `1px solid ${data.bandeira.cor}40` }}
          >
            [ {data.bandeira.nome.toUpperCase()} ]
          </div>
        </div>

        {/* Tarifa */}
        <div className="text-2xl font-black text-white tracking-tighter">
          R$ {data.tarifa.total.toFixed(3)}
          <span className="text-xs font-mono text-zinc-500 ml-1">/kWh</span>
        </div>
        <p className="text-[10px] text-zinc-600 mt-1 font-mono">{data.bandeira.descricao}</p>

        {/* Custo e economia */}
        <div className="mt-3 pt-3 border-t border-zinc-800 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">Custo/Hora AC</p>
            <p className="text-sm font-bold text-white font-mono">R$ {data.ac.custo_por_hora.toFixed(3)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-zinc-400" strokeWidth={1.2} />
              <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider">Economia Eco/h</p>
            </div>
            <p className="text-sm font-bold text-white font-mono">R$ {data.ac.economia_modo_eco_por_hora.toFixed(3)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
