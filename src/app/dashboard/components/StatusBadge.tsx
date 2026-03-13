"use client"

import { useEffect, useState } from "react"

export function StatusBadge({ latestCreatedAt }: { latestCreatedAt?: string }) {
  const [now, setNow] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)

  // Temporizador para atualizar "há X segundos" e checar status online/offline
  // Isolado aqui para evitar re-renderizar todo o dashboard (tabelas e gráficos grandes) a cada segundo
  useEffect(() => {
    setMounted(true)
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  let isOnline = false
  let secondsAgo = 0

  if (latestCreatedAt && now) {
    const lastPulse = new Date(latestCreatedAt).getTime()
    secondsAgo = Math.floor((now.getTime() - lastPulse) / 1000)
    isOnline = secondsAgo < 60
  }

  if (!mounted || !latestCreatedAt) return null

  return (
    <span className={`text-xs ${isOnline ? 'text-white' : 'text-gray-500'} font-mono tracking-wider flex items-center gap-2`}>
      <span className="relative flex h-2 w-2">
        {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-white' : 'bg-gray-500'}`}></span>
      </span>
      {isOnline ? 'SISTEMA ONLINE' : 'SISTEMA OFFLINE'}
      <span className="text-gray-500 ml-2 hidden sm:inline">
        (Atualizado há {secondsAgo}s)
      </span>
    </span>
  )
}
