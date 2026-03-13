import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { UserHeader } from './header'
import { DashboardProvider } from './context'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-white selection:bg-white selection:text-black">
      <DashboardProvider>
        <UserHeader email={user.email || 'Usuário'} />
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
      </DashboardProvider>
    </div>
  )
}
