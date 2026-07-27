/**
 * PageStateWrapper — CORE-03 §7: 5 estados obrigatórios
 * Carregando, Vazio, Erro, Connector offline, Sincronização parcial
 * Uso: envolva o conteúdo da página com este componente
 */
import { ReactNode } from "react";
import { Loader2, AlertTriangle, WifiOff, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export type LoadState = "loading" | "loaded" | "empty" | "error" | "offline" | "partial";

interface PageStateWrapperProps {
  state: LoadState;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  children: ReactNode;
}

export function PageStateWrapper({
  state,
  emptyTitle = "Nenhum dado encontrado",
  emptyDescription = "Não há registros para exibir no momento.",
  onRetry,
  children,
}: PageStateWrapperProps) {
  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <div className="text-center">
          <h3 className="text-lg font-semibold">Erro ao carregar dados</h3>
          <p className="text-sm text-muted-foreground mt-1">Não foi possível conectar ao servidor.</p>
        </div>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
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
          <h3 className="text-lg font-semibold">Connector offline</h3>
          <p className="text-sm text-muted-foreground mt-1">O servidor GuardIA não está respondendo.</p>
        </div>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" /> Reconectar
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
          <h3 className="text-lg font-semibold">{emptyTitle}</h3>
          <p className="text-sm text-muted-foreground mt-1">{emptyDescription}</p>
        </div>
      </div>
    );
  }

  // "loaded" or "partial" — render children, with optional banner for partial
  return (
    <>
      {state === "partial" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-400 mb-4">
          <AlertTriangle className="h-4 w-4" />
          Sincronização parcial — alguns dados podem estar incompletos.
        </div>
      )}
      {children}
    </>
  );
}
