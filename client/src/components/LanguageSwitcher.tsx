/**
 * LanguageSwitcher — Botão flutuante + dropdown para alternar idioma PT/EN/ZH.
 * 
 * Modo "floating": FAB fixo no canto inferior esquerdo, sempre visível,
 * com bandeira grande e tooltip. Ideal para demonstração.
 * Modo "inline": dropdown compacto no header.
 */
import { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown, Languages } from "lucide-react";
import { useI18n, Language } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";

const languages: { code: Language; label: string; shortLabel: string; flag: string }[] = [
  { code: "pt", label: "Português", shortLabel: "PT", flag: "🇧🇷" },
  { code: "en", label: "English", shortLabel: "EN", flag: "🇺🇸" },
  { code: "zh", label: "中文", shortLabel: "中", flag: "🇨🇳" },
];

interface LanguageSwitcherProps {
  variant?: "inline" | "floating";
}

export default function LanguageSwitcher({ variant = "inline" }: LanguageSwitcherProps) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = languages.find(l => l.code === lang) || languages[0];

  // ===== Floating FAB mode =====
  if (variant === "floating") {
    return (
      <div ref={ref} className="fixed bottom-5 left-5 z-[100]">
        {/* Tooltip when closed */}
        {!open && (
          <div className="absolute bottom-14 left-0 whitespace-nowrap rounded-lg bg-card/95 backdrop-blur-sm border border-border px-3 py-1.5 text-xs text-muted-foreground shadow-lg animate-in fade-in duration-200">
            {current.label} — Click to switch language
            <div className="absolute -bottom-1 left-4 h-2 w-2 rotate-45 bg-card border-r border-b border-border" />
          </div>
        )}

        {/* FAB button */}
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-2xl transition-all duration-200 active:scale-95",
            open
              ? "border-primary bg-primary/10 rotate-180"
              : "border-border bg-card/95 backdrop-blur-xl hover:border-primary/50"
          )}
          aria-label="Switch language"
        >
          <span className="text-2xl">{current.flag}</span>
        </button>

        {/* Language options — expand upward */}
        {open && (
          <div
            className="absolute bottom-16 left-0 flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200"
            style={{ animation: "slideInRight 0.2s cubic-bezier(0.23, 1, 0.32, 1)" }}
          >
            {languages.map(l => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setOpen(false); }}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border bg-card/95 backdrop-blur-xl px-3 py-2.5 shadow-lg transition-all duration-150 active:scale-95",
                  lang === l.code
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/40"
                )}
              >
                <span className="text-xl">{l.flag}</span>
                <div className="text-left">
                  <p className={cn("text-xs font-bold", lang === l.code ? "text-primary" : "text-foreground")}>
                    {l.shortLabel}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{l.label}</p>
                </div>
                {lang === l.code && <Check className="h-3.5 w-3.5 text-primary ml-1" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ===== Inline dropdown mode (header) =====
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{current.flag}</span>
        <span className="hidden md:inline">{current.label}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          {languages.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors",
                lang === l.code ? "bg-primary/10 text-primary" : "text-popover-foreground hover:bg-accent"
              )}
            >
              <span className="text-base">{l.flag}</span>
              <span className="flex-1 text-left">{l.label}</span>
              {lang === l.code && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
