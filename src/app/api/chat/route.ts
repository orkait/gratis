import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Server-side backend URL. Falls back to the public one (same host in dev).
const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3460";

type ChatRequest = { messages: UIMessage[]; model?: string };

/** Built per request: the caller's BYOK key rides in a header and must never be captured into a
 * module-level client shared across users. Nothing here is logged or stored. */
function client(providerKey: string | null, cfAccountId: string | null) {
  return createOpenAICompatible({
    name: "gratis",
    baseURL: `${BACKEND}/v1`,
    // The backend authenticates providers, not us; any non-empty key satisfies this client.
    apiKey: "local",
    headers: {
      ...(providerKey ? { "X-Provider-Key": providerKey } : {}),
      ...(cfAccountId ? { "X-CF-Account-Id": cfAccountId } : {}),
    },
  });
}

export async function POST(req: Request) {
  const { messages, model }: ChatRequest = await req.json();
  const gratis = client(req.headers.get("X-Provider-Key"), req.headers.get("X-CF-Account-Id"));
  const result = streamText({
    model: gratis(model || "gratis-auto"),
    messages: await convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
}
