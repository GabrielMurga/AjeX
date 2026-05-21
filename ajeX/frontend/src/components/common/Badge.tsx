import { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "slate" | "blue" | "green" | "red" | "yellow" | "purple" | "orange";

const tones: Record<Tone, string> = {
  slate:  "bg-slate-100 text-slate-700",
  blue:   "bg-blue-100 text-blue-700",
  green:  "bg-green-100 text-green-700",
  red:    "bg-red-100 text-red-700",
  yellow: "bg-yellow-100 text-yellow-800",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
};

export function Badge({ tone = "slate", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone], className)} {...props} />;
}
