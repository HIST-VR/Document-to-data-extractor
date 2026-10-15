import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "quiet";

const VARIANT: Record<Variant, string> = {
  primary: "bg-accent text-white hover:opacity-90",
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
      className={`inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${className}`}
      {...props}
    />
  );
}
