"use client"

import { useState } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { AdminKPICards } from "@/components/admin-kpi-cards"
import { AdminRevenueChart } from "@/components/admin-revenue-chart"
import { AdminActivityFeed } from "@/components/admin-activity-feed"
import { AdminFleetTable } from "@/components/admin-fleet-table"
import { AdminLiveMap } from "@/components/admin-live-map"
import { AdminFinancePanel } from "@/components/admin-finance-panel"
import { AdminRoutesPanel } from "@/components/admin-routes-panel"
import { AdminSendMoneyForm } from "@/components/admin-send-money-form"
import type { AdminSection } from "@/components/admin-sidebar"

export default function AdminPage() {
  const [selectedDriver, setSelectedDriver] = useState("")

  return (
    <AdminLayout>
      {(activeSection: AdminSection, onDriverSelect: (phone: string) => void) => {

        const handleDriverSelect = (phone: string) => {
          setSelectedDriver(phone)
          onDriverSelect(phone)
        }

        if (activeSection === "overview") {
          return (
            <div className="space-y-6 max-w-[1400px]">
              <AdminKPICards />
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="xl:col-span-2">
                  <AdminRevenueChart />
                </div>
                <div className="xl:col-span-1">
                  <AdminActivityFeed />
                </div>
              </div>
            </div>
          )
        }

        if (activeSection === "fleet") {
          return (
            <div className="space-y-6 max-w-[1400px]">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <AdminFleetTable onDriverSelect={handleDriverSelect} />
                </div>
                <div className="xl:col-span-1">
                  <AdminSendMoneyForm preselectedDriver={selectedDriver} />
                </div>
              </div>
            </div>
          )
        }

        if (activeSection === "map") {
          return (
            <div className="max-w-[1400px]">
              <AdminLiveMap />
            </div>
          )
        }

        if (activeSection === "finance") {
          return (
            <div className="max-w-[1400px]">
              <AdminFinancePanel />
            </div>
          )
        }

        if (activeSection === "routes") {
          return (
            <div className="max-w-[1400px]">
              <AdminRoutesPanel />
            </div>
          )
        }

        return null
      }}
    </AdminLayout>
  )
}
