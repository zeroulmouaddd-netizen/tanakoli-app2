"use client"

import { useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { Lightbulb } from "lucide-react"
import { AdminLayout } from "@/components/admin-layout"
import { AdminStatsCards } from "@/components/admin-stats-cards"
import { AdminDriverMap } from "@/components/admin-driver-map"
import { AdminSendMoneyForm } from "@/components/admin-send-money-form"
import { AdminTransactionsLog } from "@/components/admin-transactions-log"
import { useAdminI18n } from "@/lib/i18n/admin-i18n"

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export default function AdminPage() {
  const { t } = useAdminI18n()
  const [selectedDriver, setSelectedDriver] = useState<string>("")

  return (
    <AdminLayout>
      {/* Page Header */}
      <Reveal delay={0}>
        <div className="mb-6 sm:mb-8">
          <h2 className="text-[26px] font-bold leading-tight tracking-tight text-[var(--admin-text)] sm:text-3xl">
            {t("page.title")}
          </h2>
          <p className="mt-1.5 text-[13.5px] text-[var(--admin-text-2)] sm:text-sm">
            {t("page.subtitle")}
          </p>
        </div>
      </Reveal>

      {/* Stats Grid */}
      <Reveal delay={0.08} className="mb-6 sm:mb-8">
        <AdminStatsCards />
      </Reveal>

      {/* Main Content Grid */}
      <div className="mb-6 grid grid-cols-1 gap-6 sm:mb-8 lg:grid-cols-3">
        {/* Left Column: Active Drivers */}
        <Reveal delay={0.16} className="lg:col-span-2">
          <AdminDriverMap onDriverSelect={setSelectedDriver} />
        </Reveal>

        {/* Right Column: Send Money Form */}
        <Reveal delay={0.24} className="lg:col-span-1">
          <AdminSendMoneyForm preselectedDriver={selectedDriver} />
        </Reveal>
      </div>

      {/* Full Width: Transactions Log */}
      <Reveal delay={0.32} className="mb-6 sm:mb-8">
        <AdminTransactionsLog />
      </Reveal>

      {/* Info Box */}
      <Reveal delay={0.4}>
        <div
          className="admin-card flex items-start gap-3.5 px-4 py-4 sm:px-5"
          style={{
            background:
              "linear-gradient(180deg, rgba(56,189,248,0.07), rgba(56,189,248,0.03)), var(--admin-surface)",
            borderColor: "rgba(56,189,248,0.22)",
          }}
        >
          <span
            className="admin-icon-badge mt-0.5 h-8 w-8 rounded-[10px]"
            style={
              {
                "--badge-bg": "rgba(56,189,248,0.14)",
                "--badge-border": "rgba(56,189,248,0.32)",
                "--badge-color": "#7dd3fc",
              } as React.CSSProperties
            }
          >
            <Lightbulb className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <p className="text-[13px] leading-relaxed text-[#bae6fd] sm:text-sm">
            <span className="font-semibold text-[#e0f2fe]">{t("tip.label")}</span>{" "}
            {t("tip.body")}
          </p>
        </div>
      </Reveal>
    </AdminLayout>
  )
}
