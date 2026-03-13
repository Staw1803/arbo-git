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
    .order('created_at', { ascending: false })
    .limit(50)

  return <DashboardClient initialData={initialData || []} />
}
