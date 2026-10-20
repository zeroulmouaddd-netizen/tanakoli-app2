/**
 * Admin Dashboard — display-layer dictionary (ar / en).
 *
 * IMPORTANT: this file is translation only. It never defines business values:
 * transaction types, statuses, routes and every other internal value keep
 * their exact original strings (e.g. "completed", "admin_transfer"). The
 * dictionary is only consulted when rendering a label on screen.
 */

export type AdminLang = "ar" | "en"

export const ADMIN_LANG_STORAGE_KEY = "tanakoli_admin_lang"
export const DEFAULT_ADMIN_LANG: AdminLang = "ar"

/** BCP-47 tags used for display-only date/time formatting. */
export const ADMIN_LOCALES: Record<AdminLang, string> = {
  // ar-DZ with the Latin numbering system so amounts, phones and counts keep
  // Western digits (0-9) in Arabic mode.
  ar: "ar-DZ-u-nu-latn",
  en: "en-US",
}

const en: Record<string, string> = {
  /* ── Document / language ─────────────────────────────────────────────── */
  "meta.title": "Admin Dashboard | Tanakoli",
  "lang.label": "Language",
  "lang.arabic": "AR",
  "lang.english": "EN",

  /* ── Header & footer ─────────────────────────────────────────────────── */
  "header.title": "Admin Dashboard",
  "header.subtitle": "Tanakoli Management System",
  "header.logout": "Logout",
  "footer.brand": "Admin Dashboard",
  "footer.secure": "Secure Session",
  "footer.warning": "Do not share your password",

  /* ── Password gate ───────────────────────────────────────────────────── */
  "gate.subtitle": "Enter your password to continue",
  "gate.placeholder": "Enter admin password",
  "gate.showPassword": "Show password",
  "gate.hidePassword": "Hide password",
  "gate.invalid": "Invalid password",
  "gate.verifying": "Verifying...",
  "gate.submit": "Unlock Admin Panel",
  "gate.footer.secure": "Secure Session",
  "gate.footer.sessionOnly": "Session-only authentication",

  /* ── Page intro & tip ────────────────────────────────────────────────── */
  "page.title": "Dashboard Overview",
  "page.subtitle": "Monitor drivers, manage transactions, and send payments in real-time",
  "tip.label": "Tip:",
  "tip.body":
    "Click on drivers in the map or list to quickly select them for money transfers. All transactions are recorded in real-time.",

  /* ── Stats cards ─────────────────────────────────────────────────────── */
  "stats.activeDrivers": "Active Drivers",
  "stats.todayVolume": "Today's Volume",
  "stats.totalTransactions": "Total Transactions",

  /* ── Active drivers panel ────────────────────────────────────────────── */
  "drivers.title": "Active Drivers",
  "drivers.empty": "No active drivers at the moment",
  "drivers.select": "Select",
  "drivers.lat": "Lat",
  "drivers.lng": "Lng",

  /* ── Shared ──────────────────────────────────────────────────────────── */
  "common.na": "N/A",
  "time.justNow": "Just now",

  /* ── Send money form ─────────────────────────────────────────────────── */
  "send.title": "Send Money to Driver",
  "send.subtitle": "Instant wallet top-up",
  "send.selectDriver": "Select Driver",
  "send.loadingDrivers": "Loading drivers from Firestore…",
  "send.chooseDriver": "— Choose a driver —",
  "send.noDrivers": "No drivers found in Firestore. Check the users collection.",
  "send.current": "current",
  "send.amount": "Amount (د.ج)",
  "send.note": "Note",
  "send.optional": "(optional)",
  "send.notePlaceholder": "e.g. Monthly bonus",
  "send.before": "Before transfer",
  "send.transferAmount": "Transfer amount",
  "send.newBalance": "New balance",
  "send.processing": "Processing…",
  "send.sent": "Sent",
  "send.send": "Send",
  "send.sendMoney": "Send Money",
  "send.dismiss": "Dismiss",

  "send.error.noDriver.title": "No driver selected",
  "send.error.noDriver.body": "Please choose a driver from the list.",
  "send.error.invalidAmount.title": "Invalid amount",
  "send.error.invalidAmount.body": "Enter a positive number greater than 0.",
  "send.error.tooLarge.title": "Amount too large",
  "send.error.tooLarge.body": "Single transfer limit is 50,000 د.ج.",
  "send.confirm.title": "Transfer {amount} د.ج to {name}?",
  "send.confirm.body": "This will update their wallet balance immediately.",
  "send.success.title": "Transfer successful",
  "send.success.body": "{amount} د.ج sent to {name}. New balance: {balance} د.ج",
  "send.error.failed.title": "Transfer failed",
  "send.error.failed.body": "Unknown error — please try again.",
  "send.error.network.title": "Network error",
  "send.error.network.body": "Could not reach Firebase. Check your connection.",

  /* ── Transactions log ────────────────────────────────────────────────── */
  "tx.title": "Recent Transactions",
  "tx.last50": "Last 50",
  "tx.count": "{n} transactions",
  "tx.filters": "Transaction filters",
  "tx.empty": "No transactions found",
  "tx.driver": "Driver:",
  "tx.new": "New:",
  "tx.th.type": "Type",
  "tx.th.user": "User",
  "tx.th.amount": "Amount",
  "tx.th.status": "Status",
  "tx.th.time": "Time",

  /* ── Filter tabs (display labels only) ───────────────────────────────── */
  "filter.all": "All Transactions",
  "filter.fare_deduction": "Fare Deductions",
  "filter.balance_recharge": "Driver Recharges",
  "filter.admin_transfer": "Admin Transfers",
  "filter.ticket_purchase": "Ticket Purchases",

  /* ── Transaction type labels (display only) ──────────────────────────── */
  "type.fare_deduction": "Fare Deduction",
  "type.balance_recharge": "Driver Recharge",
  "type.ticket_purchase": "Ticket Purchase",
  "type.admin_transfer": "Admin Transfer",
  "type.payment": "Payment",
  "type.topup": "Top-up",

  /* ── Status labels (display only) ────────────────────────────────────── */
  "status.completed": "completed",
  "status.pending": "pending",
  "status.failed": "failed",

  /* ── Summary strip ───────────────────────────────────────────────────── */
  "summary.totalTransactions": "Total Transactions",
  "summary.totalVolume": "Total Volume",
  "summary.lastActivity": "Last Activity",
}

