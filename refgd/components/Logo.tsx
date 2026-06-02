export default function Logo({ className = "h-9 w-auto" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      role="img"
      aria-label="RefundGod"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/crown-logo.png" alt="" aria-hidden="true" className="h-full w-auto" />
      <span
        style={{
          fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: "1.2rem",
          letterSpacing: "-0.03em",
          lineHeight: 1,
          color: "white",
        }}
      >
        Refund<span style={{ color: "#f5b945" }}>God</span>
      </span>
    </span>
  );
}
