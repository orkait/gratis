"use client";
import { useCallback } from "react";
import { LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type VaultUnlockProps = {
  passphrase: string;
  error: string | null;
  onPassphraseChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export function VaultUnlock({ passphrase, error, onPassphraseChange, onSubmit }: VaultUnlockProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onPassphraseChange(e.target.value),
    [onPassphraseChange],
  );

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-3">
      <label htmlFor="vault-passphrase" className="block text-sm font-medium">
        Passphrase
      </label>
      <Input
        id="vault-passphrase"
        type="password"
        autoFocus
        value={passphrase}
        onChange={handleChange}
        placeholder="Unlock your vault"
        className="h-9 font-mono"
      />
      {error ? <div className="text-sm text-(--color-danger)">{error}</div> : null}
      <Button type="submit" variant="outline" size="lg">
        <LockOpen className="w-3.5 h-3.5" /> Unlock
      </Button>
    </form>
  );
}
