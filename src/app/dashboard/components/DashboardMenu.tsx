"use client"

import { useState, useRef, useEffect } from 'react'
import { Menu, LogOut, Printer, LifeBuoy, LayoutDashboard, Thermometer, Waves, BrainCircuit, AirVent, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/actions'
import { useDashboard } from '../context'

export function DashboardMenu() {
  const { activeTab, setActiveTab } = useDashboard()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handlePrint = () => {
    setIsOpen(false)
    window.print()
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-[#1a1a1a] border border-[#333333] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Painéis</div>
            
            <button
              onClick={() => { setActiveTab('overview'); setIsOpen(false); }}
              className={`flex w-full items-center px-4 py-2 text-sm transition-colors group cursor-pointer ${activeTab === 'overview' ? 'text-white bg-[#2a2a2a]' : 'text-gray-300 hover:bg-[#2a2a2a] hover:text-white'}`}
            >
              <LayoutDashboard className={`mr-3 h-4 w-4 transition-colors ${activeTab === 'overview' ? 'text-white' : 'text-gray-500 group-hover:text-white'}`} />
              Visão Geral
            </button>
            <button
              onClick={() => { setActiveTab('temperature'); setIsOpen(false); }}
              className={`flex w-full items-center px-4 py-2 text-sm transition-colors group cursor-pointer ${activeTab === 'temperature' ? 'text-white bg-[#2a2a2a]' : 'text-gray-300 hover:bg-[#2a2a2a] hover:text-white'}`}
            >
              <Thermometer className={`mr-3 h-4 w-4 transition-colors ${activeTab === 'temperature' ? 'text-white' : 'text-gray-500 group-hover:text-white'}`} />
              Temperatura
            </button>
            <button
              onClick={() => { setActiveTab('humidity'); setIsOpen(false); }}
              className={`flex w-full items-center px-4 py-2 text-sm transition-colors group cursor-pointer ${activeTab === 'humidity' ? 'text-white bg-[#2a2a2a]' : 'text-gray-300 hover:bg-[#2a2a2a] hover:text-white'}`}
            >
              <Waves className={`mr-3 h-4 w-4 transition-colors ${activeTab === 'humidity' ? 'text-white' : 'text-gray-500 group-hover:text-white'}`} />
              Umidade
            </button>
            <button
              onClick={() => { setActiveTab('ai'); setIsOpen(false); }}
              className={`flex w-full items-center px-4 py-2 text-sm transition-colors group cursor-pointer ${activeTab === 'ai' ? 'text-green-400 bg-[#2a2a2a]' : 'text-gray-300 hover:bg-[#2a2a2a] hover:text-green-400'}`}
            >
              <BrainCircuit className={`mr-3 h-4 w-4 transition-colors ${activeTab === 'ai' ? 'text-green-400' : 'text-gray-500 group-hover:text-green-400'}`} />
              Central A.I.
            </button>
            <button
              onClick={() => { setActiveTab('ac'); setIsOpen(false); }}
              className={`flex w-full items-center px-4 py-2 text-sm transition-colors group cursor-pointer ${activeTab === 'ac' ? 'text-blue-400 bg-[#2a2a2a]' : 'text-gray-300 hover:bg-[#2a2a2a] hover:text-blue-400'}`}
            >
              <AirVent className={`mr-3 h-4 w-4 transition-colors ${activeTab === 'ac' ? 'text-blue-400' : 'text-gray-500 group-hover:text-blue-400'}`} />
              Climatização AC
            </button>
            <button
              onClick={() => { setActiveTab('devices'); setIsOpen(false); }}
              className={`flex w-full items-center px-4 py-2 text-sm transition-colors group cursor-pointer ${activeTab === 'devices' ? 'text-white bg-[#2a2a2a]' : 'text-gray-300 hover:bg-[#2a2a2a] hover:text-white'}`}
            >
              <Server className={`mr-3 h-4 w-4 transition-colors ${activeTab === 'devices' ? 'text-white' : 'text-gray-500 group-hover:text-white'}`} />
              Dispositivos (Frota)
            </button>

            <div className="border-t border-[#333333] my-1"></div>
            
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</div>
            <button
              onClick={handlePrint}
              className="flex w-full items-center px-4 py-2 text-sm text-gray-300 hover:bg-[#2a2a2a] hover:text-white transition-colors group cursor-pointer"
            >
              <Printer className="mr-3 h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
              Imprimir relatórios
            </button>
            <a
              href="mailto:suporte@arbo.com"
              className="flex w-full items-center px-4 py-2 text-sm text-gray-300 hover:bg-[#2a2a2a] hover:text-white transition-colors group cursor-pointer"
              onClick={() => setIsOpen(false)}
            >
              <LifeBuoy className="mr-3 h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
              Suporte
            </a>
            
            <div className="border-t border-[#333333] my-1"></div>
            
            <form action={logout}>
              <button
                type="submit"
                className="flex w-full items-center px-4 py-2 text-sm text-red-500 hover:bg-[#2a2a2a] hover:text-red-400 transition-colors group cursor-pointer"
              >
                <LogOut className="mr-3 h-4 w-4 text-red-500/80 group-hover:text-red-400 transition-colors" />
                Sair do sistema
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
