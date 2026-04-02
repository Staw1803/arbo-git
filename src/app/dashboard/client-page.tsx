"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { BentoGrid } from './components/BentoGrid'
import { AuditTable } from './components/AuditTable'
import { StatusBadge } from './components/StatusBadge'
import { DiscoveryBanner } from './components/DiscoveryBanner'
import { DevicesList } from './components/DevicesList'
import { AQIAlert } from './components/AQIWidget'
import { useDashboard } from './context'
import dynamic from 'next/dynamic'

const HistoryChart = dynamic(() => import('./components/HistoryChart').then((mod) => ({ default: mod.HistoryChart })), { ssr: false })
const TemperatureChart = dynamic(() => import('./components/TemperatureChart').then((mod) => ({ default: mod.TemperatureChart })), { ssr: false })
const HumidityChart = dynamic(() => import('./components/HumidityChart').then((mod) => ({ default: mod.HumidityChart })), { ssr: false })
const AIEnginePanel = dynamic(() => import('./components/AIEnginePanel').then((mod) => ({ default: mod.AIEnginePanel })), { ssr: false })
const ACWizard = dynamic(() => import('./components/ACWizard').then((mod) => ({ default: mod.ACWizard })), { ssr: false })


interface TelemetryData {
  id: string;
  created_at: string;
  temperatura: number;
  umidade: number;
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
        const parsedData = fetchResult.map(item => ({
            ...item,
            temperatura: Number(item.temperatura) || 0,
            umidade: Number(item.umidade) || 0,
            umid_solo: Number(item.umid_solo) || 0,
        })) as TelemetryData[];
        setData(parsedData)
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
          const newData = payload.new as any;
          if (newData.mac_address) {
            const safeData: TelemetryData = {
                ...newData,
                temperatura: Number(newData.temperatura) || 0,
                umidade: Number(newData.umidade) || 0,
                umid_solo: Number(newData.umid_solo) || 0,
            };
            setData((current) => [safeData, ...current].slice(0, 50))
          }
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
       <AQIAlert />
       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-3xl font-bold tracking-tight">
            {activeTab === 'overview' && 'Visão Geral'}
            {activeTab === 'temperature' && 'Temperatura'}
            {activeTab === 'humidity' && 'Umidade'}
            {activeTab === 'ai' && 'Central A.I.'}
            {activeTab === 'ac' && 'Climatização AC'}
            {activeTab === 'devices' && 'Dispositivos (Frota)'}
          </h2>
          {latestData && (
              <StatusBadge latestCreatedAt={latestData.created_at} />
          )}
       </div>

       <div className="transition-all duration-300">
         {activeTab === 'overview' && (
           <div className="space-y-6 transition-all duration-300 opacity-100">
             <BentoGrid data={latestData} />
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2">
                   <HistoryChart data={data} />
                 </div>
                 <AuditTable data={data} />
             </div>
           </div>
         )}

         {activeTab === 'temperature' && (
           <div className="space-y-6 transition-all duration-300 opacity-100">
             <TemperatureChart data={data} />
           </div>
         )}

         {activeTab === 'humidity' && (
           <div className="space-y-6 transition-all duration-300 opacity-100">
             <HumidityChart data={data} />
           </div>
         )}

          {activeTab === 'ai' && (
           <div className="space-y-6 transition-all duration-300 opacity-100">
             <AIEnginePanel mac={latestData?.mac_address || undefined} />
           </div>
          )}

          {activeTab === 'ac' && (
           <div className="space-y-6 transition-all duration-300 opacity-100">
             <ACWizard mac={latestData?.mac_address || undefined} />
           </div>
          )}

          {activeTab === 'devices' && (
           <div className="space-y-6 transition-all duration-300 opacity-100">
             <DevicesList />
           </div>
          )}
       </div>
    </div>
  )
}
