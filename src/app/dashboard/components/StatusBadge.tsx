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
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 border border-zinc-800 rounded-none bg-black`}>
      <span className={`text-[10px] font-mono tracking-widest ${isOnline ? 'text-white' : 'text-zinc-600'}`}>
        {isOnline ? '[ ONLINE ]' : '[ OFFLINE ]'}
      </span>
      <span className="text-[10px] text-zinc-600 font-mono hidden sm:inline border-l border-zinc-800 pl-2">
        {secondsAgo}s
      </span>
    </div>
  )
}
