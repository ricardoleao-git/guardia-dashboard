/**
 * Fábrica do cliente Supabase — e nada mais.
 *
 * `CLAUDE.md` §3: Supabase não é a stack do produto; existe só neste
 * protótipo, e todo código que fale Supabase tem que ficar isolado atrás de
 * uma camada de acesso a dados. Essa camada é `@/lib/data`.
 *
 * As consultas que antes moravam aqui (eventos, status do connector,
 * anotações, realtime) estão em `@/lib/data/adapters/supabase-events.ts`.
 *
 * 🚫 Não importe `supabase` deste arquivo em hook, página ou componente.
 *    Os únicos consumidores legítimos são os adaptadores em
 *    `@/lib/data/adapters/`. Importar direto daqui recria o acoplamento que
 *    a camada existe para evitar.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
