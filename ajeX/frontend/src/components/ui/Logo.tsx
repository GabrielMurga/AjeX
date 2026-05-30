/**
 * Logo AjeX — "A." reconstruído em vetor/CSS.
 * Marca: "A" + ponto laranja. Use light={true} sobre fundo navy.
 */
export function Logo({
  size = 26,
  withWordmark = true,
  light = true,
}: {
  size?: number;
  withWordmark?: boolean;
  light?: boolean;
}) {
  const fg = light ? "#ffffff" : "#1D242D";
  return (
    <div className="flex select-none items-center gap-2.5">
      <div
        className="relative font-extrabold leading-none tracking-tight"
        style={{ fontSize: size, color: fg, fontWeight: 800 }}
      >
        A
        <span
          className="absolute rounded-full bg-brand-500"
          style={{
            width: size * 0.26,
            height: size * 0.26,
            right: -size * 0.3,
            bottom: size * 0.02,
          }}
        />
      </div>
      {withWordmark && (
        <div className="leading-none" style={{ marginLeft: size * 0.22 }}>
          <div
            className="font-bold tracking-tight"
            style={{ color: fg, fontSize: size * 0.66 }}
          >
            AjeX
          </div>
          <div
            className="font-medium tracking-wide"
            style={{
              color: light ? "rgba(255,255,255,.5)" : "#9aa3ad",
              fontSize: size * 0.36,
              marginTop: 2,
            }}
          >
            AGILE HUB
          </div>
        </div>
      )}
    </div>
  );
}
