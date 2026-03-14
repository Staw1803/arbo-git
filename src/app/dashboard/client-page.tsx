"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { BentoGrid } from './components/BentoGrid'
import { HistoryChart } from './components/HistoryChart'
import { AuditTable } from './components/AuditTable'
import { StatusBadge } from './components/StatusBadge'
import { TemperatureChart } from './components/TemperatureChart'
import { HumidityChart } from './components/HumidityChart'
import { AIEnginePanel } from './components/AIEnginePanel'
import { ACWizard } from './components/ACWizard'
import { DiscoveryBanner } from './components/DiscoveryBanner'
import { useDashboard } from './context'
import { motion, AnimatePresence } from 'framer-motion'


interface TelemetryData {
  id: string;
  created_at: string;
  temp: number;
  umid_ar: number;
  umid_solo: number;
  presenca: boolean;
  mac_address: string;
}

export default function DashboardClient({ initialData }: { initialData: TelemetryData[] }) {
  // Mantemos os últimos 50 itens
  const [data, setData] = useState<TelemetryData[]>(initialData || [])
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    // Busca inicial cliente-side
    const fetchInitialData = async () => {
      const { data: fetchResult, error } = await supabase
        .from('telemetria')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (fetchResult && !error) {
        setData(fetchResult)
      }
    }
    
    fetchInitialData()

    // Setup Supabase Realtime subscription
    const channel = supabase
      .channel('telemetria_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telemetria',
        },
        (payload) => {
          setData((current) => [payload.new as TelemetryData, ...current].slice(0, 50))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const { activeTab } = useDashboard()
  const latestData = data.length > 0 ? data[0] : null

  return (
    <div className="space-y-6">
       <DiscoveryBanner />
       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-3xl font-bold tracking-tight">
            {activeTab === 'overview' && 'Visão Geral'}
            {activeTab === 'temperature' && 'Temperatura'}
            {activeTab === 'humidity' && 'Umidade'}
            {activeTab === 'ai' && 'Central A.I.'}
            {activeTab === 'ac' && 'Climatização AC'}
          </h2>
          {latestData && (
              <StatusBadge latestCreatedAt={latestData.created_at} />
          )}
       </div>

       <AnimatePresence mode="wait">
         {activeTab === 'overview' && (
           <motion.div 
             key="overview"
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -10 }}
             className="space-y-6"
           >
             <BentoGrid data={latestData} />
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <HistoryChart data={data} />
                 <AuditTable data={data} />
             </div>
           </motion.div>
         )}

         {activeTab === 'temperature' && (
           <motion.div
             key="temperature"
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -10 }}
             className="space-y-6"
           >
             <TemperatureChart data={data} />
           </motion.div>
         )}

         {activeTab === 'humidity' && (
           <motion.div
             key="humidity"
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -10 }}
             className="space-y-6"
           >
             <HumidityChart data={data} />
           </motion.div>
         )}

          {activeTab === 'ai' && (
           <motion.div
             key="ai"
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -10 }}
             className="space-y-6"
           >
             <AIEnginePanel mac={latestData?.mac_address || undefined} />
           </motion.div>
          )}

          {activeTab === 'ac' && (
           <motion.div
             key="ac"
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             exit={{ opacity: 0, y: -10 }}
             className="space-y-6"
           >
             <ACWizard mac={latestData?.mac_address || undefined} />
           </motion.div>
          )}
       </AnimatePresence>
    </div>
  )
}
