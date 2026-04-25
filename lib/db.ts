/**
 * Tiny atomic JSON-file store.
 *
 * Why not SQLite? Zero native deps means this app installs and runs on any
 * Node host without a build toolchain. For a few hundred stores + admin
 * sessions this is plenty fast and the file is human-readable / git-trackable.
 *
 * Atomic writes via tmp-file + rename so a crash mid-write can't corrupt data.
 */
import fs from "node:fs";
import path from "node:path";

export interface DbShape {
  stores: Record<string, unknown>;       // id -> Store
  contentBlocks: Record<string, { value: string; updatedAt: string }>;
  admins: Record<string, { passwordHash: string; createdAt: string }>;
}

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "data", "refgd.db.json");

let _cache: DbShape | null = null;
let _writeQueue: Promise<void> = Promise.resolve();

function emptyDb(): DbShape {
  return { stores: {}, contentBlocks: {}, admins: {} };
}

function readSync(): DbShape {
  if (_cache) return _cache;
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    _cache = emptyDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(_cache, null, 2));
    return _cache;
  }
  try {
    _cache = JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as DbShape;
  } catch {
    _cache = emptyDb();
  }
  // ensure all tables present
  if (!_cache.stores) _cache.stores = {};
  if (!_cache.contentBlocks) _cache.contentBlocks = {};
  if (!_cache.admins) _cache.admins = {};
  return _cache;
}

function writeSync(db: DbShape): void {
  _cache = db;
  const tmp = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_PATH);
}

/** Read the in-memory snapshot. Cheap. */
export function db(): DbShape {
  return readSync();
}

/** Mutate the db with a callback. Serialises writes to avoid races. */
export function withDb<T>(fn: (d: DbShape) => T): T {
  const d = readSync();
  const result = fn(d);
  // Serialise writes
  _writeQueue = _writeQueue.then(() => {
    writeSync(d);
  });
  return result;
}
