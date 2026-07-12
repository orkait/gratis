/** Local token vault.
 *
 * Honest threat model. This protects your provider keys at rest: a stolen laptop, a shared machine,
 * someone opening DevTools and reading IndexedDB. It is NOT authentication - there is no server to
 * authenticate against, and anyone holding the device can read the ciphertext and attack it offline.
 * The passphrase is what stands between them and the keys, so its strength is the whole game.
 *
 * Once unlocked, keys live in memory and travel in request headers. Nothing can hide them from an
 * XSS on this origin - not encryption, not WASM. Keep the CSP tight; that is the real defence there.
 *
 * PBKDF2-SHA256 at 600k iterations (OWASP 2023 floor) -> AES-GCM-256. All native WebCrypto.
 */

import type { ProviderId } from "@/config/providers";

/** Which provider's key a model needs. The one implementation lives in the provider registry; the
 *  re-export keeps vault callers from having to know where the registry sits. */
export { providerForModel } from "@/config/providers";

const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12; // AES-GCM standard
const VAULT_VERSION = 1;

/** The second credential some providers need. Derived from the provider id so the stored key and
 *  the registry cannot drift. Changing this suffix orphans the value in every existing vault. */
const ACCOUNT_ID_SUFFIX = "_account_id";

export type AccountIdKey = `${ProviderId}${typeof ACCOUNT_ID_SUFFIX}`;

/** Everything the vault can hold: one key per provider, plus an account id for the providers that
 *  need one. A typo can no longer create a secret nothing will ever read. */
export type SecretKey = ProviderId | AccountIdKey;

export type Secrets = Partial<Record<SecretKey, string>>;

export type VaultBlob = {
  v: number;
  salt: number[];
  iv: number[];
  ct: number[];
};

export function accountIdKey(provider: ProviderId): AccountIdKey {
  return `${provider}${ACCOUNT_ID_SUFFIX}`;
}

/** A blank field means "not set", never "set to empty": an empty key must not be written to the
 *  vault, and must not be sent as a request header. */
export function pruneEmptySecrets(draft: Secrets): Secrets {
  const kept: Secrets = {};
  for (const [key, value] of Object.entries(draft) as [SecretKey, string | undefined][]) {
    if (value?.trim()) kept[key] = value;
  }
  return kept;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptSecrets(secrets: Secrets, passphrase: string): Promise<VaultBlob> {
  // Fresh salt and IV every write. Reusing an AES-GCM IV under the same key is catastrophic.
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(JSON.stringify(secrets)),
  );
  return { v: VAULT_VERSION, salt: [...salt], iv: [...iv], ct: [...new Uint8Array(ct)] };
}

/** Throws on a wrong passphrase: AES-GCM authenticates, so tampering and bad keys both fail here. */
export async function decryptSecrets(blob: VaultBlob, passphrase: string): Promise<Secrets> {
  const key = await deriveKey(passphrase, new Uint8Array(blob.salt));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(blob.iv) as BufferSource },
    key,
    new Uint8Array(blob.ct) as BufferSource,
  );
  return JSON.parse(new TextDecoder().decode(plain)) as Secrets;
}
