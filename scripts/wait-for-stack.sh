#!/usr/bin/env bash
# Waits until every service behind the gateway answers, then exits 0. Exits 1 on timeout.
#
# The service containers publish no ports and their images have no curl, so readiness is
# checked from outside, through one route per service. Any HTTP status below 500 means that
# service has started and finished its migrations (401 is the expected answer on the
# authenticated routes); 502/503 means the gateway is up but the service behind it is not.
#
# Usage: wait-for-stack.sh [GATEWAY_URL] [TIMEOUT_SECONDS]

set -u

gateway="${1:-http://localhost:5100}"
timeout="${2:-180}"

routes=(
    "auth:/api/auth/debug-otp?email=readiness@example.com"
    "admin:/api/users"
    "teacher:/api/teacher/classes"
    "student:/api/recognition/board"
)

deadline=$(( $(date +%s) + timeout ))

for entry in "${routes[@]}"; do
    service="${entry%%:*}"
    path="${entry#*:}"
    while true; do
        status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$gateway$path" || true)"
        if [ "${status:-000}" != "000" ] && [ "$status" -lt 500 ]; then
            echo "$service is up (HTTP $status)"
            break
        fi
        if [ "$(date +%s)" -ge "$deadline" ]; then
            echo "Timed out after ${timeout}s waiting for $service at $gateway$path (last status: ${status:-none})" >&2
            exit 1
        fi
        sleep 3
    done
done

echo "Stack is ready at $gateway"
