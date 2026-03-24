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

## Completed
| Phase | What gets added |
|---|---|
| Phase 1 | Project creation form — rich text, images, milestones, submit |
| Phase 2 | Project list + detail view for consultant |
| Phase 3 | Edit + version diffing + highlighted changes |

## Coming next
| Phase 4 | Learner project search and discovery |
| Phase 5 | Work requests + approval + state transitions |
| Phase 6 | Signoff flow for in-progress changes |
| Phase 7 | Comments section |
| Phase 8 | Project completion |
| Phase 9 | Analytics dashboard |
