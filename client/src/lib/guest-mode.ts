/**
 * Guest mode utility — visitors in demo mode should never touch Supabase.
 * They see mock data only. This prevents anon-key reads on the database
 * and keeps RLS policies strict (authenticated-only).
 */

export function isGuestSession(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("guardia_guest") === "true";
}
