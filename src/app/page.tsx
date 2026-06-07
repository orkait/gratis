"use client";
import { useState } from "react";
import { useUIStore } from "@/lib/stores/ui-store";
import { useChatSessionStore } from "@/lib/stores/chat-session-store";
import { useRankings } from "@/lib/query/rankings";
import { useGlobalHotkeys } from "@/lib/use-global-hotkeys";
import { ChatSidebar } from "@/components/app/chat-sidebar";
import { ChatView } from "@/components/app/chat-view";
import { CommandPalette } from "@/components/app/command-palette";
import { HelpSheet } from "@/components/app/help-sheet";

export default function Page() {
  const { setCmdk, cmdkOpen } = useUIStore();
  const { startNewChat } = useChatSessionStore();
  const { data: models = [] } = useRankings();
  const [helpOpen, setHelpOpen] = useState(false);

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
      <ChatSidebar />
      <ChatView models={models} />
      <CommandPalette models={models} />
      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
