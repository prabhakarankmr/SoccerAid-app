# Frontend Project Instructions — Football Match Tracker (React Native)

> **Read this file before writing any code.** It is the single source of truth for the mobile app.
> Recommended: keep a copy at the repo root as `CLAUDE.md` / `AGENTS.md` so AI coding tools load it automatically.
> Companion file: `BACKEND_INSTRUCTIONS.md` (API, engine rules, realtime contract).

---

## 0. Living Document Protocol (MANDATORY)

This file must always describe the app as it actually is. **Any change that introduces a new procedure updates this file in the same commit / PR.**

| Change                                  | Section to update       |
| --------------------------------------- | ----------------------- |
| New screen / route                      | §5 Navigation & screens |
| New reusable component                  | §7 Component library    |
| New API hook or endpoint used           | §6 Data layer           |
| New socket event handled                | §6.4 Realtime           |
| New colour, spacing or typography token | §4 Design system        |
| New modal step in the scoring flow      | §8 Live match flow      |
| New env var, script, build profile      | §11 Config & release    |
| New library or convention               | §2 / §9                 |

Rules:

1. PR template has a required checkbox: **"FRONTEND_INSTRUCTIONS.md updated (or not needed because …)"**.
2. Every update adds one line to the **Changelog** at the bottom.
3. CI runs `scripts/check-instructions.ts`: fails if a route file in `app/`, a component in `src/components/`, or a key in `src/config/env.ts` is not mentioned in this file.
4. AI agents: when you add a procedure, update this file **in the same task** without being asked.

---

## 1. Golden Rule — The App Is a Thin Client

**No business logic in the app.** The app:

- **sends intents** (e.g. "pass from P1 to P2", "shot on target", "undo") to `POST /api/v1/matches/:id/events`;
- **renders state** returned by the API or pushed by the WebSocket (score, clock, possession, stats, timeline, standings, awards);
- **shows the next modal** the server asks for via the `prompt` field in the event response.

The app must **never** compute: score, stats, assists, possession time, match clock, standings/points table, leaderboards, awards, formations' default coordinates, fixture generation, or validation of football rules. If you are writing an `if` about football rules in the app, it belongs in the backend.

Allowed client-side logic: UI state (which modal is open, selected tab), input validation for UX (required fields), formatting (`mm:ss`), rendering a running clock **between** server updates from `clockStartedAt + elapsedSec`, and the offline queue.

> The reference project (`E:\football-match-tracker`) does all logic in `components/match-setup.tsx` (~2000 lines of `useState` + stat maths). **Copy its UI, not its logic.**

---

## 2. Tech Stack (pin exact versions at init)

| Concern            | Choice                                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework          | **Expo** (latest SDK at init) + React Native (version bundled with that SDK), **TypeScript strict**                                                      |
| Routing            | **Expo Router** (file-based, typed routes)                                                                                                               |
| Styling            | **NativeWind** (latest stable — v5 with Tailwind CSS v4 if stable at init, otherwise v4 + Tailwind 3.4) — `className` everywhere                         |
| Server state       | **TanStack Query v5**                                                                                                                                    |
| Local UI state     | **Zustand** (small stores only — no server data copied into it)                                                                                          |
| API client         | Generated from backend OpenAPI with **orval** (or `openapi-typescript` + `openapi-fetch`) — never hand-write request types                               |
| Realtime           | `socket.io-client` (`transports: ['websocket']`)                                                                                                         |
| Pitch drawing      | `react-native-svg` (markings)                                                                                                                            |
| Gestures/animation | `react-native-gesture-handler` + `react-native-reanimated` (drag players in setup)                                                                       |
| Orientation        | `expo-screen-orientation` (true landscape for the pitch)                                                                                                 |
| Secure storage     | `expo-secure-store` (tokens)                                                                                                                             |
| Fast storage       | `react-native-mmkv` (offline event queue, query persistence)                                                                                             |
| Lists              | `@shopify/flash-list`                                                                                                                                    |
| Icons              | `lucide-react-native` (same icon set as reference: Target, User, Goal, Crosshair, Circle, Trophy, Timer, Users, RotateCcw, Play, Pause, ArrowLeft, Plus) |
| Forms              | `react-hook-form` + `zod` (UX validation only)                                                                                                           |
| Toasts             | `sonner-native` or `burnt`                                                                                                                               |
| Push               | `expo-notifications`                                                                                                                                     |
| Tests              | Jest + `@testing-library/react-native`; Maestro for E2E flows                                                                                            |
| Builds             | EAS Build / EAS Update                                                                                                                                   |

