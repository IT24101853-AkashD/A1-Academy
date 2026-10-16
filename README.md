# A1 Academy - Online Learning & Tutoring Platform

[![Backend Tests](https://github.com/IT24101853-AkashD/A1-Academy/actions/workflows/ci-backend-tests.yml/badge.svg)](https://github.com/IT24101853-AkashD/A1-Academy/actions/workflows/ci-backend-tests.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=IT24101853-AkashD_A1-Academy&metric=alert_status)](https://sonarcloud.io/project/overview?id=IT24101853-AkashD_A1-Academy)

A1 Academy is a learning platform for **Students**, **Teachers** and **Administrators**, all
governed by role-based access control:

- **Teachers** schedule classes, share materials and assignments, mark attendance, grade
  submissions, award badges and see their class's grade distribution.
- **Students** search and enrol in classes, download materials, submit work and follow their
  attendance and grades on a personal Progress Card.
- **Admins** approve teachers, manage users, subjects and badge templates, and follow platform
  growth from a live dashboard.
- Every role can export its reports as formatted Excel files.

| | URL |
|---|---|
| **Live site** | https://a1-academy-frontend-d4d6h7fuhebqbyfm.malaysiawest-01.azurewebsites.net |
| **API (gateway)** | https://a1academy-gateway.greenfield-88918092.malaysiawest.azurecontainerapps.io |
| **API docs (Swagger UI)** | https://a1academy-gateway.greenfield-88918092.malaysiawest.azurecontainerapps.io/swagger |
| **Code quality** | [SonarCloud dashboard](https://sonarcloud.io/project/overview?id=IT24101853-AkashD_A1-Academy) |
| **Project board** | [JIRA project AA](https://my-team-n7l64tjy.atlassian.net/issues/?jql=project+%3D+%22AA%22) |

---

## Architecture

```
Browser ─► Frontend (React + Vite, Azure Web App)
              │
              ▼
         API Gateway (YARP) ─┬─► Auth service     ─┐
                             ├─► Admin service    ─┤
                             ├─► Teacher service  ─┼─► PostgreSQL
                             └─► Student service  ─┘
                                   ▲  │
                                   └──┴─ Kafka (Azure Event Hubs in production)
```

All backend services are ASP.NET Core 10 and share the `A1Academy.Shared` library (EF Core data
model, Kafka producer/consumer, email service, health checks, Swagger set-up).

| Gateway route | Service |
|---|---|
| `/api/auth/*` | Auth: register, login, Google sign-in, OTP, password reset, profile |
| `/api/users/*`, `/api/categories/*`, `/api/admin/badges/*`, `/api/teacher-subject-requests/*` | Admin: user directory, approvals, dashboard stats, growth report, subjects, badge templates, exports |
| `/api/teacher/classes/*`, `/api/teacher/subjects/*`, `/api/teacher/badges/*` | Teacher: classes, materials, assignments, attendance, grading, grade distribution, badge awarding |
| `/api/student/classes/*`, `/api/recognition/*` | Student: search, enrolment, submissions, Progress Card, public recognition board |
| `/swagger`, `/openapi/{auth,admin,teacher,student}.json` | Gateway: one Swagger UI for all four services |

- Every service also exposes `/health/live` (process up) and `/health/ready` (database reachable).
- **CORS is handled by the gateway only.** The services are never called from the browser directly,
  so they send no CORS headers of their own; two `Access-Control-Allow-Origin` headers on one
  response would make the browser reject it.
- **API docs:** each service publishes its OpenAPI document at `/swagger/v1/swagger.json`. The gateway
  serves them at `/openapi/<service>.json` and hosts the Swagger UI at `/swagger`. To call a
  protected endpoint, run `POST /api/auth/login`, click **Authorize** and paste the returned token.

## Repository Structure

| Path | Contents |
|---|---|
| `frontend/` | React + Vite app; unit tests in `src/**/__tests__`, WebdriverIO E2E tests in `e2e/` |
| `backend/A1Academy.Gateway/` | YARP API gateway |
| `backend/A1Academy.{Auth,Admin,Teacher,Student}Service/` | The four microservices |
| `backend/A1Academy.Shared/` | Data model, EF Core migrations, Kafka, email, health checks |
| `backend/A1Academy.Tests/` | xUnit unit + integration tests (and Selenium E2E, excluded by default) |
| `performance/jmeter/` | JMeter load test plans and the script that runs them |
| `scripts/run-tests.ps1` | Runs every test layer locally and prints one result table |
| `scripts/devops-azure-setup.sh` | Production operations script (status, secrets, restart) |
| `docker-compose.yml` | Local development stack |
| `docker-compose.test.yml` | Override that turns the stack into the isolated test stack used by the E2E and load tests |
| `.github/workflows/` | CI/CD pipelines |
| `docs/evidence/` | Sprint evidence and reports |

---

## Running Locally

### Prerequisites
- **Docker Desktop**
- **.NET 10 SDK** (only needed to run tests or a single service outside Docker)
- **Node.js 22+**

### 1. Start the backend (one command)

```bash
docker compose up -d --build
```

This starts PostgreSQL, Kafka (with ZooKeeper), the four services and the gateway. First build
takes a few minutes.

| Service | Address on your machine |
|---|---|
| API gateway | http://localhost:5100 |
| Swagger UI | http://localhost:5100/swagger |
| PostgreSQL | `localhost:5433` (user `appuser`, database `appdb`) |
| Kafka | `localhost:9092` |

The four services are only reachable through the gateway. On first start an Admin account is
created: **`admin@a1academy.com` / `LocalAdmin123!`**. The JWT key and admin password in
`docker-compose.yml` are **local-development values only**; production uses Azure secrets.

> **Brand-new database:** all four services apply migrations at start-up, and on an empty database
> one of them can lose that race and skip creating the Admin account. If the admin login fails on a
> fresh volume, run `docker compose restart auth` once.

Check everything is up:

```bash
docker compose ps
curl http://localhost:5100/health/ready        # -> Healthy
```

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev                                    # http://localhost:5173
```

`frontend/.env.development` already points the app at the local gateway (`http://localhost:5100`).

### 3. Optional: verify Kafka end to end

```bash
docker exec -it local_kafka bash -c \
  "echo hello | kafka-console-producer --bootstrap-server localhost:29092 --topic test-topic"
docker compose logs auth admin teacher student | grep "KAFKA RECEIVED"   # all 4 services log it
```

### Running a single service outside Docker

Useful for debugging in an IDE. Configuration comes from .NET user secrets, so nothing sensitive
goes into `appsettings.json`:

```bash
docker compose up -d postgres kafka zookeeper
cd backend/A1Academy.AuthService
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5433;Database=appdb;Username=appuser;Password=SecurePassword123!"
dotnet user-secrets set "Jwt:Key" "local-dev-only-jwt-signing-key-not-used-in-production-000000"
dotnet run                                     # http://localhost:5185
```

Local ports: Auth `5185`, Admin `5219`, Teacher `5194`, Student `5208`, Gateway `5088`.

> **Never commit real secrets.** `appsettings.json` deliberately leaves passwords and keys empty.

---

## Testing

Every layer runs with one command, and the same layers run in CI (see the Test Pipeline below):

```powershell
./scripts/run-tests.ps1                          # all four layers
./scripts/run-tests.ps1 -Layer backend,frontend  # the two that need no Docker
./scripts/run-tests.ps1 -Layer load -LoadProfile stress
```

The E2E and load layers build and start their own copy of the stack from
`docker-compose.yml` + `docker-compose.test.yml` (empty database, emails captured locally by
Mailpit) and remove it afterwards. It uses the same container names and ports as the development
stack, so run `docker compose down` first; the script stops with a message if you forget.

| Layer | Tool | Run it on its own | Needs |
|---|---|---|---|
| **Backend** unit + integration | xUnit, WebApplicationFactory, Moq | `dotnet test backend/A1Academy.Tests/A1Academy.Tests.csproj --filter "Category!=E2E"` | Nothing (in-memory database, mocked email) |
| **Frontend** unit | Vitest, Testing Library | `cd frontend && npm run test:ci` | Nothing; writes coverage to `frontend/coverage/` |
| **Browser E2E** | Selenium (xUnit, `Category=E2E`) | `./scripts/run-tests.ps1 -Layer e2e` | Docker |
| **Browser E2E** | WebdriverIO | `cd frontend && npm run e2e` | The test stack and the frontend on `http://localhost:5173` |
| **Load** | JMeter | `./scripts/run-tests.ps1 -Layer load` | Docker, Java; see [performance/jmeter/README.md](performance/jmeter/README.md) |

Reports land in `test-results/`, `frontend/reports/`, `frontend/coverage/` and
`performance/jmeter/results/` (HTML dashboards). None of these are committed.

**Current results** (16 October 2026)

| Layer | Tests | Result |
|---|---|---|
| Backend unit + integration (xUnit) | 252 | All passing |
| Frontend components (Vitest, 20 files) | 170 | All passing |
| Browser E2E: Selenium journey + WebdriverIO (3 specs) | 1 + 14 | All passing |
| Load: JMeter login at 50 / 100 / 200 users | 3,500 requests | 0% errors; slowest response 1.96 s (limit 5 s) |
| SonarCloud on `main` | 85.7% coverage, 0 bugs, 2.3% duplication | Quality Gate passed |

---

## CI/CD

Build, test and deploy are separate jobs, so a red check names the stage that failed.

| Workflow | Runs on | What it does |
|---|---|---|
| `test-pipeline.yml` (**Test Pipeline**) | Every PR, every merge to `main`, and by hand | Four parallel jobs - backend tests, frontend tests, browser E2E, load tests (the last two in the `staging` environment) - each writing its results to the run summary, plus a final **Pipeline result** check |
| `ci-backend-tests.yml` | Every PR touching `backend/` | Builds the solution and runs the backend tests |
| `ci-{auth,admin,teacher,student}.yml` | PRs and merges touching that service or `Shared` | Tests, builds the Docker image; on `main` pushes it and deploys |
| `ci-gateway.yml` | PRs and merges touching the gateway | Builds; on `main` pushes and deploys |
| `deploy-containerapp.yml` | Called by the service pipelines (main only) | Deploys the commit's image, restarts the app, waits for `/health/ready = 200` |
| `sonarcloud.yml` | PRs and merges touching `backend/` | Static analysis + coverage; **fails if the Quality Gate fails** |
| `main_a1-academy-frontend.yml` | Every merge to `main`; PRs touching `frontend/` | Lint + build; on `main` deploys to Azure Web App |

- **Test Pipeline:** the E2E and load jobs start the whole system with
  `.github/actions/start-test-stack`. Started by hand (Actions tab, **Run workflow**), it lets you
  pick the JMeter load profile; pull requests use the light `smoke` profile because shared runners
  give noisy timings.
- **Merging to `main` deploys automatically.** Every service pipeline also has a **Run workflow**
  button (Actions tab) to redeploy `main` manually.
- Azure login uses **GitHub OIDC** (no password stored in GitHub). Pull request builds never push images.
- All GitHub Actions are **pinned to commit SHAs**; **Dependabot** opens weekly update PRs for NuGet,
  npm and Actions. Coupled major upgrades (EF Core, Npgsql, ASP.NET Core auth, App Insights) are
  excluded and should be done together.

### Environments

| Environment | Where | How it is created |
|---|---|---|
| **Development** | A developer's machine | `docker compose up -d --build` + `npm run dev` (see Running Locally) |
| **Staging** | GitHub Actions runner, one per pipeline run | The E2E and load jobs (GitHub environment `staging`) start the full system from `docker-compose.yml` + `docker-compose.test.yml` with an empty database and Mailpit, test it, and tear it down |
| **Production** | Azure, Malaysia West | Automatic deploy of every merge to `main` (see Production below) |

---

## Branching

- `main` is always deployable: every merge to it deploys to Azure. Nothing is committed to it
  directly; work happens on a branch and reaches `main` through a pull request.
- Branches are named `<type>/<short-description>`, with the type saying what the change is:
  `feature/`, `fix/`, `test/`, `ci/` or `devops/`, `docs/`, `chore/`, `deps/`.
- A pull request is merged once its checks are green: **Test Pipeline / Pipeline result**,
  **SonarCloud Quality Gate**, and the build of every service it touches.
- If a check goes red on `main`, fixing it comes before new work.

---

## Production (Azure)

| Resource | Name |
|---|---|
| Resource group | `A1-Academy-RG` (Malaysia West) |
| Container Apps (Express environment) | `a1academy-gateway`, `-auth`, `-admin`, `-teacher`, `-student` |
| Database | Azure Database for PostgreSQL Flexible Server `a1-academy-final-db` |
| Messaging | Azure Event Hubs (Kafka endpoint) `a1academy-kafka-sprint4` |
| Frontend | Azure Web App `a1-academy-frontend` |
| Images | Docker Hub `a1academy-<service>:<commit-sha>` |

All secrets (JWT key, database connection, admin password, SMTP password, Kafka key) are stored as
**Container App secrets**, never in the repository. Manage production with the ops script from
**Azure Cloud Shell**:

```bash
git clone --depth 1 https://github.com/IT24101853-AkashD/A1-Academy.git && cd A1-Academy
bash scripts/devops-azure-setup.sh status            # health, images, flags any plain-text secret
bash scripts/devops-azure-setup.sh secrets           # rotate secrets (hidden prompts)
bash scripts/devops-azure-setup.sh restart [app]     # required after any configuration change
```

> **Express environment:** changing a Container App's settings does **not** restart the running
> container. Always run `restart` afterwards (the deploy pipeline does this automatically).

> **Cost:** Event Hubs Standard and the Container Apps use the student subscription's credit.
> Delete the resource group once the project no longer needs to run.

### Security measures

- Passwords hashed with BCrypt; signed JWTs with role claims, issued by one `JwtTokenService` whose
  key comes from validated `Jwt` settings (the `jwt-key` secret in production). The Auth service
  refuses to start without a key.
- Every endpoint checks roles on the server (403), and every request re-checks the account status,
  so deactivating a user ends their session immediately.
- Data isolation: students only see their own grades and progress, and teachers only their own
  classes.
- All containers run as a **non-root user**; the frontend image uses `nginx-unprivileged`.
- PostgreSQL requires SSL and accepts only Azure services; deploys use GitHub OIDC.
- SonarCloud scans every pull request and blocks a merge when its Quality Gate fails.

---

## Known Issues

| Issue | Impact | Workaround |
|---|---|---|
| On a brand-new database the services race to apply migrations, and the Admin account may not be created | Admin login fails on a fresh volume | Restart the Auth service once |
| No automated browser test for the full badge journey (template, award, recognition board) | Covered by API tests and a manual walkthrough only | - |
| Load tests cover login (and, in Sprint 3, class search and enrolment) but not the reporting endpoints | Report performance under load is not measured | - |

---

## Documentation and Evidence

**Sprint 4 (final sprint)**

| Topic | Evidence |
|---|---|
| **DevOps & QA report**: Kafka, CI/CD, security, SonarCloud, tests, incidents | [Markdown](docs/evidence/Sprint4-DevOps-QA-Report.md) · [PDF](docs/evidence/Sprint4-DevOps-QA-Report.pdf) |
| Kafka locally and on Azure Event Hubs | [Sprint4-Kafka-Azure.md](docs/evidence/Sprint4-Kafka-Azure.md) |

**Earlier sprints**

| Topic | Evidence |
|---|---|
| User deactivation and account state machine | [User-Deactivation.md](docs/evidence/User-Deactivation.md) |
| Teacher approval | [Teacher-Approval.md](docs/evidence/Teacher-Approval.md) |
| Filter pending teachers | [Filter-Pending-Teachers.md](docs/evidence/Filter-Pending-Teachers.md) |
| Directory pagination | [Directory-Pagination.md](docs/evidence/Directory-Pagination.md) |
| Admin user directory (role-restricted) | [Admin-User-Directory.md](docs/evidence/Admin-User-Directory.md) |
| Login load testing (50/100/200 users, 0 % errors) | [Login-Load-Testing.md](docs/evidence/Login-Load-Testing.md) |
| E2E authentication (Selenium) | [E2E-Authentication-Testing.md](docs/evidence/E2E-Authentication-Testing.md) |
| Frontend component testing | [AA-19-Frontend-Testing.md](docs/evidence/AA-19-Frontend-Testing.md) |

Some earlier evidence documents refer to the original single-project backend (`A1Academy.API`,
port 5123), which has since been split into the microservices described above.
