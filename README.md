# Forma

Give Forma an objective, idea or problem and watch it become a complete, schedulable plan.

```
Idea → Prompt → AI understands → AI structures → AI organizes → Finished plan
```

The app's home (`/app`) is a single prompt. When you submit, the prompt travels to the top of the screen, a frosted planning canvas appears, and the plan assembles live as an AI model running **in your browser** writes it: goal, phases, tasks, dependencies, timeline and milestones. When it's done, the canvas expands into a workspace with an overview, timeline, task list, calendar, milestones, resources, notes, and an assistant that can change the plan.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS 4 · Radix primitives in shadcn-style components · Framer Motion · Postgres (Render) with built-in auth (Arctic for Google/Microsoft) · WebLLM (on-device Qwen3 8B over WebGPU) · Zod

## Deploy on Render

`render.yaml` is a Render Blueprint that creates a Postgres database and the web service, and connects them.

1. In Render, choose **New → Blueprint**, connect this GitHub repository and select **Apply**. Render creates `forma-db` and `forma`, builds the app, and on start the schema in `db/migrations` is applied automatically.
2. Open the site at the `forma` service's `.onrender.com` address. Email sign-up works right away.
3. **Optional: Google sign-in.** In Google Cloud Console → APIs & Services → Credentials, create an OAuth client (Web application) with the authorized redirect URI `https://<your-app>.onrender.com/auth/callback/google`. Put its ID and secret in the service's **Environment** tab as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
4. **Optional: Microsoft sign-in.** In the Azure portal → Microsoft Entra ID → App registrations, register an app (any organizational directory and personal Microsoft accounts) with the Web redirect URI `https://<your-app>.onrender.com/auth/callback/microsoft`, create a client secret, and set `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET`.
5. **Test account.** Sign in with `admin@forma.com` (or just `admin`) and the password `Admin123!`. It's a shared placeholder account: the password is public in this repository, so before sharing the site widely change `DEMO_ADMIN_PASSWORD` in the service's **Environment** tab, or set it to `off` to switch the account off.
6. **Optional: password-reset email.** Create a free [Resend](https://resend.com) API key and set `RESEND_API_KEY` and `EMAIL_FROM`. Without them, “Forgot password?” is hidden.

Free-plan notes: a free web service sleeps after 15 minutes without visitors and takes about a minute to wake. **A free Render Postgres database is deleted 30 days after creation unless it's upgraded to a paid plan**, so upgrade `forma-db` before then to keep your data.

## Run locally

1. `npm install`, then `cp .env.example .env.local`.
2. Point `DATABASE_URL` at any Postgres 13+ database (a local one, or a Render database's *external* URL).
3. `npm run db:migrate` to apply the schema (`npm start` also does this), then `npm run dev`.

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build; start applies migrations, then serves |
| `npm run db:migrate` | Apply `db/migrations` to `DATABASE_URL` |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Unit tests: scheduling engine, mutations, AI schemas, calendars, voice text, passwords |

## How it works

### On-device AI

There is no AI provider and no API key. Plans and assistant answers come from **Qwen3** running on the visitor's GPU through WebGPU ([WebLLM](https://github.com/mlc-ai/web-llm)), in one of three sizes (`lib/ai/local/models.ts`):

| Size | Model | Download | For |
| --- | --- | --- | --- |
| Best | Qwen3 8B | about 4.5 GB | Dedicated NVIDIA/AMD graphics, 6 GB+ |
| Balanced | Qwen3 4B | about 2.3 GB | Most recent laptops |
| Light | Qwen3 1.7B | about 1 GB | Older or low-memory computers |

- **Auto** (the default) reads the graphics chip (vendor, memory hints, software rendering) and picks a size; people can override it in *Settings → AI*. Chips without 16-bit shader support automatically get the 32-bit build of the same size, which the 16-bit builds would otherwise fail on.
- The model downloads from Hugging Face on first use and is cached by the browser. It runs in a module Web Worker (`lib/ai/local/engine.ts`) loading the same pinned WebLLM version from jsDelivr, falling back to the main thread.
- If a model runs out of graphics memory, the error points to a lighter size.
- To pin one model for everyone, set `NEXT_PUBLIC_LOCAL_MODEL` to any WebLLM prebuilt model id.

### Setup and modes

New accounts go through `/setup` (`components/setup/setup-flow.tsx`) before their first plan: a mode (Student 📚, Professional 💼, Founder 🚀, Creator 🎨, Athlete 🏃, Life & home 🏡), daily time, pace, days off and a voice. Choices are made with `PressTile` (`components/ui/press-tile.tsx`), a physical key that lifts and tilts on hover and sinks into its base when pressed.

Modes are defined in `lib/personas.ts`. A mode adds guidance to the planning prompt, changes the home screen's starting suggestions and proposes default time and pace. It is stored on the account (`users.persona`); time, pace and days off go to `user_preferences`. Settings shows the mode and can reopen setup.

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

Plain Postgres (Render Postgres in production), schema in `db/migrations`, applied by `scripts/migrate.mjs` on start. Every table carries `user_id`, and every query in `lib/db/` is scoped to the signed-in user (tested: one account can't read, change or delete another's plans or chats). Tables: `users`, `oauth_accounts`, `sessions`, `password_resets`, `user_preferences`, `plans`, `phases`, `tasks`, `milestones`, `resources`, `schedule_items`, `conversations`, `messages`. A plan is written atomically by the `save_plan(user, plan)` function.

**Auth** (`lib/auth/`): passwords are hashed with scrypt; sessions are random tokens in an HttpOnly cookie, stored only as SHA-256 hashes and revocable (signing out deletes the session; a password reset signs out everywhere). Google and Microsoft use OAuth with PKCE and state (`/auth/oauth/[provider]` → `/auth/callback/[provider]`). A Google account links to an existing account only when Google has verified the email. Sign-in, sign-up and reset requests are rate-limited.

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
  auth/               passwords, sessions, OAuth providers, rate limiting, email
  db/                 Postgres pool and repositories (users, plans, chats, preferences)
  validation/         Zod schemas for the domain and API
  motion.ts           shared motion primitives
db/migrations/        schema (applied on start)
scripts/migrate.mjs   migration runner
render.yaml           Render Blueprint (database + web service)
tests/                node:test unit tests
```

## Design system

Tokens are in `app/globals.css`: near-black text on an off-white base, one restrained cobalt accent, hairline borders and a dark theme with the same accent. Geist Sans and Geist Mono. Motion primitives (`lib/motion.ts`) keep springs and easing consistent. With `prefers-reduced-motion`, Framer Motion turns movement into fades and CSS loops stop.

To rename the product, edit `product` in `lib/config.ts`.

## Site and app

- **Marketing site** (`app/(marketing)/`): `/` (home), `/features`, `/how-it-works` and `/pricing`, sharing one nav and footer (`components/landing/`). The live demo is the real planning canvas replaying a streamed plan (`components/landing/demo-plan.ts`) through the real `PlanAssembler`. Signed-in visitors see **Open app** and their account menu instead of **Sign in**. Animations in `components/reactbits/` come from [React Bits](https://github.com/DavidHDev/react-bits) (MIT + Commons Clause, see the license file there). The pricing tiers are placeholders: no payment provider is connected.
- **The app** lives at `/app` (the prompt and planning canvas), with `/today`, `/plan/[id]`, `/chats`, `/history`, `/personalize`, `/settings` and `/setup`.
- **Sign-in** (`/login`): email and password, password reset (`/reset-password`), and Google or Microsoft when their credentials are set.

### Account menu and Personalize

The avatar menu holds Today, Personalize, Chats, Plans, Settings, light/dark/system and a color-theme row. `/personalize` covers:

- **Mode** (see Setup and modes below).
- **Appearance:** light, dark or system, plus color themes (Cobalt, Pastel pink, Baby blue, Mint, Lavender, Peach, Graphite). Each palette is a set of CSS variables in `app/globals.css`, checked for WCAG AA contrast in light and dark.
- **Voice:** the voice picker.
- **Accessibility:** larger text (the interface scales), higher contrast, reduced motion (also switches Framer Motion to fades), readable spacing and underlined links.
- **Connections** (below).

Appearance and accessibility choices are stored on the device (`lib/appearance.ts`, applied before first paint by a script in the root layout).

### Connections

Read-only, with no third-party API keys:

- **Calendar feeds:** Schoology, Canvas, Outlook, Google Calendar and Apple Calendar can all publish a private iCal link. Forma stores the link on the account and reads upcoming items from it on the server (`lib/connections/`). The fetcher accepts only HTTPS, checks every resolved address inside the connection's own DNS lookup so it can't be pointed at private networks, follows at most three redirects and caps size and time.
- **Skyward** has no public feed, so its assignments page is pasted and kept on the device.
- **Using them:** in the prompt box, *Add context → Connected tools* attaches upcoming deadlines to a new plan.
- **The other direction:** every plan has *Add to calendar* (`/api/plans/[id]/calendar`), an .ics file for Outlook, Google or Apple Calendar.

### Today, focus and reminders

- **Today** (`/today`): the day's work sessions from every active plan, with overdue and due-today tasks, the next six days, and focus totals. Start a focus session or tick a task off from any row. Finishing a task reflows the plan, so its later sessions disappear and the rest move up. Data comes from `GET /api/today` (`lib/db/today.ts`) using the browser's local date.
- **Focus timer** (`components/focus/`): available on every page. 15, 25 or 50 minute blocks with a 5 minute break (10 after 50), +5 minutes, pause (Space), minimize to a floating pill (Esc), and *Mark task done*. It ends with a soft chime, and the voice says so when voice is on. The state is kept in localStorage, so a reload doesn't lose it, and focused minutes are saved to `focus_sessions` (`POST /api/focus`, `db/migrations/002_focus.sql`).
- **Reminders** (`components/today/reminders.tsx`): five minutes before each session, plus a once-a-day deadline note. They come from an open Forma tab: a system notification when the tab is in the background and notifications are allowed (Today asks), otherwise an in-app toast with *Start focus*. The **Task reminders** setting turns them off. With no tab open nothing is sent, because there's no push server.

### Chats

`/chats` lists every plan that has an assistant conversation, with search and the full transcript. *Continue this chat* opens the plan with the assistant focused.

## Claude test bench

`npm run bench` builds `bench/dist/forma-bench.html`: a single-file version of the app that runs inside Claude as an artifact, with no server or database. It bundles the real assembler, prompts, schemas, scheduling engine and mutation reducer (`bench/engine.ts`), and calls Claude (not the on-device model) through the artifact `sample` capability on the viewer's own account. Plans are saved in the browser. Use it to try the generation flow and prompt changes without deploying.

## Current limitations

- Reminders only fire while a Forma tab is open (no push server). Notification preferences are saved, but this repository doesn't send email. Connect an email provider to deliver them.
- File context accepts text formats (`.txt`, `.md`, `.csv`, `.json`). Links are passed as URLs and not fetched.
- The on-device model is much smaller than a hosted frontier model: plans are simpler, and it can't run on phones or low-memory GPUs.
- Attached context (notes, files, earlier plans) shares the 8,192-token window with the plan, so very long attachments can crowd out the plan.