Install with `npx expo install <pkg>` (keeps versions SDK-compatible) and commit the lockfile.

---

## 3. Folder Structure

```
app/                              # Expo Router routes ONLY (thin: compose screens)
  _layout.tsx
  (auth)/login.tsx  (auth)/otp.tsx
  (tabs)/_layout.tsx
  (tabs)/index.tsx                # Dashboard / home feed (live + recent matches)
  (tabs)/tournaments.tsx
  (tabs)/players.tsx
  (tabs)/profile.tsx
  match/new.tsx                   # Match setup (step 1: teams & format)
  match/[id]/lineup.tsx           # Player setup (step 2: pitch + squads)
  match/[id]/live.tsx             # Live scoring (scorer) / live view (viewer)
  match/[id]/summary.tsx          # Match summary
  tournament/new.tsx
  tournament/[id]/index.tsx       # Standings, teams, fixtures, history
  tournament/[id]/leaderboard.tsx
  player/[id].tsx                 # Player stats (Overview / Tournaments / Matches)
  team/[id].tsx
src/
  api/                            # generated client + axios/fetch instance + interceptors
  hooks/                          # useMatchState, useSendEvent, useStandings… (TanStack Query)
  realtime/                       # socket singleton, useMatchLive
  offline/                        # MMKV event queue + flush worker
  components/
    ui/                           # Button, Card, Dialog(BottomSheet), Select, Input, Badge, Tabs
    pitch/                        # FootballPitch, PlayerToken, EmptySlot, PitchMarkings
    match/                        # Scoreboard, MatchControls, LiveStatsBar, ActionBar, EventsTimeline, modals/
    tournament/                   # StandingsTable, FixtureCard
  stores/                         # zustand: uiStore, scorerSessionStore
  theme/                          # tokens.ts (mirrors tailwind config)
  config/env.ts
  utils/format.ts                 # formatClock, ordinal dates
```

Rules: route files ≤ 80 lines; components ≤ 250 lines; one component per file; no data fetching inside `components/ui`.

---

## 4. Design System (copied from the reference app)

The reference uses shadcn tokens + an **emerald / blue** team palette on a soft green gradient. Reproduce exactly in `tailwind.config` (NativeWind):

| Token             | Value / Tailwind class                                                                                                                                | Used for                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Screen background | `bg-gradient` emerald: `from-green-50 to-emerald-100` (use `expo-linear-gradient` `#f0fdf4 → #d1fae5`)                                                | every match/tournament screen |
| Card              | `bg-white/80 border border-emerald-200 rounded-lg`                                                                                                    | all cards                     |
| Heading           | `text-emerald-800 font-bold`                                                                                                                          | titles, CardTitle             |
| Label             | `text-emerald-700`                                                                                                                                    | form labels                   |
| **Home / Team A** | `emerald-600` fill, `emerald-700` border, `emerald-100` name chip, `emerald-800` chip text                                                            | players, score, badges        |
| **Away / Team B** | `blue-600` fill, `blue-700` border, `blue-100` chip, `blue-800` text                                                                                  |                               |
| Goalkeeper        | `orange-500` fill, `orange-600` border, `Target` icon                                                                                                 | GK token                      |
| Outfield icon     | `User` icon, white                                                                                                                                    | player token                  |
| Ball possession   | `ring-2 ring-yellow-400` on token + `bg-yellow-400 text-black rounded-full` pill "⚽ Ball with: {name}"                                               |                               |
| Pitch             | `bg-green-400`, stripe gradient `green-400 → green-500 → green-400`, `border-4 border-white rounded-lg`, white markings                               |                               |
| Empty slot        | `w-8 h-8 rounded-full border-2 border-dashed`, Team A `border-emerald-400 bg-emerald-100`, Team B `border-blue-400 bg-blue-100`, `Plus` icon gray-600 | setup                         |
| Primary button    | `bg-emerald-600` (pressed `emerald-700`), white text                                                                                                  |                               |
| Outline button    | `border-emerald-300`                                                                                                                                  | Back buttons                  |
| Destructive       | `bg-red-50 border-red-300 text-red-700`                                                                                                               | End Match                     |
| Radius            | 8 px (`--radius: 0.5rem`)                                                                                                                             |                               |
| Dark mode         | reference has shadcn dark tokens; support later via NativeWind `dark:`                                                                                |                               |

