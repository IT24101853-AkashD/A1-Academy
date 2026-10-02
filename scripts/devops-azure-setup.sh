#!/usr/bin/env bash
# Production configuration for the A1 Academy backend Container Apps. Run it in Azure Cloud Shell
# (Bash) or anywhere with `az login` done.
#
# Safe to re-run: it only changes what the chosen command is for, never prints secret values,
# and never overwrites a secret you didn't supply. Secret values are NEVER written into this
# file - they come from environment variables or a hidden prompt when you run it.
#
# Usage:  bash scripts/devops-azure-setup.sh <command> [app ...]
#
#   status            Read-only. Per app: image, when the running container started, which settings
#                     are secret references vs plain text, and /health/ready.
#   kafka             Ensure the Event Hubs (Kafka) namespace, topics and access key exist, store the
#                     key as the `kafka-sasl-password` secret and point the Kafka__* settings at it.
#   secrets           Create or rotate app secrets and point the apps' settings at them (secretref).
#                     Prompts for each one; leave a prompt empty to keep the current value.
#   restart [app ...] Stop/start the apps and wait until each is healthy. REQUIRED after `kafka`
#                     or `secrets`: on this Express environment, setting changes don't reach the
#                     running container until it is restarted. Default: the 4 backend services.
#
# Secret inputs for `secrets` (env vars, otherwise prompted):
#   JWT_KEY               JWT signing key, shared by all services. Use "generate" for a new random one.
#                         Rotating it logs every user out.
#   DB_CONNECTION_STRING  Full Npgsql connection string. To rotate the DB password: run `secrets` with
#                         the new string, then `az postgres flexible-server update --admin-password`,
#                         then `restart` straight away (the apps are down in between).
#   ADMIN_PASSWORD        Only used to create the FIRST Admin account on an empty database; changing it
#                         does not change an existing Admin's password.
#   SMTP_PASSWORD         Gmail app password for the OTP / notification emails.
#   SENDER_EMAIL          (not a secret) Gmail address the emails are sent from. It is also the SMTP login,
#                         so it must belong to the same account as SMTP_PASSWORD - change both together.
#
# Typical runs:
#   bash scripts/devops-azure-setup.sh status
#   SENDER_EMAIL=me@gmail.com bash scripts/devops-azure-setup.sh secrets && bash scripts/devops-azure-setup.sh restart
set -euo pipefail

RESOURCE_GROUP="A1-Academy-RG"
BACKEND_APPS=(a1academy-auth a1academy-admin a1academy-teacher a1academy-student)
ALL_APPS=("${BACKEND_APPS[@]}" a1academy-gateway)

# Kafka (Azure Event Hubs, Kafka endpoint). Standard tier or above - Basic has no Kafka endpoint.
# Event Hubs doesn't auto-create topics from Kafka clients, so every topic the services use goes here.
EVENTHUBS_NAMESPACE="a1academy-kafka-sprint4"
KAFKA_TOPICS=(test-topic)
KAFKA_ACCESS_RULE="a1academy-services"

# secret name in Azure | app setting (env var) that reads it
SECRET_SETTINGS=(
  "jwt-key|Jwt__Key|JWT_KEY"
  "db-connection|ConnectionStrings__DefaultConnection|DB_CONNECTION_STRING"
  "admin-password|Admin__Password|ADMIN_PASSWORD"
  "smtp-password|EmailSettings__SmtpPassword|SMTP_PASSWORD"
)

API_VERSION="2024-03-01"

# Hide az's informational warnings (e.g. "behavior altered by extension") so the script's own
# output - especially the plain-text-secret WARNINGs from `status` - stays readable. Errors still show.
export AZURE_CORE_ONLY_SHOW_ERRORS=true

log() { printf '\n== %s\n' "$*"; }

require_login() {
  az account show -o none 2>/dev/null || { echo "Not logged in: run 'az login' first." >&2; exit 1; }
  az group show -n "$RESOURCE_GROUP" -o none 2>/dev/null || { echo "Resource group $RESOURCE_GROUP not found in this subscription." >&2; exit 1; }
  az extension add --name containerapp --upgrade --yes --only-show-errors
}

app_url() {
  echo "https://management.azure.com/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.App/containerApps/$1"
}

