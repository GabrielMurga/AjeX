import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "slate" | "navy" | "blue" | "green" | "red" | "yellow" | "purple" | "orange";

const tones: Record<Tone, string> = {
  slate:  "bg-slate-100 text-slate-700",
  navy:   "bg-ink-800/10 text-ink-800",
  blue:   "bg-sky-100 text-sky-700",
  green:  "bg-emerald-100 text-emerald-700",
  red:    "bg-rose-100 text-rose-700",
  yellow: "bg-amber-100 text-amber-800",
  purple: "bg-violet-100 text-violet-700",
  orange: "bg-brand-100 text-brand-700",
};

export function Badge({ tone = "slate", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
