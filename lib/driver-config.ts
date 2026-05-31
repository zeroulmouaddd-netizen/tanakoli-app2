// Hardcoded list of phone numbers authorized to access Driver Mode.
// Format: E.164  (+213XXXXXXXXX — leading 0 replaced by +213)
// To add a driver: append their E.164 number to this set.
export const AUTHORIZED_DRIVER_PHONES = new Set<string>([
  "+213775453629",
])

export function isAuthorizedDriverPhone(e164Phone: string | null | undefined): boolean {
  if (!e164Phone) return false
  return AUTHORIZED_DRIVER_PHONES.has(e164Phone)
}
