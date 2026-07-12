"use client";
import { useCallback } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const DARK = "dark";
const LIGHT = "light";

/** The icon is chosen by CSS, not by React.
 *
 * The obvious implementation (`resolvedTheme === "dark" ? <Sun/> : <Moon/>`) cannot render correctly
 * on the server, which does not know the visitor's OS preference. That forces a `mounted` flag, a
 * setState-in-effect, and a frame of the wrong icon. Rendering both and letting the `dark:` variant
 * hide one is correct on first paint with no state at all.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = useCallback(() => {
    setTheme(resolvedTheme === DARK ? LIGHT : DARK);
  }, [resolvedTheme, setTheme]);

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      <Moon className="w-3.5 h-3.5 dark:hidden" />
      <Sun className="w-3.5 h-3.5 hidden dark:block" />
    </Button>
  );
}
