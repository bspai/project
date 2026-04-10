# Kaliyuva Democratic LMS Platform

### Available In Production
Module: Project based learning 
- Project Creation UI for Consultants
- Project view UI for Learners

### Upcoming

Module: Core
- Course Consumption UI
- Course Creation UI

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| State | Zustand |
| Auth | NextAuth.js (credentials) |
| ORM | Prisma |
| Database | PostgreSQL |
| Storage | S3-compatible object storage |
| Rich Text | Tiptap (free/MIT) |
| Diffing | diff-match-patch |
| Forms | React Hook Form + Zod |

---
## Setup & Run ( local docker setup )

### Prerequisites
- Docker
- Docker Compose
- In the project root repo, Copy `.env.example` to `.env.local` and fill in your values

Generate a secret:
```bash
openssl rand -base64 32
```
 - configure this value generated to NEXTAUTH_SECRET env variable

```env
# Minimum required for Phase 0:
DATABASE_URL="postgresql://postgres:password@localhost:5432/lms_platform"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -base64 32"

# Object storage (needed for Phase 1 image uploads — can leave blank for Phase 0)
STORAGE_ENDPOINT=""
STORAGE_REGION=""
STORAGE_BUCKET=""
STORAGE_ACCESS_KEY=""
STORAGE_SECRET_KEY=""
STORAGE_PUBLIC_URL=""
```

### Run database and pgadmin
- docker-compose up db -d
- docker-compose up pgadmin -d

### Check
- load pgadmin dashboard using URL http://127.0.0.1:5050
- login with credentials as in docker-componse file
- connect to plsql server using credential of db in docker-componse file
- when checking no tables will be visible at this stage

### Run application
- docker-compose up app 

### Check
- after logs display "✓ Ready in  NNN ms " 
- Load application using URL http://127.0.0.1:3000
- login with given credentials will throw error as database does not have these users

### Run in another terminal
- docker exec lms_app npm run db:generate   
- docker exec lms_app npm run db:push
For production, use migrations:
```bash
npm run db:migrate    # Creates and applies a migration
```
- docker exec lms_app npm run db:seed

This creates:

| Role | Email | Password |
|---|---|---|
| Consultant | consultant@kaliyuva.com | password123 |
| Learner | learner@kaliyuva.com | password123 |
| Admin | admin@kaliyuva.com | password123 |

And one sample project.

---

### Check
- Load application using URL http://127.0.0.1:3000
- It will show Dashboard for logged in user

## Folder Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/             # Login page
│   ├── (app)/
│   │   ├── layout.tsx         # App shell wrapper (auth-gated)
│   │   ├── consultant/
│   │   │   ├── dashboard/     # Consultant dashboard
│   │   │   └── projects/      # Project list + new (Phase 1+2)
│   │   └── learner/
│   │       ├── dashboard/     # Learner dashboard
│   │       └── projects/      # Browse projects (Phase 4)
│   ├── api/
│   │   ├── auth/[...nextauth] # NextAuth handler
│   │   └── analytics/track    # Usage event tracker
│   ├── unauthorized/          # 403 page
│   ├── layout.tsx             # Root layout + providers
│   └── page.tsx               # Root redirect
├── lib/
│   ├── auth/
│   │   ├── auth-options.ts    # NextAuth config
│   │   └── session.ts         # requireAuth / requireRole helpers
│   ├── db/
│   │   └── prisma.ts          # Prisma singleton
│   └── storage/
│       └── index.ts           # S3 upload/delete helpers
├── modules/
│   ├── shared/
│   │   ├── components/        # Button, Input, Badge, Card, Avatar, etc.
│   │   ├── hooks/
│   │   │   ├── useAuthStore.ts    # Zustand auth store
│   │   │   └── useTrackEvent.ts   # Analytics hook
│   │   └── utils/
│   │       └── index.ts       # cn, formatDate, statusColor, etc.
│   └── projects/              # (Populated Phase 1+)
├── middleware.ts              # Route protection + role-based redirects
└── styles/
    └── globals.css            # Tailwind + Tiptap + custom styles
prisma/
├── schema.prisma              # Full DB schema
└── seed.ts                    # Test accounts + sample data
```

---

## Testing

The project uses **Vitest** for unit, component, and integration tests, and **Playwright** for end-to-end tests.

### Test structure

```
src/__tests__/
├── api/                  # Integration tests (API routes)
│   ├── analytics.test.ts
│   ├── approve.test.ts
│   ├── defer.test.ts
│   ├── projects.test.ts
│   ├── request.test.ts
│   ├── signoff.test.ts
│   └── versions.test.ts
└── setup/
    └── component-setup.ts
src/lib/diff/__tests__/          # Unit tests (diff engine)
src/modules/**/hooks/__tests__/  # Hook tests
src/modules/**/components/__tests__/  # Component tests
src/modules/**/utils/__tests__/  # Utility tests
e2e/                             # Playwright E2E tests
```

### Running tests locally

```bash
# Run all tests (unit + component + integration)
npm test

# Run specific test suites
npm run test:unit           # Unit tests only
npm run test:components     # Component tests only (happy-dom)
npm run test:integration    # API integration tests (sequential, Node env)

# Watch mode (re-runs on file changes)
npx vitest --watch

# Run a single test file
npx vitest run src/__tests__/api/signoff.test.ts

# Coverage report
npm run test:coverage

# E2E tests (requires the app running on localhost:3000)
npm run test:e2e            # Headless
npm run test:e2e:ui         # Interactive UI mode
```

### Testing with a test database

Use a separate `.env.test` to point at an isolated database:

```bash
# Reset and seed the test database
npm run db:test:reset       # Apply migrations to test DB
npm run db:test:seed        # Seed test DB with sample data
```

### Running tests in CI

A GitHub Actions workflow is provided at `.github/workflows/ci.yml`. It runs automatically on pushes and pull requests to `main` and `develop`.

**What CI does:**
1. Starts a PostgreSQL service container
2. Installs dependencies
3. Generates the Prisma client and pushes the schema
4. Seeds the database
5. Runs all Vitest suites (unit, component, integration)
6. Builds the Next.js app (type-check + build validation)

To run the same sequence locally:

```bash
npm run test:ci
```

> **Note:** `test:ci` runs all Vitest suites followed by Playwright E2E tests. Ensure the database is running and seeded before running locally.

---

## Completed
| Phase | What got added |
|---|---|
| Phase 1 | Project creation form — rich text, images, milestones, submit |
| Phase 2 | Project list + detail view for consultant |
| Phase 3 | Edit + version diffing + highlighted changes |
| Phase 4 | Learner project search and discovery |
| Phase 5 | Work requests + approval + state transitions |
| Phase 6 | Collaborative signoff + defer to next phase |
| Phase 7 | Comments section — threaded comments with replies, edit/delete, role badges |
| Phase 8 | Project completion — Mark as Complete modal, Reopen with reason, assignee notifications |
| Phase 9 | Analytics dashboard — stat cards, action breakdown, project activity, recent event feed |
