# School OS

A full-stack school management system with a **Next.js frontend** and **Express backend**.

## Project Structure

```
school-os/
├── frontend/          # Next.js 16 (TypeScript, Tailwind, App Router)
│   ├── src/
│   │   ├── app/       # App Router pages
│   │   ├── components/# React components (shadcn/ui)
│   │   └── lib/       # Utilities
│   ├── prisma/        # Database schema
│   └── package.json
├── backend/           # Express API (TypeScript)
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── types/
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or use Supabase)

### Run Locally

Open **two terminals** and run:

**Terminal 1 — Backend:**
```bash
cd backend
npm install
cp .env.example .env   # fill in your credentials
npm run dev
```
Backend runs on **http://localhost:4000**

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
cp .env.example .env   # fill in your credentials
npm run dev
```
Frontend runs on **http://localhost:3000**

## Tech Stack

| Layer    | Tech                                        |
|----------|---------------------------------------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind |
| UI       | shadcn/ui                                   |
| Backend  | Express, TypeScript                         |
| Database | Prisma + PostgreSQL (Supabase)              |
| Auth     | Supabase Auth                               |
