"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * SecureLockCenterpiece
 * ─────────────────────────────────────────────────────────────────
 * Animated centerpiece for the "secure lock + shield" PNG. The image
 * sits in a glowing aurora ring; it floats up-and-down, breathes a
 * subtle rotation, and the underlying ring pulses on its own cadence.
 *
 * The PNG itself is already alpha-keyed (background removed). The
 * surrounding radial glow is rendered behind it via CSS so the asset
 * sits convincingly atop the dark page without a hard rectangular
 * boundary.
 */
export default function SecureLockCenterpiece({
  src = "/uploads/secure-lock.png",
  size = 360,
}: {
  src?: string;
  size?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <div
      className="relative mx-auto grid place-items-center"
      style={{ width: size, height: size }}
    >
      {/* aurora pulse ring */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        initial={{ scale: 0.92, opacity: 0.7 }}
        animate={
          reduce ? undefined : { scale: [0.92, 1.06, 0.92], opacity: [0.6, 0.95, 0.6] }
        }
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(124,58,237,0.55) 0%, rgba(34,211,238,0.35) 35%, rgba(245,185,69,0.18) 60%, transparent 75%)",
          filter: "blur(20px)",
        }}
      />
      {/* outer thin glow ring */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-[8%] rounded-full border-2"
        initial={{ rotate: 0, opacity: 0.8 }}
        animate={reduce ? undefined : { rotate: 360, opacity: [0.6, 0.95, 0.6] }}
        transition={{
          rotate: { duration: 22, repeat: Infinity, ease: "linear" },
          opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" },
        }}
        style={{
          borderColor: "rgba(167,139,250,0.45)",
          borderStyle: "dashed",
          boxShadow: "0 0 30px rgba(124,58,237,0.45) inset",
        }}
      />
      {/* the lock+shield asset itself, breathing */}
      <motion.img
        src={src}
        alt="Secure vault — lock and shield"
        loading="lazy"
        decoding="async"
        initial={{ y: 0, scale: 1, rotate: 0 }}
        animate={
          reduce ? undefined : { y: [0, -14, 0], scale: [1, 1.04, 1], rotate: [-2, 2, -2] }
        }
        transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "relative",
          zIndex: 2,
          width: "78%",
          height: "78%",
          objectFit: "contain",
          filter:
            "drop-shadow(0 30px 50px rgba(0,0,0,0.7)) drop-shadow(0 0 24px rgba(124,58,237,0.55))",
        }}
      />
    </div>
  );
}
