export default function Logo({ className = "h-9 w-auto" }: { className?: string }) {
  // Inline SVG mark — no external request, fully self-hosted.
  return (
    <svg
      viewBox="0 0 220 48"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="RefundGod"
      role="img"
    >
      <defs>
        <linearGradient id="rgGold" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffe28a" />
          <stop offset="0.5" stopColor="#f5b945" />
          <stop offset="1" stopColor="#d99520" />
        </linearGradient>
      </defs>
      <g transform="translate(2, 6)">
        <path
          d="M18 4 L34 4 L36 8 L36 18 L26 18 L34 36 L24 36 L17 22 L10 22 L10 36 L2 36 Z M10 10 L10 14 L26 14 L26 10 Z"
          fill="url(#rgGold)"
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="0.5"
        />
      </g>
      <text
        x="50"
        y="32"
        fontFamily="Space Grotesk, Inter, system-ui, sans-serif"
        fontWeight="700"
        fontSize="22"
        letterSpacing="-0.5"
        fill="white"
      >
        Refund<tspan fill="url(#rgGold)">God</tspan>
      </text>
    </svg>
  );
}