Typography: system font; score `text-3xl md:text-4xl font-bold`; timer `text-emerald-600` with `Timer` icon; timeline minute `font-mono font-bold text-emerald-600`.

---

## 5. Screens (must match the reference UI)

### 5.1 Match Setup — `match/new.tsx` (ref: `match-setup.tsx` step `teams`)

- Header: outline "← Back to Dashboard".
- Card centered: title **"New Match Setup"** (`text-2xl text-emerald-800`), subtitle "Enter team names and match size to get started" (`text-emerald-600`).
- Two columns (stack on phone): **Team A** / **Team B** — Select "Select existing team or enter new" with first option **"Enter new team"**; when new, show Input "Enter team A name...".
- **Players Per Team** select: options from `GET /meta/formats` (labels "3v3 … 11v11"). Then **Formation** select from `GET /meta/formations?playersPerSide=`.
- (Extra vs reference) half duration, extra time, penalties toggles; optional tournament link.
- Full-width large primary button **"Set Up Players"** (disabled until both names) → `POST /matches` → navigate to lineup.

### 5.2 Player Setup — `match/[id]/lineup.tsx` (ref: step `players`)

- Title **"Player Setup"**.
- `FootballPitch mode="setup"`: dashed empty slots at **server-provided** formation coordinates; tap slot → bottom sheet "Add Player to {Team}" with player autocomplete ("Search or create a player...", excludes already-picked players). Drag tokens to reposition (gesture handler, bounded 5–95 %).
- Two team cards (emerald / blue headings) listing starters with "Move to bench" / remove, and **"Substitutes (n)"** list with add / "Move to starters".
- Card with **Start Match** button → `PUT /matches/:id/lineups` then `KICK_OFF` event.

### 5.3 Live Match — `match/[id]/live.tsx` (ref: step `match`) — most important screen

Top to bottom (portrait), identical order to reference:

1. **Header row:** outline "← Back to Setup" | **Scoreboard** (`TeamA name` emerald-800 / score emerald-600 · "-" gray-500 · `TeamB name` blue-800 / score blue-600) with `Timer` + `mm:ss` underneath.
2. **Match Events card** (only when ≥1 goal): header `Trophy` + "MATCH EVENTS" (`text-sm font-bold uppercase tracking-wider text-emerald-800`, header bg `emerald-500/10`), rows: `{minute}'` · `Goal` icon (emerald/blue by side) · "**Goal** by **{scorer}** assisted by **{assister}**" (assister `text-purple-700`). Show newest 3, "..." row expands, "Hide" collapses. Minute and assister come from the API.
3. **Controls:** `Undo` (outline, `RotateCcw`), `Pause`/`Resume` (yellow-50/yellow-300/yellow-700 ↔ green-50/green-300/green-700), `End Match` (red-50/red-300/red-700, `Trophy`).
4. **Live stats bar** — 2×2 grid of cards: **Total Passes** (emerald-700), **Turnovers** (orange-700), **Goals** (blue-700), **Ball Possession** = possessor name (purple-700). Values from `MatchState`.
5. **Action bar** (wrap):
   - **Record Shot** `bg-yellow-600` + `Crosshair`
   - **Record Goal** `bg-green-600` + `Goal`
   - **Ball Out of Play** outline red-300 / red-700 + `Circle`
   - **Record Corner** `bg-purple-600` + `Target`
   - **Manage Team** outline blue-300 / blue-700 + `Users`
   - **Record Foul** outline orange-300 / orange-700 + `Circle`
     Disabled (`opacity-50`) when paused or when no possessor (except Manage Team / Foul).
