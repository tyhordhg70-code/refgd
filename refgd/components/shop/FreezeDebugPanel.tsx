"use client";

/**
 * TEMPORARY on-device freeze diagnostic panel.
 *
 * Renders the breadcrumb trail recorded by lib/freeze-debug. Mounted on
 * /shop-methods. Usage: tap "Clear", tap the vouches button; if the page
 * freezes, force-close the tab, reopen /shop-methods — this panel shows the
 * last step reached before the freeze. Remove once the freeze is located.
 */

import { useEffect, useState } from "react";
import { readBc, clearBc, installFreezeHandlers, type Crumb } from "@/lib/freeze-debug";

export default function FreezeDebugPanel() {
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    installFreezeHandlers();
    setCrumbs(readBc());
  }, []);

  if (hidden) return null;

  const t0 = crumbs.length ? crumbs[0].t : 0;
  const btn: React.CSSProperties = {
    border: 0,
    borderRadius: 4,
    padding: "3px 9px",
    fontWeight: 700,
    fontSize: 11,
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 6,
        left: 6,
        right: 6,
        zIndex: 2147483647,
        maxHeight: "42vh",
        overflow: "auto",
        background: "rgba(0,0,0,0.93)",
        color: "#7CFC00",
        font: "11px/1.4 ui-monospace, monospace",
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid #7CFC00",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div style={{ display: "flex", gap: 6, marginBottom: 6, color: "#fff", alignItems: "center" }}>
        <strong style={{ flex: 1 }}>FREEZE TRACE ({crumbs.length})</strong>
        <button style={{ ...btn, color: "#000", background: "#7CFC00" }} onClick={() => { clearBc(); setCrumbs([]); }}>
          Clear
        </button>
        <button style={{ ...btn, color: "#000", background: "#fff" }} onClick={() => setCrumbs(readBc())}>
          Refresh
        </button>
        <button style={{ ...btn, color: "#fff", background: "transparent", border: "1px solid #fff" }} onClick={() => setHidden(true)}>
          ×
        </button>
      </div>
      {crumbs.length === 0 ? (
        <div style={{ color: "#bbb" }}>
          No trace yet. Tap “Clear”, then tap “Read community vouches”. If it
          freezes, force-close the tab, reopen this page, and the LAST line below
          shows where it hung.
        </div>
      ) : (
        crumbs.map((c, i) => (
          <div key={i} style={{ whiteSpace: "pre" }}>
            {String(c.t - t0).padStart(6, " ")}ms · {c.s}
          </div>
        ))
      )}
    </div>
  );
}
