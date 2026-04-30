"use client";
import { motion } from "framer-motion";

export type PathIllustrationKind =
  | "store"
  | "shield"
  | "chess"
  | "spark"
  | "mastery"
  | "buy4you";

const ACCENT_TO_HEX: Record<string, { primary: string; secondary: string; soft: string }> = {
  gold:    { primary: "#f5b945", secondary: "#ffe28a", soft: "rgba(245,185,69,0.30)" },
  fuchsia: { primary: "#ec4899", secondary: "#f9a8d4", soft: "rgba(236,72,153,0.30)" },
  cyan:    { primary: "#22d3ee", secondary: "#a5f3fc", soft: "rgba(34,211,238,0.30)" },
  violet:  { primary: "#8b5cf6", secondary: "#c4b5fd", soft: "rgba(139,92,246,0.30)" },
  orange:  { primary: "#f97316", secondary: "#fdba74", soft: "rgba(249,115,22,0.30)" },
};


/* shorthand for inline animation style */
const a = (name: string, dur: string, ease = "ease-in-out", delay = "0s") =>
  ({ animation: `${name} ${dur} ${ease} ${delay} infinite` }) as React.CSSProperties;

/* orbit: rotate around an SVG viewport point */
const orbit = (cx: number, cy: number, dur: string, delay = "0s") =>
  ({ transformBox: "view-box", transformOrigin: `${cx}px ${cy}px`, ...a("pi-spin", dur, "linear", delay) }) as React.CSSProperties;

/* self: rotate/scale around own fill-box center */
const self = (name: string, dur: string, ease = "ease-in-out", delay = "0s") =>
  ({ transformBox: "fill-box", transformOrigin: "center", ...a(name, dur, ease, delay) }) as React.CSSProperties;

function PathIllustrationContent({ kind, accent, animated }: { kind: PathIllustrationKind; accent: keyof typeof ACCENT_TO_HEX; animated: boolean }) {
  const c = ACCENT_TO_HEX[accent];
  /*
   * pi-paused class moved DIRECTLY onto the <svg>. Previously a wrapper
   * <div> sat between PathCard's `relative` container and the absolute
   * <svg>. The wrapper had `display: block` with no positioning, which
   * is harmless in most contexts — but inside the mobile Swiper cube
   * slide (`position: absolute` + transform: rotate3d), some browsers
   * computed the inner stacking context such that the SVG was clipped
   * away or rendered behind the slide background. Putting the
   * pause-state class on the SVG itself preserves the descendant
   * pause behaviour with zero structural change.
   */
  return (
    <motion.svg
      viewBox="0 0 400 500"
      className={`absolute inset-0 h-full w-full ${animated ? "pi-animated" : "pi-paused"}`}
      preserveAspectRatio="xMidYMid slice"
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 1.1, ease: [0.25, 0.4, 0.25, 1] }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`pi-bg-${kind}`} cx="50%" cy="35%" r="80%">
          <stop offset="0%"   stopColor={c.secondary} stopOpacity="0.55" />
          <stop offset="55%"  stopColor={c.primary}   stopOpacity="0.18" />
          <stop offset="100%" stopColor="#05060a"     stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`pi-stroke-${kind}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={c.secondary} stopOpacity="0.95" />
          <stop offset="100%" stopColor={c.primary}   stopOpacity="0.7" />
        </linearGradient>
        <radialGradient id={`pi-aurora-${kind}`} cx="50%" cy="50%" r="55%">
          <stop offset="0%"  stopColor={c.secondary} stopOpacity="0.55" />
          <stop offset="60%" stopColor={c.primary}   stopOpacity="0.18" />
          <stop offset="100%" stopColor="#05060a"    stopOpacity="0" />
        </radialGradient>
        <filter id={`pi-glow-${kind}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Background wash */}
      <rect x="0" y="0" width="400" height="500" fill={`url(#pi-bg-${kind})`} style={a("pi-breathe","6s")} />

      {/* Aurora halo behind the main subject — pulses in scale + opacity
          so every illustration always has a visible "ahh" glow even on
          static iOS Safari snapshots. */}
      <ellipse cx="200" cy="250" rx="170" ry="170"
        fill={`url(#pi-aurora-${kind})`}
        style={{ transformBox: "fill-box", transformOrigin: "center", ...a("pi-halo","5.5s") }} />

      {/* Dotted grid */}
      <g opacity="0.18">
        {Array.from({length:20}).map((_,r)=>Array.from({length:16}).map((_,col)=>(
          <circle key={`${r}-${col}`} cx={col*26+12} cy={r*26+12} r="0.8" fill="white"/>
        )))}
      </g>

      {kind==="store"   && <StoreScene   c={c} kind={kind}/>}
      {kind==="shield"  && <ShieldScene  c={c} kind={kind}/>}
      {kind==="chess"   && <ChessScene   c={c} kind={kind}/>}
      {kind==="spark"   && <SparkScene   c={c} kind={kind}/>}
      {kind==="mastery" && <MasteryScene c={c} kind={kind}/>}
      {kind==="buy4you" && <Buy4YouScene c={c} kind={kind}/>}

      {/* Floating accent dots */}
      {[
        {x:60, y:80, r:2.5},{x:320,y:110,r:1.8},{x:95, y:380,r:2.2},
        {x:350,y:320,r:2.0},{x:200,y:60, r:1.4},{x:280,y:460,r:1.6},
      ].map((p,i)=>(
        <g key={i} style={{...a("pi-float4",`${3+(i%4)}s`,"ease-in-out",`${i*0.4}s`)}}>
          <circle cx={p.x} cy={p.y} r={p.r} fill={c.secondary}
            filter={`url(#pi-glow-${kind})`}
            style={{...a("pi-pulse",`${3+(i%4)}s`,"ease-in-out",`${i*0.4}s`)}} />
        </g>
      ))}
    </motion.svg>
  );
}

