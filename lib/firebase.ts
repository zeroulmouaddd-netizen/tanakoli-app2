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
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
}

// Validate that all required config values are present
const isValidConfig = Object.entries(firebaseConfig).every(
  ([key, value]) => {
    // measurementId is optional
    if (key === 'measurementId') return true
    return value !== undefined && value !== ''
  }
)

if (!isValidConfig) {
  console.error('[Firebase] Missing required environment variables. Please check your NEXT_PUBLIC_FIREBASE_* env vars.')
}

let app: ReturnType<typeof initializeApp> | ReturnType<typeof getApp>
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
} catch (error) {
  console.error('[Firebase] Initialization error:', error)
  throw error
}

if (typeof window !== "undefined") {
  try {
    Promise.resolve().then(() => {
      return import("firebase/analytics").then(({ getAnalytics, isSupported }) => {
        return isSupported().then((supported) => {
          if (supported) {
            try {
              getAnalytics(app)
            } catch (e) {
              console.error("[firebase] Failed to initialize analytics:", e)
            }
          }
        })
      })
    }).catch((e) => {
      console.error("[firebase] Analytics import error:", e)
    })
  } catch (e) {
    console.error("[firebase] Analytics setup error:", e)
  }
}

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

export const auth = getAuth(app)
export const rtdb = getDatabase(app)
export { db }
