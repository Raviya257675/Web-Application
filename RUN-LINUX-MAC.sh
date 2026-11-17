#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

if ! command -v java >/dev/null 2>&1; then
  echo "Java was not found. Install JDK 21+ from https://adoptium.net and try again."
  exit 1
fi

echo ""
echo "  Starting Meridian HMS on http://localhost:8080"
echo "  Press Ctrl+C to stop."
echo ""

java -jar hospital-management-system.jar
