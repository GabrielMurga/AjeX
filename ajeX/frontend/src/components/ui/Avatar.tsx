import { cn } from "@/lib/cn";

// Paleta da identidade AjeX (laranja, navy, e tons harmônicos)
const COLORS = ["#FF5722", "#1D242D", "#0EA5E9", "#7C3AED", "#16A34A", "#D946EF", "#0891B2", "#E11D48"];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function Avatar({ name, size = 28, className }: { name: string; size?: number; className?: string }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join("");
  return (
    <div
      title={name}
      style={{ width: size, height: size, fontSize: size * 0.4, background: colorFor(name) }}
      className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold text-white", className)}
    >
      {initials}
    </div>
  );
}
