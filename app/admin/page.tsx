"use client"

import { useState } from "react"
import { AdminLayout } from "@/components/admin-layout"
import { AdminDriverMap } from "@/components/admin-driver-map"
import { AdminSendMoneyForm } from "@/components/admin-send-money-form"
import { AdminTransactionsLog } from "@/components/admin-transactions-log"
import { Grid3x3, Users, TrendingUp } from "lucide-react"

export default function AdminPage() {
  const [selectedDriver, setSelectedDriver] = useState<string>("")

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h2>
        <p className="text-slate-400">
          Monitor drivers, manage transactions, and send payments in real-time
        </p>
      </div>

      {/* Stats Grid (Optional) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Active Drivers</p>
              <p className="text-3xl font-bold text-blue-400 mt-1">—</p>
            </div>
            <Users className="w-8 h-8 text-blue-500/50" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Today's Volume</p>
              <p className="text-3xl font-bold text-emerald-400 mt-1">—</p>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-500/50" />
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm font-medium">Total Transactions</p>
              <p className="text-3xl font-bold text-cyan-400 mt-1">—</p>
            </div>
            <Grid3x3 className="w-8 h-8 text-cyan-500/50" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left Column: Map */}
        <div className="lg:col-span-2">
          <AdminDriverMap onDriverSelect={setSelectedDriver} />
        </div>

        {/* Right Column: Send Money Form */}
        <div className="lg:col-span-1">
          <AdminSendMoneyForm preselectedDriver={selectedDriver} />
        </div>
      </div>

      {/* Full Width: Transactions Log */}
      <div className="mb-8">
        <AdminTransactionsLog />
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <span className="font-semibold">💡 Tip:</span> Click on drivers in the map or list to quickly select them for money transfers. All transactions are recorded in real-time.
        </p>
      </div>
    </AdminLayout>
  )
}
