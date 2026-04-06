#!/usr/bin/env bash
# Reads Claude Code hook JSON from stdin and forwards it to the Mission Control daemon.
# Enriches the payload with cwd and git branch before sending.

SOCKET="${MC_SOCKET:-/tmp/backbrain-mc.sock}"

if [ ! -S "$SOCKET" ]; then
  exit 0  # daemon not running, silently skip
fi

# Read stdin
INPUT=$(cat)

# Enrich with cwd and branch
CWD=$(pwd)
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

# Merge extra fields into the JSON payload and send as newline-delimited JSON
printf '%s' "$INPUT" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
import os, subprocess
data.setdefault('cwd', os.getcwd())
try:
    data.setdefault('branch', subprocess.check_output(['git','rev-parse','--abbrev-ref','HEAD'], stderr=subprocess.DEVNULL).decode().strip())
except Exception:
    data.setdefault('branch', 'unknown')
print(json.dumps(data))
" 2>/dev/null \
  | nc -U "$SOCKET" 2>/dev/null || true
