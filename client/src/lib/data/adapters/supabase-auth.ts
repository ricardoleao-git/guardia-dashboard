/**
 * Adaptador de autenticação — Supabase Auth atrás do `AuthPort`.
 *
 * Junto com `supabase-collection.ts`, é o único ponto do client que conhece
 * o `@supabase/supabase-js` (`CLAUDE.md` §3).
 */
import { supabase } from "@/lib/supabase";
import type { AuthPort, AuthUser, Unsubscribe } from "../types";

function toAuthUser(user: { id: string; email?: string } | null | undefined): AuthUser | null {
  return user ? { id: user.id, email: user.email ?? null } : null;
}

export const supabaseAuth: AuthPort = {
  available: true,

  async getUser() {
    const { data } = await supabase!.auth.getSession();
    return toAuthUser(data.session?.user);
  },

  onAuthStateChange(cb: (user: AuthUser | null) => void): Unsubscribe {
    const { data } = supabase!.auth.onAuthStateChange((_event, session) => {
      cb(toAuthUser(session?.user));
    });
    return () => data.subscription.unsubscribe();
  },

  async signInWithPassword(email: string, password: string) {
    const { error } = await supabase!.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  async signOut() {
    await supabase!.auth.signOut();
  },

  async inviteByEmail(email: string, redirectTo?: string) {
    const { error } = await supabase!.auth.signInWithOtp({
      email,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    });
    return { error: error?.message ?? null };
  },
};

/** Sem backend de auth: tudo recusa, nada faz requisição. */
export const unavailableAuth: AuthPort = {
  available: false,
  async getUser() {
    return null;
  },
  onAuthStateChange() {
    return () => {};
  },
  async signInWithPassword() {
    return { error: "Supabase não configurado. Operando em modo demonstração." };
  },
  async signOut() {
    /* nada a encerrar */
  },
  async inviteByEmail() {
    return { error: "Modo demonstração: não é possível convidar operadores" };
  },
};
