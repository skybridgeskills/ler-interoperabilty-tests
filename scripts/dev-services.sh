#!/usr/bin/env bash
set -euo pipefail

# Run from the repo root so the relative compose path + .env resolve correctly,
# regardless of the cwd turbo invokes us from.
cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f docker/compose.dev.yml --env-file .env)

cleanup() {
	# Stop (not down) so containers can restart fast; state under
	# docker/.data survives either way. Idempotent — safe to run twice.
	"${COMPOSE[@]}" stop
}

# Guarantee teardown no matter how turbo terminates this task (ctrl-c, quit,
# terminal close) — trap fires on INT/TERM and always on EXIT.
trap cleanup INT TERM EXIT

"${COMPOSE[@]}" up
