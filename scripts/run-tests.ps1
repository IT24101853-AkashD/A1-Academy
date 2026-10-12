<#
.SYNOPSIS
    Runs the same test layers as the Test Pipeline workflow (.github/workflows/test-pipeline.yml)
    on this machine and prints one combined result table.

.DESCRIPTION
    backend   dotnet test (xUnit), everything except the Selenium Category=E2E suite.
    frontend  Vitest with coverage.
    e2e       Selenium journeys in a real browser, against the full stack.
    load      JMeter plans, against the full stack.

    e2e and load need Docker running: the stack is built and started from
    docker-compose.yml + docker-compose.test.yml (stop the development stack first - it uses the
    same container names) and removed again afterwards unless -KeepStack is given.

    Reports land in test-results/, frontend/reports, frontend/coverage and
    performance/jmeter/results. Exits 0 only if every layer that ran passed.

.EXAMPLE
    ./scripts/run-tests.ps1                               # every layer
    ./scripts/run-tests.ps1 -Layer backend,frontend       # the two that need no Docker
    ./scripts/run-tests.ps1 -Layer load -LoadProfile stress -KeepStack
#>
param(
    [ValidateSet('all', 'backend', 'frontend', 'e2e', 'load')]
    [string[]]$Layer = 'all',

    [ValidateSet('smoke', 'baseline', 'stress', 'spike')]
    [string]$LoadProfile = 'smoke',

    [switch]$KeepStack
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$gateway = 'http://localhost:5100'
$frontendUrl = 'http://localhost:5173'
$compose = @('compose', '-p', 'a1test', '-f', (Join-Path $repoRoot 'docker-compose.yml'), '-f', (Join-Path $repoRoot 'docker-compose.test.yml'))
$results = @()

function Test-Selected($name) { $Layer -contains 'all' -or $Layer -contains $name }

function Add-Result($name, $passed, $total, $failed, $detail) {
    $script:results += [pscustomobject]@{
        Layer  = $name
        Result = if ($passed) { 'Passed' } else { 'FAILED' }
        Tests  = $total
        Failed = $failed
        Detail = $detail
    }
}

function Read-Trx($directory) {
    $trx = Get-ChildItem $directory -Filter *.trx -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $trx) { return $null }
    ([xml](Get-Content $trx.FullName -Raw)).TestRun.ResultSummary.Counters
}

# Git's own bash, not whatever "bash" is on PATH - on Windows that can be WSL, which sees
# neither this repo's paths nor the Windows Java install.
function Get-GitBash {
    $git = (Get-Command git -ErrorAction Stop).Source
    $candidate = Join-Path (Split-Path (Split-Path $git -Parent) -Parent) 'bin\bash.exe'
    if (Test-Path $candidate) { return $candidate }
    throw "Could not find Git Bash next to $git - it is needed to run the stack and load test scripts."
}

# Returns $true only when the stack is up. Command output goes through Out-Host so it is shown
# rather than becoming part of this function's return value.
function Start-TestStack {
    Write-Host "`n=== Starting the test stack (docker compose) ===" -ForegroundColor Cyan

    # Both stacks use the same container names and ports, so they cannot run side by side.
    $running = @(docker ps --filter 'name=^local_' --format '{{.Names}}')
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Docker is not running - start Docker Desktop and try again.' -ForegroundColor Red
        return $false
    }
    $testStack = @(docker ps --filter 'name=^local_' --filter 'label=com.docker.compose.project=a1test' --format '{{.Names}}')
    $devContainers = @($running | Where-Object { $_ -and ($testStack -notcontains $_) })
    if ($devContainers.Count -gt 0) {
        Write-Host 'The development stack is running and uses the same container names and ports.' -ForegroundColor Red
        Write-Host 'Stop it first (your database volume is kept):  docker compose down' -ForegroundColor Red
        return $false
    }

    docker @compose up -d --build | Out-Host
    if ($LASTEXITCODE -ne 0) { return $false }
    & (Get-GitBash) (Join-Path $repoRoot 'scripts/wait-for-stack.sh') $gateway 240 | Out-Host
    return ($LASTEXITCODE -eq 0)
}

if (Test-Selected 'backend') {
    Write-Host "`n=== Backend tests (xUnit) ===" -ForegroundColor Cyan
    $backendResults = Join-Path $repoRoot 'test-results/backend'
    if (Test-Path $backendResults) { Remove-Item -Recurse -Force $backendResults }

    dotnet test (Join-Path $repoRoot 'backend/A1Academy.Tests/A1Academy.Tests.csproj') `
        --filter "Category!=E2E" `
        --logger "trx;LogFileName=backend-tests.trx" `
        --collect:"XPlat Code Coverage" `
        --results-directory $backendResults `
        --nologo --verbosity quiet `
        -- 'DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.ExcludeByFile=**/Migrations/**'
    $exitCode = $LASTEXITCODE

    $counters = Read-Trx $backendResults
    $coverage = '-'
    $cobertura = Get-ChildItem $backendResults -Filter coverage.cobertura.xml -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cobertura) {
        $rate = [double]([xml](Get-Content $cobertura.FullName -Raw)).coverage.'line-rate'
        $coverage = '{0:N1}% line coverage' -f ($rate * 100)
    }
    Add-Result 'Backend (xUnit)' ($exitCode -eq 0) $counters.total $counters.failed $coverage
}

