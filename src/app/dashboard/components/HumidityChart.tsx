"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { format } from "date-fns"
import { useEffect, useState } from "react"
import { Waves } from "lucide-react"

interface TelemetryData {
    created_at: string;
    umidade: number;
}

export function HumidityChart({ data }: { data: TelemetryData[] }) {
    const [mounted, setMounted] = useState(false)
    
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null
    
    const sortedData = [...data].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const formattedData = sortedData.map(d => ({
        ...d,
        time: format(new Date(d.created_at), 'HH:mm:ss')
    }))

    return (
        <Card className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl w-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                   <CardTitle className="text-sm font-semibold tracking-wider text-gray-300">ANÁLISE HÍDRICA</CardTitle>
                   <p className="text-xs text-gray-500 mt-1">Umidade Relativa do Ar (%)</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                   <Waves className="h-5 w-5 text-blue-400" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="w-full mt-4 min-h-[400px]" style={{ height: 400 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={formattedData} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
                            <defs>
                                <linearGradient id="colorUmid" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis 
                                dataKey="time" 
                                stroke="#555" 
                                fontSize={11} 
                                tickLine={false}
                                axisLine={false}
                                minTickGap={30}
                            />
                            <YAxis 
                                stroke="#555" 
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}%`}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                                labelStyle={{ color: '#888', fontSize: '11px', marginBottom: '4px' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="umidade" 
                                stroke="#3b82f6" 
                                strokeWidth={3} 
                                fillOpacity={1} 
                                fill="url(#colorUmid)" 
                                name="Umidade do Ar"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
