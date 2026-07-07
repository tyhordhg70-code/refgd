/**
 * Pure-JS intrinsic-dimension probe for image bytes (PNG / JPEG / GIF /
 * WebP). Used at vouch-media ingest so bubbles can reserve the exact
 * aspect-ratio box before the photo streams in (no layout pop-in).
 *
 * Deliberately dependency-free: adding sharp (or similar native deps) to the
 * runtime bundle has broken Render builds before — header parsing is all we
 * need for width/height.
 */
export function probeImageDims(
  buf: Buffer,
): { w: number; h: number } | null {
  try {
    if (buf.length < 24) return null;

    // PNG: 8-byte signature, IHDR width/height at fixed offsets 16/20.
    if (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    ) {
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      return ok(w, h);
    }

    // GIF87a / GIF89a: logical screen size at offsets 6/8 (LE).
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) {
      return ok(buf.readUInt16LE(6), buf.readUInt16LE(8));
    }

    // JPEG: walk markers until a SOFn frame header carries the size.
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let p = 2;
      while (p + 9 < buf.length) {
        if (buf[p] !== 0xff) {
          p++;
          continue;
        }
        const marker = buf[p + 1];
        // Standalone markers without a length payload.
        if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
          p += 2;
          continue;
        }
        const len = buf.readUInt16BE(p + 2);
        if (len < 2) return null;
        const isSOF =
          marker >= 0xc0 &&
          marker <= 0xcf &&
          marker !== 0xc4 &&
          marker !== 0xc8 &&
          marker !== 0xcc;
        if (isSOF) {
          const h = buf.readUInt16BE(p + 5);
          const w = buf.readUInt16BE(p + 7);
          return ok(w, h);
        }
        if (marker === 0xda) return null; // entropy data — size not found
        p += 2 + len;
      }
      return null;
    }

    // WebP: RIFF....WEBP then VP8 / VP8L / VP8X first chunk.
    if (
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
    ) {
      const tag = buf.toString("latin1", 12, 16);
      if (tag === "VP8X" && buf.length >= 30) {
        const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
        const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
        return ok(w, h);
      }
      if (tag === "VP8 " && buf.length >= 30) {
        // Lossy bitstream: 3-byte start code 9D 01 2A then 14-bit dims.
        if (buf[23] === 0x9d && buf[24] === 0x01 && buf[25] === 0x2a) {
          const w = buf.readUInt16LE(26) & 0x3fff;
          const h = buf.readUInt16LE(28) & 0x3fff;
          return ok(w, h);
        }
        return null;
      }
      if (tag === "VP8L" && buf.length >= 25) {
        if (buf[20] !== 0x2f) return null;
        const bits =
          buf[21] | (buf[22] << 8) | (buf[23] << 16) | (buf[24] << 24);
        const w = 1 + (bits & 0x3fff);
        const h = 1 + ((bits >> 14) & 0x3fff);
        return ok(w, h);
      }
      return null;
    }

    return null;
  } catch {
    return null;
  }
}

function ok(w: number, h: number): { w: number; h: number } | null {
  return w > 0 && h > 0 && w < 65536 && h < 65536 ? { w, h } : null;
}
