import { initializeApp, getApps, getApp } from "firebase/app"
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
} from "firebase/firestore"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: 'AIzaSyCz62DFbbD89fpYUXdg38nRCohX-yTJ4z8',
  authDomain: 'tanakoli-khenchela.firebaseapp.com',
  projectId: 'tanakoli-khenchela',
  storageBucket: 'tanakoli-khenchela.firebasestorage.app',
  messagingSenderId: '757217321198',
  appId: '1:757217321198:web:1cbdfd808a180b6ff9d3ff'
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

// initializeFirestore throws if called more than once on the same app instance
// (happens on hot reloads). Fall back to getFirestore if already initialized.
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

const auth = getAuth(app)

export { db, auth }
