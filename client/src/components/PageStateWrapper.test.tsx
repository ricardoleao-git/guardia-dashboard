/**
 * Testes do PageStateWrapper.
 *
 * Por que este segundo: 20 páginas o importam. Um estado que renderize errado
 * — ou que renderize os filhos quando não deveria — vaza para todas de uma
 * vez, e nada avisa.
 *
 * O i18n é real, não mockado: o wrapper resolve as strings por `t()` e a
 * regressão que interessa é justamente "voltou a ter texto cravado".
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "@/contexts/I18nContext";
import { PageStateWrapper, type LoadState } from "./PageStateWrapper";

/**
 * O I18nProvider auto-detecta `navigator.language` quando não há escolha
 * salva, e no jsdom isso é `en-US`. Os testes fixam o idioma explicitamente
 * para não depender do ambiente — e é a mesma chave que a UI usa.
 */
const LANG_KEY = "guardia-lang";

function renderWrapper(
  props: Partial<React.ComponentProps<typeof PageStateWrapper>> = {},
  lang: "pt" | "en" | "zh" = "pt"
) {
  localStorage.setItem(LANG_KEY, lang);
  return render(
    <I18nProvider>
      <PageStateWrapper state="loaded" {...props}>
        <p>conteúdo da página</p>
      </PageStateWrapper>
    </I18nProvider>
  );
}

const CONTEUDO = "conteúdo da página";

describe("qual estado mostra o conteúdo", () => {
  it("loaded renderiza os filhos", () => {
    renderWrapper({ state: "loaded" });
    expect(screen.getByText(CONTEUDO)).toBeInTheDocument();
  });

  it("partial renderiza os filhos E o banner", () => {
    renderWrapper({ state: "partial" });
    expect(screen.getByText(CONTEUDO)).toBeInTheDocument();
    expect(screen.getByText(/Sincronização parcial/)).toBeInTheDocument();
  });

  it.each<LoadState>(["loading", "error", "offline", "empty"])(
    "%s NÃO renderiza os filhos",
    (state) => {
      renderWrapper({ state });
      expect(screen.queryByText(CONTEUDO)).not.toBeInTheDocument();
    }
  );

  it("loaded não mostra o banner de parcial", () => {
    renderWrapper({ state: "loaded" });
    expect(screen.queryByText(/Sincronização parcial/)).not.toBeInTheDocument();
  });
});

describe("os 5 estados obrigatórios (CORE-03 §7)", () => {
  it("loading mostra o texto traduzido", () => {
    renderWrapper({ state: "loading" });
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  it("error mostra título, descrição e nada mais", () => {
    renderWrapper({ state: "error" });
    expect(screen.getByText("Erro ao carregar")).toBeInTheDocument();
    expect(screen.getByText("Não foi possível conectar ao servidor.")).toBeInTheDocument();
  });

  it("offline distingue do error — são problemas diferentes", () => {
    renderWrapper({ state: "offline" });
    expect(screen.getByText("Connector offline")).toBeInTheDocument();
    expect(screen.queryByText("Erro ao carregar")).not.toBeInTheDocument();
  });

  it("empty cai no texto genérico quando a página não passa o próprio", () => {
    renderWrapper({ state: "empty" });
    expect(screen.getByText("Nenhum dado encontrado")).toBeInTheDocument();
  });
});

describe("onRetry", () => {
  it("error mostra o botão e chama o callback", async () => {
    const onRetry = vi.fn();
    renderWrapper({ state: "error", onRetry });
    await userEvent.click(screen.getByRole("button", { name: /Tentar novamente/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("offline usa 'Reconectar', não 'Tentar novamente'", async () => {
    const onRetry = vi.fn();
    renderWrapper({ state: "offline", onRetry });
    expect(screen.queryByRole("button", { name: /Tentar novamente/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Reconectar/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("sem onRetry não há botão — nada de botão morto na tela", () => {
    renderWrapper({ state: "error" });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("empty não tem botão de retry — vazio não é falha", () => {
    renderWrapper({ state: "empty", onRetry: vi.fn() });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("vazio customizado por página", () => {
  it("usa título e descrição próprios quando passados", () => {
    renderWrapper({
      state: "empty",
      emptyTitle: "Nenhum registro de frequência",
      emptyDescription: "Não há eventos faciais cadastrados para hoje.",
    });
    expect(screen.getByText("Nenhum registro de frequência")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum dado encontrado")).not.toBeInTheDocument();
  });

  it("emptyAction renderiza o CTA que o CORE-03 §7 pede", () => {
    renderWrapper({
      state: "empty",
      emptyAction: <button>Nova configuração</button>,
    });
    expect(screen.getByRole("button", { name: "Nova configuração" })).toBeInTheDocument();
  });

  it("emptyAction NÃO aparece nos outros estados", () => {
    for (const state of ["loading", "error", "offline", "loaded"] as LoadState[]) {
      const { unmount } = renderWrapper({
        state,
        emptyAction: <button>CTA do vazio</button>,
      }, "pt");
      expect(screen.queryByRole("button", { name: "CTA do vazio" })).not.toBeInTheDocument();
      unmount();
    }
  });
});

describe("partialMessage", () => {
  it("substitui a mensagem genérica", () => {
    renderWrapper({
      state: "partial",
      partialMessage: "Sincronização parcial — exibindo 12/30 reservas",
    });
    expect(screen.getByText("Sincronização parcial — exibindo 12/30 reservas")).toBeInTheDocument();
  });

  it("aceita contagem interpolada — o motivo do slot existir", () => {
    // Duas páginas interpolam contagem ao vivo; a mensagem genérica perderia
    // a informação. Ver lib/data e §14.5.
    const exibindo = 12;
    const total = 30;
    renderWrapper({
      state: "partial",
      partialMessage: <>exibindo {exibindo} de {total} ocorrências</>,
    });
    expect(screen.getByText(/exibindo 12 de 30 ocorrências/)).toBeInTheDocument();
  });

  it("NÃO aparece quando o estado não é partial", () => {
    renderWrapper({ state: "loaded", partialMessage: "mensagem parcial" });
    expect(screen.queryByText("mensagem parcial")).not.toBeInTheDocument();
  });

  it("o conteúdo da página continua visível junto do banner", () => {
    renderWrapper({ state: "partial", partialMessage: "parcial" });
    expect(screen.getByText("parcial")).toBeInTheDocument();
    expect(screen.getByText(CONTEUDO)).toBeInTheDocument();
  });
});

describe("i18n — nenhuma string dos 5 estados fica cravada", () => {
  it("as strings vêm do dicionário, não do componente", () => {
    // Se alguém recolar texto literal no wrapper, este teste continua
    // passando — mas o de baixo, que troca o idioma, não.
    renderWrapper({ state: "loading" });
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  it("trocar o idioma troca o texto dos estados", async () => {
    renderWrapper({ state: "error", onRetry: vi.fn() }, "en");
    // Se o texto estiver cravado em PT, isto falha — que é o ponto.
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try again/ })).toBeInTheDocument();
  });
});
