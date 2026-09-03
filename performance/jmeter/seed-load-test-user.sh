#!/usr/bin/env bash
# Creates (once) the Student account that login-load-test.jmx logs into repeatedly.
#
# Login is idempotent, so a single seeded account is reused across every load-test run -
# JMeter threads should never register their own accounts, that would measure signup/DB
# write cost instead of pure login/auth performance.
#
# Requires the backend running locally in Development (so GET /api/auth/debug-otp is
# enabled) at the URL below. Safe to re-run: if the account already exists, registration
# fails with "Email already exists" and the script just confirms login still works.
#
# Usage: ./seed-load-test-user.sh [API_URL] [EMAIL] [PASSWORD]
set -euo pipefail

API="${1:-http://localhost:5123}"
EMAIL="${2:-jmeter.loadtest@example.com}"
PASSWORD="${3:-LoadTest!2026Secure}"
FIRSTNAME="LoadTest"

echo "Seeding load-test account '$EMAIL' against $API ..."

login_check() {
  curl -sS -o /dev/null -w "%{http_code}" -X POST "$API/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
}

status=$(login_check)
if [ "$status" = "200" ]; then
  echo "Account already exists and logs in successfully - nothing to do."
  exit 0
fi

echo "Account not usable yet (login returned $status) - registering it now."

curl -sS -X POST "$API/api/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"firstName\":\"$FIRSTNAME\"}" > /dev/null

otp_json=$(curl -sS "$API/api/auth/debug-otp?email=$EMAIL")
otp=$(echo "$otp_json" | sed -n 's/.*"otp":"\{0,1\}\([0-9]*\)"\{0,1\}.*/\1/p')

if [ -z "$otp" ]; then
  echo "Could not read a pending OTP from $API/api/auth/debug-otp." >&2
  echo "That endpoint only responds in Development/Testing - is the API running with ASPNETCORE_ENVIRONMENT=Development?" >&2
  echo "Raw response: $otp_json" >&2
  exit 1
fi

curl -sS -X POST "$API/api/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"otp\":\"$otp\"}" > /dev/null

curl -sS -X POST "$API/api/auth/register" \
  -F "firstName=$FIRSTNAME" \
  -F "email=$EMAIL" \
  -F "password=$PASSWORD" \
  -F "role=Student" > /dev/null

status=$(login_check)
if [ "$status" = "200" ]; then
  echo "Seed account ready: $EMAIL"
else
  echo "Registered the account but login still returned $status - check the API logs." >&2
  exit 1
fi