6. **FootballPitch `mode="match"`** — tap a player = give them the ball. Team name chips top-left (emerald) / top-right (blue); yellow "⚽ Ball with: X" pill top-centre.
7. **Dynamic instruction** banner (gradient emerald-500 → blue-500, pulsing yellow dot): "Tap a player to give them the ball" — shown when live and no possessor, auto-hides after 10 s.

Landscape: a "Landscape View" toggle (`RotateCcw`) locks orientation to landscape via `expo-screen-orientation` and renders the pitch full-screen with compact chips (the reference fakes this with CSS `rotate(90deg)` — use real orientation instead).

Viewer mode (not a scorer): same screen without controls/action bar/undo; pitch taps disabled.

### 5.4 Match Summary — `match/[id]/summary.tsx` (ref: `match-stats.tsx`, `match-detail-view.tsx`)

Header: team names (emerald-800 / blue-800, `text-2xl`), score, date with ordinal ("22nd Oct 2026"). Sections:

- **Match Awards** — Top Scorer (`Goal`, green), Most Passes (`Users`, blue) … (from `/matches/:id/summary`).
- **Key Stats** — 2×2 tiles (Goals emerald, Passes blue, Interceptions orange, Tackles purple) + full-width "Possession: A x% – y% B".
- **Match Timeline** — scrollable list.
- **Player Statistics** — table: Player, Team, Goals, Passes, Interceptions, Tackles, Shots, Saves (horizontal scroll on phone, sticky header `bg-gray-100 text-gray-600 uppercase text-xs`).

### 5.5 Tournament — `tournament/[id]/index.tsx` (ref: `app/tournament/[id]/page.tsx`)

Title `text-2xl font-bold text-emerald-800`. Cards: **Points Table** (Team, P, W, D, L, GF, GA, GD, Pts — all from `/standings`), **Teams** (squad lists), **Match History** (fixtures/results, tap → summary/live), video link manager. Actions: create match from fixture, edit result (owner only).

### 5.6 Player Stats — `player/[id].tsx` (ref: `PlayerStatsSection.tsx`)

Tabs **Overview / Tournaments / Matches**; overview cards with career totals; per-tournament cards; per-match list.

### 5.7 Dashboard — `(tabs)/index.tsx`

Live matches (realtime badges), recent matches (ref: `match-history-list.tsx`, "Match History" card), "New Match" and "New Tournament" CTAs.

---

## 6. Data Layer

### 6.1 API client

- Base URL `${env.API_URL}/api/v1` — **version lives in one constant** (`API_VERSION = 'v1'`).
- Generated client from `${API_URL}/api/docs-json` via `npm run api:generate`; commit generated code; regenerate whenever backend contract changes.
- Interceptors: attach `Authorization: Bearer`, `X-Request-Id`, `Idempotency-Key` on POST/PUT; on 401 refresh once then retry; map error envelope `{ error: { code, message } }` to a typed `ApiError`.
- Show user messages by `error.code` (map in `src/api/errorMessages.ts`), never raw server text.

### 6.2 TanStack Query

- Query keys factory in `src/api/queryKeys.ts` (`matchKeys.state(id)` …). No inline string keys.
- `staleTime` 30 s default; match state is kept fresh by sockets (`setQueryData`), not by polling.
- Persist selected queries to MMKV for fast cold start.

