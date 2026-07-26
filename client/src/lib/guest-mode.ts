/**
 * Guest mode utility — visitors in demo mode should never touch Supabase.
 * They see mock data only. This prevents anon-key reads on the database
 * and keeps RLS policies strict (authenticated-only).
 */

export function isGuestSession(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("guardia_guest") === "true";
}

/**
 * Returns true if the current session should use mock data
 * (guest mode OR Supabase not configured).
 */
export function shouldUseMockData(): boolean {
  return isGuestSession() || !Boolean(
    import.meta.env.VITE_SUPABASE_URL ||
    "https://ycqrgrczrunvyivxfnch.supabase.co"
  );
}
