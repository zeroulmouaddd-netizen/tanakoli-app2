"use client"

import { LayoutDashboard, Truck, MapPin, CreditCard, Route, ChevronLeft, ChevronRight, LogOut, Bus, Settings } from "lucide-react"

export type AdminSection = "overview" | "fleet" | "map" | "finance" | "routes"

interface AdminSidebarProps {
  activeSection: AdminSection
  onSectionChange: (section: AdminSection) => void
  onLogout: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

const navItems: { id: AdminSection; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: "overview",  label: "Overview",        icon: LayoutDashboard },
  { id: "fleet",     label: "Fleet & Drivers",  icon: Truck },
  { id: "map",       label: "Live Dispatcher",  icon: MapPin },
  { id: "finance",   label: "Finance",          icon: CreditCard },
  { id: "routes",    label: "Routes & Lines",   icon: Route },
]

export function AdminSidebar({ activeSection, onSectionChange, onLogout, collapsed, onToggleCollapse }: AdminSidebarProps) {
  return (
    <aside
      className="relative flex flex-col border-r border-slate-800/60 bg-slate-950 transition-all duration-300 ease-in-out"
      style={{ width: collapsed ? 64 : 228 }}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-3 py-5 border-b border-slate-800/60 ${collapsed ? "justify-center" : ""}`}>
        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
          <Bus className="h-4 w-4 text-emerald-400" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-none">Tanakoli</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Admin Console</p>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-hidden">
        {navItems.map((item) => {
          const active = activeSection === item.id
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-150 text-left group ${
                active
                  ? "bg-emerald-500/12 text-emerald-400 border border-emerald-500/20"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <item.icon
                className={`flex-shrink-0 h-4.5 w-4.5 ${active ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"}`}
                style={{ width: 18, height: 18 }}
              />
              {!collapsed && (
                <span className="text-sm font-medium truncate flex-1">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Divider + Logout */}
      <div className="px-2 pt-3 pb-4 border-t border-slate-800/60 space-y-0.5">
        <button
          onClick={onLogout}
          title={collapsed ? "Logout" : undefined}
          className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/8 transition-all border border-transparent ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut style={{ width: 18, height: 18 }} className="flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>

      {/* Collapse toggle button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-[72px] h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-500 transition-all z-20"
      >
        {collapsed
          ? <ChevronRight style={{ width: 12, height: 12 }} />
          : <ChevronLeft style={{ width: 12, height: 12 }} />
        }
      </button>
    </aside>
  )
}
