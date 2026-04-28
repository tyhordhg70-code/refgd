import type { Region } from "@/lib/types";

interface Props {
  region: Region;
  className?: string;
}

/**
 * Inline SVG flags — no external image requests.
 */
export default function RegionFlag({ region, className = "h-6 w-9" }: Props) {
  switch (region) {
    case "USA":
      return (
        <svg viewBox="0 0 60 40" className={className} aria-label="USA flag" role="img">
          {Array.from({ length: 13 }).map((_, i) => (
            <rect key={i} x="0" y={i * (40 / 13)} width="60" height={40 / 13} fill={i % 2 === 0 ? "#b22234" : "#fff"} />
          ))}
          <rect x="0" y="0" width="24" height={40 * 7 / 13} fill="#3c3b6e" />
          {Array.from({ length: 50 }).map((_, i) => {
            const row = Math.floor(i / 10);
            const col = i % 10;
            const offset = row % 2 === 0 ? 1.2 : 2.4;
            return <circle key={i} cx={offset + col * 2.2} cy={1.3 + row * 1.7} r="0.5" fill="white" />;
          })}
        </svg>
      );
    case "CAD":
      return (
        <svg viewBox="0 0 60 40" className={className} aria-label="Canada flag" role="img">
          <rect width="15" height="40" fill="#d52b1e" />
          <rect x="15" width="30" height="40" fill="#fff" />
          <rect x="45" width="15" height="40" fill="#d52b1e" />
          <path
            d="M30 8 L31.5 12 L35 11 L33 14 L37 16 L33 17 L34 21 L30 19 L26 21 L27 17 L23 16 L27 14 L25 11 L28.5 12 Z"
            fill="#d52b1e"
          />
        </svg>
      );
    case "EU":
      return (
        <svg viewBox="0 0 60 40" className={className} aria-label="European Union flag" role="img">
          <rect width="60" height="40" fill="#003399" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const r = 12;
            // Round to fixed precision so SSR and CSR strings match
            // exactly — Node and the browser disagree at the last
            // float digit otherwise, which trips React hydration.
            const round = (n: number) => Number(n.toFixed(3));
            const cx = round(30 + Math.cos(a) * r);
            const cy = round(20 + Math.sin(a) * r);
            return (
              <polygon
                key={i}
                points="0,-1.5 0.4,-0.4 1.5,-0.4 0.6,0.2 1,1.4 0,0.7 -1,1.4 -0.6,0.2 -1.5,-0.4 -0.4,-0.4"
                fill="#ffcc00"
                transform={`translate(${cx},${cy})`}
              />
            );
          })}
        </svg>
      );
    case "UK":
      return (
        <svg viewBox="0 0 60 40" className={className} aria-label="United Kingdom flag" role="img">
          <rect width="60" height="40" fill="#012169" />
          <path d="M0 0 L60 40 M60 0 L0 40" stroke="#fff" strokeWidth="6" />
          <path d="M0 0 L60 40 M60 0 L0 40" stroke="#c8102e" strokeWidth="3" />
          <path d="M30 0 V40 M0 20 H60" stroke="#fff" strokeWidth="10" />
          <path d="M30 0 V40 M0 20 H60" stroke="#c8102e" strokeWidth="6" />
        </svg>
      );
  }
}
