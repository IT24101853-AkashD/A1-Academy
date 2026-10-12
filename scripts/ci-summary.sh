#!/usr/bin/env bash
# Prints one test layer's results as a Markdown section, for the Test Pipeline's run summary.
#
#   ci-summary.sh backend  <results dir>   - reads *.trx and coverage.cobertura.xml (dotnet test)
#   ci-summary.sh e2e      <results dir>   - reads *.trx from the Selenium run (dotnet test)
#   ci-summary.sh frontend <frontend dir>  - reads reports/junit.xml and coverage/coverage-summary.json (Vitest)
#
# Uses only grep/sed so it runs the same on a GitHub runner and in Git Bash.

set -u

layer="${1:?usage: ci-summary.sh <backend|e2e|frontend> <dir>}"
dir="${2:?usage: ci-summary.sh <backend|e2e|frontend> <dir>}"

# attr <name> <text> - the value of the first name="value" in the text, or nothing.
attr() {
    printf '%s' "$2" | sed -n "s/.*[[:space:]]$1=\"\([^\"]*\)\".*/\1/p" | head -n 1
}

print_section() {
    local title="$1" total="$2" passed="$3" failed="$4" coverage="$5"
    local verdict="Passed"
    if [ -z "$total" ]; then
        verdict="No results found"
    elif [ "${failed:-0}" != "0" ]; then
        verdict="Failed"
    fi

    echo "### $title: $verdict"
    echo
    echo "| Tests | Passed | Failed | Line coverage |"
    echo "|---:|---:|---:|---:|"
    echo "| ${total:--} | ${passed:--} | ${failed:--} | ${coverage:--} |"
    echo
}

# trx_section <title> <results dir> - a dotnet test run, with coverage when it was collected.
trx_section() {
    local title="$1" results="$2"
    local trx cobertura counters rate total="" passed="" failed="" coverage=""
    trx="$(find "$results" -name '*.trx' 2>/dev/null | head -n 1)"
    cobertura="$(find "$results" -name 'coverage.cobertura.xml' 2>/dev/null | head -n 1)"

    if [ -n "$trx" ]; then
        counters="$(grep -o '<Counters[^>]*>' "$trx" | head -n 1)"
        total="$(attr total "$counters")"
        passed="$(attr passed "$counters")"
        failed="$(attr failed "$counters")"
    fi
    if [ -n "$cobertura" ]; then
        rate="$(attr line-rate "$(grep -o '<coverage[^>]*>' "$cobertura" | head -n 1)")"
        [ -n "$rate" ] && coverage="$(awk -v r="$rate" 'BEGIN { printf "%.1f%%", r * 100 }')"
    fi

    print_section "$title" "$total" "$passed" "$failed" "$coverage"
}

case "$layer" in
    backend)
        trx_section "Backend tests (xUnit)" "$dir"
        ;;

    e2e)
        trx_section "Browser E2E tests (Selenium)" "$dir"
        ;;

    frontend)
        junit="$dir/reports/junit.xml"
        summary="$dir/coverage/coverage-summary.json"
        total="" passed="" failed="" coverage=""

        if [ -f "$junit" ]; then
            suites="$(grep -o '<testsuites[^>]*>' "$junit" | head -n 1)"
            total="$(attr tests "$suites")"
            failures="$(attr failures "$suites")"
            errors="$(attr errors "$suites")"
            failed=$(( ${failures:-0} + ${errors:-0} ))
            passed=$(( ${total:-0} - failed ))
        fi
        if [ -f "$summary" ]; then
            pct="$(tr -d '\n' < "$summary" | sed -n 's/.*"total"[^}]*"lines"[^}]*"pct":[[:space:]]*\([0-9.]*\).*/\1/p')"
            [ -n "$pct" ] && coverage="$pct%"
        fi

        print_section "Frontend tests (Vitest)" "$total" "$passed" "$failed" "$coverage"
        ;;

    *)
        echo "ci-summary.sh: unknown layer '$layer' (expected backend, e2e or frontend)" >&2
        exit 2
        ;;
esac
