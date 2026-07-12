"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { KeyRound, Lock, LockOpen, ShieldAlert, Trash2, ArrowLeft } from "lucide-react";
import { useVaultStore } from "@/lib/stores/vault-store";
import type { Secrets } from "@/lib/vault";

const PROVIDERS = [
  { id: "groq", label: "Groq", hint: "gsk_..." },
  { id: "openrouter", label: "OpenRouter", hint: "sk-or-v1-..." },
  { id: "cerebras", label: "Cerebras", hint: "csk-..." },
  { id: "aistudio", label: "Google AI Studio", hint: "AIza..." },
  { id: "ollama", label: "Ollama Cloud", hint: "" },
  { id: "cloudflare", label: "Cloudflare Workers AI", hint: "" },
  { id: "cloudflare_account_id", label: "Cloudflare Account ID", hint: "required with the Cloudflare key" },
] as const;

const input =
  "w-full rounded-md border border-(--color-border) bg-(--color-surface-1) px-3 py-2 text-[13px] font-mono text-(--color-fg) placeholder:text-(--color-fg-subtle) focus:outline-none focus:border-(--color-accent)";
const button =
  "inline-flex items-center gap-1.5 rounded-md border border-(--color-border) px-3 py-2 text-[13px] text-(--color-fg-muted) hover:bg-(--color-surface-2) transition-colors disabled:opacity-40";

export default function SettingsPage() {
  const { status, secrets, init, unlock, save, lock, destroy } = useVaultStore();
  const [passphrase, setPassphrase] = useState("");
  const [draft, setDraft] = useState<Secrets>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => void init(), [init]);
  useEffect(() => setDraft(secrets), [secrets]);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await unlock(passphrase);
      setPassphrase("");
    } catch {
      setError("Wrong passphrase.");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!passphrase && status !== "unlocked") return setError("Choose a passphrase first.");
    try {
      const filled = Object.fromEntries(Object.entries(draft).filter(([, v]) => v?.trim()));
      await save(filled, passphrase || "");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Could not save.");
    }
  }

  return (
    <main className="min-h-dvh bg-(--color-bg) text-(--color-fg)">
      <div className="mx-auto w-full max-w-(--width-prose) p-6">
        <Link href="/models" className="inline-flex items-center gap-1.5 text-[12px] text-(--color-fg-subtle) hover:text-(--color-fg-muted)">
          <ArrowLeft className="w-3.5 h-3.5" /> Market
        </Link>

        <h1 className="mt-4 text-[20px] font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-[13px] text-(--color-fg-muted)">
          Your provider keys, encrypted in this browser with your passphrase. They are sent with your
          requests and are never stored on any server.
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-md border border-(--color-border) bg-(--color-surface-1) p-3 text-[12px] text-(--color-fg-muted)">
          <ShieldAlert className="w-4 h-4 mt-px shrink-0" />
          <span>
            This is a local vault, not a login. It protects your keys at rest, on this device. Anyone
            who can run scripts on this page while it is unlocked can read them, so pick a strong
            passphrase and lock when you are done. There is no recovery: lose it and you re-enter the keys.
          </span>
        </div>

        {status === "locked" ? (
          <form onSubmit={handleUnlock} className="mt-6 space-y-3">
            <label className="block text-[13px] font-medium">Passphrase</label>
            <input
              type="password" autoFocus value={passphrase} onChange={(e) => setPassphrase(e.target.value)}
              className={input} placeholder="Unlock your vault"
            />
            {error ? <div className="text-[12px] text-(--color-danger)">{error}</div> : null}
            <button type="submit" className={button}><LockOpen className="w-3.5 h-3.5" /> Unlock</button>
          </form>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div>
              <label className="block text-[13px] font-medium">
                Passphrase {status === "unlocked" ? <span className="text-(--color-fg-subtle) font-normal">(leave blank to keep the current one)</span> : null}
              </label>
              <input
                type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)}
                className={`${input} mt-1.5`}
                placeholder={status === "unlocked" ? "Unchanged" : "Choose a passphrase"}
              />
            </div>

            <div className="space-y-3 pt-2">
              {PROVIDERS.map((p) => (
                <div key={p.id}>
                  <label className="block text-[13px] font-medium">{p.label}</label>
                  <input
                    type="password" autoComplete="off" value={draft[p.id] ?? ""}
                    onChange={(e) => setDraft({ ...draft, [p.id]: e.target.value })}
                    className={`${input} mt-1.5`} placeholder={p.hint || "Not set"}
                  />
                </div>
              ))}
            </div>

            {error ? <div className="text-[12px] text-(--color-danger)">{error}</div> : null}

            <div className="flex items-center gap-2 pt-2">
              <button type="submit" className={button}><KeyRound className="w-3.5 h-3.5" /> Save keys</button>
              {status === "unlocked" ? (
                <button type="button" onClick={lock} className={button}><Lock className="w-3.5 h-3.5" /> Lock</button>
              ) : null}
              <button
                type="button"
                onClick={() => confirm("Delete all stored keys from this browser?") && destroy()}
                className={`${button} ml-auto`}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete vault
              </button>
              {saved ? <span className="text-[12px] text-(--color-success)">Saved</span> : null}
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
