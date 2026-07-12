"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useVaultStore, type VaultStatus } from "@/stores/vault-store";
import { pruneEmptySecrets, type SecretKey, type Secrets } from "../lib/vault";

/** All of the API-keys form's behaviour, so the page is only layout.
 *
 * The passphrase never leaves this hook's state: it is passed straight to the store's crypto calls
 * and is not persisted anywhere.
 */

const SAVED_NOTICE_MS = 2_000;

const MESSAGES = {
  wrongPassphrase: "Wrong passphrase.",
  passphraseRequired: "Choose a passphrase first.",
  saveFailed: "Could not save.",
} as const;

const CONFIRM_DESTROY = "Delete all stored keys from this browser?";

export type VaultForm = {
  status: VaultStatus;
  passphrase: string;
  draft: Secrets;
  error: string | null;
  saved: boolean;
  setPassphrase: (value: string) => void;
  setSecret: (key: SecretKey, value: string) => void;
  submitUnlock: (e: React.FormEvent) => void;
  submitSave: (e: React.FormEvent) => void;
  lock: () => void;
  destroy: () => void;
};

export function useVaultForm(): VaultForm {
  const { status, secrets, init, unlock, save, lock, destroy } = useVaultStore();
  const [passphrase, setPassphrase] = useState("");
  const [draft, setDraft] = useState<Secrets>(secrets);
  const [syncedSecrets, setSyncedSecrets] = useState<Secrets>(secrets);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => void init(), [init]);

  // The store's secrets are the truth; the draft is what the user is editing on top of them. An
  // unlock, a lock or a save replaces the truth, so the draft restarts from it - adjusted during
  // render rather than in an effect, which would render the stale draft first.
  if (syncedSecrets !== secrets) {
    setSyncedSecrets(secrets);
    setDraft(secrets);
  }

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  const setSecret = useCallback((key: SecretKey, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  const flashSaved = useCallback(() => {
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), SAVED_NOTICE_MS);
  }, []);

  const submitUnlock = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      void unlock(passphrase)
        .then(() => setPassphrase(""))
        .catch(() => setError(MESSAGES.wrongPassphrase));
    },
    [unlock, passphrase],
  );

  const submitSave = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      // An unlocked vault may be re-saved with a blank passphrase: it keeps the current one.
      if (!passphrase && status !== "unlocked") {
        setError(MESSAGES.passphraseRequired);
        return;
      }
      void save(pruneEmptySecrets(draft), passphrase)
        .then(flashSaved)
        .catch(() => setError(MESSAGES.saveFailed));
    },
    [save, draft, passphrase, status, flashSaved],
  );

  const destroyVault = useCallback(() => {
    if (!window.confirm(CONFIRM_DESTROY)) return;
    void destroy();
  }, [destroy]);

  return {
    status,
    passphrase,
    draft,
    error,
    saved,
    setPassphrase,
    setSecret,
    submitUnlock,
    submitSave,
    lock,
    destroy: destroyVault,
  };
}
