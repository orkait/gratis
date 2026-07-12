import { openDB, type IDBPDatabase } from "idb";
import type { VaultBlob } from "./vault";

// Separate database from chat history: wiping your keys must never wipe your conversations.
const DB_NAME = "gratis-vault";
const DB_VERSION = 1;
const STORE = "vault";
const RECORD_KEY = "secrets";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    },
  });
  return dbPromise;
}

/** Only ever holds ciphertext. The passphrase and the plaintext keys are never written to disk. */
export async function saveVault(blob: VaultBlob): Promise<void> {
  const db = await getDb();
  await db.put(STORE, blob, RECORD_KEY);
}

export async function loadVault(): Promise<VaultBlob | null> {
  const db = await getDb();
  return (await db.get(STORE, RECORD_KEY)) ?? null;
}

export async function clearVault(): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, RECORD_KEY);
}
