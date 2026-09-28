import fs from 'node:fs';
import path from 'node:path';

/** Envelope {schemaVersion, data}: a cache of another format is not read after a CLI update (reference t-invest). */
interface CacheEnvelope {
  schemaVersion: number;
  data: unknown;
}

/** Cache data, or null when the file is missing, another schema version, or corrupt (then `warn` is called). */
export function readVersionedCache<T>(filePath: string, schemaVersion: number, warn: (line: string) => void): T | null {
  if (!fs.existsSync(filePath)) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    warn(`Кэш повреждён и будет перезаписан: ${filePath}`);
    return null;
  }
  const envelope = parsed as Partial<CacheEnvelope> | null;
  if (!envelope || typeof envelope !== 'object' || envelope.schemaVersion !== schemaVersion) return null;
  return envelope.data as T;
}

/** Atomic write: tmp file per pid, then rename, so a parallel run never reads half a file. */
export function writeVersionedCache(filePath: string, schemaVersion: number, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tmpPath, JSON.stringify({ schemaVersion, data } satisfies CacheEnvelope));
  fs.renameSync(tmpPath, filePath);
}
