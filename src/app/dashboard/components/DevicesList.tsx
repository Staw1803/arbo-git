"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Server, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Device {
  id: string
  mac_address: string
  nome: string
  sala: string
  status: string
  ac_configured: boolean
  created_at: string
}

export function DevicesList() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createClient())
  
  useEffect(() => {
    const fetchDevices = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("dispositivos")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (data) setDevices(data)
      setLoading(false)
    }

    fetchDevices()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-neutral-500">
        <Loader2 className="h-6 w-6 animate-spin mr-3" />
        <span className="text-sm font-medium tracking-wide">BUSCANDO FROTA...</span>
      </div>
    )
  }

  if (devices.length === 0) {
    return (
      <div className="border border-neutral-800 rounded-xl p-12 flex flex-col items-center justify-center text-center bg-[#0a0a0a]">
        <Server className="h-10 w-10 text-neutral-700 mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">Nenhum Dispositivo Encontrado</h3>
        <p className="text-neutral-500 text-sm max-w-sm">
          Você ainda não possui vasos A.R.B.O. vinculados à sua conta. Quando um novo dispositivo for ligado na mesma rede, ele aparecerá no painel para ser configurado.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {devices.map((device) => {
        const isActive = device.status === 'ACTIVE'
        return (
          <div key={device.id} className="border border-neutral-800 rounded-xl bg-neutral-900 overflow-hidden flex flex-col">
            <div className="p-5 flex-1 relative">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 shrink-0 flex items-center justify-center rounded-full ${isActive ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-500'}`}>
                    <Server className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white tracking-tight">{device.nome}</h3>
                    <p className="text-xs text-neutral-400 font-mono">ID Final: {device.mac_address.slice(-5)}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase ${isActive ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-500'}`}>
                  {device.status}
                </div>
              </div>

              <div className="space-y-3 mt-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500 text-xs uppercase font-bold tracking-wider">Setor</span>
                  <span className="text-neutral-300">{device.sala}</span>
                </div>
                <div className="flex items-center justify-between text-sm border-t border-neutral-800 pt-3">
                  <span className="text-neutral-500 text-xs uppercase font-bold tracking-wider">Climatização</span>
                  {device.ac_configured ? (
                    <span className="flex items-center gap-1.5 text-neutral-300">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Mapeada
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-neutral-500">
                      <AlertCircle className="h-4 w-4" />
                      Não Configurada
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm border-t border-neutral-800 pt-3">
                  <span className="text-neutral-500 text-xs uppercase font-bold tracking-wider">Registro Em</span>
                  <span className="text-neutral-400 text-xs">
                    {formatDistanceToNow(new Date(device.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
