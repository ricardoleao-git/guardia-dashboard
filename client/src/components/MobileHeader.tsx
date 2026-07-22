import { Menu, ShieldCheck } from "lucide-react";

interface MobileHeaderProps {
  onMenuClick: () => void;
}

/**
 * Header compacto para mobile com botão hamburger.
 * Visível apenas abaixo de lg (1024px).
 */
export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-sidebar text-white lg:hidden sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <h1 className="font-display text-base font-bold tracking-tight">
          Guard<span className="text-primary">IA</span>
        </h1>
      </div>
      <button
        onClick={onMenuClick}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-sidebar-accent/50 transition-colors active:scale-95"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>
    </div>
  );
}
