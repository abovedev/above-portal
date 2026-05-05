# Above Portal — Guide

A company intranet portal built with React + Express, deployed on Vercel (frontend + backend) with Aiven PostgreSQL.

---

## Live Site

| | |
|---|---|
| **URL** | https://above-portal.vercel.app |
| **Admin login** | georgina@abovedigital.co / TUy8rwMC |

---

## What It Does

Above Portal is a company hub where employees log in to see their personalised dashboard, company pages, and integrated tools. Admins manage users, pages, and announcements.

---

## Features

### For Everyone
| Feature | Description |
|---|---|
| **Dashboard** | Drag-and-drop widget grid, personalised per user |
| **Company Pages** | Rich-text pages published by admins |
| **My Pages** | Pages assigned specifically to you |
| **Profile** | Update your name, avatar, department, position |
| **Notifications** | Real-time in-app alerts |

### Dashboard Widgets
Widgets can be added, removed, and rearranged freely.

| Widget | What it shows |
|---|---|
| Clock | Live time |
| Notes | Personal scratchpad |
| Tasks | Your to-do list |
| Quick Links | Bookmarked URLs |
| Announcements | Latest company announcements |
| Stats | Personal stats summary |
| Gmail | Your recent emails (requires Google sign-in) |
| Google Calendar | Upcoming events (requires Google sign-in) |
| Google Chat | Chat spaces & messages (requires Google Workspace) |

### For Admins
| Area | What you can do |
|---|---|
| **Users** | Create, edit, deactivate user accounts |
| **Global Pages** | Publish pages visible to all users |
| **Per-User Pages** | Assign pages to specific users |
| **Announcements** | Post company-wide announcements |
| **Settings** | Company name, logo, theme |
| **Admin Dashboard** | Overview stats across all users |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Express, TypeScript, Node 22 |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT access + refresh tokens (HTTP-only cookies) |
| Hosting | Vercel (frontend + serverless API) |
| Database host | Aiven PostgreSQL |
| Integrations | Google (Gmail, Calendar, Chat), Asana |

---

## Local Development

### Prerequisites
- Node 22+
- A PostgreSQL database (local or Aiven)

### 1. Clone and install
```bash
git clone https://github.com/abovedev/above-portal.git
cd above-portal
npm install --prefix server
npm install --prefix client
```

### 2. Configure environment
Copy and fill in `server/.env`:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/portal_db"
JWT_SECRET="any-long-random-string"
JWT_REFRESH_SECRET="another-long-random-string"
CLIENT_URL="http://localhost:5173"

# Optional — for Google widgets
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="http://localhost:4000/api/google/callback"

# Optional — for Asana widget
ASANA_CLIENT_ID="..."
ASANA_CLIENT_SECRET="..."
ASANA_REDIRECT_URI="http://localhost:4000/api/asana/callback"
```

### 3. Set up the database
```bash
npm run db:generate   # generate Prisma client
npm run db:push       # sync schema to DB
npm run db:seed       # create demo users
```

### 4. Run
```bash
# Two terminals:
npm run dev:server    # API on http://localhost:4000
npm run dev:client    # App on http://localhost:5173
```

---

## Deployment

The app deploys to **Vercel** in one command from the project root:

```bash
vercel --prod
```

Vercel handles both the React frontend (static) and the Express API (`/api/*` → serverless function).

### Environment variables required on Vercel
Set these in the Vercel dashboard or via `vercel env add`:

```
DATABASE_URL
JWT_SECRET
JWT_REFRESH_SECRET
JWT_EXPIRES_IN          = 15m
JWT_REFRESH_EXPIRES_IN  = 7d
NODE_ENV                = production
CLIENT_URL              = https://above-portal.vercel.app
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI     = https://above-portal.vercel.app/api/google/callback
ASANA_CLIENT_ID
ASANA_CLIENT_SECRET
ASANA_REDIRECT_URI      = https://above-portal.vercel.app/api/asana/callback
```

### Database migrations
After schema changes, run against production:
```bash
DATABASE_URL="<aiven-url>" npx prisma db push --schema=server/prisma/schema.prisma
```

---

## Google Integration Setup

To enable Gmail, Calendar, and Google Chat widgets:

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add authorised redirect URI: `https://above-portal.vercel.app/api/google/callback`
4. Enable these APIs: Gmail API, Google Calendar API, Google Chat API
5. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to Vercel env vars
6. Users connect their account from the Dashboard → any Google widget → **Connect Google**

> Google Chat requires a **Google Workspace** account (not a personal Gmail).

---

## Asana Integration Setup

1. Go to [Asana Developer Console](https://app.asana.com/0/my-apps)
2. Create an app → set redirect URI to `https://above-portal.vercel.app/api/asana/callback`
3. Add `ASANA_CLIENT_ID` and `ASANA_CLIENT_SECRET` to Vercel env vars
4. Users connect from Dashboard → Tasks widget → **Connect Asana**

---

## Project Structure

```
above-portal/
├── api/
│   └── index.ts          ← Vercel serverless entry point (wraps Express)
├── client/
│   └── src/
│       ├── pages/         ← Route pages (dashboard, login, admin/*)
│       ├── components/    ← UI components + widgets
│       ├── stores/        ← Zustand state (auth, theme)
│       ├── hooks/         ← Data-fetching hooks
│       └── lib/           ← Axios API client
├── server/
│   └── src/
│       ├── controllers/   ← Request handlers
│       ├── routes/        ← Express route definitions
│       ├── middleware/    ← Auth, error handling, uploads
│       ├── prisma/        ← Prisma client singleton
│       └── utils/         ← JWT helpers, response utils
├── vercel.json            ← Build + routing config
└── package.json           ← Root deps (shared by Vercel build)
```

---

## User Roles

| Role | Access |
|---|---|
| `USER` | Dashboard, company pages, assigned pages, profile |
| `ADMIN` | Everything above + admin panel (users, pages, announcements, settings) |

Role is set per user in the admin → Users panel.

---

## Common Tasks

**Add a new user**
Admin panel → Users → New User → fill in details, set role.

**Publish a company page**
Admin panel → Global Pages → New Page → write content → Publish.

**Assign a page to a specific person**
Admin panel → Per-User Pages → New Page → assign to user(s).

**Reset a user's password**
Admin panel → Users → Edit → update password field.

**Update company branding**
Admin panel → Settings → company name / logo / accent colour.
