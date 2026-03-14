"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { Cpu, Power, Zap, AirVent } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface AuditDecision {
  id: string
  created_at: string
  action: string
  confidence: number
}

const ACTION_LABEL: Record<string, string> = {
  STANDBY: "Em Standby",
  AC_OFF: "AC Desligado",
  AC_COOL: "Resfriando",
}

const ACTION_ICON: Record<string, React.ReactNode> = {
  STANDBY: <Zap className="h-4 w-4" />,
  AC_OFF: <Power className="h-4 w-4" />,
  AC_COOL: <AirVent className="h-4 w-4" />,
}

export function AIEnginePanel({ mac = "ESP-TEST-01" }: { mac?: string }) {
  const [loading, setLoading] = useState(true)
  const [lastDecision, setLastDecision] = useState<AuditDecision | null>(null)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const fetchHistory = async () => {
      const { data } = await supabase
        .from("ai_decisions")
        .select("id, created_at, action, confidence")
        .eq("mac_address", mac)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (data) setLastDecision(data)
      setLoading(false)
    }
    
    fetchHistory()

    const channel = supabase
      .channel("ai_decisions_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_decisions" }, () => {
        fetchHistory()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [mac, supabase])

  if (loading) {
    return (
      <Card className="rounded-2xl border border-neutral-800 bg-neutral-900 shadow-xl h-32 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Cpu className="h-5 w-5 text-neutral-500 animate-pulse" />
          <span className="text-neutral-400 font-mono text-xs animate-pulse">Iniciando Motor IA...</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl border border-neutral-800 bg-neutral-900 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/20" />
      <CardHeader className="pb-2 pt-5">
        <CardTitle className="flex items-center gap-2 text-xs font-bold tracking-widest text-neutral-400">
          <Cpu className="h-4 w-4 text-white" />
          GOVERNANÇA AUTÔNOMA A.I.
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lastDecision ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center rounded-full bg-white text-black">
                {ACTION_ICON[lastDecision.action] ?? <Zap className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-sm font-bold text-white uppercase tracking-wider">
                  {ACTION_LABEL[lastDecision.action] ?? lastDecision.action}
                </p>
                <p className="text-[10px] text-neutral-500 font-mono">
                  Última ação há {formatDistanceToNow(new Date(lastDecision.created_at), { locale: ptBR })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-1 rounded-md bg-white/10 text-[10px] font-bold text-white uppercase tracking-wider">
                Ativo
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 py-2">
            <div className="h-2 w-2 rounded-full bg-neutral-600" />
            <p className="text-xs text-neutral-500 font-mono">Aguardando primeiras decisões autônomas...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