/* ── STORE ─────────────────────────────────────────────────────── */
function StoreScene({c,kind}:{c:any;kind:string}) {
  return (
    <g filter={`url(#pi-glow-${kind})`} style={a("pi-float4","5s")}>
      <polygon points="200,40 130,260 270,260" fill={c.secondary}
        style={a("pi-beam","3.5s")}/>
      <g transform="translate(80,180)" stroke={`url(#pi-stroke-${kind})`} strokeWidth="2" fill="none">
        <path d="M0,0 L240,0 L260,40 L-20,40 Z" fill={c.soft}/>
        {Array.from({length:7}).map((_,i)=>(
          <line key={i} x1={i*(240/6)} y1="0" x2={i*(240/6)+20} y2="40"/>
        ))}
        <rect x="-20" y="40" width="280" height="180" rx="6" fill="rgba(5,6,10,0.28)"/>
        <rect x="100" y="120" width="40" height="100" rx="4" fill={c.soft}/>
        <circle cx="134" cy="170" r="2" fill={c.secondary}/>
        <rect x="10"  y="80" width="60" height="30" rx="3" fill={c.soft} style={a("pi-win-a","2.4s")}/>
        <rect x="170" y="80" width="60" height="30" rx="3" fill={c.soft} style={a("pi-win-b","2.4s")}/>
        <rect x="10"  y="135" width="60" height="60" rx="3" fill="rgba(5,6,10,0.45)"/>
        <rect x="170" y="135" width="60" height="60" rx="3" fill="rgba(5,6,10,0.45)"/>
        <g transform="translate(180,55)" style={{transformOrigin:"0px 10px",transformBox:"fill-box",...a("pi-sale","3.2s")}}>
          <polygon points="0,0 26,0 36,10 26,20 0,20" fill={c.primary}/>
          <circle cx="6" cy="10" r="1.8" fill="#05060a"/>
        </g>
      </g>
      <text x="200" y="160" textAnchor="middle"
            fontFamily="Clash Display, system-ui" fontWeight="700"
            fontSize="20" fill={c.secondary} letterSpacing="3">STORE</text>
    </g>
  );
}

