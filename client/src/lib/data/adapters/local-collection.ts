/**
 * Adaptadores locais — o que responde quando não há backend.
 *
 * Três estratégias distintas, porque o comportamento em modo demo já era
 * diferente por hook antes desta camada, e mudá-lo aqui seria alterar o demo
 * de contrabando:
 *
 *  - `readOnlyEmpty`  — lista vazia, escrita recusada com mensagem própria.
 *    (face_lists, devices, attendance, automation_rules, profiles)
 *  - `localStorage`   — CRUD real persistido no navegador. (search_presets)
 *  - `seededLocal`    — seed fixo + o que o usuário escreveu. (audit_logs)
 *
 * Nenhum deles faz requisição de rede: o §14.2 registra que o modo demo faz
 * zero chamada a `supabase.co`, e essa propriedade é validada em runtime.
 */
import type {
  Collection,
  DeleteResult,
  ListOptions,
  MutationResult,
  Unsubscribe,
} from "../types";

/** Ordena/filtra/limita em memória, com a mesma semântica do adaptador remoto. */
function applyOptions<T>(rows: T[], options: ListOptions = {}): T[] {
  let out = [...rows];

  if (options.where) {
    out = out.filter((row) =>
      Object.entries(options.where!).every(
        (entry) => (row as any)[entry[0]] === entry[1]
      )
    );
  }
  if (options.orderBy) {
    const { column, ascending = true } = options.orderBy;
    out.sort((a, b) => {
      const av = (a as any)[column];
      const bv = (b as any)[column];
      if (av === bv) return 0;
      return (av > bv ? 1 : -1) * (ascending ? 1 : -1);
    });
  }
  if (options.limit != null) {
    out = out.slice(0, options.limit);
  }
  return out;
}

/** Sem realtime fora do backend: nada muda por baixo, então não há o que avisar. */
const noopSubscribe: Collection<any>["subscribe"] = () => () => {};

/**
 * Lista vazia e escrita recusada. `refusal` é a mensagem que o usuário vê —
 * preservada literalmente do hook correspondente.
 */
export function readOnlyEmpty<T>(refusal: string): Collection<T> {
  const denied = async () => ({ error: refusal });
  return {
    async list() {
      return [];
    },
    insert: denied as () => Promise<MutationResult<T>>,
    update: denied as () => Promise<MutationResult<T>>,
    remove: denied as () => Promise<DeleteResult>,
    subscribe: noopSubscribe,
  };
}

function readJson<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeJson<T>(key: string, rows: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(rows));
  } catch {
    /* cota estourada ou storage indisponível — silencioso, como antes */
  }
}

/** CRUD persistido em localStorage. Gera `id` e `created_at` quando ausentes. */
export function localStorageCollection<T extends { id?: string }>(
  storageKey: string
): Collection<T> {
  return {
    async list(options?: ListOptions) {
      return applyOptions(readJson<T>(storageKey), options);
    },

    async insert(row: Partial<T>): Promise<MutationResult<T>> {
      const rows = readJson<T>(storageKey);
      const created = {
        id: (row as any).id ?? crypto.randomUUID(),
        created_at: (row as any).created_at ?? new Date().toISOString(),
        ...row,
      } as unknown as T;
      writeJson(storageKey, [created, ...rows]);
      return { data: created };
    },

    async update(id: string, patch: Partial<T>): Promise<MutationResult<T>> {
      const rows = readJson<T>(storageKey);
      const i = rows.findIndex((r) => (r as any).id === id);
      if (i < 0) return { error: "Registro não encontrado" };
      const updated = { ...rows[i], ...patch } as T;
      rows[i] = updated;
      writeJson(storageKey, rows);
      return { data: updated };
    },

    async remove(id: string): Promise<DeleteResult> {
      const rows = readJson<T>(storageKey);
      writeJson(
        storageKey,
        rows.filter((r) => (r as any).id !== id)
      );
      return { success: true };
    },

    subscribe: noopSubscribe,
  };
}

/**
 * Seed fixo (sintético) mais o que o usuário escreveu na sessão.
 * O seed é lazy para que os dados de exemplo não entrem no bundle inicial
 * de quem está autenticado de verdade.
 */
export function seededLocalCollection<T extends { id?: string }>(
  storageKey: string,
  seed: () => T[]
): Collection<T> {
  const written = localStorageCollection<T>(storageKey);
  return {
    async list(options?: ListOptions) {
      const rows = [...(await written.list()), ...seed()];
      return applyOptions(rows, options);
    },
    insert: written.insert,
    update: written.update,
    remove: written.remove,
    subscribe: noopSubscribe,
  };
}
