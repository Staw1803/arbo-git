"use client"

import { DashboardMenu } from './components/DashboardMenu'
import { Logo } from '@/components/Logo'
import Link from 'next/link'
import { useDashboard } from './context'

export function UserHeader({ email }: { email: string }) {
    const { setActiveTab } = useDashboard()
    const institutionName = email && email !== 'Usuário' ? email.split('@')[0].toUpperCase() : 'ARBO'

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#333333] px-6">
            <Link href="/dashboard" className="flex items-center gap-4 hover:opacity-80 transition-opacity" onClick={() => setActiveTab('overview')}>
               <Logo className="w-16 h-16 text-white" hideText={true} />
               <div className="flex flex-col">
                 <h1 className="text-xl font-bold tracking-[0.2em]">{institutionName}</h1>
                 <span className="text-[10px] text-gray-400">PORTAL DE TELEMETRIA</span>
               </div>
            </Link>
            <div className="flex items-center gap-6">
                <span className="text-sm hidden sm:inline-block text-gray-500">{email}</span>
                <DashboardMenu />
            </div>
        </header>
    )
}
