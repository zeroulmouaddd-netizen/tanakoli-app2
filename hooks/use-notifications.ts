"use client"

import { useEffect, useState } from "react"
import { collection, query, orderBy, onSnapshot, doc, writeBatch } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"

export interface AppNotification {
  id: string
  type: "payment" | "recharge" | "low_balance"
  message: string
  amount?: number | null
  read: boolean
  createdAt: Date | null
}

export function useNotifications() {
  const { firestoreUserId } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!firestoreUserId) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    const notifRef = collection(db, "users", firestoreUserId, "notifications")
    const q = query(notifRef, orderBy("createdAt", "desc"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = snapshot.docs.map((d) => ({
        id: d.id,
        type: d.data().type as AppNotification["type"],
        message: d.data().message as string,
        amount: d.data().amount ?? null,
        read: (d.data().read as boolean) ?? false,
        createdAt: d.data().createdAt?.toDate?.() ?? null,
      }))
      setNotifications(notifs)
      setUnreadCount(notifs.filter((n) => !n.read).length)
    })

    return () => unsubscribe()
  }, [firestoreUserId])

  const markAllRead = async () => {
    if (!firestoreUserId) return
    const unread = notifications.filter((n) => !n.read)
    if (unread.length === 0) return
    const batch = writeBatch(db)
    unread.forEach((n) => {
      const ref = doc(db, "users", firestoreUserId, "notifications", n.id)
      batch.update(ref, { read: true })
    })
    await batch.commit().catch((err) =>
      console.error("[Notifications] markAllRead failed:", err)
    )
  }

  return { notifications, unreadCount, markAllRead }
}
