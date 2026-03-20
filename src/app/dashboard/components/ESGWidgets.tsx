"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Leaf, TrendingDown, Factory, PiggyBank, RefreshCw } from "lucide-react"

interface ESGData {
  ceiling: number
  projected_spend: number
  total_savings_brl: number
  carbon_reduced_kg: number
}

export function ESGWidgets() {
  const [data, setData] = useState<ESGData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchESG() {
      try {
        const res = await fetch('/api/esg')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchESG()
    // Refresh a cada 5 minutos
    const interval = setInterval(fetchESG, 300000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse mt-4">
        {[1,2,3].map(i => (
           <Card key={i} className="h-32 bg-zinc-900 border-zinc-800 rounded-none"></Card>
        ))}
      </div>
    )
  }

  if (!data || data.ceiling === 0) {
    return (
      <div className="lg:col-span-4 mt-4 border border-zinc-800 bg-black/40 p-6 rounded-none text-center relative overflow-hidden group">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
         <p className="text-zinc-500 font-mono text-sm mb-4">MÉTRICAS ESG E LINHA DE BASE INDISPONÍVEIS</p>
         <a href="/dashboard/upload" className="inline-flex items-center gap-2 bg-white text-black px-6 py-2 text-xs font-bold font-mono hover:bg-zinc-200 transition-colors">
            CADASTRAR FATURA <RefreshCw className="w-3 h-3" />
         </a>
      </div>
    )
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  const percentUsed = Math.min(100, (data.projected_spend / data.ceiling) * 100)

  return (
    <div className="lg:col-span-4 mt-6">
       <div className="mb-4 flex items-center justify-between border-b border-zinc-800 pb-2">
          <h2 className="text-lg font-black text-white tracking-widest flex items-center gap-2">
             <Leaf className="w-5 h-5 text-green-500" /> A.R.B.O. GOVERNANÇA ESG
          </h2>
          <span className="text-[10px] font-mono text-zinc-500 tracking-widest">ATUALIZAÇÃO EM TEMPO REAL</span>
       </div>
       
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Monitoramento (Gasto Atual vs Teto) */}
          <Card className="rounded-none border-l-4 border-l-orange-500 border-zinc-800 bg-black relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-transparent z-10 relative">
               <CardTitle className="text-[10px] font-mono tracking-widest text-zinc-400">MONITORAMENTO MENSAL</CardTitle>
               <TrendingDown className="h-4 w-4 text-orange-400" strokeWidth={1.5} />
            </CardHeader>
            <CardContent className="z-10 relative">
               <div className="text-3xl font-black text-white tracking-tighter">{formatCurrency(data.projected_spend)}</div>
               <div className="flex justify-between items-center mt-2">
                 <p className="text-[10px] text-zinc-500 font-mono">TETO: {formatCurrency(data.ceiling)}</p>
                 <p className="text-[10px] text-zinc-500 font-mono font-bold">{percentUsed.toFixed(1)}%</p>
               </div>
               <div className="w-full h-[2px] bg-zinc-800 mt-2">
                 <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${percentUsed}%` }} />
               </div>
            </CardContent>
          </Card>

          {/* Card 2: Economia Ativa */}
          <Card className="rounded-none border-l-4 border-l-green-500 border-zinc-800 bg-black relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-2xl rounded-full" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-transparent z-10 relative">
               <CardTitle className="text-[10px] font-mono tracking-widest text-green-400/80">ECONOMIA ATIVA</CardTitle>
               <PiggyBank className="h-4 w-4 text-green-500" strokeWidth={1.5} />
            </CardHeader>
            <CardContent className="z-10 relative">
               <div className="text-3xl font-black text-green-400 tracking-tighter">{formatCurrency(data.total_savings_brl)}</div>
               <p className="text-[10px] text-zinc-500 mt-2 font-mono leading-tight">Valor economizado autonomamente por decisões do A.R.B.O. neste mês.</p>
            </CardContent>
          </Card>

          {/* Card 3: Relatório ESG (Carbono) */}
          <Card className="rounded-none border-l-4 border-l-blue-500 border-zinc-800 bg-black relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 to-transparent bg-size-200 bg-pos-0 group-hover:bg-pos-100 transition-all duration-700" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-transparent z-10 relative">
               <CardTitle className="text-[10px] font-mono tracking-widest text-zinc-400">PEGADA ACÚSTICA / CARBONO</CardTitle>
               <Factory className="h-4 w-4 text-blue-400" strokeWidth={1.5} />
            </CardHeader>
            <CardContent className="z-10 relative">
               <div className="text-3xl font-black text-white tracking-tighter flex items-end gap-1">
                 -{data.carbon_reduced_kg.toFixed(2)} <span className="text-sm text-zinc-500 mb-1">kg CO₂</span>
               </div>
               <p className="text-[10px] text-zinc-500 mt-2 font-mono leading-tight">Emissão evitada na atmosfera através de eficiêcia energética auditável.</p>
            </CardContent>
          </Card>
       </div>
    </div>
  )
}
