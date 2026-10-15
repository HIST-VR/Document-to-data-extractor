import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { useI18n } from "../../i18n";
import { Button } from "./Button";
import { Checkbox } from "./Checkbox";

export function ConsentDialog({
  open,
  onCancel,
  onAccept,
}: {
  open: boolean;
  onCancel: () => void;
  onAccept: () => void;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 border border-hairline bg-raised p-6">
          {open ? <ConsentForm onAccept={onAccept} onCancel={onCancel} /> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ConsentForm({ onAccept, onCancel }: { onAccept: () => void; onCancel: () => void }) {
  const { copy } = useI18n();
  const [checked, setChecked] = useState(false);

  return (
    <>
      <Dialog.Title className="font-display text-3xl text-ink">{copy.consent.title}</Dialog.Title>
      <Dialog.Description className="mt-3 text-sm leading-6 text-muted">{copy.consent.lead}</Dialog.Description>
      <div className="mt-6 flex items-start gap-3">
        <span className="pt-0.5">
          <Checkbox id="upload-consent" checked={checked} onCheckedChange={setChecked} labelledBy="upload-consent-label" />
        </span>
        <label id="upload-consent-label" htmlFor="upload-consent" className="min-h-11 cursor-pointer text-sm leading-6">
          {copy.consent.sentence}
        </label>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="primary" disabled={!checked} onClick={onAccept}>
          {copy.consent.continue}
        </Button>
        <Dialog.Close asChild>
          <Button onClick={onCancel}>{copy.consent.cancel}</Button>
        </Dialog.Close>
      </div>
    </>
  );
}
