import { describe, it, expect } from "vitest";
import { encryptSecrets, decryptSecrets, providerForModel, type VaultBlob } from "./vault";

const SECRETS = { groq: "gsk_live_supersecret", openrouter: "sk-or-v1-abc" };
const PASS = "correct horse battery staple";

describe("vault crypto", () => {
  it("round-trips secrets", async () => {
    const blob = await encryptSecrets(SECRETS, PASS);
    expect(await decryptSecrets(blob, PASS)).toEqual(SECRETS);
  });

  it("rejects a wrong passphrase", async () => {
    const blob = await encryptSecrets(SECRETS, PASS);
    await expect(decryptSecrets(blob, "wrong")).rejects.toThrow();
  });

  it("never leaves the plaintext key in the stored blob", async () => {
    const blob = await encryptSecrets(SECRETS, PASS);
    const serialized = JSON.stringify(blob);
    expect(serialized).not.toContain("gsk_live_supersecret");
    expect(serialized).not.toContain("sk-or-v1-abc");
    expect(serialized).not.toContain(PASS);
  });

  it("uses a fresh salt and IV on every write", async () => {
    const a = await encryptSecrets(SECRETS, PASS);
    const b = await encryptSecrets(SECRETS, PASS);
    // Reusing an AES-GCM IV under one key leaks plaintext. Same input must not give the same blob.
    expect(a.iv).not.toEqual(b.iv);
    expect(a.salt).not.toEqual(b.salt);
    expect(a.ct).not.toEqual(b.ct);
  });

  it("detects tampering with the ciphertext", async () => {
    const blob = await encryptSecrets(SECRETS, PASS);
    const tampered: VaultBlob = { ...blob, ct: [...blob.ct] };
    tampered.ct[0] ^= 0xff;
    await expect(decryptSecrets(tampered, PASS)).rejects.toThrow();
  });
});

describe("providerForModel", () => {
  it.each([
    ["groq/llama-3.3-70b-versatile", "groq"],
    ["cloudflare/@cf/openai/gpt-oss-120b", "cloudflare"],
    ["aistudio/gemini-2.5-flash", "aistudio"],
    ["cerebras/gemma-4-31b", "cerebras"],
    ["ollama/qwen3", "ollama"],
    ["openrouter/anthropic/claude-3-opus", "openrouter"],
    ["some/unprefixed-model", "openrouter"],
  ])("%s -> %s", (id, provider) => {
    expect(providerForModel(id)).toBe(provider);
  });
});
