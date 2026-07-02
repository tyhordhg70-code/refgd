/**
 * The exact Telegram Web A bubble tail ("appendix"), lifted verbatim from the
 * owner's saved export: a 9x20 SVG with the drop-shadow filter and the fill
 * path. Own bubbles use #EEFFDE, incoming use #FFFFFF; the saved tg-webapp
 * stylesheet positions/mirrors .svg-appendix per side. Like the real client,
 * every message repeats the same #messageAppendix filter def (the composer
 * uses its own #composerAppendix id, also matching the saved page).
 */

const PATH =
  "M6 17H0V0c.193 2.84.876 5.767 2.05 8.782.904 2.325 2.446 4.485 4.625 6.48A1 1 0 016 17z";

export default function Appendix({
  own,
  composer,
}: {
  own: boolean;
  /** Composer-wrapper tail (white, #composerAppendix filter id). */
  composer?: boolean;
}) {
  const id = composer ? "composerAppendix" : "messageAppendix";
  const fill = composer ? "#FFF" : own ? "#EEFFDE" : "#FFFFFF";
  return (
    <svg width="9" height="20" className="svg-appendix" aria-hidden>
      <defs>
        <filter
          x="-50%"
          y="-14.7%"
          width="200%"
          height="141.2%"
          filterUnits="objectBoundingBox"
          id={id}
        >
          <feOffset dy="1" in="SourceAlpha" result="shadowOffsetOuter1" />
          <feGaussianBlur
            stdDeviation="1"
            in="shadowOffsetOuter1"
            result="shadowBlurOuter1"
          />
          <feColorMatrix
            values="0 0 0 0 0.0621962482 0 0 0 0 0.138574144 0 0 0 0 0.185037364 0 0 0 0.15 0"
            in="shadowBlurOuter1"
          />
        </filter>
      </defs>
      <g fill="none" fillRule="evenodd">
        <path d={PATH} fill="#000" filter={`url(#${id})`} />
        <path d={PATH} fill={fill} className="corner" />
      </g>
    </svg>
  );
}
