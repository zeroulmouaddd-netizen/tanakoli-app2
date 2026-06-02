'use client'

import { initializeApp, getApps, getApp } from "firebase/app"
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
} from "firebase/firestore"
import { getAuth } from "firebase/auth"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyCz62DFbbD89fpYUXdg38nRCohX-yTJ4z8",
  authDomain: "tanakoli-khenchela.firebaseapp.com",
  projectId: "tanakoli-khenchela",
  storageBucket: "tanakoli-khenchela.firebasestorage.app",
  messagingSenderId: "757217321198",
  appId: "1:757217321198:web:1cbdfd808a180b6ff9d3ff",
  measurementId: "G-S4BJ4GEEKF",
}

// Guard against re-initialization on hot reloads
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// Analytics initialization - only in browser
if (typeof window !== "undefined") {
  try {
    Promise.resolve().then(() => {
      return import("firebase/analytics").then(({ getAnalytics, isSupported }) => {
        return isSupported().then((supported) => {
          if (supported) {
            try {
              getAnalytics(app)
            } catch (e) {
              // Analytics may fail, but it shouldn't break the app
              console.error("[v0] Failed to initialize analytics:", e)
            }
          }
        })
      })
    }).catch((e) => {
      // Catch any errors from analytics initialization
      console.error("[v0] Analytics import error:", e)
    })
  } catch (e) {
    // Fallback error handling
    console.error("[v0] Analytics setup error:", e)
  }
}

// initializeFirestore throws if called more than once on the same app instance
// (happens on hot reloads in dev). Fall back to getFirestore if already initialized.
let db: ReturnType<typeof getFirestore>
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    }),
  })
} catch {
  db = getFirestore(app)
}

// Initialize and export Firebase Auth
export const auth = getAuth(app)

// Initialize and export Firebase Realtime Database
export const realtimeDb = getDatabase(app)

export { db }
