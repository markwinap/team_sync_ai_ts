# Team Sync AI

Team Sync is an AI-powered project orchestration platform that intelligently builds and structures project teams while generating comprehensive project documentation from organizational knowledge.

---

## Description

Team Sync connects three planning domains into one AI-assisted workflow:

- Company profile context (industry, constraints, standards, and technical direction)
- Project profile requirements (goals, scope, architecture, risks, timeline, and delivery model)
- Team member capabilities (skills, certifications, roles, and availability)

Using this combined context, the platform recommends team allocation and generates project-ready documentation. The result is faster project setup, clearer role alignment, and more consistent planning outputs.

---

## Project Features

### 🤖 AI-Powered Team Assignment
- Suggests team assignments based on role fit, skills, certifications, and capacity
- Supports both greenfield project staffing and existing project re-planning
- Balances practical constraints such as required roles and allocation percentages

---

### 📄 Intelligent Project Generation
- Generates structured artifacts from project and organizational context
- Covers functional/non-functional requirements, stories/use cases, risks, and architecture direction
- Improves consistency and completeness across project documents

---

### 🧩 Domain-Driven Data Modeling

#### Company Profile
- Organization identity, domain context, technology direction, and compliance constraints

#### Project Profile
- Goals, stakeholders, and scope boundaries
- Architecture, integrations, dependencies, and technology stack
- Delivery details such as timeline, environments, operations, and risk controls

#### Team Member Profile
- Expertise, role coverage, technical skills, and certifications
- Capacity, collaboration preferences, and growth direction

---

### ⚙️ Talent Bank and Profile Management
- Centralized profile management for company, project, and team-member data
- Supports iterative updates as project context evolves
- Enables repeatable planning workflows across multiple initiatives

---

### 📊 Enhanced Decision-Making
- Surfaces AI-backed recommendations for team composition and project structure
- Helps identify planning risks earlier and improve delivery confidence

---

### 🚀 Productivity Acceleration
- Reduces manual setup effort in early project phases
- Shortens onboarding-to-execution time with ready-to-use artifacts
- Lets teams spend more time delivering and less time drafting baseline plans

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org) (App Router, Turbopack) |
| Language | TypeScript 5 |
| API | [tRPC v11](https://trpc.io) |
| Database | PostgreSQL via [Drizzle ORM](https://orm.drizzle.team) |
| UI | [Ant Design 6](https://ant.design) |
| Auth | [NextAuth.js v5](https://next-auth.js.org) (GitHub OAuth) |
| AI — Persona & Proposal | OpenAI-compatible provider (configurable base URL/model) |
| AI — Meeting & Comms | [Google Gemini](https://ai.google.dev) (summary, analysis, generation, translation) |
| AI — Transcription | [AssemblyAI](https://www.assemblyai.com) (real-time WebSocket streaming) |
| Package Manager | npm |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- A running PostgreSQL instance (see `start-database.sh` for a Docker-based local setup)

### Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```env
# Required
DATABASE_URL=               # PostgreSQL connection string

# Auth (required in production)
AUTH_SECRET=                # Random secret for NextAuth session encryption

# GitHub OAuth (optional — enables login)
GITHUB_CLIENT_ID=           # GitHub OAuth app client ID
GITHUB_CLIENT_SECRET=       # GitHub OAuth app client secret

# OpenAI-compatible AI provider (persona analysis, proposal analysis, chat)
AI_API_KEY=                 # API key for the AI provider
AI_BASE_URL=                # Optional — defaults to OpenAI endpoint
AI_MODEL=                   # Optional — defaults to gpt-4o-mini

# Google Gemini (meeting notes AI, communications generation, translation)
GOOGLE_GEMINI_API_KEY=      # Required to enable Gemini-powered features
GOOGLE_GEMINI_PROJECT_ID=   # Optional — GCP project ID if using Vertex AI
GOOGLE_GEMINI_MODEL=        # Optional — defaults to gemini-2.5-flash

# AssemblyAI (live meeting transcription)
ASSEMBLY_AI_API_KEY=        # Required to enable real-time audio transcription
```

### Install and Run

```bash
npm install
npm run db:migrate     # Apply database migrations
npm run dev            # Start the development server (Turbopack)
```

### Database Management

```bash
npm run db:generate    # Generate a new migration from schema changes
npm run db:migrate     # Apply pending migrations
npm run db:push        # Push schema directly (dev only)
npm run db:studio      # Open Drizzle Studio to browse the database
```

---

## Project Structure

```text
src/
  app/
    api/
      auth/[...nextauth]/
      trpc/[trpc]/
    _components/
      team-sync-dashboard.tsx
      company-profile-manager.tsx
      project-profile-manager.tsx
      team-member-profile-manager.tsx
    page.tsx
    layout.tsx
    team-sync.module.css
  modules/
    team-sync/
      application/
        services/
        use-cases/
      domain/
      infrastructure/
      presentation/
  lib/
    normalize.ts
  server/
    api/
      routers/
      root.ts
      trpc.ts
    auth/
      config.ts
      index.ts
    db/
      index.ts
      schema.ts
    services/
      persona-analysis.ts
      proposal-analysis.ts
      proposal-chat.ts
      meeting-notes.ts
      team-member-matching.ts
      project-markdown-generation.ts
      translation.ts
      gemini-client.ts
      response-cache.ts
  trpc/
    react.tsx
    server.ts
    query-client.ts
```

Top-level support directories:

```text
drizzle/             # SQL migrations
public/              # Static assets
scripts/             # Utility scripts
styles/globals.css   # Global styles
```

---