/* ── SHIELD ────────────────────────────────────────────────────── */
function ShieldScene({c,kind}:{c:any;kind:string}) {
  return (
    <g filter={`url(#pi-glow-${kind})`}>
      <g transform="translate(200,260)" style={self("pi-scale-sm","4s")}>
        <path d="M0,-110 L95,-72 L82,40 C80,90 40,128 0,140 C-40,128 -80,90 -82,40 L-95,-72 Z"
          fill={c.soft} stroke={`url(#pi-stroke-${kind})`} strokeWidth="3"/>
        <path d="M-32,-2 L-8,22 L34,-30"
          stroke={c.secondary} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
      {[{x:80,y:110,rot:25},{x:320,y:140,rot:-30},{x:100,y:360,rot:45},{x:310,y:380,rot:-55}].map((a2,i)=>(
        <g key={i} transform={`translate(${a2.x},${a2.y}) rotate(${a2.rot})`}
          style={a("pi-arrow","2.6s","ease-out",`${i*0.6}s`)}>
          <line x1="0" y1="0" x2="46" y2="0" stroke={c.secondary} strokeWidth="2" opacity="0.7"/>
          <polygon points="46,-5 56,0 46,5" fill={c.secondary} opacity="0.7"/>
        </g>
      ))}
      <g transform="translate(192,140)" style={a("pi-dim","2.2s")}>
        <rect x="0" y="6" width="16" height="14" rx="2" fill={c.primary}/>
        <path d="M3,6 V2 a5,5 0 0 1 10,0 V6" stroke={c.secondary} strokeWidth="2" fill="none"/>
      </g>
    </g>
  );
}

/* ── CHESS ─────────────────────────────────────────────────────── */
function ChessScene({c,kind}:{c:any;kind:string}) {
  return (
    <g filter={`url(#pi-glow-${kind})`}>
      <g transform="translate(200,330)">
        {Array.from({length:4}).map((_,r)=>Array.from({length:4}).map((_,col)=>{
          const x=(col-r)*36, y=(col+r)*18;
          return (
            <polygon key={`${r}-${col}`}
              points={`${x},${y} ${x+36},${y+18} ${x},${y+36} ${x-36},${y+18}`}
              fill={(r+col)%2===0?c.soft:"rgba(5,6,10,0.5)"} stroke={c.primary} strokeWidth="0.6" opacity="0.85"/>
          );
        }))}
      </g>
      <g transform="translate(170,150)" fill={c.secondary} stroke={c.primary} strokeWidth="2"
        style={a("pi-float6","4s")}>
        <path d="M30,0 L30,18 M22,9 L38,9" strokeLinecap="round" strokeWidth="3"/>
        <path d="M14,30 Q30,18 46,30 L52,80 L8,80 Z"/>
        <ellipse cx="30" cy="30" rx="20" ry="7"/>
        <rect x="6" y="80" width="48" height="14" rx="3"/>
      </g>
      <g transform="translate(240,200)" fill={c.primary} opacity="0.9"
        style={a("pi-float4","5s","ease-in-out","0.5s")}>
        <path d="M0,80 L0,52 Q0,28 18,18 Q24,8 36,8 Q48,8 50,22 Q60,30 56,52 L56,80 Z"
          stroke={c.secondary} strokeWidth="2"/>
        <circle cx="22" cy="28" r="2.5" fill="#05060a"/>
      </g>
    </g>
  );
}

