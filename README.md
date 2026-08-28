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

## Automated Testing
To run the unit tests locally, navigate to the tests folder and execute them:
```bash
cd backend/A1Academy.Tests
dotnet test
```
