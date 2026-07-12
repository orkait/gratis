// @vitest-environment jsdom
/** Its OWN file on purpose: chat-db caches its IndexedDB connection at module scope, so state leaks
 * between tests in a file and makes this order-dependent. Vitest isolates per file, which gives this
 * one a clean database and a clean module registry. */
import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import ChatsPage from "./page";
import { createThread, updateThread, listThreads, deleteThread } from "@/features/chat/lib/chat-db";
import { ROUTES } from "@/config/routes";
import { POOL_MODEL_ID } from "@/config/models";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => ROUTES.archive,
}));

// The tests share ONE IndexedDB (the module caches its connection), so state leaks between them and
// makes assertions order-dependent. Start every test from an empty archive.
beforeEach(async () => {
  for (const thread of await listThreads()) await deleteThread(thread.id);

  global.ResizeObserver ||= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  global.matchMedia ||= ((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  })) as unknown as typeof matchMedia;
});

afterEach(cleanup);

function renderArchive() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
      <QueryClientProvider client={client}>
        <ChatsPage />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe("archive resilience", () => {
  it("survives a legacy thread with no modelId instead of white-screening", async () => {
    // The bug: providerForModel(undefined) threw on `.startsWith`. React unmounted the entire tree
    // and the user got a blank page - which, showing only the raw background, reads as "the app
    // randomly switched to dark mode". One bad row in IndexedDB took down the whole application.
    const healthy = await createThread("groq/llama-3.3-70b-versatile");
    await updateThread(healthy.id, { messages: [] });

    // A record shaped like one written before `modelId` existed.
    const legacy = await createThread("groq/llama-3.3-70b-versatile");
    await updateThread(legacy.id, { modelId: undefined as unknown as string, messages: [] });

    renderArchive();

    // The legacy row is the proof: it renders as the normalized pool id instead of throwing.
    await waitFor(() => expect(document.body.textContent).toContain(POOL_MODEL_ID), { timeout: 3000 });

    const body = document.body.textContent ?? "";
    expect(body).toContain("groq/llama-3.3-70b-versatile"); // the healthy thread
    expect(body).toContain(POOL_MODEL_ID); // the legacy one, normalized rather than fatal
    expect(body).not.toContain("hit an error"); // the boundary never even had to catch it
  });
});
