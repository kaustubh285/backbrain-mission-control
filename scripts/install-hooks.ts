#!/usr/bin/env bun
/**
 * Installs Claude Code hooks into ~/.claude/hooks/backbrain-mc/
 * and registers them in ~/.claude/settings.json
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, copyFileSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME ?? "/";
const CLAUDE_DIR = join(HOME, ".claude");
const HOOKS_DEST = join(CLAUDE_DIR, "hooks", "backbrain-mc");
const SETTINGS_PATH = join(CLAUDE_DIR, "settings.json");
const HOOK_SCRIPT_SRC = join(import.meta.dir, "sample-hooks", "forward-event.sh");

// Ensure destination exists
mkdirSync(HOOKS_DEST, { recursive: true });

// Copy the forwarder script
const destScript = join(HOOKS_DEST, "forward-event.sh");
copyFileSync(HOOK_SCRIPT_SRC, destScript);
// Make executable
Bun.spawnSync(["chmod", "+x", destScript]);
console.log(`✓ Copied hook script to ${destScript}`);

// Read or create settings.json
let settings: Record<string, unknown> = {};
if (existsSync(SETTINGS_PATH)) {
  try {
    settings = JSON.parse(readFileSync(SETTINGS_PATH, "utf8"));
  } catch {
    console.warn("⚠ Could not parse ~/.claude/settings.json — creating fresh hooks section");
  }
}

const hookEvents = [
  "SessionStart",
  "SessionEnd",
  "PreToolUse",
  "PostToolUse",
  "PermissionRequest",
];

const hooksSection: Record<string, unknown[]> = (settings.hooks as Record<string, unknown[]>) ?? {};

for (const event of hookEvents) {
  const existing: unknown[] = hooksSection[event] ?? [];
  const alreadyRegistered = existing.some(
    (h) =>
      typeof h === "object" &&
      h !== null &&
      (h as Record<string, unknown>).command === destScript
  );
  if (!alreadyRegistered) {
    existing.push({ command: destScript, timeout: 5 });
  }
  hooksSection[event] = existing;
}

settings.hooks = hooksSection;
writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
console.log(`✓ Updated ${SETTINGS_PATH}`);
console.log("\n🛰  Hooks installed. Restart your Claude Code sessions to activate telemetry.");
