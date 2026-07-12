"use client";
import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatThread = {
  id: string;
  modelId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  tokenUsage?: number | null;
};

interface ChatSchema extends DBSchema {
  threads: {
    key: string;
    value: ChatThread;
    indexes: {
      "by-updatedAt": number;
      "by-modelId": string;
    };
  };
}

// Deliberately NOT renamed with the product. This is the IndexedDB name: changing it points the app
// at a fresh empty database and orphans every existing user's chat history. The name is invisible.
const DB_NAME = "zerocostllm-chat";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ChatSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<ChatSchema>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB only available in browser"));
  }
  if (!dbPromise) {
    dbPromise = openDB<ChatSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("threads", { keyPath: "id" });
        store.createIndex("by-updatedAt", "updatedAt");
        store.createIndex("by-modelId", "modelId");
      },
    });
  }
  return dbPromise;
}

function newId(): string {
  return `thr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function deriveTitle(messages: ChatMessage[], fallback: string): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (firstUser?.content) {
    const trimmed = firstUser.content.trim().replace(/\s+/g, " ");
    return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
  }
  return fallback;
}

export async function createThread(modelId: string): Promise<ChatThread> {
  const now = Date.now();
  const thread: ChatThread = {
    id: newId(),
    modelId,
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
    tokenUsage: null,
  };
  const db = await getDb();
  await db.put("threads", thread);
  return thread;
}

export async function getThread(id: string): Promise<ChatThread | undefined> {
  const db = await getDb();
  return db.get("threads", id);
}

export async function listThreads(): Promise<ChatThread[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex("threads", "by-updatedAt");
  return all.reverse();
}

export async function updateThread(
  id: string,
  patch: Partial<Omit<ChatThread, "id" | "createdAt">>,
): Promise<ChatThread | undefined> {
  const db = await getDb();
  const existing = await db.get("threads", id);
  if (!existing) return undefined;
  const next: ChatThread = {
    ...existing,
    ...patch,
    updatedAt: Date.now(),
  };
  if (patch.messages) {
    next.title = patch.messages.length > 0 ? deriveTitle(patch.messages, existing.title) : existing.title;
  }
  await db.put("threads", next);
  return next;
}

export async function deleteThread(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("threads", id);
}

export async function searchThreads(query: string): Promise<ChatThread[]> {
  const all = await listThreads();
  if (!query.trim()) return all;
  const q = query.toLowerCase();
  return all.filter((t) =>
    t.title.toLowerCase().includes(q) ||
    t.modelId.toLowerCase().includes(q) ||
    t.messages.some((m) => m.content.toLowerCase().includes(q)),
  );
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  const e = await navigator.storage.estimate();
  return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
}

export async function requestPersistence(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  return navigator.storage.persist();
}
