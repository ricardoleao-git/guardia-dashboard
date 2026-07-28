/**
 * PageStateWrapper — os 5 estados obrigatórios do CORE-03 §7:
 * Carregando, Vazio, Erro, Connector offline, Sincronização parcial.
 *
 * Uso: envolva o conteúdo da página. Nenhuma página deve declarar um
 * `type PageState` local nem recolar os blocos de JSX — foi assim que 13
 * páginas acabaram com os 5 estados em português cravado (§14.5).
 *
 *     <PageStateWrapper state={pageState} onRetry={retry}>
 *       ...conteúdo...
 *     </PageStateWrapper>
 *
 * Todas as strings fixas passam por `t()` com chaves `state.*` nos três
 * idiomas (PT/EN/ZH). O estado **vazio** aceita título e descrição próprios,
 * porque o CORE-03 §7 pede CTA específico ali ("Adicione o primeiro
 * dispositivo") — o chamador resolve com `t()` antes de passar.
 */
import { ReactNode } from "react";
import { Loader2, AlertTriangle, WifiOff, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";

export type LoadState = "loading" | "loaded" | "empty" | "error" | "offline" | "partial";

interface PageStateWrapperProps {
  state: LoadState;
  /** Título do estado vazio. Já resolvido via `t()` pelo chamador. */
  emptyTitle?: string;
  /** Descrição do estado vazio. Já resolvida via `t()` pelo chamador. */
  emptyDescription?: string;
  /**
   * CTA do estado vazio — o CORE-03 §7 pede "empty state com CTA"
   * ("Adicione o primeiro dispositivo"). Opcional: páginas sem ação
   * cabível simplesmente não passam.
   */
  emptyAction?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
}

export function PageStateWrapper({
  state,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onRetry,
  children,
}: PageStateWrapperProps) {
  const { t } = useI18n();

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t("state.loading")}</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">{t("state.error_title")}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t("state.error_desc")}</p>
        </div>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" /> {t("state.retry")}
          </Button>
        )}
      </div>
    );
  }

  if (state === "offline") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <WifiOff className="h-12 w-12 text-zinc-400" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">{t("state.offline_title")}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t("state.offline_desc")}</p>
        </div>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" /> {t("state.reconnect")}
          </Button>
        )}
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Inbox className="h-12 w-12 text-zinc-400" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">{emptyTitle ?? t("state.empty_title")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {emptyDescription ?? t("state.empty_desc")}
          </p>
        </div>
        {emptyAction}
      </div>
    );
  }

  // "loaded" ou "partial" — renderiza o conteúdo; "partial" ganha o banner.
  return (
    <>
      {state === "partial" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-400 mb-4">
          <AlertTriangle className="h-4 w-4" />
          {t("state.partial")}
        </div>
      )}
      {children}
    </>
  );
}