if (Test-Selected 'frontend') {
    Write-Host "`n=== Frontend tests (Vitest) ===" -ForegroundColor Cyan
    Push-Location (Join-Path $repoRoot 'frontend')
    try {
        if (-not (Test-Path 'node_modules')) { npm install }
        npx vitest run --coverage --reporter=default --reporter=junit --outputFile.junit=reports/junit.xml
        $exitCode = $LASTEXITCODE

        $total = $failed = $coverage = '-'
        if (Test-Path 'reports/junit.xml') {
            $suites = ([xml](Get-Content 'reports/junit.xml' -Raw)).testsuites
            $total = $suites.tests
            $failed = [int]$suites.failures + [int]$suites.errors
        }
        if (Test-Path 'coverage/coverage-summary.json') {
            $coverage = '{0}% line coverage' -f (Get-Content 'coverage/coverage-summary.json' -Raw | ConvertFrom-Json).total.lines.pct
        }
        Add-Result 'Frontend (Vitest)' ($exitCode -eq 0) $total $failed $coverage
    }
    finally {
        Pop-Location
    }
}

$needsStack = (Test-Selected 'e2e') -or (Test-Selected 'load')
$stackReady = $false
if ($needsStack) {
    $stackReady = Start-TestStack
}

if (Test-Selected 'e2e') {
    Write-Host "`n=== Browser E2E tests (Selenium) ===" -ForegroundColor Cyan
    if (-not $stackReady) {
        Add-Result 'Browser E2E (Selenium)' $false '-' '-' 'test stack not available'
    }
    else {
        $e2eResults = Join-Path $repoRoot 'test-results/e2e'
        if (Test-Path $e2eResults) { Remove-Item -Recurse -Force $e2eResults }
        $preview = $null
        Push-Location (Join-Path $repoRoot 'frontend')
        try {
            # Built against the local gateway and served on :5173, the origin CORS allows.
            if (-not (Test-Path 'node_modules')) { npm install }
            $env:VITE_API_URL = $gateway
            npm run build
            $preview = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npx vite preview --port 5173 --strictPort' -PassThru -WindowStyle Hidden
            curl.exe -fsS -o NUL --retry 15 --retry-connrefused --retry-delay 2 $frontendUrl

            $env:E2E_API_URL = $gateway
            $env:E2E_FRONTEND_URL = $frontendUrl
            dotnet test (Join-Path $repoRoot 'backend/A1Academy.Tests/A1Academy.Tests.csproj') `
                --filter "Category=E2E" `
                --logger "trx;LogFileName=e2e-tests.trx" `
                --results-directory $e2eResults `
                --nologo --verbosity quiet
            $exitCode = $LASTEXITCODE

            $counters = Read-Trx $e2eResults
            Add-Result 'Browser E2E (Selenium)' ($exitCode -eq 0) $counters.total $counters.failed 'real browser, full stack'
        }
        finally {
            Remove-Item Env:VITE_API_URL, Env:E2E_API_URL, Env:E2E_FRONTEND_URL -ErrorAction SilentlyContinue
            if ($preview) { taskkill /PID $preview.Id /T /F | Out-Null }
            Pop-Location
        }
    }
}

if (Test-Selected 'load') {
    Write-Host "`n=== Load tests (JMeter, profile '$LoadProfile') ===" -ForegroundColor Cyan
    if (-not $stackReady) {
        Add-Result 'Load (JMeter)' $false '-' '-' 'test stack not available'
    }
    else {
        & (Get-GitBash) (Join-Path $repoRoot 'performance/jmeter/run-load-test.sh') $LoadProfile
        $exitCode = $LASTEXITCODE

        # One table row per plan: | plan | samples | errors | average | p95 | max | result |
        $summary = Join-Path $repoRoot "performance/jmeter/results/$LoadProfile/summary.md"
        $rows = @()
        if (Test-Path $summary) {
            $rows = @(Get-Content $summary | Where-Object { $_ -match '^\| [^P-]' } | ForEach-Object { , ($_.Trim('|').Split('|').Trim()) })
        }
        $samples = ($rows | ForEach-Object { [int]$_[1] } | Measure-Object -Sum).Sum
        $errors = ($rows | ForEach-Object { [int]($_[2] -replace ' .*') } | Measure-Object -Sum).Sum
        $detail = ($rows | ForEach-Object { '{0}: p95 {1}' -f $_[0], $_[4] }) -join '; '
        Add-Result 'Load (JMeter)' ($exitCode -eq 0) $samples $errors $detail
    }
}

if ($stackReady -and -not $KeepStack) {
    Write-Host "`n=== Removing the test stack ===" -ForegroundColor Cyan
    docker @compose down -v
}

Write-Host "`n=== Test pipeline result ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize | Out-String | Write-Host

if ($results | Where-Object { $_.Result -ne 'Passed' }) {
    Write-Host 'One or more test layers failed.' -ForegroundColor Red
    exit 1
}
Write-Host 'All test layers passed.' -ForegroundColor Green
