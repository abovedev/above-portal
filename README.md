# Above Portal

A full-stack company portal system with a **User Portal** and **Admin Portal** — built with React, TypeScript, Express, PostgreSQL, and Prisma.

---

## Features

### User Portal
- **Customizable Dashboard** — drag-and-drop widget board (Clock, Tasks, Announcements, Quick Links, Notes, Stats, Calendar)
- **Company Pages** — browse and read global published pages
- **My Pages** — pages assigned specifically to you
- **Profile** — edit personal info, upload avatar, change password
- **Notifications** — real-time bell with unread badge and dropdown panel

### Admin Portal
- **Admin Dashboard** — same drag-and-drop board with admin-specific widgets (System Stats)
- **Global Pages Manager** — create, edit, publish/draft, duplicate, delete pages
- **Rich Text Editor** — TipTap block editor with headings, lists, quotes, code, images, and dividers; autosaves every 30s
- **Per-User Pages** — two-panel layout to assign/unassign pages to specific users; batch assign support
- **Users Manager** — invite users, edit roles/departments, activate/deactivate accounts
- **Announcements** — create priority-tiered announcements with pinning and expiry
- **Settings** — company name, logo, accent color, theme

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, Framer Motion |
| State | Zustand |
| Routing | React Router v6 |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Auth | JWT (access) + Refresh Tokens (httpOnly cookie) |
| Editor | TipTap |
| DnD | @dnd-kit |
| UI Primitives | Radix UI |
| Toasts | Sonner |

---

## Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (or Docker)
- pnpm / npm

### 1. Clone & Install

```bash
# Root — no dependencies here
cd "Above Portal"

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Start PostgreSQL

**With Docker:**
```bash
docker compose up -d postgres
```

**Locally:**
```bash
createdb portal_db
# Update server/.env with your local connection string
```

### 3. Configure Environment

```bash
cp server/.env.example server/.env
# Edit server/.env — set DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
```

### 4. Migrate & Seed Database

```bash
cd server
npm run db:generate   # Generate Prisma client
npm run db:push       # Push schema to DB
npm run db:seed       # Seed demo data
```

### 5. Run Development Servers

**Terminal 1 — Backend:**
```bash
cd server && npm run dev
# Runs on http://localhost:4000
```

**Terminal 2 — Frontend:**
```bash
cd client && npm run dev
# Runs on http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@company.com | admin123 |
| User | sarah.chen@company.com | user123 |
| User | marcus.johnson@company.com | user123 |

---

## Database Management

```bash
cd server
npm run db:studio    # Open Prisma Studio (visual DB browser)
npm run db:migrate   # Run migrations (development)
npm run db:seed      # Re-seed demo data (clears existing data)
```

---

## Deploy to Render

This repo includes `render.yaml` for a Render Blueprint deployment:

- `above-portal-api` — Node/Express API
- `above-portal` — static Vite frontend
- `above-portal-db` — managed Postgres database
- `above-portal-uploads` — persistent disk for uploaded logos/images

Steps:

1. Push this folder to a GitHub or GitLab repository.
2. In Render, choose **New > Blueprint** and connect the repo.
3. Render will read `render.yaml` and create the API, frontend, and database.
4. Fill the secret environment variables Render prompts for:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `ASANA_CLIENT_ID`
   - `ASANA_CLIENT_SECRET`
5. Add these OAuth callback URLs to the matching Google/Asana app settings:
   - `https://above-portal-api.onrender.com/api/google/callback`
   - `https://above-portal-api.onrender.com/api/asana/callback`

If Render creates different service URLs, update `CLIENT_URL`, `VITE_API_URL`, `GOOGLE_REDIRECT_URI`, and `ASANA_REDIRECT_URI` in Render to match the actual URLs.

The API service uses a persistent disk, which requires a paid Render web service plan. Without a disk, uploaded images are not preserved across deploys/restarts.

---

## Project Structure

```
Above Portal/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── components/      # UI, widgets, layout, admin components
│       ├── pages/           # Auth, user, admin page views
│       ├── stores/          # Zustand state stores
│       ├── lib/             # API client (Axios), utilities
│       └── types/           # Shared TypeScript types
│
├── server/                  # Express + TypeScript backend
│   ├── src/
│   │   ├── controllers/     # Route handler logic
│   │   ├── middleware/       # Auth, error, file upload
│   │   ├── routes/          # Express routers
│   │   └── utils/           # JWT helpers, response formatters
│   └── prisma/
│       ├── schema.prisma    # Database schema
│       └── seed.ts          # Demo data seeder
│
└── docker-compose.yml       # PostgreSQL container
```

---

## API Overview

All responses follow: `{ success: boolean, data: T, message?: string }`

| Resource | Endpoints |
|---|---|
| Auth | POST /login, POST /logout, POST /refresh, GET /me |
| Pages | GET, POST, PUT, DELETE /api/pages |
| Assignments | GET /user/:id, POST, DELETE /api/assignments |
| Widgets | GET, POST, PUT, PUT/batch, DELETE /api/widgets |
| Users | GET, GET/:id, PUT/:id, POST/invite /api/users |
| Announcements | GET, POST, PUT/:id, DELETE/:id /api/announcements |
| Notifications | GET, PUT/:id/read, PUT/read-all /api/notifications |
| Tasks | Full CRUD /api/tasks |
| Quick Links | Full CRUD /api/quick-links |
| Settings | GET, PUT /api/settings |
