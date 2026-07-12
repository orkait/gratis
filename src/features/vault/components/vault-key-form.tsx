"use client";
import { useCallback } from "react";
import { KeyRound, Lock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VAULT_FIELDS, type VaultField } from "../lib/vault-fields";
import type { SecretKey, Secrets } from "../lib/vault";
import type { VaultStatus } from "@/stores/vault-store";

const NOT_SET = "Not set";

const PASSPHRASE_PLACEHOLDER: Record<"unlocked" | "new", string> = {
  unlocked: "Unchanged",
  new: "Choose a passphrase",
};

export type VaultKeyFormProps = {
  status: VaultStatus;
  passphrase: string;
  draft: Secrets;
  error: string | null;
  saved: boolean;
  onPassphraseChange: (value: string) => void;
  onSecretChange: (key: SecretKey, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onLock: () => void;
  onDestroy: () => void;
};

export function VaultKeyForm({
  status,
  passphrase,
  draft,
  error,
  saved,
  onPassphraseChange,
  onSecretChange,
  onSubmit,
  onLock,
  onDestroy,
}: VaultKeyFormProps) {
  const unlocked = status === "unlocked";

  const handlePassphraseChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onPassphraseChange(e.target.value),
    [onPassphraseChange],
  );

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="vault-passphrase" className="block text-[13px] font-medium">
          Passphrase{" "}
          {unlocked ? (
            <span className="text-(--color-fg-subtle) font-normal">
              (leave blank to keep the current one)
            </span>
          ) : null}
        </label>
        <Input
          id="vault-passphrase"
          type="password"
          value={passphrase}
          onChange={handlePassphraseChange}
          placeholder={unlocked ? PASSPHRASE_PLACEHOLDER.unlocked : PASSPHRASE_PLACEHOLDER.new}
          className="mt-1.5 h-9 font-mono"
        />
      </div>

      <div className="space-y-3 pt-2">
        {VAULT_FIELDS.map((field) => (
          <VaultKeyField
            key={field.key}
            field={field}
            value={draft[field.key] ?? ""}
            onChange={onSecretChange}
          />
        ))}
      </div>

      {error ? <div className="text-[12px] text-(--color-danger)">{error}</div> : null}

      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" variant="outline" size="lg">
          <KeyRound className="w-3.5 h-3.5" /> Save keys
        </Button>
        {unlocked ? (
          <Button type="button" variant="outline" size="lg" onClick={onLock}>
            <Lock className="w-3.5 h-3.5" /> Lock
          </Button>
        ) : null}
        <Button type="button" variant="outline" size="lg" onClick={onDestroy} className="ml-auto">
          <Trash2 className="w-3.5 h-3.5" /> Delete vault
        </Button>
        {saved ? <span className="text-[12px] text-(--color-success)">Saved</span> : null}
      </div>
    </form>
  );
}

function VaultKeyField({
  field,
  value,
  onChange,
}: {
  field: VaultField;
  value: string;
  onChange: (key: SecretKey, value: string) => void;
}) {
  const inputId = `vault-${field.key}`;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(field.key, e.target.value),
    [onChange, field.key],
  );

  return (
    <div>
      <label htmlFor={inputId} className="block text-[13px] font-medium">
        {field.label}
      </label>
      <Input
        id={inputId}
        type="password"
        autoComplete="off"
        value={value}
        onChange={handleChange}
        placeholder={field.placeholder || NOT_SET}
        className="mt-1.5 h-9 font-mono"
      />
    </div>
  );
}
