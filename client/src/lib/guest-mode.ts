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
 *
 * §12.0: The fallback must be OUTSIDE Boolean(). Previously the `||` was
 * inside Boolean(...), making the Supabase-not-configured branch dead code
 * because a non-empty string literal is always truthy.
 */
export function shouldUseMockData(): boolean {
  return isGuestSession() || !import.meta.env.VITE_SUPABASE_URL;
}
