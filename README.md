# Kaliyuva LMS Platform

Project-based learning platform connecting consultants and learners.

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

## Phase 0 — Setup & Run

### Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a hosted URL)
- An S3-compatible bucket (AWS S3, Supabase Storage, or Cloudflare R2)

---

### 1. Install dependencies

```bash
npm install
```

---

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

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

Generate a secret:
```bash
openssl rand -base64 32
```

---

### 3. Create the database

```bash
# Create the database in PostgreSQL first
createdb lms_platform

# Or via psql:
psql -U postgres -c "CREATE DATABASE lms_platform;"
```

---

### 4. Run Prisma migrations

```bash
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to database (dev shortcut)
```

For production, use migrations:
```bash
npm run db:migrate    # Creates and applies a migration
```

---

### 5. Seed the database

```bash
npm run db:seed
```

This creates:

| Role | Email | Password |
|---|---|---|
| Consultant | consultant@kaliyuva.com | password123 |
| Learner | learner@kaliyuva.com | password123 |
| Admin | admin@kaliyuva.com | password123 |

And one sample project.

---

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Phase 0 — What to Test

1. **Visit** `http://localhost:3000` → redirects to `/login`
2. **Login as consultant** → redirected to `/consultant/dashboard`
   - See stat cards (0/0/0 initially, or seeded project shows up)
   - Sidebar shows: Dashboard, My Projects
3. **Sign out** → back to login
4. **Login as learner** → redirected to `/learner/dashboard`
   - Sidebar shows: Dashboard, Browse Projects
5. **Try accessing** `/consultant/dashboard` while logged in as learner → `/unauthorized`
6. **Check DB** with Prisma Studio:
   ```bash
   npm run db:studio
   ```
   Verify: `users`, `projects`, `project_versions`, `milestones`, `project_phases` tables are populated.

---

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

## Coming Next

| Phase | What gets added |
|---|---|
| Phase 1 | Project creation form — rich text, images, milestones, submit |
| Phase 2 | Project list + detail view for consultant |
| Phase 3 | Edit + version diffing + highlighted changes |
| Phase 4 | Learner project search and discovery |
| Phase 5 | Work requests + approval + state transitions |
| Phase 6 | Signoff flow for in-progress changes |
| Phase 7 | Comments section |
| Phase 8 | Project completion |
| Phase 9 | Analytics dashboard |
