/**
 * Testes dos adaptadores locais da camada de acesso a dados.
 *
 * Por que estes primeiro: a camada é o ponto único por onde passam as 25
 * chamadas que antes iam direto ao Supabase. Se ela quebra, quebram as 32
 * telas de uma vez — e as três estratégias locais são deliberadamente
 * diferentes entre si (`lib/data/README.md`), o que é exatamente o tipo de
 * coisa que um refactor uniformiza por engano.
 *
 * Lógica pura, sem rede: o modo demo não faz requisição (§14.2).
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  localStorageCollection,
  readOnlyEmpty,
  seededLocalCollection,
} from "./local-collection";

interface Row {
  id?: string;
  nome?: string;
  ordem?: number;
  ativo?: boolean;
  created_at?: string;
}

describe("readOnlyEmpty", () => {
  const col = readOnlyEmpty<Row>("Modo demonstração: não é possível cadastrar pessoas");

  it("lista vazia", async () => {
    expect(await col.list()).toEqual([]);
  });

  it("recusa escrita com a mensagem da página, não uma genérica", async () => {
    // O texto vem do hook original e já aparece na tela do usuário —
    // trocá-lo por uma mensagem genérica seria regressão de UX silenciosa.
    const esperado = "Modo demonstração: não é possível cadastrar pessoas";
    expect(await col.insert({ nome: "x" })).toEqual({ error: esperado });
    expect(await col.update("1", { nome: "y" })).toEqual({ error: esperado });
    expect(await col.remove("1")).toEqual({ error: esperado });
  });

  it("subscribe devolve uma função de cancelamento inofensiva", () => {
    const unsub = col.subscribe(() => {
      throw new Error("não deveria disparar — não há backend para mudar");
    });
    expect(typeof unsub).toBe("function");
    expect(() => unsub()).not.toThrow();
  });
});

describe("localStorageCollection", () => {
  const KEY = "guardia:test-presets";
  let col: ReturnType<typeof localStorageCollection<Row>>;

  beforeEach(() => {
    col = localStorageCollection<Row>(KEY);
  });

  it("insere e lê de volta", async () => {
    const res = await col.insert({ nome: "preset-1" });
    expect(res.error).toBeUndefined();
    expect((await col.list()).map((r) => r.nome)).toEqual(["preset-1"]);
  });

  it("gera id e created_at quando ausentes", async () => {
    const res = await col.insert({ nome: "sem-id" });
    expect(res.data?.id).toBeTruthy();
    expect(res.data?.created_at).toBeTruthy();
  });

  it("respeita id e created_at fornecidos", async () => {
    const res = await col.insert({ id: "meu-id", created_at: "2020-01-01", nome: "x" });
    expect(res.data?.id).toBe("meu-id");
    expect(res.data?.created_at).toBe("2020-01-01");
  });

  it("persiste de verdade — outra instância vê o mesmo dado", async () => {
    await col.insert({ id: "a", nome: "persistido" });
    const outra = localStorageCollection<Row>(KEY);
    expect((await outra.list()).map((r) => r.id)).toEqual(["a"]);
  });

  it("insere no início (mais novo primeiro)", async () => {
    await col.insert({ id: "a" });
    await col.insert({ id: "b" });
    expect((await col.list()).map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("atualiza por id", async () => {
    await col.insert({ id: "a", nome: "antes" });
    const res = await col.update("a", { nome: "depois" });
    expect(res.data?.nome).toBe("depois");
    expect((await col.list())[0].nome).toBe("depois");
  });

  it("update de id inexistente devolve erro, não cria", async () => {
    const res = await col.update("fantasma", { nome: "x" });
    expect(res.error).toBe("Registro não encontrado");
    expect(await col.list()).toEqual([]);
  });

  it("remove por id", async () => {
    await col.insert({ id: "a" });
    await col.insert({ id: "b" });
    expect(await col.remove("a")).toEqual({ success: true });
    expect((await col.list()).map((r) => r.id)).toEqual(["b"]);
  });

  it("remove de id inexistente não estoura", async () => {
    expect(await col.remove("fantasma")).toEqual({ success: true });
  });

  it("localStorage com JSON corrompido devolve lista vazia em vez de estourar", async () => {
    localStorage.setItem(KEY, "{isto não é json");
    expect(await col.list()).toEqual([]);
  });

  describe("ListOptions — mesma semântica do adaptador remoto", () => {
    beforeEach(async () => {
      await col.insert({ id: "c", ordem: 3, ativo: true });
      await col.insert({ id: "a", ordem: 1, ativo: true });
      await col.insert({ id: "b", ordem: 2, ativo: false });
    });

    it("ordena ascendente por default", async () => {
      const r = await col.list({ orderBy: { column: "ordem" } });
      expect(r.map((x) => x.ordem)).toEqual([1, 2, 3]);
    });

    it("ordena descendente quando pedido", async () => {
      const r = await col.list({ orderBy: { column: "ordem", ascending: false } });
      expect(r.map((x) => x.ordem)).toEqual([3, 2, 1]);
    });

    it("filtra por igualdade", async () => {
      const r = await col.list({ where: { ativo: true } });
      expect(r.map((x) => x.id).sort()).toEqual(["a", "c"]);
    });

    it("combina where com AND", async () => {
      const r = await col.list({ where: { ativo: true, ordem: 1 } });
      expect(r.map((x) => x.id)).toEqual(["a"]);
    });

    it("aplica limit", async () => {
      const r = await col.list({ orderBy: { column: "ordem" }, limit: 2 });
      expect(r.map((x) => x.ordem)).toEqual([1, 2]);
    });

    it("limit vem depois de order — não corta antes de ordenar", async () => {
      const r = await col.list({ orderBy: { column: "ordem", ascending: false }, limit: 1 });
      expect(r[0].ordem).toBe(3);
    });

    it("não muta o que está no storage ao ordenar", async () => {
      await col.list({ orderBy: { column: "ordem", ascending: false } });
      const bruto = JSON.parse(localStorage.getItem(KEY)!) as Row[];
      expect(bruto.map((x) => x.id)).toEqual(["b", "a", "c"]);
    });
  });
});

describe("seededLocalCollection", () => {
  const KEY = "guardia:test-audit";

  it("combina seed com o que foi escrito", async () => {
    const col = seededLocalCollection<Row>(KEY, () => [{ id: "seed-1", nome: "sintético" }]);
    await col.insert({ id: "escrito-1", nome: "do operador" });
    expect((await col.list()).map((r) => r.id).sort()).toEqual(["escrito-1", "seed-1"]);
  });

  it("o seed é lazy — não é chamado antes do list", async () => {
    let chamadas = 0;
    const col = seededLocalCollection<Row>(KEY, () => {
      chamadas++;
      return [];
    });
    expect(chamadas).toBe(0);
    await col.list();
    expect(chamadas).toBe(1);
  });

  it("o escrito vem antes do seed", async () => {
    const col = seededLocalCollection<Row>(KEY, () => [{ id: "seed" }]);
    await col.insert({ id: "novo" });
    expect((await col.list()).map((r) => r.id)).toEqual(["novo", "seed"]);
  });

  it("não escreve o seed no storage — seed é só leitura", async () => {
    const col = seededLocalCollection<Row>(KEY, () => [{ id: "seed" }]);
    await col.list();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("ordena o conjunto inteiro, não cada metade", async () => {
    const col = seededLocalCollection<Row>(KEY, () => [{ id: "s", ordem: 2 }]);
    await col.insert({ id: "w", ordem: 1 });
    await col.insert({ id: "x", ordem: 3 });
    const r = await col.list({ orderBy: { column: "ordem" } });
    expect(r.map((x) => x.id)).toEqual(["w", "s", "x"]);
  });
});
