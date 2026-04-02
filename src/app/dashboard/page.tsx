import { createClient } from '@/utils/supabase/server'
import DashboardClient from './client-page'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Guard access and enforce RLS context
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/login')
  }

  // Initial data fetch utilizing authenticated client (will enforce RLS auto-magically)
  const { data: initialData } = await supabase
    .from('telemetria')
    .select('*')
    .ilike('mac_address', 'cc:db:a7:92:25:64')
    .order('created_at', { ascending: false })
    .limit(50)

  let parsedInitialData = []
  if (initialData) {
     parsedInitialData = initialData.map((item: any) => ({
         ...item,
         temperatura: Number(item.temperatura) || 0,
         umidade: Number(item.umidade) || 0,
         umid_solo: Number(item.umid_solo) || 0,
     }))
  }

  return <DashboardClient initialData={parsedInitialData} />
}
