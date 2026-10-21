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

// NEXT_PUBLIC_* values are inlined at build time. When they are absent (e.g.
// Vercel Preview builds where the env vars are not enabled for the Preview
// scope, or local `next build` without a .env file), the Firebase SDKs throw
// `auth/invalid-api-key` / `app/no-database-url` at module scope — which
// crashes the Next.js build during static prerendering of every page.
//
// To keep builds deterministic, critical fields fall back to well-formed
// placeholders so the SDKs can initialize. With placeholders the app simply
// fails its network calls through the error paths every listener/reader
// already handles; with real env vars the behaviour is completely unchanged.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBuildPlaceholderKey000000000000",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "placeholder.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "placeholder-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "placeholder.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "0",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:0:web:placeholder",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://placeholder-project-default-rtdb.firebaseio.com",
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

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

// Auth / RTDB init is guarded so a malformed or partially-configured env can
// never throw during build-time prerendering. Runtime callers already use
// try/catch or listener error callbacks around these services.
let auth: ReturnType<typeof getAuth>
try {
  auth = getAuth(app)
} catch (e) {
  console.error("[firebase] Failed to initialize auth:", e)
  auth = null as unknown as ReturnType<typeof getAuth>
}

let rtdb: ReturnType<typeof getDatabase>
try {
  rtdb = getDatabase(app)
} catch (e) {
  console.error("[firebase] Failed to initialize realtime database:", e)
  rtdb = null as unknown as ReturnType<typeof getDatabase>
}

export { db, auth, rtdb }
