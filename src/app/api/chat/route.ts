import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Server-side backend URL. Falls back to the public one (same host in dev).
const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const gratis = createOpenAICompatible({
  name: "gratis",
  baseURL: `${BACKEND}/v1`,
  // backend injects provider keys server-side; any non-empty key satisfies the client.
  apiKey: "local",
});

type ChatRequest = { messages: UIMessage[]; model?: string };

export async function POST(req: Request) {
  const { messages, model }: ChatRequest = await req.json();
  const result = streamText({
    model: gratis(model || "gratis-auto"),
    messages: await convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
}
