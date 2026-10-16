import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

export function Checkbox({
  id,
  checked,
  onCheckedChange,
  labelledBy,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  labelledBy: string;
}) {
  return (
    <CheckboxPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={(value) => onCheckedChange(value === true)}
      aria-labelledby={labelledBy}
      className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-control"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-[4px] border border-ink bg-raised text-surface group-data-[state=checked]:bg-ink">
        <CheckboxPrimitive.Indicator>
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
        </CheckboxPrimitive.Indicator>
      </span>
    </CheckboxPrimitive.Root>
  );
}
