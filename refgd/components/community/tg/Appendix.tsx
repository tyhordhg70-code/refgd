/**
 * The exact Telegram Web A bubble tail ("appendix"), lifted verbatim from the
 * owner's saved export: a 9x20 SVG path filled with the bubble color. Own
 * bubbles use #EEFFDE, incoming use #FFFFFF; incoming tails are mirrored via
 * CSS (transform: scaleX(-1) on .tg-msg:not(.own) .tg-appendix).
 */
export default function Appendix({ own }: { own: boolean }) {
  return (
    <svg
      className="tg-appendix"
      width="9"
      height="20"
      viewBox="0 0 9 20"
      aria-hidden
    >
      <path
        d="M6 17H0V0c.193 2.84.876 5.767 2.05 8.782.904 2.325 2.446 4.485 4.625 6.48A1 1 0 016 17z"
        fill={own ? "#EEFFDE" : "#FFFFFF"}
      />
    </svg>
  );
}
