"use client"

import { useAdminI18n } from "@/lib/i18n/admin-i18n"
import type { AdminLang } from "@/lib/i18n/admin-dictionary"

const OPTIONS: Array<{ value: AdminLang; labelKey: string }> = [
  { value: "ar", labelKey: "lang.arabic" },
  { value: "en", labelKey: "lang.english" },
]

/**
 * Compact AR | EN switch shown in the admin header. Presentation only —
 * it just stores the display-language preference.
 */
export function AdminLanguageSwitcher() {
  const { lang, setLang, t } = useAdminI18n()

  return (
    <div
      className="admin-lang-switch"
      dir="ltr"
      role="group"
      aria-label={t("lang.label")}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLang(option.value)}
          data-active={lang === option.value}
          aria-pressed={lang === option.value}
          className="admin-lang-option"
        >
          {t(option.labelKey)}
        </button>
      ))}
    </div>
  )
}
