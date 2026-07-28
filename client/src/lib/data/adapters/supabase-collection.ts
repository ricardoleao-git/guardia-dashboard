/**
 * Adaptador Supabase — a ÚNICA parte do client que fala Supabase.
 *
 * `CLAUDE.md` §3 manda isolar tudo que fale Supabase atrás da camada de
 * acesso a dados, porque a stack de produção é PostgreSQL/HostDime. Quando a
 * troca acontecer, é este arquivo que se substitui.
 */
import { supabase } from "@/lib/supabase";
import type {
  Collection,
  DeleteResult,
  ListOptions,
  MutationResult,
  Unsubscribe,
} from "../types";

/**
 * O cliente é `null` quando as env vars não estão configuradas
 * (`lib/supabase.ts:11`). O seletor em `../index.ts` só entrega este
 * adaptador quando há cliente, mas a checagem fica aqui também: era
 * justamente a ausência dela que fazia `useDevices.updateDevice` e as três
 * mutações de `useAutomationRules` estourarem `TypeError` no modo demo.
 */
function client() {
  if (!supabase) {
    throw new Error(
      "Adaptador Supabase usado sem cliente configurado — o seletor de " +
        "@/lib/data deveria ter escolhido o adaptador local."
    );
  }
  return supabase;
}

export function supabaseCollection<T>(table: string): Collection<T> {
  return {
    async list(options: ListOptions = {}): Promise<T[]> {
      let query = client().from(table).select("*");

      if (options.where) {
        for (const [column, value] of Object.entries(options.where)) {
          query = query.eq(column, value);
        }
      }
      if (options.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? true,
        });
      }
      if (options.limit != null) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data as T[]) ?? [];
    },

    async insert(row: Partial<T>): Promise<MutationResult<T>> {
      // `as any`: o tipo gerado do postgrest é paramétrico na tabela, e aqui
      // o nome da tabela é string em runtime. A garantia de forma fica no
      // tipo `T` que o chamador declara.
      const { data, error } = await client()
        .from(table)
        .insert(row as any)
        .select()
        .single();
      if (error) return { error: error.message };
      return { data: data as T };
    },

    async update(id: string, patch: Partial<T>): Promise<MutationResult<T>> {
      const { data, error } = await client()
        .from(table)
        .update(patch as any)
        .eq("id", id)
        .select()
        .single();
      if (error) return { error: error.message };
      return { data: data as T };
    },

    async remove(id: string): Promise<DeleteResult> {
      const { error } = await client().from(table).delete().eq("id", id);
      if (error) return { error: error.message };
      return { success: true };
    },

    subscribe(onChange: () => void): Unsubscribe {
      const c = client();
      const channel = c
        .channel(`${table}_changes`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => onChange()
        )
        .subscribe();
      return () => {
        c.removeChannel(channel);
      };
    },
  };
}
