const CACHE_VERSION = 'v2'
const STATIC_CACHE = 'tanakoli-static-' + CACHE_VERSION
const FONT_CACHE = 'tanakoli-fonts-' + CACHE_VERSION
const OFFLINE_URL = '/offline.html'

// Domains/patterns that must NEVER be cached — always hit the network
const BYPASS_PATTERNS = [
  // Map tiles
  /tile\.openstreetmap\.org/,
  /basemaps\.cartocdn\.com/,
  /api\.maptiler\.com/,
  /mapbox\.com/,
  /maptiles/,
  // OSRM routing
  /router\.project-osrm\.org/,
  /osrm/,
  // Firebase / Google APIs (auth, Firestore, RTDB, analytics)
  /firebaseio\.com/,
  /firestore\.googleapis\.com/,
  /identitytoolkit\.googleapis\.com/,
  /securetoken\.googleapis\.com/,
  /firebase\.googleapis\.com/,
  /googleapis\.com/,
  /firebaseapp\.com\//__/,
  /firebasedatabase\.app/,
  // Vercel analytics
  /_vercel\/insights/,
]

// Static asset extensions worth caching aggressively
const STATIC_EXTENSIONS = ['.js', '.css', '.woff', '.woff2', '.ttf', '.otf', '.ico', '.svg', '.png', '.webp', '.jpg', '.jpeg']

function isBypassed(url) {
  return BYPASS_PATTERNS.some((pattern) => pattern.test(url))
}

function isStaticAsset(url) {
  // Next.js static chunks
  if (url.includes('/_next/static/')) return true
  // Fonts served from Google Fonts CDN
  if (url.includes('fonts.gstatic.com') || url.includes('fonts.googleapis.com')) return true
  // Local static files with cacheable extensions
  try {
    const pathname = new URL(url).pathname
    return STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))
  } catch {
    return false
  }
}

// ── Install: pre-cache the offline fallback page ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.add(OFFLINE_URL))
  )
  self.skipWaiting()
})

// ── Activate: delete any old cache versions ───────────────────────────────────
self.addEventListener('activate', (event) => {
  const validCaches = [STATIC_CACHE, FONT_CACHE]
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// ── Fetch: tiered caching strategy ───────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = request.url

  // Always bypass for non-GET, DevTools, chrome-extension, etc.
  if (request.method !== 'GET') return
  if (!url.startsWith('http')) return

  // Always bypass map tiles, Firebase, OSRM — pass straight through
  if (isBypassed(url)) return

  // ── Fonts: cache-first, long-lived ────────────────────────────────────────
  if (url.includes('fonts.gstatic.com') || url.includes('fonts.googleapis.com')) {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      })
    )
    return
  }

  // ── Next.js static chunks & local assets: cache-first ─────────────────────
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        try {
          const response = await fetch(request)
          if (response.ok) cache.put(request, response.clone())
          return response
        } catch {
          // Static asset unavailable offline — nothing useful to return
          return new Response('', { status: 503 })
        }
      })
    )
    return
  }

  // ── Navigation (HTML pages): network-first, offline fallback ──────────────
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then((r) => r || new Response('Offline', { status: 503 }))
      )
    )
    return
  }

  // Everything else: plain network, no interference
})
