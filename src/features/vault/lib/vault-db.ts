import { openDB, type IDBPDatabase } from "idb";
import { DATABASES } from "@/config/storage";
import type { VaultBlob } from "./vault";

// Separate database from chat history: wiping your keys must never wipe your conversations. The
// name, version, store and record key live in the storage config - renaming any of them orphans
// every existing vault, which is a consequence worth seeing next to the chat database.
const { name: DB_NAME, version: DB_VERSION, store: STORE, recordKey: RECORD_KEY } = DATABASES.vault;

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
