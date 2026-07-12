"use client";
import { useCallback } from "react";
import { useState } from "react";
import { X, Copy, ExternalLink } from "lucide-react";
import { Dialog } from "@base-ui-components/react/dialog";
import { Tabs } from "@base-ui-components/react/tabs";
import { ProviderAvatar } from "@/components/ui/provider-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUIStore } from "@/stores/ui-store";
import type { ModelStats } from "@/types/model";
import { cn } from "@/lib/utils";
import { API_BASE_URL, BACKEND_ENDPOINTS } from "@/config/api";
import { useOpenChat } from "../hooks/use-open-chat";



export function DetailDrawer({ models }: { models: ModelStats[] }) {
  const { drawerModelId, closeDrawer } = useUIStore();
  const openChat = useOpenChat();
  const open = drawerModelId !== null;
  const model = models.find((m) => m.id === drawerModelId);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) closeDrawer();
    },
    [closeDrawer],
  );

  const handleOpenInChat = useCallback(() => {
    if (!model) return;
    closeDrawer();
    openChat(model.id);
  }, [model, closeDrawer, openChat]);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-(--z-modal-backdrop) bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup className="fixed right-0 top-0 z-(--z-modal) flex h-dvh w-full max-w-[440px] flex-col bg-(--color-surface-1) border-l border-(--color-border) shadow-[0_0_60px_rgb(0_0_0_/_0.45)] transition-transform duration-250 ease-out data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full motion-reduce:transition-none focus:outline-none">
          {model && (
            <>
              <header className="flex items-center justify-between gap-2 px-5 py-4 border-b border-(--color-border) shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ProviderAvatar provider={model.provider} size="md" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <Dialog.Title className="text-base font-semibold truncate">{model.id}</Dialog.Title>
                    <Dialog.Description className="text-xs text-(--color-fg-muted)">{model.provider}</Dialog.Description>
                  </div>
                </div>
                <Dialog.Close render={<Button variant="ghost" size="icon" aria-label="Close"><X className="w-4 h-4" /></Button>} />
              </header>

              <div className="flex-1 overflow-y-auto p-5">
                <Tabs.Root defaultValue="overview">
                  <Tabs.List className="flex gap-0.5 p-0.5 mb-4 rounded-md border border-(--color-border) bg-(--color-surface-2) w-fit">
                    {["overview", "code", "metrics"].map((t) => (
                      <Tabs.Tab
                        key={t}
                        value={t}
                        className={cn(
                          "h-7 px-3 rounded text-sm capitalize cursor-pointer transition-colors duration-150",
                          "text-(--color-fg-subtle) hover:text-(--color-fg)",
                          "data-[active]:bg-(--color-surface-1) data-[active]:text-(--color-accent) data-[active]:shadow-sm",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)/40",
                        )}
                      >
                        {t}
                      </Tabs.Tab>
                    ))}
                  </Tabs.List>

                  <Tabs.Panel value="overview" className="focus:outline-none">
                    <div className="grid grid-cols-2 gap-3">
                      <Stat label="Tier" value={model.is_free ? <Badge variant="success">FREE</Badge> : <Badge>PAID</Badge>} />
                      <Stat label="Overall" value={<span className="font-mono text-(--color-accent) text-base font-semibold">{(model.scores?.overall ?? model.balanced).toFixed(1)}</span>} />
                      <Stat label="Intelligence" value={model.scores?.intelligence != null ? model.scores.intelligence.toFixed(0) : "-"} />
                      <Stat label="Confidence" value={model.confidence ?? "-"} />
                      <Stat label="Context" value={`${(model.ctx / 1000).toFixed(0)}K`} />
                      <Stat label="TPS" value={model.tps != null ? model.tps.toFixed(1) : "-"} />
                    </div>
                    {model.arena_elo != null && (
                      <div className="mt-3 rounded-md bg-(--color-surface-2) px-3 py-2.5 text-sm text-(--color-fg-muted)">
                        Human preference (LMArena Elo): <span className="font-mono text-(--color-fg)">{model.arena_elo}</span>
                        {model.divergence === "human-favored" && <span className="text-(--color-success)"> · humans rate it above its benchmarks</span>}
                        {model.divergence === "bench-favored" && <span className="text-(--color-warning)"> · benchmarks rate it above human preference</span>}
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {model.brain && <Badge variant="accent">Reasoning</Badge>}
                      {model.tools && <Badge variant="info">Tool calling</Badge>}
                      {model.open && <Badge>Open weights</Badge>}
                      {(model.badges ?? []).map((b) => <Badge key={b}>{b}</Badge>)}
                    </div>
                  </Tabs.Panel>

                  <Tabs.Panel value="code" className="focus:outline-none">
                    <CodeBlock label="cURL" code={`curl ${API_BASE_URL}${BACKEND_ENDPOINTS.chatCompletions} \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${model.id}","messages":[{"role":"user","content":"hi"}]}'`} />
                    <CodeBlock label="Python" code={`from openai import OpenAI
client = OpenAI(base_url="${API_BASE_URL}/v1", api_key="any")
r = client.chat.completions.create(
  model="${model.id}",
  messages=[{"role": "user", "content": "hi"}],
)
print(r.choices[0].message.content)`} />
                  </Tabs.Panel>

                  <Tabs.Panel value="metrics" className="focus:outline-none">
                    <div className="text-sm text-(--color-fg-muted) leading-relaxed">
                      Provider: <span className="text-(--color-fg)">{model.provider}</span><br />
                      Benchmarks used: <span className="font-mono text-(--color-fg)">{model.bench_count ?? 0}</span><br />
                      Cross-benchmark agreement: <span className="font-mono text-(--color-fg)">{model.consensus != null ? `${model.consensus.toFixed(0)}%` : "-"}</span><br />
                      Value index: <span className="font-mono text-(--color-fg)">{model.value.toLocaleString()}</span>
                    </div>
                  </Tabs.Panel>
                </Tabs.Root>
              </div>

              <footer className="border-t border-(--color-border) px-5 py-4 flex gap-2 justify-end shrink-0">
                <Dialog.Close render={<Button variant="outline">Close</Button>} />
                <Button onClick={handleOpenInChat}>
                  <ExternalLink className="w-3.5 h-3.5" /> Open in chat
                </Button>
              </footer>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-(--color-surface-2) px-3 py-2.5">
      <div className="text-xs uppercase tracking-wider text-(--color-fg-subtle) font-semibold">{label}</div>
      <div className="mt-1 text-sm text-(--color-fg)">{value}</div>
    </div>
  );
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs uppercase tracking-wider text-(--color-fg-subtle) font-semibold">{label}</span>
        <Button variant="ghost" size="sm" onClick={onCopy}>
          <Copy className="w-3 h-3" /> {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="rounded-md bg-(--color-surface-2) border border-(--color-border) p-3 overflow-x-auto text-sm font-mono text-(--color-fg) leading-relaxed">{code}</pre>
    </div>
  );
}
