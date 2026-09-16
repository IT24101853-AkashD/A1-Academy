# A1 Academy - Online Learning & Tutoring Platform

Welcome to the A1 Academy project repository!

## Project Structure
- `/frontend`: React.js (Vite) application
- `/backend/A1Academy.API`: ASP.NET Core 10 Web API (Configured for PostgreSQL & Kafka)
- `/backend/A1Academy.Tests`: xUnit automated tests
- `/.github/workflows`: GitHub Actions CI/CD pipelines (Azure deployment & automated tests)

## Local Setup Instructions

### Prerequisites
- **Node.js** (v20+ recommended) for the frontend.
- **.NET 10 SDK** for the backend API and testing.
- **Docker Desktop** (Optional, but recommended for spinning up PostgreSQL and Kafka easily).

### Development Configuration

The backend requires configuration through `appsettings.Development.json`. This file is excluded from version control for security reasons.

1. Copy the template file to create your local development settings:
```bash
cd backend/A1Academy.API
cp appsettings.Development.json.template appsettings.Development.json
```

2. Update the placeholders in `appsettings.Development.json` with your actual credentials:
   - `<YOUR_DB_PASSWORD>` - Database password (from docker-compose.yml)
   - `<YOUR_JWT_SECRET_KEY>` - A secure random key for JWT authentication
   - `<YOUR_GOOGLE_CLIENT_ID>` - Your Google OAuth client ID
   - `<YOUR_SENDER_EMAIL>` - Email address for SMTP
   - `<YOUR_SMTP_PASSWORD>` - SMTP password (e.g., Gmail app password)
   - `<YOUR_APPLICATION_INSIGHTS_CONNECTION_STRING>` - Application Insights key (optional)
   - `<YOUR_ADMIN_EMAIL>` / `<YOUR_ADMIN_PASSWORD>` - credentials for the bootstrap Administrator account, created automatically on first run (there's no self-registration path for Admin - see [Admin User Directory evidence](docs/evidence/Admin-User-Directory.md))

**⚠️ Important:** Never commit `appsettings.Development.json` with real credentials to version control.

### 1. Database & Infrastructure (Docker)
If you have Docker installed, you can spin up the required PostgreSQL database and Kafka instance automatically:
```bash
docker-compose up -d
```

### 2. Backend (ASP.NET Core 10)
1. Navigate to the API directory: `cd backend/A1Academy.API`
2. Install dependencies/restore: `dotnet restore`
3. Run the backend server: `dotnet run`

### 3. Frontend (React + Vite)
1. Open a new terminal and navigate to the frontend: `cd frontend`
2. Install Node dependencies: `npm install`
3. Start the Vite development server: `npm run dev`

## Local Infrastructure Setup & Verification

The A1 Academy backend uses Docker Compose to run the required local infrastructure services.

### Services

| Service | Image | Port | Purpose |
|---|---|---:|---|
| PostgreSQL | postgres:16-alpine | 5432 | Application database |
| ZooKeeper | confluentinc/cp-zookeeper:7.5.0 | 2181 | Kafka coordination |
| Kafka | confluentinc/cp-kafka:7.5.0 | 9092 | Event streaming & messaging |

### Starting Infrastructure

Start all services with:

```powershell
docker compose up -d
```

Verify services are running:

```powershell
docker compose ps
```

### PostgreSQL Verification

Verify PostgreSQL connectivity:

```powershell
docker exec local_postgres pg_isready -U appuser -d appdb
```

Expected output:
```
/var/run/postgresql:5432 - accepting connections
```

### Kafka Verification

Verify Kafka is healthy by checking container logs:

```powershell
docker logs local_kafka --tail 20
```

The backend will output on startup:
```
SUCCESS: Kafka Consumer connected & listening!
```

### Backend Database Connection

The ASP.NET Core backend uses the connection string configured in `appsettings.Development.json`:

```
Host=localhost
Port=5432
Database=appdb
Username=appuser
```

On successful startup, you should see:
```
SUCCESS: Backend connected to PostgreSQL
```

### API & Swagger Verification

Once the backend is running on `http://localhost:5123`, verify the API is accessible:

```powershell
(Invoke-WebRequest http://localhost:5123/swagger/index.html -UseBasicParsing).StatusCode
```

Expected output: `200`

Visit [http://localhost:5123/swagger/index.html](http://localhost:5123/swagger/index.html) in your browser to explore the API.

## Automated Testing
To run the unit tests locally, navigate to the tests folder and execute them:
```bash
cd backend/A1Academy.Tests
dotnet test --filter "Category!=E2E"
```

### End-to-End (Selenium) Testing

`AuthenticationFlowE2ETests` drives a real Chrome browser through Student signup (including
OTP verification) followed by login, and checks that an authenticated session with the correct
role is reached. It runs against a live local environment rather than starting one itself:

```bash
docker-compose up -d postgres kafka zookeeper   # from the repo root
dotnet run --project backend/A1Academy.API      # http://localhost:5123, ASPNETCORE_ENVIRONMENT=Development
npm run dev --prefix frontend                   # http://localhost:5173

cd backend/A1Academy.Tests
dotnet test --filter Category=E2E
```

A Chromium-based browser must be installed - Chrome, Brave, or Edge are all auto-detected from
their usual install locations (override with `E2E_BROWSER_BINARY` if yours lives elsewhere);
Selenium downloads a matching `chromedriver` for it automatically. Override `E2E_FRONTEND_URL` /
`E2E_API_URL` if your servers run elsewhere, and set `E2E_HEADLESS=false` to watch the browser
drive itself. This suite relies on a
Development/Testing-only endpoint (`GET /api/auth/debug-otp`) to read the signup OTP instead of
a real mailbox, and only covers the Student role — Teacher signups start unapproved and can't
log in until an admin approves them. It's excluded from the default `dotnet test` run and from
CI (see `.github/workflows/ci.yml`).

### Load Testing (JMeter)

[`performance/jmeter/login-load-test.jmx`](performance/jmeter/login-load-test.jmx) drives
concurrent `POST /api/auth/login` requests against a running API instance to check it holds up
under load:

```bash
docker-compose up -d postgres kafka zookeeper
dotnet run --project backend/A1Academy.API

cd performance/jmeter
./seed-load-test-user.sh                                         # once, creates the test account
jmeter -n -t login-load-test.jmx -l results.jtl -Jusers=50 -JrampUp=10 -Jloops=10
jmeter -g results.jtl -o report/                                 # HTML dashboard with percentiles
```

See [`performance/jmeter/README.md`](performance/jmeter/README.md) for the full profile list
(baseline/stress/higher-load) and [`docs/evidence/Login-Load-Testing.md`](docs/evidence/Login-Load-Testing.md)
for the locally verified results. Apache JMeter 5.6.3 executed all three profiles against the
running API, with 0% errors and response times under the ticket's 5-second threshold.

## Evidence

The following screenshots provide evidence that the local infrastructure and backend integration were successfully verified.

### E2E Authentication

The Selenium flow completed Student registration, email verification, and login successfully.

![E2E Authentication Test](docs/evidence/AA-21-E2E-authentication.png)

### Login Load Testing

The JMeter execution covered 50, 100, and 200 concurrent users with 0% errors and response times
under the 5-second threshold. Full numbers and analysis are in
[`docs/evidence/Login-Load-Testing.md`](docs/evidence/Login-Load-Testing.md).

![Login Load Test - Baseline (50 users)](docs/evidence/login-load-test-baseline-dashboard.png)
![Login Load Test - Higher Load (200 users)](docs/evidence/login-load-test-highload-dashboard.png)

### Admin User Directory

`GET /api/users` is restricted server-side to the Admin role (`[Authorize(Roles = "Admin")]`) —
verified with 200/403/403/401 for Admin/Student/Teacher/unauthenticated requests, both in
automated tests and against the live running API. Full writeup in
[`docs/evidence/Admin-User-Directory.md`](docs/evidence/Admin-User-Directory.md).

![Admin User Directory](docs/evidence/admin-user-directory.png)
![Access Denied for non-Admin](docs/evidence/admin-user-directory-access-denied.png)

### Directory Pagination

`GET /api/users` paginates (`?page=`/`?pageSize=`) and the directory table uses a windowed
Previous/page-numbers/Next control. Verified against 21 real seeded users (3 pages) by actually
clicking Next in a live browser session. Full writeup in
[`docs/evidence/Directory-Pagination.md`](docs/evidence/Directory-Pagination.md).

![Directory Pagination - page 1](docs/evidence/admin-user-directory-page1.png)
![Directory Pagination - page 2](docs/evidence/admin-user-directory-page2.png)

### Filter Pending Teachers

`GET /api/users` now takes `?role=`/`?status=` filters, and the directory has a one-click
"Pending Teacher Applications" button (role=Teacher + status=Pending) alongside generic Role/
Status dropdowns. Verified against real seeded data. Full writeup in
[`docs/evidence/Filter-Pending-Teachers.md`](docs/evidence/Filter-Pending-Teachers.md).

![Unfiltered directory](docs/evidence/admin-user-directory-unfiltered.png)
![Pending Teacher Applications filter applied](docs/evidence/admin-user-directory-pending-teachers-filter.png)

### Teacher Approval

Admins can now act on what the pending-teacher filter finds - `PATCH /api/users/{id}/approve`
flips a Teacher from Pending to Active, and the directory shows an "Approve" button on any
Pending row. Verified end to end with a real registered teacher: blocked from logging in while
Pending, able to log in immediately after approval, plus the 400/404/403 error paths. Full
writeup in [`docs/evidence/Teacher-Approval.md`](docs/evidence/Teacher-Approval.md).

![Pending teachers before approval](docs/evidence/admin-user-directory-pending-before-approval.png)
![After approval](docs/evidence/admin-user-directory-after-approval.png)

### User Deactivation

Accounts now move through a real state machine - Pending/Active/Rejected/Deactivated - instead
of a single approved bool, with a dedicated, pure-C# rules module deciding which moves are legal
(`AccountStatusTransitions`). Backed by `PATCH /api/users/{id}/{approve|reject|deactivate|reactivate}`,
each enforced the same way, and `AuthController.Login` blocking anyone whose account isn't
Active with a status-specific message. Verified with real registered accounts end to end -
deactivation blocks login, reactivation unblocks it again - plus every invalid transition (like
re-approving an already-Active account) checked live. Full writeup in
[`docs/evidence/User-Deactivation.md`](docs/evidence/User-Deactivation.md).

![Pending actions](docs/evidence/admin-user-directory-pending-actions.png)
![Deactivated actions](docs/evidence/admin-user-directory-deactivated-actions.png)
![Rejected view](docs/evidence/admin-user-directory-rejected-view.png)

### Docker Compose Services

PostgreSQL, Kafka, and ZooKeeper were successfully started using Docker Compose.

![Docker Compose Services](docs/evidence/docker%20.png)

### PostgreSQL

Backend connectivity to PostgreSQL was successfully verified.

![PostgreSQL Verification](docs/evidence/postgresql.png)

### Kafka

Kafka consumer successfully connected and listened for messages.

![Kafka Verification](docs/evidence/kafka.png)

### Backend

The backend successfully connected to the required infrastructure services.

![Backend Verification](docs/evidence/backend%20working.png)

### Swagger API

Swagger was successfully served by the ASP.NET Core backend with HTTP 200.

![Swagger Verification](docs/evidence/swagger.png)

### Integration Testing

The automated integration test suite was executed successfully.

![Integration Testing](docs/evidence/git%20integration%20testing.png)

Test result:

- **Total:** 12
- **Passed:** 12
- **Failed:** 0
- **Skipped:** 0
- **Build:** Successful

## Infrastructure and DevOps Engineering Report — Sprint 2

### Executive Summary
During Sprint 2, the core DevOps infrastructure was successfully provisioned and integrated. The primary objectives were to eliminate manual deployment overhead, establish secure cloud communication, and implement a scalable event-driven architecture. The application is now fully supported by automated CI/CD pipelines via GitHub Actions and is successfully deployed to the Azure cloud ecosystem.

### 1. Continuous Integration (CI) Architecture
To optimize the developer experience and reduce build times, a granular, microservice-specific CI strategy was implemented using GitHub Actions.

- **Decoupled Workflows:** Rather than a monolithic pipeline, distinct CI workflows were engineered for each backend service (Admin, Auth, Gateway, Student, Teacher) as well as the Frontend.
- **Path-Based Triggers:** Workflows are configured with path filtering, ensuring that builds and automated tests are only triggered for the specific microservice that was modified. This drastically reduces compute waste and accelerates feedback loops for developers.
- **Build and Validation:** The CI pipelines automatically provision the .NET environment, restore dependencies, compile the application, and execute unit testing frameworks to prevent regressions from merging into the main branch.

### 2. Continuous Deployment (CD) and Azure Cloud Integration
The transition from local development to a live cloud environment was finalized, establishing a seamless Continuous Deployment pipeline to Azure.

- **Automated Azure Deployments:** The CD pipeline is configured to securely package and promote validated code directly to the live Azure environment upon successful merge to the production branch.
- **Centralized Cloud Database:** Refactored the appsettings.json configurations across all microservices to deprecate local database dependencies. All services are now securely authenticated and connected to a centralized Azure PostgreSQL Flexible Server, ensuring data consistency across the distributed system.
- **API Gateway and CORS Remediation:** Resolved cross-origin blocking issues in the live environment by reconfiguring the A1Academy.Gateway (Program.cs). The Gateway now properly routes external requests and manages CORS policies, allowing the live React frontend to successfully consume backend APIs.
- **Environment Variable Management:** Updated frontend production environments (.env.production) to dynamically point to the live Azure Gateway URL during the build phase.

### 3. Event-Driven Messaging Architecture (Apache Kafka)
To support highly scalable, asynchronous communication between microservices, Apache Kafka was implemented as the central message broker.

- **Shared Kafka Infrastructure:** Engineered centralized KafkaProducerService and KafkaConsumerService abstractions within the A1Academy.Shared library utilizing the Confluent.Kafka SDK.
- **Service Injection:** Integrated Kafka via Dependency Injection into the Program.cs lifecycle of all microservices. This empowers any service to act as an event publisher or subscriber without tight coupling.
- **Containerized Local Development:** Orchestrated Kafka and Zookeeper within the docker-compose.yml stack. This allows the engineering team to spin up the entire event-driven messaging topology locally with a single Docker command, ensuring development parity with production.

### 4. Operational Adjustments and Technical Debt
- **Pipeline Unblocking:** Identified an issue where failing frontend unit tests were actively blocking the CD pipeline from deploying critical backend infrastructure. To unblock the release, the failing test suite was temporarily bypassed in .github/workflows/main_a1-academy-frontend.yml.
- **Action Item:** A task has been allocated to the frontend engineering team for Sprint 3 to resolve the broken tests and re-enable strict CI validation.

### Proposed DevOps Roadmap for Sprint 3
- **Security and Compliance:** Integrate Static Application Security Testing (SAST) and dependency vulnerability scanning into the CI pipelines.
- **Environment Promotion:** Establish staging environments with manual approval gates before pushing to production.
- **Observability:** Implement centralized logging and application performance monitoring (APM) to track the health of the deployed microservices.