cmd_status() {
  for app in "${ALL_APPS[@]}"; do
    log "$app"
    az containerapp show -n "$app" -g "$RESOURCE_GROUP" \
      --query "{image:properties.template.containers[0].image, running:properties.runningStatus}" -o tsv | sed 's/^/  image\/status: /'
    local revision
    revision=$(az containerapp show -n "$app" -g "$RESOURCE_GROUP" --query properties.latestRevisionName -o tsv)
    az containerapp replica list -n "$app" -g "$RESOURCE_GROUP" --revision "$revision" \
      --query "[].properties.createdTime" -o tsv | sed 's/^/  container started: /'
    # Show which sensitive-looking settings are secret references and flag any plain-text ones.
    az containerapp show -n "$app" -g "$RESOURCE_GROUP" \
      --query "properties.template.containers[0].env[].[name, secretRef || '']" -o tsv |
      while IFS=$'\t' read -r name ref; do
        case "$name" in
          *Key*|*Password*|*Connection*|*Secret*)
            if [ -n "$ref" ]; then echo "  $name -> secret '$ref'"
            else echo "  WARNING: $name is stored as PLAIN TEXT"; fi ;;
        esac
      done
    local fqdn
    fqdn=$(az containerapp show -n "$app" -g "$RESOURCE_GROUP" --query properties.configuration.ingress.fqdn -o tsv)
    echo "  /health/ready -> $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$fqdn/health/ready" || true)"
  done
}

cmd_kafka() {
  log "Event Hubs namespace $EVENTHUBS_NAMESPACE"
  if ! az eventhubs namespace show -n "$EVENTHUBS_NAMESPACE" -g "$RESOURCE_GROUP" -o none 2>/dev/null; then
    az eventhubs namespace create -n "$EVENTHUBS_NAMESPACE" -g "$RESOURCE_GROUP" \
      --location "$(az group show -n "$RESOURCE_GROUP" --query location -o tsv)" \
      --sku Standard --enable-kafka true -o none
    echo "  created"
  else
    echo "  exists"
  fi

  for topic in "${KAFKA_TOPICS[@]}"; do
    if az eventhubs eventhub show -n "$topic" --namespace-name "$EVENTHUBS_NAMESPACE" -g "$RESOURCE_GROUP" -o none 2>/dev/null; then
      echo "  topic $topic exists"
    else
      az eventhubs eventhub create -n "$topic" --namespace-name "$EVENTHUBS_NAMESPACE" -g "$RESOURCE_GROUP" --partition-count 2 -o none
      echo "  topic $topic created"
    fi
  done

  # Send + Listen only: the services never need to manage the namespace.
  if ! az eventhubs namespace authorization-rule show -n "$KAFKA_ACCESS_RULE" --namespace-name "$EVENTHUBS_NAMESPACE" -g "$RESOURCE_GROUP" -o none 2>/dev/null; then
    az eventhubs namespace authorization-rule create -n "$KAFKA_ACCESS_RULE" --namespace-name "$EVENTHUBS_NAMESPACE" \
      -g "$RESOURCE_GROUP" --rights Send Listen -o none
  fi
  local conn
  conn=$(az eventhubs namespace authorization-rule keys list -n "$KAFKA_ACCESS_RULE" --namespace-name "$EVENTHUBS_NAMESPACE" \
    -g "$RESOURCE_GROUP" --query primaryConnectionString -o tsv)

  for app in "${BACKEND_APPS[@]}"; do
    log "$app: Kafka settings"
    az containerapp secret set -n "$app" -g "$RESOURCE_GROUP" --secrets "kafka-sasl-password=$conn" -o none
    # Event Hubs' Kafka endpoint expects the literal username "$ConnectionString" (hence single quotes).
    # shellcheck disable=SC2016
    az containerapp update -n "$app" -g "$RESOURCE_GROUP" -o none --set-env-vars \
      "Kafka__BootstrapServers=$EVENTHUBS_NAMESPACE.servicebus.windows.net:9093" \
      "Kafka__SecurityProtocol=SaslSsl" \
      "Kafka__SaslMechanism=Plain" \
      'Kafka__SaslUsername=$ConnectionString' \
      "Kafka__SaslPassword=secretref:kafka-sasl-password"
    echo "  done"
  done
  echo
  echo "Next: bash $0 restart   (settings only take effect after a restart)"
}