### 6.3 Sending match events (`useSendEvent`)

1. Build `{ clientEventId: uuid(), expectedSeq: state.lastSeq, type, ... }`.
2. Put it in the **MMKV offline queue** first, then send.
3. Optimistic UI is limited to a "pending" indicator on the action — **do not** change score/stats locally.
4. On 200: `setQueryData(matchKeys.state(id), res.state)`, remove from queue, open `res.prompt` modal if present.
5. On 409 `MATCH_SEQ_CONFLICT`: replace state with server state, drop the stale event, toast "Match updated on another device".
6. On network failure: keep in queue; flush in order when online (same `clientEventId` ⇒ server dedupes). Show an "Offline – n events pending" chip.

### 6.4 Realtime (`useMatchLive(matchId)`)

- Single socket instance (`/v1/live`, `transports: ['websocket']`, JWT in `auth`).
- On focus: `match:subscribe`; on blur: `match:unsubscribe`.
- `match:state` / `match:event` → `setQueryData`; if `seq` gap detected → refetch `/state`.
- `tournament:standings` → update standings query.
- Reconnect with backoff; on reconnect re-subscribe and refetch state.

---

## 7. Component Library (keep this list current)

| Component                                                                                                                              | Ref equivalent                | Notes                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `ui/Button` (variants: default, outline, ghost, destructive; sizes sm/md/lg)                                                           | `components/ui/button.tsx`    | NativeWind + `cva`-style variants                                                                             |
| `ui/Card`, `CardHeader`, `CardTitle`, `CardContent`                                                                                    | `ui/card.tsx`                 |                                                                                                               |
| `ui/Dialog` → implemented as bottom sheet                                                                                              | `ui/dialog.tsx`               | max-w-xs content for choice modals                                                                            |
| `ui/Select`, `ui/Input`, `ui/Label`, `ui/Badge`, `ui/Tabs`                                                                             |                               |                                                                                                               |
| `pitch/FootballPitch` (`mode: 'setup' \| 'match'`)                                                                                     | `football-pitch.tsx`          | 16:10 aspect, coords in %, SVG markings: halfway line, centre circle + spot, both penalty & goal areas, goals |
| `pitch/PlayerToken`                                                                                                                    | `renderPlayer`                | 40 px circle, icon, name chip under it                                                                        |
| `pitch/EmptySlot`                                                                                                                      | `renderEmptySlot`             |                                                                                                               |
| `match/Scoreboard`, `match/MatchControls`, `match/LiveStatsBar`, `match/ActionBar`, `match/EventsTimeline`, `match/DynamicInstruction` | sections of `match-setup.tsx` |                                                                                                               |
| `match/modals/*`                                                                                                                       | dialogs in `match-setup.tsx`  | see §8                                                                                                        |
| `PlayerAutocomplete`                                                                                                                   | `player-autocomplete.tsx`     | searches `/players?q=`, "create" option                                                                       |
| `tournament/StandingsTable`, `FixtureCard`, `CreateTournamentSheet`, `VideoLinkManager`                                                | `components/tournament/*`     |                                                                                                               |
| `ConfirmationDialog`                                                                                                                   | `confirmation-dialog.tsx`     | End match, clear lineup                                                                                       |

Team-B coordinates are mirrored **by the server**; the pitch only renders `posX/posY`.

---

## 8. Live Match Flow (modals) — same as reference, but driven by server `prompt`

