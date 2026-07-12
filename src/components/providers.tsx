"use client";
import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Tooltip } from "@base-ui-components/react/tooltip";
import { ThemeProvider } from "next-themes";
import { makeQueryClient } from "@/lib/query/client";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    // next-themes owns the theme: system default, persistence, and the pre-paint no-flash script.
    // attribute="data-theme" matches the [data-theme="dark"] selector in globals.css.
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <Tooltip.Provider delay={150} closeDelay={0}>{children}</Tooltip.Provider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
