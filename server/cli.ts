#!/usr/bin/env bun
/**
 * backbrain-mc CLI entry point
 *
 * Usage:
 *   backbrain-mc                  → start the daemon (default)
 *   backbrain-mc start            → start the daemon
 *   backbrain-mc install-hooks    → install Claude Code hooks into ~/.claude
 *   backbrain-mc --version / -v   → print version
 *   backbrain-mc --help / -h      → print help
 */

import { join } from "node:path";

const VERSION = "0.1.0";

const HELP = `
backbrain-mc — Mission Control for Claude Code sessions

Usage:
  backbrain-mc [command]

Commands:
  start            Start the daemon and open the UI (default)
  install-hooks    Install Claude Code hooks into ~/.claude
  uninstall-hooks  Remove Claude Code hooks from ~/.claude

Options:
  -v, --version    Print version
  -h, --help       Print this help

Environment:
  MC_PORT          HTTP/WebSocket port (default: 4321)
  MC_SOCKET        Unix socket path    (default: /tmp/backbrain-mc.sock)

Examples:
  backbrain-mc
  backbrain-mc start
  MC_PORT=5000 backbrain-mc start
  backbrain-mc install-hooks
`.trim();

const arg = process.argv[2];

if (arg === "--version" || arg === "-v") {
  console.log(VERSION);
  process.exit(0);
}

if (arg === "--help" || arg === "-h") {
  console.log(HELP);
  process.exit(0);
}

if (arg === "install-hooks") {
  const hooksScript = join(import.meta.dir, "../scripts/install-hooks.ts");
  await import(hooksScript);
  process.exit(0);
}

if (arg === "uninstall-hooks") {
  const uninstallScript = join(import.meta.dir, "../scripts/uninstall-hooks.ts");
  await import(uninstallScript);
  process.exit(0);
}

// Default: start the daemon (handles both bare invocation and explicit "start")
if (!arg || arg === "start") {
  await import("./index.ts");
} else {
  console.error(`Unknown command: ${arg}\nRun 'backbrain-mc --help' for usage.`);
  process.exit(1);
}
