import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "quiet";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:opacity-90",
  quiet: "border border-hairline bg-raised text-ink hover:border-ink",
};

export function Button({
  variant = "quiet",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`btn inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 type-ui font-medium disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${className}`}
      {...props}
    />
  );
}
