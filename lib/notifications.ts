"use client"

import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

export type NotificationType = "payment" | "recharge" | "low_balance"

export async function addNotification(
  userId: string,
  type: NotificationType,
  message: string,
  amount?: number
): Promise<void> {
  try {
    const notifRef = collection(db, "users", userId, "notifications")
    await addDoc(notifRef, {
      type,
      message,
      amount: amount ?? null,
      read: false,
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("[Notifications] Failed to add notification:", error)
  }
}

export const LOW_BALANCE_THRESHOLD = 50
