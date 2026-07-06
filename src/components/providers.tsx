"use client";
import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Tooltip } from "@base-ui-components/react/tooltip";
import { makeQueryClient } from "@/lib/query/client";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <Tooltip.Provider delay={150} closeDelay={0}>{children}</Tooltip.Provider>
    </QueryClientProvider>
  );
}