/* ── SPARK ─────────────────────────────────────────────────────── */
function SparkScene({c,kind}:{c:any;kind:string}) {
  return (
    <g filter={`url(#pi-glow-${kind})`}>
      <g transform="translate(200,250)" stroke={c.secondary} strokeWidth="3" fill={c.soft}
        style={self("pi-scale-lg","3.6s")}>
        <polygon points="0,-90 80,0 0,90 -80,0"/>
        <polygon points="0,-90 30,-30 -30,-30" fill={c.primary} opacity="0.55"/>
        <polygon points="0,90 30,30 -30,30" fill={c.primary} opacity="0.45"/>
        <line x1="-80" y1="0" x2="80" y2="0"/>
        <line x1="-30" y1="-30" x2="30" y2="-30"/>
        <line x1="-30" y1="30" x2="30" y2="30"/>
      </g>
      <g style={orbit(200,250,"24s","0s")}>
        {Array.from({length:8}).map((_,i)=>{
          const angle=i*45, r1=130, r2=170;
          const round=(n:number)=>Number(n.toFixed(3));
          const x1=round(200+Math.cos(angle*Math.PI/180)*r1), y1=round(250+Math.sin(angle*Math.PI/180)*r1);
          const x2=round(200+Math.cos(angle*Math.PI/180)*r2), y2=round(250+Math.sin(angle*Math.PI/180)*r2);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={c.secondary} strokeWidth="3" strokeLinecap="round" opacity="0.8"/>;
        })}
      </g>
      {[{x:80,y:130},{x:320,y:150},{x:110,y:380},{x:300,y:360}].map((p,i)=>(
        <g key={i} transform={`translate(${p.x},${p.y})`}
          style={{transformBox:"fill-box",transformOrigin:"center",...a("pi-twinkle","2.2s","ease-in-out",`${i*0.4}s`)}}>
          <path d="M0,-8 L2,-2 L8,0 L2,2 L0,8 L-2,2 L-8,0 L-2,-2 Z" fill={c.secondary}/>
        </g>
      ))}
    </g>
  );
}

/* ── BUY4YOU ───────────────────────────────────────────────────── */
function Buy4YouScene({c,kind}:{c:any;kind:string}) {
  return (
    <g filter={`url(#pi-glow-${kind})`}>
      <text x="200" y="320" textAnchor="middle"
        fontFamily="Clash Display, system-ui" fontWeight="800" fontSize="320"
        fill={c.soft} stroke={c.secondary} strokeWidth="3"
        style={a("pi-breathe","3.4s")}>4</text>
      <g transform="translate(200,250)"
        style={{transformBox:"fill-box",transformOrigin:"center",...a("pi-bag","4.2s")}}>
        <path d="M-22,-30 Q-22,-58 0,-58 Q22,-58 22,-30"
          stroke={c.secondary} strokeWidth="5" fill="none" strokeLinecap="round"/>
        <path d="M-46,-30 L46,-30 L40,60 L-40,60 Z"
          fill={c.primary} stroke={c.secondary} strokeWidth="3" strokeLinejoin="round"/>
        <path d="M-12,0 L-9,-7 L-2,-10 L-9,-13 L-12,-20 L-15,-13 L-22,-10 L-15,-7 Z"
          fill="#fff8e6"
          style={{transformBox:"fill-box",transformOrigin:"center",...a("pi-sparkle","2.2s")}}/>
        <path d="M14,8 a6,6 0 0 1 12,0 a6,6 0 0 1 12,0 c0,8 -12,16 -12,16 c0,0 -12,-8 -12,-16 z"
          transform="translate(-20,8)" fill="#fff8e6" opacity="0.9"/>
      </g>
      {[{a:0,r:130,label:"FOR YOU"},{a:120,r:130,label:"GIFT"},{a:240,r:130,label:"DEAL"}].map((t,i)=>(
        <g key={i} style={orbit(200,250,`${22+i*3}s`)}>
          <g transform={`translate(${(200+Math.cos(t.a*Math.PI/180)*t.r).toFixed(3)},${(250+Math.sin(t.a*Math.PI/180)*(t.r*0.55)).toFixed(3)})`}>
            <rect x="-30" y="-12" width="60" height="22" rx="11"
              fill="rgba(5,6,10,0.55)" stroke={c.secondary} strokeWidth="1.5"/>
            <text x="0" y="4" textAnchor="middle"
              fontFamily="Clash Display, system-ui" fontWeight="700"
              fontSize="10" fill={c.secondary} letterSpacing="2">{t.label}</text>
          </g>
        </g>
      ))}
      <text x="200" y="450" textAnchor="middle"
        fontFamily="Clash Display, system-ui" fontWeight="700"
        fontSize="14" fill={c.secondary} letterSpacing="6">CONCIERGE</text>
    </g>
  );
}

