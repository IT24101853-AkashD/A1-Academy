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

# ---- Kafka (Azure Event Hubs, Kafka endpoint) ----
# Namespace name must be globally unique. Standard tier or above is required - Basic has no Kafka endpoint.
EVENTHUBS_NAMESPACE="a1academy-events"
# Event Hubs does not auto-create topics from Kafka clients, so every topic the services use is created here.
KAFKA_TOPICS=("test-topic")

echo "Installing/Upgrading Azure Container Apps extension..."
az extension add --name containerapp --upgrade

echo "--- Provisioning Event Hubs namespace $EVENTHUBS_NAMESPACE (Kafka) ---"
LOCATION=$(az group show --name "$RESOURCE_GROUP" --query location -o tsv)
az eventhubs namespace create \
  --name "$EVENTHUBS_NAMESPACE" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard \
  --enable-kafka true

for TOPIC in "${KAFKA_TOPICS[@]}"; do
  az eventhubs eventhub create \
    --name "$TOPIC" \
    --namespace-name "$EVENTHUBS_NAMESPACE" \
    --resource-group "$RESOURCE_GROUP" \
    --partition-count 2
done

# Least-privilege key for the services: send + listen only, no manage rights.
az eventhubs namespace authorization-rule create \
  --name a1academy-services \
  --namespace-name "$EVENTHUBS_NAMESPACE" \
  --resource-group "$RESOURCE_GROUP" \
  --rights Send Listen

KAFKA_BOOTSTRAP_SERVERS="${EVENTHUBS_NAMESPACE}.servicebus.windows.net:9093"
KAFKA_SASL_PASSWORD=$(az eventhubs namespace authorization-rule keys list \
  --name a1academy-services \
  --namespace-name "$EVENTHUBS_NAMESPACE" \
  --resource-group "$RESOURCE_GROUP" \
  --query primaryConnectionString -o tsv)

for APP_NAME in "$AUTH_APP_NAME" "$ADMIN_APP_NAME" "$STUDENT_APP_NAME" "$TEACHER_APP_NAME"; do
  echo "--- Setting secrets on $APP_NAME ---"
  # Event Hubs' Kafka endpoint expects the literal username "$ConnectionString" (hence single quotes).
  az containerapp update \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --set-env-vars \
      "Jwt__Key=$JWT_KEY" \
      "Admin__Password=$ADMIN_PASSWORD" \
      "ConnectionStrings__DefaultConnection=${DB_CONNECTION_STRING};Pooling=true;Max Pool Size=100;" \
      "EmailSettings__SmtpPassword=$SMTP_PASSWORD" \
      "Kafka__BootstrapServers=$KAFKA_BOOTSTRAP_SERVERS" \
      "Kafka__SecurityProtocol=SaslSsl" \
      "Kafka__SaslMechanism=Plain" \
      'Kafka__SaslUsername=$ConnectionString' \
      "Kafka__SaslPassword=$KAFKA_SASL_PASSWORD"
done

echo "Done! You can check logs using:"
echo "az containerapp logs show --name <APP_NAME> --resource-group $RESOURCE_GROUP --tail 50"
