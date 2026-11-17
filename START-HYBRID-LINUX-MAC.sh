#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v java >/dev/null || { echo 'Java 21+ is required'; exit 1; }
command -v node >/dev/null || { echo 'Node.js 20+ is required'; exit 1; }
command -v npm >/dev/null || { echo 'npm is required'; exit 1; }
if [[ ! -d gateway/node_modules/express ]]; then
  echo 'Installing Express gateway dependencies (Internet required on first run)...'
  (cd gateway && npm install --no-audit --no-fund)
fi
java -jar hospital-management-system.jar &
java_pid=$!
trap 'kill "$java_pid" 2>/dev/null || true' EXIT INT TERM
echo 'Open http://localhost:5000 (Feedback & Support: http://localhost:5000/support)'
(cd gateway && npm start)