/* ── MASTERY ───────────────────────────────────────────────────── */
function MasteryScene({c,kind}:{c:any;kind:string}) {
  return (
    <g filter={`url(#pi-glow-${kind})`}>
      <polygon points="200,80 150,420 250,420" fill={c.secondary} style={a("pi-beam","3.6s")}/>
      <g transform="translate(200,360)" stroke={`url(#pi-stroke-${kind})`} strokeWidth="2" fill={c.soft}>
        <polygon points="-70,0 -35,-22 35,-22 70,0 35,22 -35,22"/>
        <polygon points="-70,0 -35,28 35,28 70,0 35,22 -35,22" fill="rgba(5,6,10,0.5)"/>
        <line x1="-70" y1="0" x2="-70" y2="20"/>
        <line x1="70" y1="0" x2="70" y2="20"/>
      </g>
      {/* Gem: float + spin via separate CSS animations */}
      <g transform="translate(200,250)"
        style={{transformBox:"view-box",transformOrigin:"200px 250px"}}>
        <g style={a("pi-float10","4s")}>
          <g style={{...self("pi-spin","18s","linear")}}>
            <polygon points="0,-32 26,0 0,38 -26,0" fill={c.primary} stroke={c.secondary} strokeWidth="2"/>
            <polygon points="0,-32 12,-10 -12,-10" fill={c.secondary} opacity="0.85"/>
            <polygon points="0,38 12,10 -12,10" fill="#05060a" opacity="0.4"/>
          </g>
        </g>
      </g>
      {/* Crown float */}
      <g transform="translate(200,180)" style={a("pi-float8","5s")}>
        <rect x="-40" y="20" width="80" height="14" rx="3" fill={c.primary} stroke={c.secondary} strokeWidth="2"/>
        <path d="M-40,20 L-25,-10 L-10,12 L0,-22 L10,12 L25,-10 L40,20 Z"
          fill={c.primary} stroke={c.secondary} strokeWidth="2.5" strokeLinejoin="round"/>
        <circle cx="-25" cy="-2" r="3.5" fill={c.secondary}/>
        <circle cx="0"   cy="-12" r="4.5" fill="#fff8e6"/>
        <circle cx="25"  cy="-2" r="3.5" fill={c.secondary}/>
        <line x1="-40" y1="27" x2="40" y2="27" stroke={c.secondary} strokeWidth="0.8" opacity="0.7"/>
        <circle cx="-22" cy="27" r="1.5" fill={c.secondary}/>
        <circle cx="0"   cy="27" r="1.5" fill={c.secondary}/>
        <circle cx="22"  cy="27" r="1.5" fill={c.secondary}/>
      </g>
      {[0,120,240].map((angle,i)=>(
        <g key={i} style={orbit(200,200,`${14+i*4}s`)}>
          <g transform={`translate(${(200+Math.cos(angle*Math.PI/180)*110).toFixed(3)},${(200+Math.sin(angle*Math.PI/180)*60).toFixed(3)})`}>
            <path d="M0,-10 L2.5,-2.5 L10,0 L2.5,2.5 L0,10 L-2.5,2.5 L-10,0 L-2.5,-2.5 Z"
              fill={c.secondary}/>
          </g>
        </g>
      ))}
      <text x="200" y="450" textAnchor="middle"
        fontFamily="Clash Display, system-ui" fontWeight="700"
        fontSize="14" fill={c.secondary} letterSpacing="6">MASTERY</text>
    </g>
  );
}

/* ─────────────────────────────────────────────────────────────────
 * Public wrapper.
 *
 * `animated=false` → puts .pi-paused class directly on the <svg> so
 * CSS pauses ALL descendant animations instantly without any React
 * re-render and without inserting an extra wrapper element that can
 * confuse Swiper's 3D cube slide stacking context.
 *
 * Active slide (animated=true, default) gets .pi-animated marker
 * (used by the prefers-reduced-motion @media rule in globals.css to
 * disable looping animations for users who request reduced motion).
 * ───────────────────────────────────────────────────────────────── */
export default function PathIllustration(props: {
  kind: PathIllustrationKind;
  accent: keyof typeof ACCENT_TO_HEX;
  animated?: boolean;
}) {
  return (
    <PathIllustrationContent
      kind={props.kind}
      accent={props.accent}
      animated={props.animated !== false}
    />
  );
}
