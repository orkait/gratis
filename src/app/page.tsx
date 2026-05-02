"use client";
import { useState } from "react";
import useSWR from "swr";
import axios from "axios";
import { useStore } from "@/lib/store";
import { useGlobalHotkeys } from "@/lib/use-global-hotkeys";
import { ChatSidebar } from "@/components/app/chat-sidebar";
import { ChatView } from "@/components/app/chat-view";
import { CommandPalette } from "@/components/app/command-palette";
import { HelpSheet } from "@/components/app/help-sheet";
import type { ModelStats } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const fetcher = async (url: string) => (await axios.get<ModelStats[]>(url)).data;

export default function Page() {
  const { setCmdk, cmdkOpen, startNewChat } = useStore();
  const { data: models = [] } = useSWR(`${API_BASE}/v1/rankings`, fetcher, { revalidateOnFocus: false });
  const [helpOpen, setHelpOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshThreads = () => setRefreshKey((k) => k + 1);

  useGlobalHotkeys({
    "cmdk.toggle": () => setCmdk(!cmdkOpen),
    "search.focus": () => {
      const el = document.querySelector<HTMLInputElement>('aside input[placeholder="Search chats..."]');
      el?.focus();
    },
    "chat.new": () => startNewChat(),
    "overlay.close": () => {
      if (cmdkOpen) setCmdk(false);
      else if (helpOpen) setHelpOpen(false);
    },
    "help.toggle": () => setHelpOpen((v) => !v),
  });

  return (
    <div className="flex min-h-dvh bg-(--color-bg) text-(--color-fg)">
      <ChatSidebar refreshKey={refreshKey} />
      <ChatView models={models} onThreadChange={refreshThreads} />
      <CommandPalette models={models} />
      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
