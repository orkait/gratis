"use client";
import { useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, LayoutGrid, MessageSquare, Archive, KeyRound, Search, HelpCircle } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { useUIStore } from "@/stores/ui-store";
import { Kbd } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "./theme-toggle";
import { ErrorBoundary } from "./error-boundary";
import { cn } from "@/lib/utils";

/** ONE shell for every surface.
 *
 * The market and the chat used to be two different applications sharing a name: each had its own
 * sidebar, its own logo block and its own header, and the chat was a centred editorial page while
 * the market was a dense dashboard. Same chrome everywhere now; only the sidebar `panel` and the
 * content differ per route.
 */

const NAV = [
  { href: ROUTES.market, label: "Market", icon: LayoutGrid },
  { href: ROUTES.chat, label: "Chat", icon: MessageSquare },
  { href: ROUTES.archive, label: "Archive", icon: Archive },
  { href: ROUTES.settings, label: "API keys", icon: KeyRound },
] as const;

export type ShellWidth = "market" | "prose" | "full";

const WIDTH_CLASS: Record<ShellWidth, string> = {
  market: "max-w-(--width-market)",
  prose: "max-w-(--width-prose)",
  full: "",
};

export function AppShell({
  title,
  meta,
  panel,
  actions,
  width = "market",
  padded = true,
  children,
}: {
  title: string;
  meta?: string;
  panel?: React.ReactNode;
  actions?: React.ReactNode;
  width?: ShellWidth;
  padded?: boolean;
  children: React.ReactNode;
}) {
  const { sidebarWidth, setCmdk } = useUIStore();
  const pathname = usePathname();

  const openCmdk = useCallback(() => setCmdk(true), [setCmdk]);

  return (
    <div className="flex min-h-dvh bg-(--color-bg) text-(--color-fg)">
      <aside
        style={{ width: sidebarWidth }}
        className="shrink-0 h-dvh sticky top-0 bg-(--color-bg) border-r border-(--color-border) flex flex-col"
      >
        <div className="h-12 flex items-center gap-2 px-4 border-b border-(--color-border)">
          <div className="w-6 h-6 rounded-md bg-(--color-accent) flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-(--color-accent-fg)" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold tracking-tight">Gratis</span>
        </div>

        <nav className="p-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "h-8 px-3 rounded-md flex items-center gap-2 text-sm transition-colors duration-120",
                  active
                    ? "bg-(--color-accent-soft) text-(--color-accent) font-medium"
                    : "text-(--color-fg-muted) hover:bg-(--color-surface-1) hover:text-(--color-fg)",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>

        {panel ? (
          <>
            <Separator />
            <div className="flex-1 overflow-auto min-h-0">{panel}</div>
          </>
        ) : (
          <div className="flex-1" />
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 sticky top-0 z-(--z-sticky) bg-(--color-bg)/80 backdrop-blur-md border-b border-(--color-border) flex items-center px-4 gap-4">
          <div className="flex items-baseline gap-2 shrink-0">
            <h1 className="text-base font-semibold tracking-tight">{title}</h1>
            {meta ? <span className="text-xs font-mono text-(--color-fg-subtle)">{meta}</span> : null}
          </div>

          <button
            type="button"
            onClick={openCmdk}
            className="flex-1 max-w-md mx-auto h-7 flex items-center gap-2 px-2.5 rounded-md bg-(--color-surface-1) border border-(--color-border) text-(--color-fg-subtle) hover:border-(--color-border-strong) transition-colors duration-120 cursor-pointer"
          >
            <Search className="w-3 h-3" />
            <span className="flex-1 text-left text-sm">Search models, providers, actions...</span>
            <Kbd>{"⌘"}</Kbd>
            <Kbd>K</Kbd>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            {actions}
            <ThemeToggle />
          </div>
        </header>

        <main className={cn("flex-1 min-h-0 flex flex-col", padded && "p-6")}>
          <div className={cn("mx-auto w-full flex-1 min-h-0 flex flex-col", WIDTH_CLASS[width])}>
            {/* Scoped to the CONTENT, not the whole app: a crashing surface must not take the nav
                and header with it, or the user has no way out except a reload. */}
            <ErrorBoundary surface={title.toLowerCase()}>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

/** Header slot: the live badge + help, shared by every surface that wants them. */
export function ShellStatus({ onHelpClick }: { onHelpClick: () => void }) {
  return (
    <>
      <div className="flex items-center gap-1.5 h-7 px-2 rounded-md bg-(--color-surface-1) border border-(--color-border)">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-(--color-success) opacity-60 animate-ping" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-(--color-success)" />
        </span>
        <span className="text-xs font-mono text-(--color-fg-muted)">live</span>
      </div>
      <Button variant="ghost" size="icon" onClick={onHelpClick} aria-label="Keyboard shortcuts">
        <HelpCircle className="w-3.5 h-3.5" />
      </Button>
    </>
  );
}
