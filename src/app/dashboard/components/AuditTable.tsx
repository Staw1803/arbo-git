"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useEffect, useState } from "react"

interface TelemetryData {
    id: string;
    created_at: string;
    mac_address: string;
}

export function AuditTable({ data }: { data: TelemetryData[] }) {
    const [mounted, setMounted] = useState(false)
    
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null
    
    // Most recent first for the table
    const sortedData = [...data].sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return (
        <Card className="rounded-none border-white/20 bg-[#0a0a0a] w-full">
            <CardHeader>
                <CardTitle className="text-xs font-medium tracking-wide text-gray-400">AUDITORIA DE DISPOSITIVOS</CardTitle>
            </CardHeader>
            <CardContent>
               <Table>
                    <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-gray-500 font-normal">ID Dispositivo</TableHead>
                            <TableHead className="text-gray-500 font-normal">MAC Address</TableHead>
                            <TableHead className="text-gray-500 font-normal hidden sm:table-cell">Setor</TableHead>
                            <TableHead className="text-gray-500 font-normal text-right">Último Pulso</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedData.slice(0, 10).map((row) => (
                            <TableRow key={row.id} className="border-white/5 hover:bg-white/5 transition-colors">
                                <TableCell className="font-mono text-xs text-gray-300">
                                   {row.id.split('-')[0]}...
                                </TableCell>
                                <TableCell className="font-mono text-xs">{row.mac_address || '00:00:00:00:00:00'}</TableCell>
                                <TableCell className="text-gray-400 hidden sm:table-cell">Laboratório Central</TableCell>
                                <TableCell className="text-right text-gray-300 text-sm">
                                    {formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: ptBR })}
                                </TableCell>
                            </TableRow>
                        ))}
                        {sortedData.length === 0 && (
                             <TableRow className="border-none hover:bg-transparent">
                                <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                                    Nenhum registro encontrado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
