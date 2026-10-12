#!/usr/bin/env bash
# Runs every JMeter plan in this folder against a running stack, builds the HTML dashboard for
# each, and fails if a plan breaks its error-rate or response-time limit. Used by the Test
# Pipeline workflow and by scripts/run-tests.ps1; works in Git Bash on Windows too.
#
# Usage: run-load-test.sh [PROFILE]
#
#   PROFILE   smoke (default) | baseline | stress | spike  - see the table below
#
# Environment:
#   API_PROTOCOL / API_HOST / API_PORT   where the API is            (http / localhost / 5100)
#   MAX_ERROR_PCT                        allowed failed samples, %   (0)
#   MAX_P95_MS                           allowed 95th percentile, ms (5000)
#   JMETER_HOME                          an existing JMeter install; otherwise `jmeter` on PATH
#                                        is used, otherwise JMeter is downloaded into .tools/
#
# Needs the stack started in Development or Testing (the seed step reads the sign-up OTP from
# GET /api/auth/debug-otp) - see docker-compose.test.yml.

set -euo pipefail

profile="${1:-smoke}"
case "$profile" in
    #           users rampUp loops
    smoke)    users=10;  ramp_up=5;  loops=5  ;;   # quick check that fits a shared CI runner
    baseline) users=50;  ramp_up=10; loops=10 ;;   # expected load
    stress)   users=100; ramp_up=10; loops=10 ;;   # twice the expected load
    spike)    users=200; ramp_up=2;  loops=5  ;;   # everyone arrives almost at once
    *) echo "Unknown profile '$profile' (expected smoke, baseline, stress or spike)" >&2; exit 2 ;;
esac

protocol="${API_PROTOCOL:-http}"
host="${API_HOST:-localhost}"
port="${API_PORT:-5100}"
max_error_pct="${MAX_ERROR_PCT:-0}"
max_p95_ms="${MAX_P95_MS:-5000}"

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$here/../.." && pwd)"
results_dir="$here/results/$profile"

JMETER_VERSION="5.6.3"

# Prints the JMeter install directory, downloading JMeter first if there is none.
find_jmeter_home() {
    if [[ -n "${JMETER_HOME:-}" ]] && [[ -f "$JMETER_HOME/bin/ApacheJMeter.jar" ]]; then
        echo "$JMETER_HOME"; return
    fi
    if command -v jmeter > /dev/null 2>&1; then
        local bin_dir
        bin_dir="$(cd "$(dirname "$(command -v jmeter)")" && pwd)"
        if [[ -f "$bin_dir/ApacheJMeter.jar" ]]; then
            dirname "$bin_dir"; return
        fi
    fi

    local tools="$repo_root/.tools"
    local home="$tools/apache-jmeter-$JMETER_VERSION"
    if [[ ! -f "$home/bin/ApacheJMeter.jar" ]]; then
        local archive="apache-jmeter-$JMETER_VERSION.tgz"
        echo "JMeter not found - downloading $JMETER_VERSION into .tools/ ..." >&2
        mkdir -p "$tools"
        # The CDN is fast but only carries current releases; the archive has every release.
        local mirror="https://dlcdn.apache.org/jmeter/binaries"
        local origin="https://archive.apache.org/dist/jmeter/binaries"
        local fetch=(curl -fsSL --proto "=https" --tlsv1.2 --retry 3)
        "${fetch[@]}" -o "$tools/$archive" "$mirror/$archive" || "${fetch[@]}" -o "$tools/$archive" "$origin/$archive"
        # The checksum always comes from apache.org itself, never from the mirror.
        "${fetch[@]}" -o "$tools/$archive.sha512" "$origin/$archive.sha512"
        local expected actual
        expected="$(awk '{ print $1 }' "$tools/$archive.sha512")"
        actual="$(sha512sum "$tools/$archive" | awk '{ print $1 }')"
        if [[ "$expected" != "$actual" ]]; then
            echo "Checksum mismatch for $archive - refusing to use it." >&2
            rm -f "$tools/$archive"
            exit 1
        fi
        tar -xzf "$tools/$archive" -C "$tools"
        rm -f "$tools/$archive" "$tools/$archive.sha512"
    fi
    echo "$home"
}

jmeter_home="$(find_jmeter_home)"
echo "Using JMeter: $jmeter_home"
echo "Profile '$profile': $users users, ${ramp_up}s ramp-up, $loops loops each, against $protocol://$host:$port"

# Cleared before anything can fail, so a failed run never leaves an older run's results behind.
rm -rf "$results_dir"
mkdir -p "$results_dir"

bash "$here/seed-load-test-user.sh" "$protocol://$host:$port"


summary="$results_dir/summary.md"
{
    echo "### Load tests (JMeter): profile \`$profile\`"
    echo
    echo "$users users, ${ramp_up}s ramp-up, $loops loops each. Limits: error rate <= ${max_error_pct}%, 95th percentile <= ${max_p95_ms} ms."
    echo
    echo "| Plan | Samples | Errors | Average | 95th pct | Max | Result |"
    echo "|---|---:|---:|---:|---:|---:|---|"
} > "$summary"

overall=0
for plan in "$here"/*.jmx; do
    name="$(basename "$plan" .jmx)"
    jtl="$results_dir/$name.jtl"
    echo
    echo "=== $name ==="

    # Started through the jar, not bin/jmeter: that launcher script cannot find Java under
    # Git Bash on Windows.
    java -jar "$jmeter_home/bin/ApacheJMeter.jar" -n -t "$plan" -l "$jtl" -j "$results_dir/$name.log" \
        -e -o "$results_dir/$name-report" \
        -Jprotocol="$protocol" -Jhost="$host" -Jport="$port" \
        -Jusers="$users" -JrampUp="$ramp_up" -Jloops="$loops" \
        -JresponseThresholdMs="$max_p95_ms"

    # The .jtl is CSV with a header row; column positions are read from it, not assumed.
    stats="$(awk -F, '
        NR == 1 { for (i = 1; i <= NF; i++) { if ($i == "elapsed") e = i; if ($i == "success") s = i }; next }
        { n++; sum += $e; if ($s != "true") errors++; if ($e > max) max = $e; print $e > "/dev/stderr" }
        END { printf "%d %d %d %d\n", n, errors, (n ? sum / n : 0), max }
    ' "$jtl" 2> "$results_dir/$name.elapsed")"
    read -r samples errors average max <<< "$stats"

    p95="$(sort -n "$results_dir/$name.elapsed" | awk '{ v[NR] = $1 } END { if (NR) { i = int(NR * 0.95); if (i < NR * 0.95) i++; print v[i] } else print 0 }')"
    rm -f "$results_dir/$name.elapsed"

    error_pct="$(awk -v e="$errors" -v n="$samples" 'BEGIN { printf "%.2f", (n ? e * 100 / n : 100) }')"
    verdict="Passed"
    if [[ "$samples" -eq 0 ]] \
        || awk -v a="$error_pct" -v b="$max_error_pct" 'BEGIN { exit !(a > b) }' \
        || [[ "$p95" -gt "$max_p95_ms" ]]; then
        verdict="FAILED"
        overall=1
    fi

    echo "$name: $samples samples, $errors errors (${error_pct}%), avg ${average} ms, p95 ${p95} ms, max ${max} ms -> $verdict"
    echo "| $name | $samples | $errors (${error_pct}%) | ${average} ms | ${p95} ms | ${max} ms | $verdict |" >> "$summary"
done

echo >> "$summary"
echo
echo "HTML dashboards and raw results: $results_dir"
exit "$overall"
