"use client";
import { useChatSessionStore } from "@/stores/chat-session-store";
import { useRankings } from "@/features/market/api-rankings";
import { AppShell, ShellStatus } from "@/features/shell/components/app-shell";
import { ShellOverlays } from "@/features/shell/components/shell-overlays";
import { useShellOverlays } from "@/features/shell/hooks/use-shell-overlays";
import { ChatThreads } from "@/features/chat/components/chat-threads";
import { ChatView } from "@/features/chat/components/chat-view";
import { useChatHotkeys } from "@/features/chat/hooks/use-chat-hotkeys";

/** The chat, in the same shell as the market: same sidebar, same header, same command palette. Only
 *  the sidebar panel (conversations instead of filters) and the content differ. */
export default function ChatPage() {
  const chatModelId = useChatSessionStore((state) => state.chatModelId);
  const { data: models = [] } = useRankings();
  const { helpOpen, openHelp, closeHelp } = useShellOverlays();

  useChatHotkeys();

  return (
    <AppShell
      title="Chat"
      meta={chatModelId ?? undefined}
      panel={<ChatThreads />}
      actions={<ShellStatus onHelpClick={openHelp} />}
      width="prose"
      // The chat owns its own vertical rhythm: the transcript scrolls, the composer stays put.
      padded={false}
    >
      <ChatView models={models} />
      <ShellOverlays helpOpen={helpOpen} onCloseHelp={closeHelp} />
    </AppShell>
  );
}
