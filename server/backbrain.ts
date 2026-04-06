import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import type { BackbrainNote } from "./types";

function readDumps(bbDir: string): BackbrainNote[] {
  const dumpsDir = join(bbDir, "dumps");
  if (!existsSync(dumpsDir)) return [];

  const notes: BackbrainNote[] = [];
  let files: string[] = [];
  try {
    files = readdirSync(dumpsDir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }

  for (const file of files) {
    try {
      const raw = JSON.parse(readFileSync(join(dumpsDir, file), "utf8"));

      // Backbrain format: { fluxVersion, month, dumps: [...] }
      // Also handle plain arrays or other wrapper keys for forward compatibility
      let entries: unknown[];
      if (Array.isArray(raw)) {
        entries = raw;
      } else if (raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).dumps)) {
        entries = (raw as Record<string, unknown>).dumps as unknown[];
      } else if (raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).notes)) {
        entries = (raw as Record<string, unknown>).notes as unknown[];
      } else if (raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).data)) {
        entries = (raw as Record<string, unknown>).data as unknown[];
      } else {
        entries = [raw];
      }

      for (const entry of entries) {
        if (!entry || typeof entry !== "object") continue;
        const e = entry as Record<string, unknown>;

        const text = (e.message ?? e.text ?? e.content ?? "") as string;
        const rawDate = e.timestamp ?? e.createdAt;
        const createdAt =
          typeof rawDate === "number"
            ? rawDate
            : rawDate
            ? new Date(rawDate as string).getTime()
            : 0;

        notes.push({
          id: (e.id ?? e._id ?? `${file}-${Math.random()}`) as string,
          text,
          tags: Array.isArray(e.tags) ? (e.tags as string[]) : [],
          branch: (e.branch as string) || undefined,
          workingDir: (e.workingDir ?? e.cwd ?? undefined) as string | undefined,
          createdAt,
        });
      }
    } catch (err) {
      console.error(`[backbrain] failed to parse ${file}:`, err);
    }
  }
  return notes;
}

export function readBackbrainNotes(
  projectDir: string,
  branch?: string
): BackbrainNote[] {
  const bbDir = join(projectDir, ".bb");
  if (!existsSync(bbDir)) return [];

  const all = readDumps(bbDir);
  if (!branch) return all;

  return all.filter(
    (n) => !n.branch || n.branch.toLowerCase() === branch.toLowerCase()
  );
}

/** Walk up to 2 levels deep from a root dir to find .bb directories */
export function discoverBbDirs(rootDir: string): string[] {
  const found: string[] = [];
  try {
    const entries = readdirSync(rootDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const sub = join(rootDir, entry.name);
      if (entry.name === ".bb") {
        found.push(rootDir);
        continue;
      }
      // one level deeper
      try {
        const subEntries = readdirSync(sub, { withFileTypes: true });
        if (subEntries.some((e) => e.isDirectory() && e.name === ".bb")) {
          found.push(sub);
        }
      } catch {}
    }
  } catch {}
  return found;
}
