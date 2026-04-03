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
import { ErrorBoundary } from '@/components/ErrorBoundary'
import dynamic from 'next/dynamic'

const ChartFallback = () => <div className="w-full min-h-[400px] h-[400px] flex items-center justify-center bg-neutral-900 border border-neutral-800 animate-pulse rounded-xl text-neutral-500 font-mono text-sm">Validando matriz de dados...</div>

const HistoryChart = dynamic(() => import('./components/HistoryChart').then((mod) => ({ default: mod.HistoryChart })), { ssr: false, loading: ChartFallback })
const TemperatureChart = dynamic(() => import('./components/TemperatureChart').then((mod) => ({ default: mod.TemperatureChart })), { ssr: false, loading: ChartFallback })
const HumidityChart = dynamic(() => import('./components/HumidityChart').then((mod) => ({ default: mod.HumidityChart })), { ssr: false, loading: ChartFallback })
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
  const [debugLog, setDebugLog] = useState<string>("Wait...")

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

    // Setup Supabase Realtime subscription with a unique channel name to bypass React 18 StrictMode unmount/remount bugs
    const channel = supabase
      .channel(`telemetria_changes_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telemetria',
        },
        (payload) => {
          setDebugLog("Event received: " + payload.eventType)
          const newData = payload.new as any;
          if (newData && newData.mac_address) {
            setDebugLog("Parsing safeData for MAC: " + newData.mac_address)
            const safeData: TelemetryData = {
                ...newData,
                temperatura: Number(newData.temperatura) || 0,
                umidade: Number(newData.umidade) || 0,
                umid_solo: Number(newData.umid_solo) || 0,
            };
            setData((current) => [safeData, ...current].slice(0, 50))
          } else {
            setDebugLog("Rejected payload matching due to lack of MAC: " + JSON.stringify(newData).substring(0, 50))
          }
        }
      )
      .subscribe((status, err) => {
        setDebugLog("Socket Status: " + status + (err ? " ERRO: " + err.message : ""))
        console.log("Realtime connection status:", status);
        if (err) console.error("Realtime error:", err);
      })

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
       
       <div className="bg-neutral-900 border border-neutral-700 rounded-md p-2 text-[10px] font-mono text-neutral-400">
         [REALTIME DEBUGGER]: {debugLog}
       </div>

       <div className="transition-all duration-300">
         {activeTab === 'overview' && (
           <div className="space-y-6 transition-all duration-300 opacity-100">
             <BentoGrid data={latestData} />
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2">
                   <ErrorBoundary fallbackMessage="Erro ao renderizar o Gráfico de Telemetria">
                     <HistoryChart data={data} />
                   </ErrorBoundary>
                 </div>
                 <ErrorBoundary fallbackMessage="Erro ao renderizar Tabela de Auditoria">
                   <AuditTable data={data} />
                 </ErrorBoundary>
             </div>
           </div>
         )}

         {activeTab === 'temperature' && (
           <div className="space-y-6 transition-all duration-300 opacity-100">
             <ErrorBoundary fallbackMessage="Erro ao renderizar o Gráfico Térmico">
               <TemperatureChart data={data} />
             </ErrorBoundary>
           </div>
         )}

         {activeTab === 'humidity' && (
           <div className="space-y-6 transition-all duration-300 opacity-100">
             <ErrorBoundary fallbackMessage="Erro ao renderizar o Gráfico Hídrico">
               <HumidityChart data={data} />
             </ErrorBoundary>
           </div>
         )}

          {activeTab === 'ai' && (
           <div className="space-y-6 transition-all duration-300 opacity-100">
             <AIEnginePanel mac={latestData?.mac_address || undefined} />
           </div>
          )}

          {activeTab === 'ac' && (
           <div className="space-y-6 transition-all duration-300 opacity-100">
             <ACWizard mac={"placa_amigo_ir"} />
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
