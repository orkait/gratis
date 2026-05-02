"use client";
import { useState } from "react";
import { X, Copy, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProviderAvatar } from "@/components/ui/provider-avatar";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import type { ModelStats } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export function DetailDrawer({ models }: { models: ModelStats[] }) {
  const { drawerModelId, closeDrawer, startNewChat } = useStore();
  const router = useRouter();
  const open = drawerModelId !== null;
  const model = models.find((m) => m.id === drawerModelId);

  if (!open || !model) return null;

  return (
    <Sheet open={open} onOpenChange={(v: boolean) => !v && closeDrawer()}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center gap-2.5 min-w-0">
            <ProviderAvatar provider={model.provider} size="md" />
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="text-[14px] font-semibold truncate">{model.id}</div>
              <div className="text-[11px] text-(--color-fg-muted)">{model.provider}</div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={closeDrawer} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </SheetHeader>

        <SheetBody>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Tier" value={model.is_free ? <Badge variant="success">FREE</Badge> : <Badge>PAID</Badge>} />
                <Stat label="Score" value={<span className="font-mono text-(--color-accent) text-[14px] font-semibold">{model.balanced.toFixed(1)}</span>} />
                <Stat label="Params" value={`${model.params}B`} />
                <Stat label="Context" value={`${(model.ctx / 1000).toFixed(0)}K`} />
                <Stat label="TPS" value={model.tps != null ? model.tps.toFixed(1) : "-"} />
                <Stat label="Uptime" value={model.uptime != null ? `${model.uptime.toFixed(2)}%` : "-"} />
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {model.brain && <Badge variant="accent">Reasoning</Badge>}
                {model.tools && <Badge variant="info">Tool calling</Badge>}
                {model.open && <Badge>Open weights</Badge>}
              </div>
            </TabsContent>

            <TabsContent value="code">
              <CodeBlock label="cURL" code={`curl ${API_BASE}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${model.id}","messages":[{"role":"user","content":"hi"}]}'`} />
              <CodeBlock label="Python" code={`from openai import OpenAI
client = OpenAI(base_url="${API_BASE}/v1", api_key="any")
r = client.chat.completions.create(
  model="${model.id}",
  messages=[{"role": "user", "content": "hi"}],
)
print(r.choices[0].message.content)`} />
            </TabsContent>

            <TabsContent value="metrics">
              <div className="text-[13px] text-(--color-fg-muted) leading-relaxed">
                Provider: <span className="text-(--color-fg)">{model.provider}</span><br/>
                Capability score: <span className="font-mono text-(--color-fg)">{model.capability.toFixed(2)}</span><br/>
                Value index: <span className="font-mono text-(--color-fg)">{model.value.toLocaleString()}</span>
              </div>
            </TabsContent>
          </Tabs>
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" onClick={closeDrawer}>Close</Button>
          <Button onClick={() => { startNewChat(model.id); closeDrawer(); router.push("/"); }}>
            <ExternalLink className="w-3.5 h-3.5" /> Open in chat
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-(--color-surface-2) px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold">{label}</div>
      <div className="mt-1 text-[13px] text-(--color-fg)">{value}</div>
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
        <span className="text-[10px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold">{label}</span>
        <Button variant="ghost" size="sm" onClick={onCopy}>
          <Copy className="w-3 h-3" /> {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="rounded-md bg-(--color-surface-2) border border-(--color-border) p-3 overflow-x-auto text-[12px] font-mono text-(--color-fg) leading-relaxed">{code}</pre>
    </div>
  );
}
