#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pid_file="$project_root/.a3s-form/playground.pid"
if [[ ! -f "$pid_file" ]]; then
  echo 'No A3S Form local server PID was found.'
  exit 0
fi

server_pid="$(<"$pid_file")"
if [[ "$server_pid" =~ ^[0-9]+$ ]] && kill -0 "$server_pid" 2>/dev/null; then
  command_line="$(ps -p "$server_pid" -o command= 2>/dev/null || true)"
  if [[ "$command_line" == *'scripts/serve-playground.mjs'* ]]; then
    kill "$server_pid"
    echo "Stopped the A3S Form local server (PID ${server_pid})."
  else
    echo 'The PID does not belong to A3S Form; no process was stopped.'
  fi
else
  echo 'The PID is stale; no process was stopped.'
fi
rm -f -- "$pid_file"
