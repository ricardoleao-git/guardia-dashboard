/**
 * Camada de acesso a dados — ponto de entrada.
 *
 * Consumidores importam daqui e só daqui:
 *
 *     import { data, auth, isLiveBackend } from "@/lib/data";
 *     const rows = await data.faceLists.list({ orderBy: { column: "person_name" } });
 *
 * `CLAUDE.md` §3: quando o backend virar PostgreSQL/HostDime, troca-se o
 * adaptador e nenhum hook, página ou componente muda.
 *
 * ## Por que a escolha é por chamada, e não no carregamento do módulo
 *
 * `isGuestSession()` lê o `localStorage` e muda em runtime: `AuthContext`
 * remove a flag de guest imediatamente antes do `signInWithPassword`
 * (`AuthContext.tsx`, §14.2). Resolver o adaptador uma vez na carga do módulo
 * deixaria quem veio do demo preso em mock depois de logar de verdade — que é
 * exatamente a classe de bug do §12.0.
 */
import { isGuestSession } from "@/lib/guest-mode";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

import { localStorageCollection, readOnlyEmpty, seededLocalCollection } from "./adapters/local-collection";
import { supabaseAuth, unavailableAuth } from "./adapters/supabase-auth";
import { supabaseCollection } from "./adapters/supabase-collection";
import type { AuthPort, Collection } from "./types";

export {
  fetchConnectorStatus,
  fetchEvents,
  loadAnnotations,
  saveAnnotations,
  subscribeToNewEvents,
  type EventFilters,
} from "./adapters/supabase-events";

export type {
  AuthPort,
  AuthUser,
  Collection,
  DeleteResult,
  ListOptions,
  MutationResult,
  Unsubscribe,
} from "./types";

/** Há backend real e o usuário não está no modo demo? */
export function isLiveBackend(): boolean {
  return isSupabaseConfigured && supabase !== null && !isGuestSession();
}

/** Há backend configurado, independentemente de o usuário estar em demo. */
export function isBackendConfigured(): boolean {
  return isSupabaseConfigured && supabase !== null;
}

/**
 * Mensagens de recusa em modo demo, preservadas literalmente dos hooks que
 * existiam antes desta camada — o texto já aparece na tela do usuário.
 */
const REFUSALS = {
  faceLists: "Modo demonstração: não é possível cadastrar pessoas",
  devices: "Modo demonstração: não é possível alterar dispositivos",
  attendance: "Modo demonstração: não é possível alterar frequência",
  automationRules: "Modo demonstração: não é possível alterar automações",
  profiles: "Modo demonstração: não é possível alterar operadores",
} as const;

// Chaves preservadas literalmente dos hooks anteriores — mudá-las faria o
// usuário perder o que já tem salvo no navegador.
export const SEARCH_PRESETS_STORAGE_KEY = "guardia:search-presets";
export const AUDIT_LOG_STORAGE_KEY = "guardia_audit_logs";

/** Seed sintético do log de auditoria — lazy, para não pesar o bundle de quem está logado. */
let auditSeed: (() => any[]) | null = null;
export function registerAuditLogSeed(seed: () => any[]): void {
  auditSeed = seed;
}

function live<T>(table: string): Collection<T> {
  return supabaseCollection<T>(table);
}

/**
 * Um par (remoto, local) por coleção. O getter escolhe a cada acesso.
 *
 * As três estratégias locais são diferentes de propósito — cada uma reproduz
 * o que aquele hook já fazia em modo demo. Uniformizar aqui mudaria o
 * comportamento do demo de contrabando.
 */
function pick<T>(remote: () => Collection<T>, local: () => Collection<T>): Collection<T> {
  return {
    list: (o) => (isLiveBackend() ? remote() : local()).list(o),
    insert: (r) => (isLiveBackend() ? remote() : local()).insert(r),
    update: (id, p) => (isLiveBackend() ? remote() : local()).update(id, p),
    remove: (id) => (isLiveBackend() ? remote() : local()).remove(id),
    subscribe: (cb) => (isLiveBackend() ? remote() : local()).subscribe(cb),
  };
}

export const data = {
  faceLists: pick(
    () => live("face_lists"),
    () => readOnlyEmpty(REFUSALS.faceLists)
  ),
  devices: pick(
    () => live("devices"),
    () => readOnlyEmpty(REFUSALS.devices)
  ),
  attendance: pick(
    () => live("attendance"),
    () => readOnlyEmpty(REFUSALS.attendance)
  ),
  automationRules: pick(
    () => live("automation_rules"),
    () => readOnlyEmpty(REFUSALS.automationRules)
  ),
  profiles: pick(
    () => live("profiles"),
    () => readOnlyEmpty(REFUSALS.profiles)
  ),
  /** CRUD real no navegador — era o fallback localStorage do useSearchPresets. */
  searchPresets: pick(
    () => live("search_presets"),
    () => localStorageCollection(SEARCH_PRESETS_STORAGE_KEY)
  ),
  /** Seed sintético + o que o operador escreveu na sessão. */
  auditLogs: pick(
    () => live("audit_logs"),
    () => seededLocalCollection(AUDIT_LOG_STORAGE_KEY, () => (auditSeed ? auditSeed() : []))
  ),
};

/** Autenticação. `available === false` quando não há backend configurado. */
export const auth: AuthPort = {
  get available() {
    return isBackendConfigured();
  },
  getUser: () => (isBackendConfigured() ? supabaseAuth : unavailableAuth).getUser(),
  onAuthStateChange: (cb) =>
    (isBackendConfigured() ? supabaseAuth : unavailableAuth).onAuthStateChange(cb),
  signInWithPassword: (e, p) =>
    (isBackendConfigured() ? supabaseAuth : unavailableAuth).signInWithPassword(e, p),
  signOut: () => (isBackendConfigured() ? supabaseAuth : unavailableAuth).signOut(),
  inviteByEmail: (e, r) =>
    (isBackendConfigured() ? supabaseAuth : unavailableAuth).inviteByEmail(e, r),
};
