"use client"

import React, { createContext, useContext, useState } from 'react'

type TabState = 'overview' | 'temperature' | 'humidity' | 'ai' | 'ac'

interface DashboardContextType {
  activeTab: TabState;
  setActiveTab: (tab: TabState) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabState>('overview')

  return (
    <DashboardContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}
