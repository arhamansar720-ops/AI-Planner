# Forma

Give Forma an objective, idea or problem and watch it become a complete, schedulable plan.

```
Idea → Prompt → AI understands → AI structures → AI organizes → Finished plan
```

The app's home (`/app`) is a single prompt. When you submit, the prompt travels to the top of the screen, a frosted planning canvas appears, and the plan assembles live as an AI model running **in your browser** writes it: goal, phases, tasks, dependencies, timeline and milestones. When it's done, the canvas expands into a workspace with an overview, timeline, task list, calendar, milestones, resources, notes, and an assistant that can change the plan.

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

4. **Configure auth redirects.** In *Authentication → URL Configuration*, set the Site URL to your app's URL and add `<your-url>/auth/callback` as a redirect URL (used by email confirmation, password resets and social sign-in).

5. **Optional: Google and Microsoft sign-in.** The login page reads which providers are switched on in Supabase and only uses those.
   - **Google:** create an OAuth client (Web application) in Google Cloud Console → APIs & Services → Credentials, with `https://<your-project>.supabase.co/auth/v1/callback` as the authorized redirect URI. Paste its client ID and secret into Supabase → *Authentication → Providers → Google* and enable it.
   - **Microsoft:** register an app in the Azure portal (Microsoft Entra ID → App registrations), add the same Supabase callback URL as a Web redirect URI, create a client secret, and enter them in Supabase → *Authentication → Providers → Azure*.

6. **Run it**

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

### Setup and modes

New accounts go through `/setup` (`components/setup/setup-flow.tsx`) before their first plan: a mode (Student 📚, Professional 💼, Founder 🚀, Creator 🎨, Athlete 🏃, Life & home 🏡), daily time, pace, days off and a voice. Choices are made with `PressTile` (`components/ui/press-tile.tsx`), a physical key that lifts and tilts on hover and sinks into its base when pressed.

Modes are defined in `lib/personas.ts`. A mode adds guidance to the planning prompt, changes the home screen's starting suggestions and proposes default time and pace. It is stored in the account's Supabase user metadata, so no table change is needed; time, pace and days off go to `user_preferences`. Settings shows the mode and can reopen setup.

### Voice

Free, with no account or download: it uses the browser's Web Speech API.

- **Read aloud** (`lib/voice/speech.ts`): the voices built into the device, ranked so natural-sounding ones come first (`lib/voice/text.ts`). People choose a voice (each press plays a preview), a speed, and whether assistant replies and finished plans are read automatically. Every assistant reply has a Listen button. Voice choices are saved per device, since each device has its own voices.
- **Dictation** (`lib/voice/dictation.ts`): a mic in the prompt box and the assistant. It asks the browser to recognize speech on the device where supported; otherwise the browser uses its own speech service (in Chrome, Google's). Hidden in browsers without speech recognition (such as Firefox).

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
app/                  (marketing)/ site pages; app, plan/[id], chats, history, personalize, settings, setup, login; api/*
components/
  home/               heading, prompt composer, context and model menus, chips
  setup/              first-run setup flow
  voice/              dictation and read-aloud buttons, voice picker
  personalize/ chats/ personalize page and chat history
  landing/            marketing page sections and the replayed demo
  reactbits/          vendored React Bits animation components
  generation/         planning canvas, plan graph, stage list, status, SSE hook
  planner/            orchestrator, workspace shell, overview, plan store
  tasks/ timeline/ calendar/ ai/ history/ settings/
  ui/                 design-system primitives
lib/
  ai/                 assembler, prompts, schemas, operations; local/ = on-device engine, planner, assistant
  connections/        calendar feed providers, safe fetcher, iCal reader/writer
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

## Site and app

- **Marketing site** (`app/(marketing)/`): `/` (home), `/features`, `/how-it-works` and `/pricing`, sharing one nav and footer (`components/landing/`). The live demo is the real planning canvas replaying a streamed plan (`components/landing/demo-plan.ts`) through the real `PlanAssembler`. Signed-in visitors see **Open app** and their account menu instead of **Sign in**. Animations in `components/reactbits/` come from [React Bits](https://github.com/DavidHDev/react-bits) (MIT + Commons Clause, see the license file there). The pricing tiers are placeholders: no payment provider is connected.
- **The app** lives at `/app` (the prompt and planning canvas), with `/plan/[id]`, `/chats`, `/history`, `/personalize`, `/settings` and `/setup`.
- **Sign-in** (`/login`): email and password, password reset (`/reset-password`), and Google or Microsoft when enabled in Supabase.

### Account menu and Personalize

The avatar menu holds Personalize, Chats, Plans, Settings, light/dark/system and a color-theme row. `/personalize` covers:

- **Mode** (see Setup and modes below).
- **Appearance:** light, dark or system, plus color themes (Cobalt, Pastel pink, Baby blue, Mint, Lavender, Peach, Graphite). Each palette is a set of CSS variables in `app/globals.css`, checked for WCAG AA contrast in light and dark.
- **Voice:** the voice picker.
- **Accessibility:** larger text (the interface scales), higher contrast, reduced motion (also switches Framer Motion to fades), readable spacing and underlined links.
- **Connections** (below).

Appearance and accessibility choices are stored on the device (`lib/appearance.ts`, applied before first paint by a script in the root layout).

### Connections

Read-only, with no third-party API keys:

- **Calendar feeds:** Schoology, Canvas, Outlook, Google Calendar and Apple Calendar can all publish a private iCal link. Forma stores the link in the account's user metadata and reads upcoming items from it on the server (`lib/connections/`). The fetcher accepts only HTTPS, checks every resolved address inside the connection's own DNS lookup so it can't be pointed at private networks, follows at most three redirects and caps size and time.
- **Skyward** has no public feed, so its assignments page is pasted and kept on the device.
- **Using them:** in the prompt box, *Add context → Connected tools* attaches upcoming deadlines to a new plan.
- **The other direction:** every plan has *Add to calendar* (`/api/plans/[id]/calendar`), an .ics file for Outlook, Google or Apple Calendar.

### Chats

`/chats` lists every plan that has an assistant conversation, with search and the full transcript. *Continue this chat* opens the plan with the assistant focused.

## Claude test bench

`npm run bench` builds `bench/dist/forma-bench.html`: a single-file version of the app that runs inside Claude as an artifact, with no server or database. It bundles the real assembler, prompts, schemas, scheduling engine and mutation reducer (`bench/engine.ts`), and calls Claude (not the on-device model) through the artifact `sample` capability on the viewer's own account. Plans are saved in the browser. Use it to try the generation flow and prompt changes without deploying.

## Current limitations

- Notification preferences are saved, but this repository doesn't send email. Connect an email provider to deliver them.
- File context accepts text formats (`.txt`, `.md`, `.csv`, `.json`). Links are passed as URLs and not fetched.
- The on-device model is much smaller than a hosted frontier model: plans are simpler, and it can't run on phones or low-memory GPUs.
- Attached context (notes, files, earlier plans) shares the 8,192-token window with the plan, so very long attachments can crowd out the plan.
