---
name: MapLibre GL WebGL fallback
description: MapLibre GL requires WebGL which is unavailable in Replit's container preview. Hybrid renderer solves this.
---

## Rule
`maplibre-map.tsx` is a **hybrid component**:
- Detects WebGL via `detectWebGL()` on mount
- If WebGL available → `MapLibreRenderer` (maplibre-gl, real browsers, production)
- If no WebGL → `LeafletDarkRenderer` (Leaflet + CartoDB Dark Matter tiles, canvas 2D, Replit preview)

**Why:** Replit's container has no GPU, so `new maplibregl.Map(...)` throws "Failed to initialize WebGL / BindToCurrentSequence failed" at runtime. Leaflet uses Canvas 2D and renders the same CartoDB Dark Matter tiles without WebGL.

**How to apply:** Any time a WebGL-based map renderer is added to this project, wrap it with this pattern. The `detectWebGL()` function creates a canvas, requests a WebGL context, and tests a dummy draw call. Live driver tracking (RTDB `drivers/0775453629/location`) is present in BOTH renderers — never remove it from either branch.
