"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { format } from "date-fns"
import { useEffect, useState } from "react"

interface TelemetryData {
    created_at: string;
    temp: number;
    umid_ar: number;
}

export function HistoryChart({ data }: { data: TelemetryData[] }) {
    const [mounted, setMounted] = useState(false)
    
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null
    
    // Sort ascending for chart flow (oldest left -> newest right)
    const sortedData = [...data].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    const formattedData = sortedData.map(d => ({
        ...d,
        time: format(new Date(d.created_at), 'HH:mm:ss')
    }))

    console.log('Dados no Site:', data)

    return (
        <Card className="rounded-none border-white/20 bg-[#0a0a0a] w-full">
            <CardHeader>
                <CardTitle className="text-xs font-medium tracking-wide text-gray-400">HISTÓRICO CLIMÁTICO</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[400px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formattedData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                            <XAxis 
                                dataKey="time" 
                                stroke="#555" 
                                fontSize={10} 
                                tickLine={false}
                                axisLine={false}
                                minTickGap={30}
                            />
                            <YAxis 
                                stroke="#555" 
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: 0 }}
                                itemStyle={{ color: '#fff', fontSize: '12px' }}
                                labelStyle={{ color: '#888', fontSize: '10px', marginBottom: '4px' }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="temp" 
                                stroke="#ffffff" 
                                strokeWidth={1.5} 
                                dot={false} 
                                name="Temp (°C)"
                            />
                            <Line 
                                type="monotone" 
                                dataKey="umid_ar" 
                                stroke="#888888" 
                                strokeWidth={1.5} 
                                dot={false} 
                                name="Umid (%)"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
