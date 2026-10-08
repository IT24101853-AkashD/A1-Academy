# A1 Academy - Online Learning & Tutoring Platform

[![Backend Tests](https://github.com/IT24101853-AkashD/A1-Academy/actions/workflows/ci-backend-tests.yml/badge.svg)](https://github.com/IT24101853-AkashD/A1-Academy/actions/workflows/ci-backend-tests.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=IT24101853-AkashD_A1-Academy&metric=alert_status)](https://sonarcloud.io/project/overview?id=IT24101853-AkashD_A1-Academy)

A1 Academy is a learning platform for **Students**, **Teachers** and **Administrators**: teachers
schedule classes and share materials and assignments, students enrol and submit work, and admins
manage users, subjects and teacher approvals - all governed by role-based access control.

| | URL |
|---|---|
| **Live site** | https://a1-academy-frontend-d4d6h7fuhebqbyfm.malaysiawest-01.azurewebsites.net |
| **API (gateway)** | https://a1academy-gateway.greenfield-88918092.malaysiawest.azurecontainerapps.io |
| **Code quality** | [SonarCloud dashboard](https://sonarcloud.io/project/overview?id=IT24101853-AkashD_A1-Academy) |

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
model, Kafka producer/consumer, email service, health checks).

| Gateway route | Service |
|---|---|
| `/api/auth/*` | Auth: register, login, OTP, password reset, profile |
| `/api/users/*`, `/api/categories/*`, `/api/teacher-subject-requests/*` | Admin |
| `/api/teacher/subjects/*`, `/api/teacher/classes/*` | Teacher |
| `/api/student/classes/*` | Student |

Every service also exposes `/health/live` (process up) and `/health/ready` (database reachable).

## Repository Structure

| Path | Contents |
|---|---|
| `frontend/` | React + Vite app; unit tests in `src/**/__tests__`, WebdriverIO E2E tests in `e2e/` |
| `backend/A1Academy.Gateway/` | YARP API gateway |
| `backend/A1Academy.{Auth,Admin,Teacher,Student}Service/` | The four microservices |
| `backend/A1Academy.Shared/` | Data model, EF Core migrations, Kafka, email, health checks |
| `backend/A1Academy.Tests/` | xUnit unit + integration tests (and Selenium E2E, excluded by default) |
| `performance/jmeter/` | Login load test |
| `scripts/devops-azure-setup.sh` | Production operations script (status, secrets, restart) |
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
| PostgreSQL | `localhost:5433` (user `appuser`, database `appdb`) |
| Kafka | `localhost:9092` |

The four services are only reachable through the gateway. On first start an Admin account is
created: **`admin@a1academy.com` / `LocalAdmin123!`**. The JWT key and admin password in
`docker-compose.yml` are **local-development values only**; production uses Azure secrets.

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

| Suite | Command | Notes |
|---|---|---|
| **Backend** (unit + integration, 195 tests) | `dotnet test backend/A1Academy.Tests/A1Academy.Tests.csproj --filter "Category!=E2E"` | No database or Kafka needed (in-memory DB, mocked email/Kafka). Runs on every backend PR. |
| **Frontend unit** (Vitest) | `cd frontend && npm run test:unit` | 31 tests still target the pre-redesign UI and fail; see the [Sprint 4 report](docs/evidence/Sprint4-DevOps-QA-Report.md). |
| **Backend E2E** (Selenium) | `dotnet test backend/A1Academy.Tests --filter Category=E2E` | Needs the full stack running. Set `E2E_API_URL=http://localhost:5100`; the auth service must run with `ASPNETCORE_ENVIRONMENT=Development` (it reads the signup code from `/api/auth/debug-otp`). |
| **Frontend E2E** (WebdriverIO) | `cd frontend && npm run e2e` | Needs the full stack and the dev server running. |
| **Load** (JMeter) | see [performance/jmeter/README.md](performance/jmeter/README.md) | Point it at the gateway with `-Jport=5100`. |

---

## CI/CD

| Workflow | Runs on | What it does |
|---|---|---|
| `ci-backend-tests.yml` | Every PR touching `backend/` | Builds the solution and runs the backend tests |
| `ci-{auth,admin,teacher,student}.yml` | PRs and merges touching that service or `Shared` | Tests, builds the Docker image; on `main` pushes it and deploys |
| `ci-gateway.yml` | PRs and merges touching the gateway | Builds; on `main` pushes and deploys |
| `deploy-containerapp.yml` | Called by the service pipelines (main only) | Deploys the commit's image, restarts the app, waits for `/health/ready = 200` |
| `sonarcloud.yml` | PRs and merges touching `backend/` | Static analysis + coverage; **fails if the Quality Gate fails** |
| `main_a1-academy-frontend.yml` | Every merge to `main`; PRs touching `frontend/` | Lint + build; on `main` deploys to Azure Web App |

- **Merging to `main` deploys automatically.** Every service pipeline also has a **Run workflow**
  button (Actions tab) to redeploy `main` manually.
- Azure login uses **GitHub OIDC** (no password stored in GitHub). Pull request builds never push images.
- All GitHub Actions are **pinned to commit SHAs**; **Dependabot** opens weekly update PRs for NuGet,
  npm and Actions. Coupled major upgrades (EF Core, Npgsql, ASP.NET Core auth, App Insights) are
  excluded and should be done together.

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
