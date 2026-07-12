import type { UIMessage } from "ai";
import type { ChatMessage } from "./chat-db";

/** Translation between the AI SDK's UIMessage (parts, ids, tool calls) and the flat {role, content}
 *  shape that IndexedDB stores. Pure, so it can be reasoned about without a chat in flight. */

export type ChatRole = ChatMessage["role"];

const PERSISTED_ROLES: readonly ChatRole[] = ["user", "assistant"];

const SEED_ID_PREFIX = "seed-";

function isPersistedRole(role: UIMessage["role"]): role is ChatRole {
  return (PERSISTED_ROLES as readonly string[]).includes(role);
}

/** The text of a message, ignoring non-text parts. */
export function messageText(message: UIMessage): string {
  return message.parts.map((part) => (part.type === "text" ? part.text : "")).join("");
}

/** Only user/assistant turns with text survive: a system prompt or an empty streaming shell is not
 *  conversation history. */
export function toChatMessages(messages: readonly UIMessage[]): ChatMessage[] {
  const persisted: ChatMessage[] = [];
  for (const message of messages) {
    if (!isPersistedRole(message.role)) continue;
    const content = messageText(message);
    if (content.length === 0) continue;
    persisted.push({ role: message.role, content });
  }
  return persisted;
}

/** Seeds a restored thread back into the chat. Ids are positional and stable for the life of the
 *  seed, which is all React needs for keys. */
export function toUIMessages(messages: readonly ChatMessage[]): UIMessage[] {
  return messages.map((message, index) => ({
    id: `${SEED_ID_PREFIX}${index}`,
    role: message.role,
    parts: [{ type: "text", text: message.content }],
  }));
}
