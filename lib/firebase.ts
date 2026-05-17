import { initializeApp, getApps } from "firebase/app"
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore"

const firebaseConfig = {
  apiKey: 'AIzaSyCz62DFbbD89fpYUXdg38nRCohX-yTJ4z8',
  authDomain: 'tanakoli-khenchela.firebaseapp.com',
  projectId: 'tanakoli-khenchela',
  storageBucket: 'tanakoli-khenchela.firebasestorage.app',
  messagingSenderId: '757217321198',
  appId: '1:757217321198:web:1cbdfd808a180b6ff9d3ff'
}

// Initialize Firebase only if it hasn't been initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

// Initialize Firestore with persistent cache for offline support and faster loads
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  })
})
