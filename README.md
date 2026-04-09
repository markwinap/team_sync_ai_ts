# Team Sync AI

Team Sync is an AI-powered project orchestration platform that intelligently builds and structures project teams while generating comprehensive project documentation from organizational knowledge.

---

## Description

Team Sync leverages artificial intelligence to streamline project planning and team allocation by connecting three core domains: company profiles, project requirements, and team member capabilities. 

The platform automatically assigns the most suitable team members from a talent bank to new or existing projects, ensuring optimal alignment between skills, availability, and project needs. In parallel, it generates structured project artifacts such as functional requirements, user stories, system architecture, and risk assessments—accelerating project setup and improving consistency across initiatives.

By integrating organizational data with AI-driven insights, Team Sync reduces manual effort, enhances decision-making, and enables teams to start projects faster with greater clarity and precision.

---

## Project Features

### 🤖 AI-Powered Team Assignment
- Automatically matches team members to projects based on:
  - Expertise & specialization  
  - Technical stack proficiency  
  - Certifications & credentials  
  - Availability & capacity  
- Optimizes team composition for efficiency and performance  
- Supports assignment for both new and existing projects  

---

### 📄 Intelligent Project Generation
- Generates structured project documentation, including:
  - Functional Requirements  
  - Non-functional Requirements  
  - User Stories / Use Cases  
  - Risks & Constraints  
  - System Architecture (high-level)
  - Scope (in/out)
- Ensures completeness and consistency across all project artifacts  

---

### 🧩 Domain-Driven Data Modeling

#### Company Profile
- Name, industry, and partnerships  
- Technology intent and development stacks  
- Certifications, standards, and compliance  

#### Project Profile
- Project name, description, and purpose  
- Business goals and stakeholders  
- Scope definition (in/out)  
- Architecture, data models, and integrations  
- Technology stack and development process  
- Timeline, milestones, risks, and operations
- Quality & Compliance
- Dependencies & Integrations
- Team & Roles
- Timeline & Milestones
- Risks & Constraints
- Deployment & Operations, Environments (dev, staging, prod), Deployment strategy, Monitoring & logging, Maintenance plan

#### Team Member Profile
- Expertise and specialization  
- Technical skills and certifications  
- Responsibilities and contributions  
- Communication and collaboration style  
- Availability, capacity, and growth goals  

---

### ⚙️ Talent Bank Integration
- Centralized repository of team member profiles  
- Enables dynamic and scalable team allocation  
- Continuously updated with performance and skill data  

---

### 📊 Enhanced Decision-Making
- Data-driven recommendations for:
  - Team composition  
  - Project structure  
  - Risk mitigation  
- Improves planning accuracy and delivery outcomes  

---

### 🚀 Productivity Acceleration
- Reduces manual effort in project setup  
- Speeds up onboarding and planning phases  
- Enables teams to focus on execution rather than preparation  

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
| AI — Persona & Proposal | OpenAI-compatible endpoint (configurable) |
| AI — Meeting & Comms | [Google Gemini](https://ai.google.dev) (summary, analysis, generation, translation) |
| AI — Transcription | [AssemblyAI](https://www.assemblyai.com) (real-time WebSocket streaming) |
| Package Manager | pnpm 10 |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
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
npm run db:seed        # Seed Team Sync demo data
npm run dev            # Start the development server (Turbopack)
```

### Database Management

```bash
npm run db:generate    # Generate a new migration from schema changes
npm run db:migrate     # Apply pending migrations
npm run db:seed        # Seed Team Sync demo records if missing
npm run db:push        # Push schema directly (dev only)
npm run db:studio      # Open Drizzle Studio to browse the database
```

---

## Project Structure

```text
src/
  app/
    _components/
      team-sync-dashboard.tsx      # Presentation-only UI component
    page.tsx                       # Composition root for the home screen
    team-sync.module.css
  modules/
    team-sync/
      domain/
        entities.ts                # Core business entities and scoring utilities
        repositories.ts            # Repository contracts (ports)
      application/
        use-cases/
          build-team-assignment.ts
          generate-project-artifacts.ts
        services/
          team-sync-facade.ts      # Use-case orchestration layer
      infrastructure/
        repositories/
          drizzle-team-sync-repository.ts
      presentation/
        view-models/
          dashboard-view-model.ts  # Maps domain output to UI shape
  server/
    api/
      routers/
        team-sync.ts               # tRPC endpoint exposing Team Sync snapshot
      root.ts
    services/
      persona-analysis.ts
      proposal-analysis.ts
      meeting-notes.ts
      translation.ts
```

---

## Architecture Notes (Clean Architecture)

- Domain layer contains pure business types and rules with no framework dependencies.
- Application layer implements use cases and orchestration logic.
- Infrastructure layer provides data/provider adapters and can be swapped later.
- Presentation layer maps use-case outputs into UI-focused view models.
- UI components in `src/app` only render data; they do not implement business rules.

---

## Existing Component Scan and Evaluation

### Already Existing and Reusable

- `src/server/services/*` already includes substantial AI orchestration and prompt logic for persona/proposal/meeting workflows.
- `src/server/api/trpc.ts` is a good shared API boundary with auth-aware procedures.
- `src/server/db/schema.ts` and auth config provide stable persistence/auth foundations.

### Gaps Found Before Generation

- Home UI was still default template content and did not reflect product capabilities.
- API routers only exposed example post operations.
- Business logic and feature boundaries were not grouped by domain module.

### What Was Generated

- A new `modules/team-sync` vertical slice with domain, application, infrastructure, and presentation layers.
- A `teamSync` tRPC router endpoint exposing a typed feature snapshot.
- A dashboard page and reusable component rendering team recommendations and project artifacts.
- Drizzle schema tables, migration scripts, and a database-backed Team Sync repository with default bootstrap seed data.

---

## Next Evolution Path

- Connect existing AI services (`persona-analysis`, `proposal-analysis`, etc.) into application use cases.
- Add integration tests per use case and contract tests for repository adapters.