| Trigger                                                 | Modal (title)                              | Buttons (colour)                                              | Event sent                                 |
| ------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------ |
| Record Shot                                             | **Classify Shot**                          | On Target (green-600) · Off Target (red-600)                  | `SHOT_ON_TARGET` / `SHOT_OFF_TARGET`       |
| prompt `SHOT_OUTCOME`                                   | **Shot Outcome**                           | Saved (blue-600) · Blocked (orange-600) · Woodwork (gray-600) | `SHOT_SAVED` / `SHOT_BLOCKED` / `WOODWORK` |
| prompt `FOLLOW_UP`                                      | **What happened to the ball?**             | Corner (purple-600) · Cleared (green-600)                     | `CORNER` / `CLEARED`                       |
| prompt `CORNER_TAKER` / Record Corner                   | **Who is taking the corner?**              | list of attacking players, `GK` badge                         | `CORNER_TAKEN`                             |
| Tap opponent while someone has ball → prompt `TURNOVER` | **Classify Turnover**                      | Interception (blue-600) · Tackle (orange-600)                 | `INTERCEPTION` / `TACKLE`                  |
| prompt `POSSESSION` (after woodwork/cleared/ball out)   | **Who has possession?**                    | all on-pitch players                                          | `POSSESSION_SET`                           |
| Record Foul                                             | **Who committed the foul?**                | players                                                       | `FOUL`                                     |
| Manage Team                                             | **Team Management** (tabs Team A / Team B) | "Players on Field" (sub out, make GK), "Substitutes"          | `SUBSTITUTION`, `GK_CHANGE`                |
| End Match                                               | Confirmation                               | Cancel · End Match                                            | `FULL_TIME` → navigate to summary          |

The app only knows which modal to show and which event to send; all consequences (stats, goal kicks, possession to GK, assists) come back from the server.

---

## 9. Coding Standards & Code-Review Rules

- TypeScript `strict`, no `any`, no `@ts-ignore` without linked issue.
- ESLint (expo config + typescript-eslint strict + react-hooks + react-native a11y) + Prettier; Husky + lint-staged; Conventional Commits.
- Styling only with NativeWind `className`; no inline `style` except dynamic values (pitch coordinates, animations). No hard-coded hex — use tokens.
- Components are pure/presentational; data via hooks. No `fetch` in components.
- Memoise list items (`React.memo`), use `FlashList` for lists > 20 rows, avoid re-rendering the pitch on every clock tick (clock is its own component).
- Accessibility: every pressable has `accessibilityLabel`; touch targets ≥ 44 px; colour is never the only indicator (icons + text for teams).
- Error/empty/loading states on every screen (skeletons, "No events recorded.").
- Tests: component tests for pitch, action bar, modals; hook tests for `useSendEvent` (queue, 409, retry); Maestro E2E: create match → lineup → score goal → undo → end → summary.

### PR checklist (`.github/pull_request_template.md`)

- [ ] No business/football logic added on the client
- [ ] UI matches reference (colours, order, labels) for touched screens
- [ ] Uses generated API client + query key factory; API version not hard-coded elsewhere
- [ ] Loading / error / empty / offline states handled
- [ ] Accessibility labels added
- [ ] Tests added/updated
- [ ] **FRONTEND_INSTRUCTIONS.md updated (§0)**

---

## 10. Performance & UX

- Cold start < 2 s on mid-range Android; JS bundle analysed each release.
- Haptic feedback on every scoring action (`expo-haptics`).
- Keep screen awake during live scoring (`expo-keep-awake`).
- Pitch tap → server ack p95 < 300 ms on 4G; pending indicator if slower.

---

## 11. Config & Release

| Var (`src/config/env.ts`, via `EXPO_PUBLIC_*`) | Purpose                               |
| ---------------------------------------------- | ------------------------------------- |
| `EXPO_PUBLIC_API_URL`                          | Railway backend URL (per environment) |
| `EXPO_PUBLIC_WS_URL`                           | same host, `/v1/live`                 |
| `EXPO_PUBLIC_ENV`                              | development / staging / production    |

- EAS build profiles: `development` (dev client), `preview` (staging API), `production`.
- OTA updates via EAS Update on channel per profile; native dependency changes require a new build.
- Scripts: `api:generate`, `lint`, `typecheck`, `test`, `e2e`, `check-instructions`.

---

## Changelog

| Date       | Author  | Change                                                                                                                             |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-22 | initial | First version — thin-client rules, reference UI spec (setup, lineup, live, summary, tournament, player stats), data/realtime layer |