const ar: Record<string, string> = {
  /* ── Document / language ─────────────────────────────────────────────── */
  "meta.title": "لوحة الإدارة | تنقلي",
  "lang.label": "اللغة",
  "lang.arabic": "AR",
  "lang.english": "EN",

  /* ── Header & footer ─────────────────────────────────────────────────── */
  "header.title": "لوحة الإدارة",
  "header.subtitle": "نظام تنقلي للإدارة",
  "header.logout": "خروج",
  "footer.brand": "لوحة الإدارة",
  "footer.secure": "جلسة آمنة",
  "footer.warning": "لا تشارك كلمة المرور",

  /* ── Password gate ───────────────────────────────────────────────────── */
  "gate.subtitle": "أدخل كلمة المرور للمتابعة",
  "gate.placeholder": "أدخل كلمة مرور الإدارة",
  "gate.showPassword": "إظهار كلمة المرور",
  "gate.hidePassword": "إخفاء كلمة المرور",
  "gate.invalid": "كلمة المرور غير صحيحة",
  "gate.verifying": "جارٍ التحقق...",
  "gate.submit": "فتح لوحة الإدارة",
  "gate.footer.secure": "جلسة آمنة",
  "gate.footer.sessionOnly": "مصادقة صالحة لهذه الجلسة فقط",

  /* ── Page intro & tip ────────────────────────────────────────────────── */
  "page.title": "نظرة عامة على اللوحة",
  "page.subtitle": "راقب السائقين، وأدر المعاملات، وأرسل المدفوعات في الوقت الفعلي",
  "tip.label": "نصيحة:",
  "tip.body":
    "انقر على السائق في الخريطة أو القائمة لاختياره بسرعة وتحويل مبلغ مالي إليه. تُسجَّل جميع المعاملات في الوقت الفعلي.",

  /* ── Stats cards ─────────────────────────────────────────────────────── */
  "stats.activeDrivers": "السائقون النشطون",
  "stats.todayVolume": "حجم معاملات اليوم",
  "stats.totalTransactions": "إجمالي المعاملات",

  /* ── Active drivers panel ────────────────────────────────────────────── */
  "drivers.title": "السائقون النشطون",
  "drivers.empty": "لا يوجد سائقون نشطون حالياً",
  "drivers.select": "اختيار",
  "drivers.lat": "خط العرض",
  "drivers.lng": "خط الطول",

  /* ── Shared ──────────────────────────────────────────────────────────── */
  "common.na": "غير متوفر",
  "time.justNow": "الآن",

  /* ── Send money form ─────────────────────────────────────────────────── */
  "send.title": "تحويل رصيد للسائق",
  "send.subtitle": "تعبئة فورية للمحفظة",
  "send.selectDriver": "اختيار السائق",
  "send.loadingDrivers": "جارٍ تحميل السائقين…",
  "send.chooseDriver": "— اختر سائقاً —",
  "send.noDrivers": "لم يتم العثور على سائقين. يُرجى التحقق من قاعدة البيانات.",
  "send.current": "الحالي",
  "send.amount": "المبلغ (د.ج)",
  "send.note": "ملاحظة",
  "send.optional": "(اختياري)",
  "send.notePlaceholder": "مثال: مكافأة شهرية",
  "send.before": "قبل التحويل",
  "send.transferAmount": "مبلغ التحويل",
  "send.newBalance": "الرصيد الجديد",
  "send.processing": "جارٍ المعالجة…",
  "send.sent": "تم الإرسال",
  "send.send": "إرسال",
  "send.sendMoney": "إرسال المبلغ",
  "send.dismiss": "إغلاق",

  "send.error.noDriver.title": "لم يتم اختيار سائق",
  "send.error.noDriver.body": "يُرجى اختيار سائق من القائمة.",
  "send.error.invalidAmount.title": "مبلغ غير صالح",
  "send.error.invalidAmount.body": "أدخل مبلغاً أكبر من صفر.",
  "send.error.tooLarge.title": "المبلغ كبير جداً",
  "send.error.tooLarge.body": "الحد الأقصى للتحويل الواحد هو 50,000 د.ج.",
  "send.confirm.title": "هل تريد تحويل {amount} د.ج إلى {name}؟",
  "send.confirm.body": "سيتم تحديث رصيد محفظته فوراً.",
  "send.success.title": "تم التحويل بنجاح",
  "send.success.body": "تم إرسال {amount} د.ج إلى {name}. الرصيد الجديد: {balance} د.ج",
  "send.error.failed.title": "فشل التحويل",
  "send.error.failed.body": "حدث خطأ غير معروف — يُرجى المحاولة مجدداً.",
  "send.error.network.title": "خطأ في الشبكة",
  "send.error.network.body": "تعذّر الوصول إلى الخادم. يُرجى التحقق من اتصالك.",

  /* ── Transactions log ────────────────────────────────────────────────── */
  "tx.title": "المعاملات الأخيرة",
  "tx.last50": "آخر 50",
  "tx.count": "{n} معاملة",
  "tx.filters": "تصفية المعاملات",
  "tx.empty": "لا توجد معاملات",
  "tx.driver": "السائق:",
  "tx.new": "الجديد:",
  "tx.th.type": "النوع",
  "tx.th.user": "المستخدم",
  "tx.th.amount": "المبلغ",
  "tx.th.status": "الحالة",
  "tx.th.time": "الوقت",

  /* ── Filter tabs (display labels only) ───────────────────────────────── */
  "filter.all": "كل المعاملات",
  "filter.fare_deduction": "خصومات الأجرة",
  "filter.balance_recharge": "تعبئة رصيد السائقين",
  "filter.admin_transfer": "تحويلات الإدارة",
  "filter.ticket_purchase": "شراء التذاكر",

  /* ── Transaction type labels (display only) ──────────────────────────── */
  "type.fare_deduction": "خصم أجرة",
  "type.balance_recharge": "تعبئة رصيد السائق",
  "type.ticket_purchase": "شراء تذكرة",
  "type.admin_transfer": "تحويل من الإدارة",
  "type.payment": "دفعة",
  "type.topup": "تعبئة رصيد",

  /* ── Status labels (display only) ────────────────────────────────────── */
  "status.completed": "مكتملة",
  "status.pending": "قيد الانتظار",
  "status.failed": "فشلت",

  /* ── Summary strip ───────────────────────────────────────────────────── */
  "summary.totalTransactions": "إجمالي المعاملات",
  "summary.totalVolume": "إجمالي المبالغ",
  "summary.lastActivity": "آخر نشاط",
}

export const adminDictionaries: Record<AdminLang, Record<string, string>> = { ar, en }
