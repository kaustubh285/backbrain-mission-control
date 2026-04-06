import type { GitCommit } from "./types";

export async function getCurrentBranch(cwd: string): Promise<string | null> {
  try {
    const proc = Bun.spawn(["git", "rev-parse", "--abbrev-ref", "HEAD"], {
      cwd,
      stdout: "pipe",
      stderr: "pipe",
    });
    const text = await new Response(proc.stdout).text();
    return text.trim() || null;
  } catch {
    return null;
  }
}

export async function getRecentCommits(
  cwd: string,
  limit = 20
): Promise<GitCommit[]> {
  try {
    const proc = Bun.spawn(
      ["git", "log", `--max-count=${limit}`, "--format=%H\x1f%s\x1f%ae\x1f%ct"],
      { cwd, stdout: "pipe", stderr: "pipe" }
    );
    const text = await new Response(proc.stdout).text();
    return text
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, message, author, ts] = line.split("\x1f");
        return {
          hash,
          message,
          author,
          timestamp: Number(ts) * 1000,
        };
      });
  } catch {
    return [];
  }
}

export async function getRepoRoot(cwd: string): Promise<string | null> {
  try {
    const proc = Bun.spawn(
      ["git", "rev-parse", "--show-toplevel"],
      { cwd, stdout: "pipe", stderr: "pipe" }
    );
    const text = await new Response(proc.stdout).text();
    return text.trim() || null;
  } catch {
    return null;
  }
}
