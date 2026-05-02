"use client";
import { Sheet, SheetContent, SheetHeader, SheetBody } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { X } from "lucide-react";
import { KEYBINDINGS } from "@/lib/keybindings";

export function HelpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <SheetContent className="max-w-[400px]">
        <SheetHeader>
          <span className="text-[14px] font-semibold">Keyboard shortcuts</span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </SheetHeader>
        <SheetBody>
          <div className="space-y-1">
            {KEYBINDINGS.map((b) => (
              <div key={b.id} className="h-8 px-2 rounded-md flex items-center justify-between hover:bg-(--color-surface-2)">
                <span className="text-[13px] text-(--color-fg-muted)">{b.description}</span>
                <span className="flex gap-1">
                  {b.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}
                </span>
              </div>
            ))}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
