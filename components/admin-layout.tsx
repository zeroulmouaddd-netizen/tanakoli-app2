"use client"

import { useState } from "react"
import { AdminPasswordGate } from "./admin-password-gate"
import { AdminSidebar, type AdminSection } from "./admin-sidebar"

interface AdminLayoutProps {
  children: (activeSection: AdminSection, onDriverSelect: (phone: string) => void) => React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("adminAuth") === "true"
    }
    return false
  })
  const [activeSection, setActiveSection] = useState<AdminSection>("overview")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState("")

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuth")
    setIsAuthenticated(false)
  }

  if (!isAuthenticated) {
    return <AdminPasswordGate onAuthenticated={() => setIsAuthenticated(true)} />
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={(section) => {
          setActiveSection(section)
          // When switching to fleet, pre-select nothing
        }}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur sticky top-0 z-30">
          <div>
            <h1 className="text-base font-bold text-white capitalize">
              {activeSection === "overview"  && "Dashboard Overview"}
              {activeSection === "fleet"     && "Fleet & Driver Management"}
              {activeSection === "map"       && "Live Dispatcher Map"}
              {activeSection === "finance"   && "Finance & Transactions"}
              {activeSection === "routes"    && "Routes & Line Configuration"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Tanakoli Khenchela — Admin Console</p>
          </div>

          {/* Live badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-emerald-400">Live</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children(activeSection, (phone) => {
            setSelectedDriver(phone)
            setActiveSection("fleet")
          })}
        </main>
      </div>
    </div>
  )
}
