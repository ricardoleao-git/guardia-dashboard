/**
 * Camada de acesso a dados — o contrato (port).
 *
 * `CLAUDE.md` §3: "Supabase NÃO é a stack do produto — existe só neste
 * protótipo. Todo código que fale Supabase é temporário e deve ficar isolado
 * atrás de uma camada de acesso a dados."
 *
 * Este arquivo é o contrato; os adaptadores em `./adapters` são as
 * implementações. Nenhum hook, página ou componente deve importar o cliente
 * Supabase diretamente — importam `data` de `@/lib/data`.
 *
 * Quando o backend virar PostgreSQL/HostDime, troca-se o adaptador. Os
 * consumidores não mudam.
 */

export type Unsubscribe = () => void;

export interface ListOptions {
  /** Ordenação. `ascending` default true. */
  orderBy?: { column: string; ascending?: boolean };
  /** Igualdade simples, aplicada com AND. */
  where?: Record<string, string | number | boolean>;
  limit?: number;
}

/**
 * Resultado de mutação. A forma `{ data }` / `{ error }` é a que os hooks já
 * devolviam antes desta camada — mantida de propósito para que as 32 páginas
 * não precisem mudar.
 */
export type MutationResult<T> =
  | { data: T; error?: undefined }
  | { error: string; data?: undefined };

export type DeleteResult =
  | { success: true; error?: undefined }
  | { error: string; success?: undefined };

export interface Collection<T> {
  list(options?: ListOptions): Promise<T[]>;
  insert(row: Partial<T>): Promise<MutationResult<T>>;
  update(id: string, patch: Partial<T>): Promise<MutationResult<T>>;
  remove(id: string): Promise<DeleteResult>;
  /** Realtime. Devolve a função de cancelamento — o chamador é dono dela. */
  subscribe(onChange: () => void): Unsubscribe;
}

/**
 * Usuário autenticado, na forma mínima que o app consome.
 *
 * Os nomes `id` e `email` são deliberadamente os mesmos do `User` do
 * `@supabase/supabase-js`: era o único tipo de fornecedor que vazava para o
 * `AuthContext`, e manter a forma faz a troca ser invisível para
 * `Header`, `App`, `useAuditLog` e `UserAdmin`.
 */
export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthPort {
  /** `null` quando não há backend de auth — o app cai em demo. */
  readonly available: boolean;
  getUser(): Promise<AuthUser | null>;
  onAuthStateChange(cb: (user: AuthUser | null) => void): Unsubscribe;
  signInWithPassword(email: string, password: string): Promise<{ error: string | null }>;
  signOut(): Promise<void>;
  /** Convite por magic link — usado pela administração de operadores. */
  inviteByEmail(email: string, redirectTo?: string): Promise<{ error: string | null }>;
}

/**
 * Nomes das coleções. Hoje mapeiam 1:1 para tabelas do protótipo Supabase;
 * no destino PostgreSQL o mapeamento vive no adaptador, não aqui.
 *
 * ⚠️ `cameraEvents` e `faceLists` carregam hoje vocabulário de fabricante nas
 * colunas (`face_list`, `person_name`, `face_score`, `recognize_image`,
 * `capture_image` — `CLAUDE.md` §9 item 4). O adaptador é o lugar onde essa
 * tradução deve acontecer quando o catálogo canônico entrar
 * (`contracts/events/`), sem que as telas precisem mudar. Não está feito.
 */
export interface DataSource {
  readonly kind: "supabase" | "local";
  faceLists: Collection<any>;
  devices: Collection<any>;
  attendance: Collection<any>;
  auditLogs: Collection<any>;
  searchPresets: Collection<any>;
  automationRules: Collection<any>;
  profiles: Collection<any>;
}
