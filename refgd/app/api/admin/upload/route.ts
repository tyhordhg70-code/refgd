import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import { createHash } from "crypto";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/upload
 *
 * Accepts a multipart form upload with a single `file` field.
 * Returns { url: string } — a path the browser can use as an <img> src.
 *
 * Replaces the old pattern of reading files as data-URIs and storing them
 * inline in content_blocks. A 4 MB image as base64 is ~5.3 MB of text in
 * the DB row, breaks the PUT /api/admin/content JSON payload limit, and
 * forces every page load to download the full blob inline.
 *
 * Storage:
 *   Writes to <cwd>/public/uploads/ (Next.js serves this statically).
 *   Filename = SHA-256 content hash + extension (deduplicates automatically).
 *   For ephemeral platforms (Render free tier, Vercel) set UPLOAD_DIR to a
 *   mounted persistent volume and UPLOAD_BASE_URL to its public URL.
 */
export async function POST(req: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing `file` field" }, { status: 400 });
  }

  const ALLOWED = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/avif"];
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
  }

  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 8 MB limit" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 32);
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const filename = `${hash}.${ext}`;

  const uploadDir = process.env.UPLOAD_DIR
    ? path.resolve(process.env.UPLOAD_DIR)
    : path.join(process.cwd(), "public", "uploads");

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);

  const baseUrl = (process.env.UPLOAD_BASE_URL ?? "/uploads").replace(/\/$/, "");
  return NextResponse.json({ url: `${baseUrl}/${filename}`, filename });
}
