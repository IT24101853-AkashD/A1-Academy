#!/usr/bin/env bash
# One-time DevOps setup for the 4 backend Container Apps.
# Requires: az login
set -euo pipefail

# ---- fill these in with the real Azure resource names ----
RESOURCE_GROUP="rg-a1-academy-backend"
AUTH_APP_NAME="a1academy-auth"
ADMIN_APP_NAME="a1academy-admin"
STUDENT_APP_NAME="a1academy-student"
TEACHER_APP_NAME="a1academy-teacher"

# ---- fill these in with the real secret values ----
JWT_KEY="<REAL_JWT_KEY>"
ADMIN_PASSWORD="<REAL_ADMIN_PASSWORD>"
DB_CONNECTION_STRING="<REAL_POSTGRES_CONNECTION_STRING>"
SMTP_PASSWORD="<REAL_GMAIL_APP_PASSWORD>"

echo "Installing/Upgrading Azure Container Apps extension..."
az extension add --name containerapp --upgrade

for APP_NAME in "$AUTH_APP_NAME" "$ADMIN_APP_NAME" "$STUDENT_APP_NAME" "$TEACHER_APP_NAME"; do
  echo "--- Setting secrets on $APP_NAME ---"
  az containerapp update \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --set-env-vars \
      "Jwt__Key=$JWT_KEY" \
      "Admin__Password=$ADMIN_PASSWORD" \
      "ConnectionStrings__DefaultConnection=$DB_CONNECTION_STRING" \
      "EmailSettings__SmtpPassword=$SMTP_PASSWORD"
done

echo "Done! You can check logs using:"
echo "az containerapp logs show --name <APP_NAME> --resource-group $RESOURCE_GROUP --tail 50"
