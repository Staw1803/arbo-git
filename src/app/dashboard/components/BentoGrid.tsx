"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Droplet, Thermometer, Waves, Activity } from "lucide-react"
import { motion } from "framer-motion"
import { WeatherWidget } from "./WeatherWidget"

interface SensorProps {
    temp: number;
    umid_ar: number;
    umid_solo: number;
    presenca: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

function MetricBar({ value, max, color }: { value: number, max: number, color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="w-full h-[2px] bg-white/10 rounded-full mt-3 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function BentoGrid({ data }: { data: SensorProps | null }) {
    if (!data) {
        return (
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="grid gap-4 md:grid-cols-1"
            >
                <Card className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-center h-32 shadow-2xl">
                    <p className="text-gray-500 font-mono text-sm animate-pulse">
                        Aguardando sinal do dispositivo...
                    </p>
                </Card>
            </motion.div>
        )
    }

    return (
        <motion.div 
           variants={containerVariants}
           initial="hidden"
           animate="show"
           className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
            {/* Temperatura */}
            <motion.div variants={itemVariants}>
                <Card className="h-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg hover:bg-white/[0.07] transition-colors shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-orange-500/60" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold tracking-wider text-gray-400">TEMPERATURA</CardTitle>
                        <Thermometer className="h-4 w-4 text-orange-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-white tracking-tighter">{data.temp?.toFixed(1) ?? '--'}°C</div>
                        <p className="text-xs text-gray-400 mt-2 font-medium">Ambiente</p>
                        <MetricBar value={data.temp} max={50} color="bg-orange-400/70" />
                    </CardContent>
                </Card>
            </motion.div>

            {/* Umidade do Ar */}
            <motion.div variants={itemVariants}>
                <Card className="h-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg hover:bg-white/[0.07] transition-colors shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500/60" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold tracking-wider text-gray-400">UMIDADE DO AR</CardTitle>
                        <Waves className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-white tracking-tighter">{data.umid_ar?.toFixed(1) ?? '--'}%</div>
                        <p className="text-xs text-gray-400 mt-2 font-medium">Relativa</p>
                        <MetricBar value={data.umid_ar} max={100} color="bg-blue-400/70" />
                    </CardContent>
                </Card>
            </motion.div>

            {/* Umidade do Solo */}
            <motion.div variants={itemVariants}>
                <Card className="h-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg hover:bg-white/[0.07] transition-colors shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-green-500/60" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold tracking-wider text-gray-400">UMIDADE DO SOLO</CardTitle>
                        <Droplet className="h-4 w-4 text-green-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-white tracking-tighter">{data.umid_solo !== undefined ? `${data.umid_solo}%` : '--'}</div>
                        <p className="text-xs text-gray-400 mt-2 font-medium">Capacitivo</p>
                        <MetricBar value={data.umid_solo} max={100} color="bg-green-400/70" />
                    </CardContent>
                </Card>
            </motion.div>

            {/* Presença */}
            <motion.div variants={itemVariants}>
                <Card className="h-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg hover:bg-white/[0.07] transition-colors shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/20" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold tracking-wider text-gray-400">PRESENÇA</CardTitle>
                        <Activity className="h-4 w-4 text-white" />
                    </CardHeader>
                    <CardContent>
                       <div className="flex items-center gap-3">
                          <div className={`h-3 w-3 sm:h-4 sm:w-4 rounded-full flex-shrink-0 ${data.presenca ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]' : 'bg-gray-700'}`} />
                          <div className="text-3xl sm:text-4xl font-black text-white tracking-tighter">{data.presenca ? 'ATIVO' : 'LIVRE'}</div>
                       </div>
                       <p className="text-xs text-gray-400 mt-2 font-medium">Sensor de Presença</p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Clima Externo — spans 2 cols on large screens */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
                <WeatherWidget />
            </motion.div>
        </motion.div>
    )
}
