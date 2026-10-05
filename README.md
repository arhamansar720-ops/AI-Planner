# Forma

Give Forma an objective, idea or problem and watch it become a complete, schedulable plan.

```
Idea → Prompt → AI understands → AI structures → AI organizes → Finished plan
```

The home page is the product: a single prompt. When you submit, the prompt travels to the top of the screen, a frosted planning canvas appears, and the plan assembles live as an AI model running **in your browser** writes it: goal, phases, tasks, dependencies, timeline and milestones. When it's done, the canvas expands into a workspace with an overview, timeline, task list, calendar, milestones, resources, notes, and an assistant that can change the plan.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS 4 · Radix primitives in shadcn-style components · Framer Motion · Supabase (Postgres + Auth) · WebLLM (on-device Qwen3 8B over WebGPU) · Zod

## Getting started

1. **Install**

   ```bash
   npm install
   cp .env.example .env.local
   ```

2. **Create a Supabase project** and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the anon/publishable key) from *Project Settings → API*.

3. **Apply the schema.** Either run `supabase db push` with the Supabase CLI, or paste `supabase/migrations/20261005000000_init.sql` into the SQL editor. It creates the tables, row-level security policies, the new-user trigger and the `save_plan` function.

4. **Configure auth redirects.** In *Authentication → URL Configuration*, set the Site URL to your app's URL and add `<your-url>/auth/callback` as a redirect URL (used by email confirmation).

5. **Run it**

   ```bash
   npm run dev
   ```

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Unit tests for the scheduling engine, mutations and AI schemas |

## How it works

### On-device AI

There is no AI provider and no API key. Plans and assistant answers come from **Qwen3 8B** (4-bit, via [WebLLM](https://github.com/mlc-ai/web-llm)) running on the visitor's GPU through WebGPU:

- The model (about 5 GB) downloads from Hugging Face on first use and is cached by the browser; later visits load it in seconds. The prompt box shows its status, and Settings can remove it.
- It runs in a module Web Worker (`lib/ai/local/engine.ts`) so the interface keeps animating while it writes. The worker loads the same pinned WebLLM version from jsDelivr; if that fails it runs on the main thread.
- It needs Chrome or Edge with WebGPU and roughly 6 GB of graphics memory. Unsupported devices get a clear message instead of a broken flow.
- The context window is raised to 8,192 tokens so a prompt and a complete plan fit; the planning prompt asks for compact plans (3–5 phases of 3–5 tasks).
- To use a different model, set `NEXT_PUBLIC_LOCAL_MODEL` to any WebLLM prebuilt model id (for example `Qwen3-4B-q4f16_1-MLC` for weaker machines).

### Generation: real streaming, not a loading animation

1. `lib/ai/local/planner.ts` asks the model for **NDJSON**: one JSON object per line (`meta`, then each `phase` followed by its `task`s, then `milestone`, `risk`, `resource` and `next`).
2. As each line completes, `PlanAssembler` (`lib/ai/assembler.ts`) validates it with Zod (`lib/ai/schemas.ts`), converts it to a domain entity and hands it to the canvas right away.
3. The model works in **day offsets** ("day 0 = today"). The assembler converts them to calendar dates, so the model never does date arithmetic.
4. The finished plan is posted to `POST /api/plans`, which re-normalizes and validates it, assigns its id and saves it.

`use-plan-generation.ts` puts incoming events in a queue and releases them at a readable pace, speeding up when there's a backlog. The canvas (`components/generation/`) draws them as they arrive: the goal node, phase columns, task cards that settle into place, dependency connectors and a timeline that builds itself.

If the request is too vague to plan, the model can send a single `clarify` line instead. The canvas shows the question with suggested answers, and generation restarts with the answer attached.

### One reducer, two places

Every change to a plan is a typed **mutation** (`lib/validation/mutations.ts`). The same pure reducer (`lib/planning/mutations.ts`) runs optimistically in the browser and authoritatively in `PATCH /api/plans/[id]`. The server reloads the plan, applies the mutations and persists the result.

The deterministic engine in `lib/planning/schedule.ts` handles everything derived:

- **Work sessions:** each task's estimated effort is spread across working days within its window. It respects daily capacity, blocked weekdays and dependencies, and anything that doesn't fit spills past the due date rather than disappearing.
- **Dependency propagation:** when a task moves, dependents that would start too early are pushed out, and tightly chained follow-ups move with it.
- **Deadlines:** moving the plan's deadline stretches or compresses the whole plan proportionally.
- **Phase windows, milestone positions and plan status** are recomputed after every change.

### The assistant edits the plan

`lib/ai/local/assistant.ts` gives the model the current plan and asks for a reply plus a list of structured **operations** (`update_task`, `set_daily_minutes`, `set_blocked_weekdays`, `set_deadline`, and so on). WebLLM's JSON-schema mode constrains the answer to that shape, and it is validated again with Zod. Each operation becomes a normal mutation run through the same reducer, so "I can't work Fridays" is one `set_blocked_weekdays` operation and the engine reschedules everything else. Changes show up in the conversation and can be undone. Conversations are stored per plan.

### Data

Supabase Postgres with RLS on every table (`user_id = auth.uid()`). Tables: `profiles`, `user_preferences`, `plans`, `phases`, `tasks`, `milestones`, `resources`, `schedule_items`, `conversations`, `messages`. A plan is written atomically by the `save_plan(jsonb)` function, which runs as the caller so RLS still applies.

## Project structure

```
app/                  routes: /, /plan/[id], /history, /settings, /login, api/*
components/
  home/               heading, prompt composer, context and model menus, chips
  generation/         planning canvas, plan graph, stage list, status, SSE hook
  planner/            orchestrator, workspace shell, overview, plan store
  tasks/ timeline/ calendar/ ai/ history/ settings/
  ui/                 design-system primitives
lib/
  ai/                 assembler, prompts, schemas, operations; local/ = on-device engine, planner, assistant
  planning/           dates, scheduling engine, mutations, selectors, stages
  db/                 Supabase clients and repositories
  validation/         Zod schemas for the domain and API
  motion.ts           shared motion primitives
supabase/migrations/  schema
tests/                node:test unit tests
```

## Design system

Tokens are in `app/globals.css`: near-black text on an off-white base, one restrained cobalt accent, hairline borders and a dark theme with the same accent. Geist Sans and Geist Mono. Motion primitives (`lib/motion.ts`) keep springs and easing consistent. With `prefers-reduced-motion`, Framer Motion turns movement into fades and CSS loops stop.

To rename the product, edit `product` in `lib/config.ts`.

## Claude test bench

`npm run bench` builds `bench/dist/forma-bench.html`: a single-file version of the app that runs inside Claude as an artifact, with no server or database. It bundles the real assembler, prompts, schemas, scheduling engine and mutation reducer (`bench/engine.ts`), and calls Claude (not the on-device model) through the artifact `sample` capability on the viewer's own account. Plans are saved in the browser. Use it to try the generation flow and prompt changes without deploying.

## Current limitations

- Notification preferences are saved, but this repository doesn't send email. Connect an email provider to deliver them.
- File context accepts text formats (`.txt`, `.md`, `.csv`, `.json`). Links are passed as URLs and not fetched.
- The on-device model is much smaller than a hosted frontier model: plans are simpler, and it can't run on phones or low-memory GPUs.
- Attached context (notes, files, earlier plans) shares the 8,192-token window with the plan, so very long attachments can crowd out the plan.