cmd_secrets() {
  local changed=0
  for entry in "${SECRET_SETTINGS[@]}"; do
    IFS='|' read -r secret setting var <<< "$entry"
    local value="${!var:-}"
    if [ -z "$value" ] && [ -t 0 ]; then
      read -rsp "$var (leave empty to keep current): " value; echo
    fi
    [ -z "$value" ] && { echo "  $var: unchanged"; continue; }
    if [ "$var" = "JWT_KEY" ] && [ "$value" = "generate" ]; then
      value=$(openssl rand -hex 48)
      echo "  JWT_KEY: generated a new random key"
    fi

    for app in "${BACKEND_APPS[@]}"; do
      az containerapp secret set -n "$app" -g "$RESOURCE_GROUP" --secrets "$secret=$value" -o none
      az containerapp update -n "$app" -g "$RESOURCE_GROUP" --set-env-vars "$setting=secretref:$secret" -o none
    done
    echo "  $var: stored as secret '$secret' on ${#BACKEND_APPS[@]} apps"
    changed=1
  done

  # The sender address isn't secret, so it's a plain setting (visible input). It is the SMTP
  # login too, so it should change together with SMTP_PASSWORD.
  local sender="${SENDER_EMAIL:-}"
  if [ -z "$sender" ] && [ -t 0 ]; then
    read -rp "SENDER_EMAIL (leave empty to keep current): " sender
  fi
  if [ -n "$sender" ]; then
    for app in "${BACKEND_APPS[@]}"; do
      az containerapp update -n "$app" -g "$RESOURCE_GROUP" --set-env-vars "EmailSettings__SenderEmail=$sender" -o none
    done
    echo "  SENDER_EMAIL: set to $sender on ${#BACKEND_APPS[@]} apps"
    changed=1
  else
    echo "  SENDER_EMAIL: unchanged"
  fi
  [ "$changed" = 1 ] && { echo; echo "Next: bash $0 restart   (secrets only take effect after a restart)"; } || true
}

restart_app() {
  local app=$1 url start revision fqdn code
  url=$(app_url "$app")
  start=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  log "$app: restarting"
  az rest --method post --url "$url/stop?api-version=$API_VERSION" -o none
  for _ in $(seq 1 12); do
    [ "$(az containerapp show -n "$app" -g "$RESOURCE_GROUP" --query properties.runningStatus -o tsv)" = "Stopped" ] && break
    sleep 5
  done
  az rest --method post --url "$url/start?api-version=$API_VERSION" -o none

  # Healthy only once a container started after this restart is running AND it can reach the DB.
  revision=$(az containerapp show -n "$app" -g "$RESOURCE_GROUP" --query properties.latestRevisionName -o tsv)
  fqdn=$(az containerapp show -n "$app" -g "$RESOURCE_GROUP" --query properties.configuration.ingress.fqdn -o tsv)
  for _ in $(seq 1 36); do
    if az containerapp replica list -n "$app" -g "$RESOURCE_GROUP" --revision "$revision" \
         --query "[].[properties.createdTime, properties.runningState]" -o tsv |
       awk -v start="$start" '$2 == "Running" && $1 > start { found = 1 } END { exit !found }'; then
      code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$fqdn/health/ready" || true)
      if [ "$code" = "200" ]; then echo "  OK: new container running and /health/ready -> 200"; return 0; fi
    fi
    sleep 10
  done
  echo "  ERROR: $app did not become healthy within 6 minutes (last /health/ready: ${code:-none})" >&2
  return 1
}

cmd_restart() {
  local apps=("$@") failed=0
  [ ${#apps[@]} -eq 0 ] && apps=("${BACKEND_APPS[@]}")
  for app in "${apps[@]}"; do
    [[ "$app" == a1academy-* ]] || app="a1academy-$app"
    restart_app "$app" || failed=1
  done
  return "$failed"
}

main() {
  local command=${1:-}
  shift || true
  case "$command" in
    status|kafka|secrets|restart) require_login; "cmd_$command" "$@" ;;
    *) sed -n '2,35p' "$0"; exit 1 ;;
  esac
}

main "$@"
