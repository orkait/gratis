export type KeybindingId =
  | "cmdk.toggle"
  | "search.focus"
  | "chat.new"
  | "drawer.next"
  | "drawer.prev"
  | "overlay.close"
  | "help.toggle";

export type Keybinding = {
  id: KeybindingId;
  keys: string[];
  match: (e: KeyboardEvent) => boolean;
  description: string;
};

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const mod = (e: KeyboardEvent) => (isMac ? e.metaKey : e.ctrlKey);

function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
}

export const KEYBINDINGS: Keybinding[] = [
  {
    id: "cmdk.toggle",
    keys: [isMac ? "⌘" : "Ctrl", "K"],
    description: "Open command palette",
    match: (e) => mod(e) && e.key.toLowerCase() === "k",
  },
  {
    id: "search.focus",
    keys: ["/"],
    description: "Focus search",
    match: (e) => !isTypingTarget(e) && e.key === "/",
  },
  {
    id: "chat.new",
    keys: ["n"],
    description: "Chat with top model",
    match: (e) => !isTypingTarget(e) && e.key === "n" && !mod(e),
  },
  {
    id: "drawer.next",
    keys: ["j"],
    description: "Next model",
    match: (e) => !isTypingTarget(e) && e.key === "j" && !mod(e),
  },
  {
    id: "drawer.prev",
    keys: ["k"],
    description: "Previous model",
    match: (e) => !isTypingTarget(e) && e.key === "k" && !mod(e),
  },
  {
    id: "overlay.close",
    keys: ["Esc"],
    description: "Close overlay",
    match: (e) => e.key === "Escape",
  },
  {
    id: "help.toggle",
    keys: ["?"],
    description: "Toggle keybindings help",
    match: (e) => !isTypingTarget(e) && e.key === "?",
  },
];

export function findBinding(e: KeyboardEvent): Keybinding | null {
  return KEYBINDINGS.find((b) => b.match(e)) ?? null;
}
