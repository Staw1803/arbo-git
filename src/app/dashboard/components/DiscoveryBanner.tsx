"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { motion, AnimatePresence } from "framer-motion"
import { PlusCircle, Cpu, Loader2, CheckCircle2 } from "lucide-react"

interface PendingDevice {
  mac_address: string
  created_at: string
}

export function DiscoveryBanner() {
  const [pendingDevices, setPendingDevices] = useState<PendingDevice[]>([])
  const [claimingMac, setClaimingMac] = useState<string | null>(null)
  const [formData, setFormData] = useState({ nome: "Novo Vaso A.R.B.O.", sala: "Sala Principal" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    // Get current user id
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [supabase])

  useEffect(() => {
    let isMounted = true

    const checkDiscovery = async () => {
      try {
        // Find devices with status PENDING
        const { data: devices } = await supabase
          .from("dispositivos")
          .select("mac_address, created_at")
          .eq("status", "PENDING")

        if (!devices || devices.length === 0) {
          if (isMounted) setPendingDevices([])
          return
        }

        // Fetch telemetry in the last 5 minutes to see who is active
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
        const { data: telemetry } = await supabase
          .from("telemetria")
          .select("mac_address")
          .gte("created_at", fiveMinsAgo)

        const activeMacs = new Set(telemetry?.map((t) => t.mac_address) || [])
        
        // Filter pending devices that are active in the last 5 minutes
        const activePending = devices.filter((d) => activeMacs.has(d.mac_address))
        
        if (isMounted) setPendingDevices(activePending)
      } catch (error) {
        console.error("Discovery error:", error)
      }
    }

    checkDiscovery()
    const interval = setInterval(checkDiscovery, 15000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [supabase])

  const handleClaim = async (mac: string) => {
    if (!userId) return
    setIsSubmitting(true)
    
    try {
      const { error } = await supabase
        .from("dispositivos")
        .update({
          nome: formData.nome,
          sala: formData.sala,
          status: "ACTIVE",
          user_id: userId,
        })
        .eq("mac_address", mac)

      if (!error) {
        setSuccessMsg(`Vaso ${mac} configurado com sucesso!`)
        setClaimingMac(null)
        setPendingDevices((prev) => prev.filter((d) => d.mac_address !== mac))
        setTimeout(() => setSuccessMsg(null), 5000)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-green-950/40 border border-green-500/30 rounded-xl p-4 flex items-center gap-3 text-green-400"
          >
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-medium text-sm">{successMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDevices.map((device) => (
          <motion.div
            key={device.mac_address}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden shadow-2xl relative"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-white animate-pulse" />
            
            {claimingMac === device.mac_address ? (
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3 border-b border-neutral-800 pb-3">
                  <Cpu className="h-5 w-5 text-white" />
                  <div>
                    <h4 className="font-bold text-white text-sm">Configurando {device.mac_address}</h4>
                    <p className="text-[10px] text-neutral-400 font-mono">Defina os detalhes da sala e nome.</p>
                  </div>
                </div>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-neutral-500">Nome do Vaso</label>
                    <input 
                      type="text" 
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full bg-neutral-800 border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-white outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-neutral-500">Setor / Sala</label>
                    <input 
                      type="text" 
                      value={formData.sala}
                      onChange={(e) => setFormData({ ...formData, sala: e.target.value })}
                      className="w-full bg-neutral-800 border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-white outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end mt-2">
                  <button 
                    onClick={() => setClaimingMac(null)}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-neutral-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => handleClaim(device.mac_address)}
                    disabled={isSubmitting}
                    className="px-6 py-2 rounded-lg text-xs font-bold bg-white text-black hover:bg-neutral-200 transition-colors flex items-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Vincular Dispositivo
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 pl-3">
                  <div className="h-10 w-10 rounded-full bg-neutral-800 flex flex-shrink-0 items-center justify-center">
                    <Cpu className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Novo vaso A.R.B.O. detectado na rede</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      MAC: <span className="font-mono text-neutral-300">{device.mac_address}</span> transmitiu sinal nos últimos 5 minutos.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setClaimingMac(device.mac_address)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-bold text-xs bg-white text-black hover:bg-neutral-200 transition-colors flex justify-center items-center gap-2"
                >
                  <PlusCircle className="h-4 w-4" /> Configurar Agora
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
