import { cn } from "@/lib/cn";

const COLORS = ["bg-blue-500","bg-green-500","bg-purple-500","bg-pink-500","bg-orange-500","bg-teal-500","bg-indigo-500","bg-rose-500"];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function Avatar({ name, size = 28, className }: { name: string; size?: number; className?: string }) {
  const initials = name.split(" ").slice(0, 2).map(s => s[0]?.toUpperCase()).join("");
  return (
    <div
      title={name}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={cn("flex shrink-0 items-center justify-center rounded-full font-semibold text-white", colorFor(name), className)}
    >
      {initials}
    </div>
  );
}
