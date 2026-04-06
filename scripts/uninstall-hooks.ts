#!/usr/bin/env bun
/**
 * Removes Claude Code hooks installed by install-hooks.ts
 * - Removes hook entries from ~/.claude/settings.json
 * - Deletes ~/.claude/hooks/backbrain-mc/
 */
import { readFileSync, writeFileSync, existsSync, rmSync } from "fs";
import { join } from "path";

const HOME = process.env.HOME ?? "/";
const CLAUDE_DIR = join(HOME, ".claude");
const HOOKS_DEST = join(CLAUDE_DIR, "hooks", "backbrain-mc");
const SETTINGS_PATH = join(CLAUDE_DIR, "settings.json");

const hookEvents = [
  "SessionStart",
  "SessionEnd",
  "PreToolUse",
  "PostToolUse",
  "PermissionRequest",
];

// Remove entries from settings.json
if (existsSync(SETTINGS_PATH)) {
  try {
    const settings = JSON.parse(readFileSync(SETTINGS_PATH, "utf8")) as Record<string, unknown>;
    const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>;

    for (const event of hookEvents) {
      if (!Array.isArray(hooks[event])) continue;
      hooks[event] = hooks[event].filter((h) => {
        if (typeof h !== "object" || h === null) return true;
        const cmd = (h as Record<string, unknown>).command as string | undefined;
        return !cmd?.includes("backbrain-mc");
      });
      if (hooks[event].length === 0) delete hooks[event];
    }

    if (Object.keys(hooks).length === 0) delete settings.hooks;
    else settings.hooks = hooks;

    writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    console.log(`✓ Removed hooks from ${SETTINGS_PATH}`);
  } catch (e) {
    console.error(`⚠ Could not update ${SETTINGS_PATH}:`, e);
  }
} else {
  console.log("No ~/.claude/settings.json found, nothing to update.");
}

// Remove the hook scripts directory
if (existsSync(HOOKS_DEST)) {
  rmSync(HOOKS_DEST, { recursive: true, force: true });
  console.log(`✓ Removed ${HOOKS_DEST}`);
} else {
  console.log(`No hooks directory found at ${HOOKS_DEST}, nothing to remove.`);
}

console.log("\n🛰  Hooks uninstalled. Restart your Claude Code sessions to apply.");
