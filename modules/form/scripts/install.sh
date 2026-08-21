#!/usr/bin/env bash
set -euo pipefail

module_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repository_root="$(cd "$module_root/../.." && pwd)"

command -v node >/dev/null 2>&1 || {
  echo 'Node.js 20 or newer is required.' >&2
  exit 1
}

cd "$repository_root"
exec node "$module_root/scripts/deploy.mjs" "$@"
