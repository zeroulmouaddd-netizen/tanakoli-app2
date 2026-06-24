/**
 * Schedule utilities for Algeria (UTC+1) timezone.
 * Single source of truth for ETA and schedule generation — used by both
 * the Stations page and Trips page.
 */

export interface ScheduleSlot {
  time: string
  status: "departed" | "current" | "upcoming"
}

/**
 * Returns the current local time in Algeria (Africa/Algiers, UTC+1)
 * as { hours, minutes, totalMinutes }.
 */
export function getAlgiersTime(): { hours: number; minutes: number; totalMinutes: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Algiers",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(new Date())

    let hours = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10)
    const minutes = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10)

    // Intl may return 24 for midnight in some environments
    if (hours === 24) hours = 0

    return { hours, minutes, totalMinutes: hours * 60 + minutes }
  } catch {
    // Fallback: use local machine time
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    return { hours, minutes, totalMinutes: hours * 60 + minutes }
  }
}

/**
 * Parses "HH:MM" → total minutes since midnight.
 */
function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/**
 * Formats total minutes since midnight → "HH:MM".
 */
function formatMinutes(total: number): string {
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
}

/**
 * Calculates the next scheduled arrival for a route in Algeria local time.
 *
 * - If before service starts: returns minutes until first departure.
 * - During service: returns minutes until next scheduled bus.
 * - After service ends: returns first departure time tomorrow (e.g. "غداً 06:00").
 * - If exactly on a departure: returns "الآن".
 */
export function calculateNextArrival(
  workingHours: { start: string; end: string },
  frequency: number
): string {
  const { totalMinutes: now } = getAlgiersTime()
  const startTotal = parseTime(workingHours.start)
  const endTotal = parseTime(workingHours.end)

  if (now < startTotal) {
    const diff = startTotal - now
    if (diff === 1) return "دقيقة واحدة"
    return `${diff} دقيقة`
  }

  if (now >= endTotal) {
    return `غداً ${workingHours.start}`
  }

  // Within service window — find the next departure after `now`
  const minutesSinceStart = now - startTotal
  const remainder = minutesSinceStart % frequency

  if (remainder === 0) return "الآن"

  const nextBusIn = frequency - remainder
  if (nextBusIn === 1) return "دقيقة واحدة"
  return `${nextBusIn} دقيقة`
}

/**
 * Generates up to `count` schedule slots centred around the current time.
 * Slots before the current departure are "departed", the next one is
 * "current", and the rest are "upcoming".
 */
export function generateSchedule(
  workingHours: { start: string; end: string },
  frequency: number,
  count = 5
): ScheduleSlot[] {
  const { totalMinutes: now } = getAlgiersTime()
  const startTotal = parseTime(workingHours.start)
  const endTotal = parseTime(workingHours.end)

  // Build full list of departure minutes
  const allDepartures: number[] = []
  for (let t = startTotal; t <= endTotal; t += frequency) {
    allDepartures.push(t)
  }

  if (allDepartures.length === 0) return []

  // Find the index of the "current" (next upcoming) departure
  let currentIdx = allDepartures.findIndex((t) => t >= now)
  if (currentIdx === -1) currentIdx = allDepartures.length // past last departure

  // Build a window: show some departed + current + upcoming
  const windowStart = Math.max(0, currentIdx - 2)
  const windowEnd = Math.min(allDepartures.length - 1, windowStart + count - 1)
  const window = allDepartures.slice(windowStart, windowEnd + 1)

  return window.map((t) => {
    let status: ScheduleSlot["status"]
    if (t < now) {
      status = "departed"
    } else if (t === allDepartures[currentIdx]) {
      status = "current"
    } else {
      status = "upcoming"
    }
    return { time: formatMinutes(t), status }
  })
}
