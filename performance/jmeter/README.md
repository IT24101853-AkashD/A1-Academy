# Login Endpoint Load Testing

`login-load-test.jmx` drives concurrent `POST /api/auth/login` requests against a running
instance of the API to check the endpoint holds up under load. It targets a single, already
registered Student account — login doesn't mutate anything, so one seeded account is reused
across every run instead of having every JMeter thread register its own (that would measure
signup/DB-write cost, not login/auth performance).

## Prerequisites

- Apache JMeter 5.6+ ([download](https://jmeter.apache.org/download_jmeter.cgi))
- The backend running locally in `Development` (the seed script needs `GET /api/auth/debug-otp`,
  which only responds in Development/Testing — see [AuthController.cs](../../backend/A1Academy.API/Controllers/AuthController.cs)):
  ```bash
  docker-compose up -d postgres kafka zookeeper   # from the repo root
  dotnet run --project backend/A1Academy.API      # http://localhost:5123
  ```

## 1. Seed the load-test account (once)

```bash
./seed-load-test-user.sh
```

Safe to re-run — it checks whether the account can already log in before registering anything.
Override the URL/credentials with `./seed-load-test-user.sh <API_URL> <EMAIL> <PASSWORD>`.

## 2. Run a load profile

```bash
jmeter -n -t login-load-test.jmx -l results.jtl \
  -Jusers=50 -JrampUp=10 -Jloops=10
```

| Property | Meaning | Default |
|---|---|---|
| `users` | concurrent threads (virtual users) | 50 |
| `rampUp` | seconds to start all threads | 10 |
| `loops` | iterations per thread | 10 |
| `host`, `port`, `protocol` | API location | `localhost`, `5123`, `http` |
| `loginEmail`, `loginPassword` | seeded test account | matches `seed-load-test-user.sh` defaults |
| `responseThresholdMs` | per-request failure threshold | 5000 (the ticket's success criterion) |

Suggested profiles (matching the ticket's "expected load" vs. "under stress" framing):

| Profile | users | loops | Total requests |
|---|---:|---:|---:|
| Baseline | 50 | 10 | 500 |
| Stress | 100 | 10 | 1,000 |
| Higher load | 200 | 10 | 2,000 |

Each request carries a `Duration Assertion` (fails any single sample over `responseThresholdMs`)
and `Response Assertions` checking for HTTP 200 and a `token` in the body — a fast response that
isn't actually a successful login still counts as a failure.

## 3. Read the results

Generate the HTML dashboard (percentiles, throughput, pass/fail) from the `.jtl`:

```bash
jmeter -g results.jtl -o report/
```

Open `report/index.html`. The numbers that matter for this ticket:

- **Error %** — should be 0.00%
- **95th pct** (and Max) response time — should stay under 5000 ms

See `docs/evidence/` in the repo root for a real run's dashboard screenshots and a written
pass/fail summary from the locally executed profiles.

## Notes / limitations

- This exercises the `/api/auth/login` path only (password verification + JWT issuance). It does
  not simulate the full UI flow — that's what the [Selenium E2E suite](../../backend/A1Academy.Tests/E2E/AuthenticationFlowE2ETests.cs) covers.
- Not wired into CI — load tests share a runner's resources unpredictably and would produce
  noisy, unreliable pass/fail results there. Run it locally (or against a real staging
  environment) when performance needs checking.
- Live execution was verified locally with Apache JMeter 5.6.3 and the running A1 Academy
  backend/database stack; repeat runs require the same prerequisites.
- `BCrypt.Verify` (password hashing) is intentionally CPU-heavy and synchronous, so response
  times climb with concurrency — that showed up clearly at 200 concurrent users in the recorded
  evidence. It's a real cost worth knowing about even though it stayed inside the 5s budget.
