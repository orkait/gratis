import { describe, it, expect } from "vitest";
import { providerForModel as registryProviderForModel } from "@/config/providers";
import { DATABASES } from "@/config/storage";
import {
  encryptSecrets,
  decryptSecrets,
  accountIdKey,
  pruneEmptySecrets,
  providerForModel,
  type Secrets,
  type VaultBlob,
} from "./vault";
import { VAULT_FIELDS } from "./vault-fields";

const SECRETS: Secrets = { groq: "gsk_live_supersecret", openrouter: "sk-or-v1-abc" };
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

describe("secret keys", () => {
  it("routes a model to a provider with the registry's one implementation", () => {
    // Re-export, not a second copy: two copies of this mapping is two chances to send a key to the
    // wrong provider. The routing cases themselves are covered in config.test.ts.
    expect(providerForModel).toBe(registryProviderForModel);
  });

  it("keeps the account-id key the backend and existing vaults already use", () => {
    // Users have this exact key encrypted on disk; renaming it silently drops their account id.
    expect(accountIdKey("cloudflare")).toBe("cloudflare_account_id");
  });

  it("stores keys in a database of its own, so wiping keys never wipes chats", () => {
    expect(DATABASES.vault.name).not.toBe(DATABASES.chat.name);
  });
});

describe("vault fields", () => {
  it("offers a field for every provider in the registry", () => {
    for (const id of ["groq", "openrouter", "cerebras", "aistudio", "ollama", "cloudflare"]) {
      expect(VAULT_FIELDS.some((field) => field.key === id)).toBe(true);
    }
  });

  it("offers the second credential only where the registry asks for one", () => {
    const accountFields = VAULT_FIELDS.filter((field) => field.key.endsWith("_account_id"));
    expect(accountFields.map((field) => field.key)).toEqual(["cloudflare_account_id"]);
  });
});

describe("pruneEmptySecrets", () => {
  it("drops blank fields so an empty key is never stored or sent", () => {
    const pruned = pruneEmptySecrets({ groq: "gsk_x", openrouter: "", cerebras: "   " });
    expect(pruned).toEqual({ groq: "gsk_x" });
  });

  it("keeps every filled field untouched", () => {
    expect(pruneEmptySecrets(SECRETS)).toEqual(SECRETS);
  });
});
