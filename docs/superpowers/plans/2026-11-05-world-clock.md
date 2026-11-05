# World Clock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A React + TypeScript PWA that shows a persistent, reorderable grid of world clocks (six face styles) with working-hours status, DST notices, a meeting planner, and share links.

**Architecture:** Pure, heavily-tested domain modules (`time/`, `cities/`, `hours/`, `state/`, `share/`) with no React; a single `TimeProvider` ticker feeds every card; UI components consume domain functions and one reducer-backed `AppStateProvider` persisted to `localStorage`. Analog faces wrap `react-clock`; digital/flip/LCD faces are custom. `vite-plugin-pwa` precaches the app shell and the lazily-imported city dataset.

**Tech Stack:** React 19, TypeScript 5 (strict), Vite 6, Luxon 3.7, react-clock 6, city-timezones 1.3.4, @dnd-kit/core + @dnd-kit/sortable, vite-plugin-pwa, Vitest + @testing-library/react + jsdom, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-05-world-clock-design.md` (read it alongside this plan).

**Commit convention:** the owner's rules require `<type>: <JIRA> <message>` and a `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer. `JIRA` below stands for the ticket key the owner supplies before execution (e.g. `WC-1`). Branch: `feat/JIRA-world-clock`.

## Global Constraints

- Every clock is keyed by IANA zone; all zone maths go through Luxon `DateTime.setZone` — never a fixed offset.
- `react-clock` receives a "wall-clock Date" produced only by `toWallClockDate` (Task 2).
- Default style: `full`. Style IDs: `full | classic | minimal | digital | flip | lcd`.
- Default hours: Morning 07:00–09:00, Working 09:00–18:00, Evening 18:00–22:00, Asleep 22:00–07:00; weekend Sat+Sun.
- DST notice window: ±7 days. Meeting planner: 0 to +24h, 15-minute steps, not persisted.
- Search returns at most 20 results; accent-insensitive; prefix matches before substring, then population desc.
- localStorage key `worldclock`, JSON with `version: 1`.
- Share link format: `#/share?c=<id>,<id>,…` (cities only).
- Supported: last 2 versions of Chrome/Edge/Firefox/Safari, iOS Safari 16.4+, Chrome Android.
- Mobile: no horizontal scroll at 360px; touch targets ≥ 44px; safe-area insets respected.
- Every face has an `aria-label` like `"Chennai, 10:10 PM Wednesday"`.

## Review Focus

1. **Same-named cities** (London UK / London Canada / London US): search shows province + country and IDs differ, adding one never blocks the other → test in Task 3.
2. **Bad share links** (unknown IDs, empty `c=`, garbage, >100 IDs): unknown IDs are dropped silently, no crash, banner shows only valid cities → test in Task 6.
3. **Phone sleeps / tab hidden for hours:** clocks are correct immediately on return (ticker reads `Date.now()` every tick and on `visibilitychange`, never accumulates increments) → test in Task 7.
4. **Planner scrubbing across a DST change** (+24h across 2026-11-01 01:00 in New York): card shows correct shifted wall time and offset → test in Task 2.
5. **localStorage throws** (Safari private mode / quota): `save` swallows, `load` returns defaults, app keeps working in memory → test in Task 5.

---

### File Structure

```
src/
  main.tsx, App.tsx, App.css, theme.css
  time/zoned.ts            # Luxon helpers (pure)
  time/TimeProvider.tsx    # shared ticker + planner offset
  cities/types.ts          # City type
  cities/cities.ts         # dataset load, ids, search, home detection
  hours/status.ts          # HoursRule, DEFAULT_HOURS, statusAt
  state/types.ts           # AppState, StyleId, Settings
  state/storage.ts         # load/save/validate/migrate
  state/reducer.ts         # actions
  state/AppStateProvider.tsx
  share/shareLink.ts       # encode/decode
  faces/types.ts           # FaceProps
  faces/AnalogFace.tsx, DigitalFace.tsx, FlipFace.tsx, LcdFace.tsx, ClockFace.tsx, faces.css
  components/ClockCard.tsx, CardMenu.tsx, HoursEditor.tsx
  components/CitySearch.tsx, TopBar.tsx, SettingsSheet.tsx
  components/MeetingPlanner.tsx, ShareBanner.tsx, Dashboard.tsx, UpdatePrompt.tsx
tests/                     # mirrors src/ (unit + component, Vitest)
e2e/                       # Playwright specs
public/icons/              # PWA icons
```

---

### Task 1: Scaffold, tooling, git

**Files:** Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.setup.ts`, `src/main.tsx`, `src/App.tsx`, `index.html`, `.gitignore`, `tests/App.test.tsx`, `playwright.config.ts`

**Interfaces:** Produces: `npm test` (Vitest, jsdom), `npm run test:tz` (runs the suite under `TZ=America/Los_Angeles` and `TZ=Asia/Tokyo`), `npm run e2e` (Playwright vs `vite preview`), `npm run build`.

- [ ] **Step 1:** `git init`, create branch `feat/JIRA-world-clock`; `.gitignore` includes `node_modules`, `dist`, `.superpowers/`, `test-results`, `playwright-report`.
- [ ] **Step 2:** `npm create vite@latest . -- --template react-ts`, then `npm i luxon react-clock city-timezones @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` and `npm i -D @types/luxon vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom vite-plugin-pwa @playwright/test`. Enable `"strict": true`.
- [ ] **Step 3: Write failing test** `tests/App.test.tsx`: `render(<App/>)`; `expect(screen.getByRole('heading', {name: 'World Clock'})).toBeInTheDocument()`.
- [ ] **Step 4:** Run `npm test` → FAIL (heading missing).
- [ ] **Step 5:** Make `App` render `<h1>World Clock</h1>`; configure Vitest (`environment: 'jsdom'`, `setupFiles: ['vitest.setup.ts']` importing jest-dom). Add scripts `test`, `test:tz` (`TZ=America/Los_Angeles vitest run && TZ=Asia/Tokyo vitest run`), `e2e`, `build`.
- [ ] **Step 6:** `npm test` → PASS; `npm run build` → succeeds.
- [ ] **Step 7:** Commit `chore: JIRA scaffold React TS app with Vitest and Playwright`.

---

### Task 2: Zone maths (`time/zoned.ts`)

**Files:** Create `src/time/zoned.ts`; Test `tests/time/zoned.test.ts`

**Interfaces:** Produces:
- `zoned(zone: string, instant: number): DateTime`
- `toWallClockDate(dt: DateTime): Date` — a local `Date` whose y/M/d/h/m/s/ms equal `dt`'s.
- `offsetDiffLabel(home: string, zone: string, instant: number): string` — `"+5h 30m"`, `"−5h"` (U+2212), `"Same time"`.
- `dayRelation(home: string, zone: string, instant: number): 'same' | 'tomorrow' | 'yesterday'`
- `dstChange(zone: string, instant: number, windowDays = 7): { direction: 'forward' | 'back'; days: number; past: boolean } | null` — `days` is whole days, rounded toward the nearer integer, min 0.
- `dstNoticeText(c: NonNullable<ReturnType<typeof dstChange>>): string` — `"Clocks go forward in 3 days"`, `"Clocks went back 4 days ago"`, `"Clocks go back today"` for 0.

- [ ] **Step 1: Write failing tests** (instants via `DateTime.fromISO(..., {zone:'utc'}).toMillis()`):
  - AC1: `zoned('America/New_York', utc('2026-11-01T05:30')).toFormat('HH:mm ZZ')` → `'01:30 -04:00'`; at `utc('2026-11-01T06:30')` → `'01:30 -05:00'`. London at `utc('2026-03-29T00:30')` → `'00:30 +00:00'`, at `utc('2026-03-29T01:30')` → `'02:30 +01:00'`. Sydney at `utc('2026-10-03T15:30')` → `'01:30 +10:00'`, at `utc('2026-10-03T16:30')` → `'03:30 +11:00'`.
  - AC2: at `utc('2026-11-05T16:40')`: `offsetDiffLabel('Europe/London','Asia/Kolkata',t)` → `'+5h 30m'`; `'Asia/Kathmandu'` → `'+5h 45m'`; `'America/New_York'` → `'−5h'`; `'Europe/London'` → `'Same time'`.
  - AC3: `dayRelation('Europe/London','Australia/Sydney', utc('2026-11-05T16:40'))` → `'tomorrow'`; `('Australia/Sydney','Europe/London', same)` → `'yesterday'`.
  - AC4: `dstChange('America/New_York', utc('2026-11-05T16:40'))` → `{direction:'back', days:4, past:true}`; at `utc('2026-11-09T12:00')` → `null`; `dstChange('Europe/London', utc('2026-03-26T12:00'))` → `{direction:'forward', days:3, past:false}`; `dstChange('Asia/Kolkata', any)` → `null`. `dstNoticeText` of the first → `'Clocks went back 4 days ago'`.
  - AC10 helper: `toWallClockDate(zoned('Asia/Kolkata', utc('2026-11-05T04:40:30')))` has `getHours()===10, getMinutes()===10, getSeconds()===30`.
  - Review Focus 4: `zoned('America/New_York', utc('2026-10-31T16:00') + 24*3600e3).toFormat('dd HH:mm ZZ')` → `'01 11:00 -05:00'`.
- [ ] **Step 2:** `npm test tests/time` → FAIL (module missing).
- [ ] **Step 3:** Implement the functions. `dstChange`: sample the zone offset at hourly steps across `[instant − window, instant + window]`, return the change point nearest to `instant` (offset increase ⇒ `forward`).
- [ ] **Step 4:** `npm test tests/time` and `npm run test:tz -- tests/time` → PASS under every TZ.
- [ ] **Step 5:** Commit `feat: JIRA add zone maths helpers with DST detection`.

---

### Task 3: City dataset, IDs, search, home detection

**Files:** Create `src/cities/types.ts`, `src/cities/cities.ts`; Test `tests/cities/cities.test.ts`

**Interfaces:** Produces:
- `type City = { id: string; name: string; province: string; country: string; iso2: string; zone: string; pop: number }`
- `cityId(raw: {city_ascii: string; province: string; iso2: string}): string` — `slug(city_ascii)-slug(province)-iso2.toLowerCase()`; slug = lowercase, NFD-strip accents, non-alphanumerics → `-`, trim dashes. (Verified unique across the 1.3.4 dataset.)
- `toCities(raw: CityMappingEntry[]): City[]` — drops entries without `timezone` (48 in 1.3.4).
- `loadCities(): Promise<City[]>` — `await import('city-timezones')` then `toCities(mod.cityMapping)`; memoised.
- `searchCities(cities: City[], query: string, limit = 20): City[]`
- `findHomeCity(cities: City[], zone: string): City | undefined` — prefer `name` equal to the zone's last segment with `_`→space; else highest `pop` in that zone.
- `cityLabel(c: City): string` → `"Chennai, Tamil Nadu, India"` (province omitted when empty or equal to name).

- [ ] **Step 1: Write failing tests** using the real dataset via `loadCities()`:
  - AC5: `searchCities(all,'chen')[0..4]` contains `name==='Chennai' && country==='India'`; `searchCities(all,'são')` and `('sao')` both include Sao Paulo, Brazil; empty/whitespace query → `[]`; result length ≤ 20.
  - Review Focus 1: `searchCities(all,'london')` includes ≥ 3 entries with distinct `id`s and distinct `cityLabel`s, UK first (highest pop among prefix matches).
  - AC14: `findHomeCity(all,'Asia/Kolkata')` has `country==='India'` and `zone==='Asia/Kolkata'`; `findHomeCity(all,'Europe/London').name==='London'`; unknown zone → `undefined`.
  - `toCities` drops an entry whose `timezone` is `''`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement. Search: normalise query and `name` with the same accent-strip; rank (exact > prefix > substring in name > match in country/province), tie-break `pop` desc. Precompute normalised names once per array (WeakMap cache) so typing stays instant.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: JIRA add city dataset, search and home detection`.

---

### Task 4: Working-hours status

**Files:** Create `src/hours/status.ts`; Test `tests/hours/status.test.ts`

**Interfaces:** Produces:
- `type Range = { start: number; end: number }` (minutes from midnight; `end < start` wraps midnight)
- `type HoursRule = { morning: Range; work: Range; evening: Range; asleep: Range; weekend: number[] }` (Luxon weekday 1=Mon…7=Sun)
- `DEFAULT_HOURS: HoursRule` = morning 420–540, work 540–1080, evening 1080–1320, asleep 1320–420, weekend `[6,7]`
- `type Status = 'work' | 'morning' | 'evening' | 'asleep' | 'weekend'`
- `statusAt(dt: DateTime, rule: HoursRule): Status` — first match in order asleep, evening, work (→ `weekend` if `dt.weekday` in rule.weekend), morning; fallback `'morning'`.
- `STATUS_LABEL: Record<Status,string>` = Working hours / Morning / Evening / Probably asleep / Weekend
- `isNight(s: Status): boolean` → `s==='asleep'||s==='evening'`

- [ ] **Step 1: Write failing tests** (AC11), using `DateTime.fromISO('2026-11-04T10:00',{zone:'Asia/Kolkata'})` (a Wednesday): → `'work'`; Sat `2026-11-07T10:00` → `'weekend'`; `23:00` → `'asleep'`; `06:59` → `'asleep'`; `07:00` → `'morning'`; `18:00` → `'evening'`; with custom rule `{...DEFAULT_HOURS, morning:{start:420,end:480}, work:{start:480,end:1020}}`, Wed `08:30` → `'work'`; with `{...DEFAULT_HOURS, weekend:[5,6]}`, Fri `2026-11-06T10:00` → `'weekend'` and Sun `2026-11-08T10:00` → `'work'`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: JIRA add working-hours status rules`.

---

### Task 5: App state, reducer, persistence

**Files:** Create `src/state/types.ts`, `src/state/reducer.ts`, `src/state/storage.ts`, `src/state/AppStateProvider.tsx`; Test `tests/state/reducer.test.ts`, `tests/state/storage.test.ts`

**Interfaces:** Produces:
- `type StyleId = 'full'|'classic'|'minimal'|'digital'|'flip'|'lcd'`; `STYLE_IDS: StyleId[]`
- `type CardEntry = { id: string; style?: StyleId; hours?: HoursRule }`
- `type Settings = { hour12?: boolean; theme: 'light'|'dark'|'system'; defaultStyle: StyleId; hours: HoursRule }`
- `type AppState = { version: 1; cities: CardEntry[]; homeCityId?: string; settings: Settings; initialised: boolean }` (`initialised` = home detection already ran)
- `DEFAULT_STATE: AppState` (`cities: []`, theme `system`, `defaultStyle:'full'`, `hours: DEFAULT_HOURS`, `initialised:false`)
- `type Action = {type:'add'; id} | {type:'remove'; id} | {type:'move'; from:number; to:number} | {type:'setStyle'; id; style?: StyleId} | {type:'setHours'; id; hours?: HoursRule} | {type:'setHome'; id?: string} | {type:'settings'; patch: Partial<Settings>} | {type:'merge'; ids: string[]} | {type:'initHome'; id?: string} | {type:'reset'}`
- `reducer(s: AppState, a: Action): AppState`
- `load(storage?: Storage): AppState`, `save(s: AppState, storage?: Storage): void`, `migrate(raw: unknown): AppState | null`
- `AppStateProvider` + `useAppState(): { state: AppState; dispatch: (a: Action) => void }` — saves on every state change.
- `effectiveStyle(entry: CardEntry, s: Settings): StyleId`, `effectiveHours(entry: CardEntry, s: Settings): HoursRule`

- [ ] **Step 1: Write failing tests:**
  - AC6: `add` of an existing id leaves `cities` unchanged; `merge(['a','b'])` onto `['b','c']` → `['b','c','a']`.
  - `remove` of the home city clears `homeCityId`; `setHome` sets it; `initHome('x')` adds `x` first, sets home, sets `initialised:true`; `initHome(undefined)` only sets `initialised`.
  - `move` reorders; `setStyle(id, undefined)` removes the override; `effectiveStyle` prefers the override (AC9 logic); `reset` → `{...DEFAULT_STATE, initialised:true}`.
  - AC7: `save(state, mem)` then `load(mem)` deep-equals state (with overrides, order, settings).
  - AC8: `load` with `'{not json'`, with `{version: 99}`, and with `{version:1, cities:'x'}` → `DEFAULT_STATE`; unknown style ids in entries are dropped to `undefined`.
  - Review Focus 5: a storage whose `getItem`/`setItem` throw → `load` returns `DEFAULT_STATE`, `save` does not throw.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement; `migrate` validates shape field by field (no schema lib). **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: JIRA add app state reducer and localStorage persistence`.

---

### Task 6: Share links

**Files:** Create `src/share/shareLink.ts`; Test `tests/share/shareLink.test.ts`

**Interfaces:** Produces:
- `buildShareUrl(ids: string[], base: string): string` → `${base}#/share?c=${ids.map(encodeURIComponent).join(',')}`
- `parseShareHash(hash: string, known: Set<string>): string[] | null` — `null` when hash isn't a share hash; otherwise valid, de-duplicated ids in order, capped at 100.
- `clearShareHash(): void` — `history.replaceState` without the hash.

- [ ] **Step 1: Write failing tests:** round-trip `parseShareHash(new URL(buildShareUrl(['a','b'],'https://x/')).hash, new Set(['a','b']))` → `['a','b']`; `'#/other'` → `null`; Review Focus 2: `'#/share?c='` → `[]`, `'#/share?c=a,zzz,a,%%%'` with known `{a}` → `['a']` (no throw on bad percent-encoding), 150 valid ids → length 100.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: JIRA add share link encode/decode`.

---

### Task 7: Shared ticker and planner offset

**Files:** Create `src/time/TimeProvider.tsx`; Test `tests/time/TimeProvider.test.tsx`

**Interfaces:** Produces `TimeProvider` and `useTime(): { now: number; plannerMinutes: number; setPlannerMinutes(m: number): void; instant: number }` where `instant = now + plannerMinutes*60000`. Ticks once per second aligned to the next whole second (`setTimeout(1000 - Date.now()%1000)`), reading `Date.now()` each tick and on `document` `visibilitychange`. `plannerMinutes` clamped to `[0, 1440]` and snapped to multiples of 15.

- [ ] **Step 1: Write failing tests** with `vi.useFakeTimers()`: `now` advances after `advanceTimersByTime(1000)`; `setPlannerMinutes(180)` → `instant - now === 180*60000` (AC12 core); `setPlannerMinutes(10)` → `plannerMinutes === 15` (round to nearest 15), `setPlannerMinutes(2000)` → `1440`, `setPlannerMinutes(-5)` → `0`. Review Focus 3: `vi.setSystemTime(+3h)` then dispatch `visibilitychange` → `now` equals new system time without advancing timers.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: JIRA add shared ticker and planner offset`.

---

### Task 8: Analog faces (react-clock)

**Files:** Create `src/faces/types.ts`, `src/faces/AnalogFace.tsx`, `src/faces/faces.css`; Test `tests/faces/AnalogFace.test.tsx`

**Interfaces:**
- Consumes: `toWallClockDate` (Task 2).
- Produces: `type FaceProps = { dt: DateTime; hour12: boolean; night: boolean; label: string; size?: number }`; `AnalogFace(props: FaceProps & { variant: 'full'|'classic'|'minimal' })`.
  - `full`: `renderNumbers`, hour+minute marks, second hand.
  - `classic`: `renderNumbers` with `formatHour={(_, h) => [12,3,6,9].includes(h) ? String(h) : ''}`, marks, second hand; CSS class `face--classic` (red second hand).
  - `minimal`: no numbers, `renderMinuteMarks={false}`, `renderSecondHand={false}`, thin hands.
  - Root `<div role="img" aria-label={label} class="face face--analog face--{variant}{night?' face--night':''}">`.

- [ ] **Step 1: Write failing tests** (AC10): `dt = zoned('Asia/Kolkata', utc('2026-11-05T04:40:30'))`; render `full`; read `style.transform` of `.react-clock__hour-hand`, `__minute-hand`, `__second-hand`; parse degrees mod 360 → `305.25`, `63`, `180`. `full` renders 12 `.react-clock__mark__number` with text 1–12; `classic` non-empty numbers are exactly `['3','6','9','12']`; `minimal` has no `.react-clock__second-hand`; `getByRole('img',{name: label})` exists; `night` adds `face--night`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement; import `react-clock/dist/Clock.css` once in `faces.css` consumer. **Step 4:** `npm test tests/faces` and `npm run test:tz -- tests/faces` → PASS.
- [ ] **Step 5:** Commit `feat: JIRA add analog faces using react-clock`.

---

### Task 9: Digital, Flip, LCD faces and the face switch

**Files:** Create `src/faces/DigitalFace.tsx`, `FlipFace.tsx`, `LcdFace.tsx`, `ClockFace.tsx`; Test `tests/faces/faces.test.tsx`

**Interfaces:** Each takes `FaceProps`. `ClockFace(props: FaceProps & { style: StyleId; offsetLabel: string })` dispatches; `DigitalFace` also receives `offsetLabel` (shown under the time with the date, e.g. `Thu 6 Nov · +5h 30m`).
- Digital: `dt.toFormat(hour12 ? 'h:mm' : 'HH:mm')` + `a` suffix when 12h.
- Flip: four digit tiles `data-testid="flip-digit"`; a tile whose digit changed since last render gets class `flip--animating` for 600ms; honour `prefers-reduced-motion` (no animation class).
- LCD: `HH:mm` (or `h:mm`) + seconds `ss` + date `EEE dd MMM` uppercased; monospace seven-segment-style font (CSS only, no webfont dependency required).

- [ ] **Step 1: Write failing tests** (AC9) with `dt = DateTime.fromISO('2026-11-04T22:10:30', {zone:'Asia/Kolkata'})` (a Wednesday): digital 24h shows `'22:10'`, 12h shows `'10:10'` and `'PM'`; flip renders 4 tiles `['2','2','1','0']`; LCD shows `'22:10'`, `'30'`, `'WED 04 NOV'`; rerender flip with +1 min → last tile has `flip--animating`; `ClockFace` for each of the six `STYLE_IDS` renders a `role="img"` with the label.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: JIRA add digital, flip and LCD faces`.

---

### Task 10: Clock card and card menu

**Files:** Create `src/components/ClockCard.tsx`, `CardMenu.tsx`, `HoursEditor.tsx`; Test `tests/components/ClockCard.test.tsx`

**Interfaces:**
- Consumes: `useTime`, `useAppState`, `zoned`, `offsetDiffLabel`, `dayRelation`, `dstChange`, `dstNoticeText`, `statusAt`, `STATUS_LABEL`, `isNight`, `effectiveStyle`, `effectiveHours`, `ClockFace`, `cityLabel`.
- Produces: `ClockCard({ city: City; entry: CardEntry; homeZone: string; isHome: boolean; dragHandleProps?: object })`.
- Shows: face; `city.name`; country (province too when another card or the dataset has the same name — simplest rule: always show `province, country` under the name when province is non-empty and ≠ name); time text; weekday + "Tomorrow"/"Yesterday" when `dayRelation≠'same'`; `offsetLabel`; status badge; DST notice; 📍 You on home; "custom hours" marker when `entry.hours`; ✕ remove (`aria-label="Remove {name}"`); menu: style list (+ "Use default"), "Set custom hours" (opens `HoursEditor`: four time-range inputs + weekend day toggles + Reset), "Set as my city".
- `HoursEditor({ value: HoursRule; onSave(r: HoursRule): void; onReset?(): void })` — reused by Settings (Task 12).

- [ ] **Step 1: Write failing tests** with providers and fake time `2026-11-05T16:40Z`, home `Europe/London`: Sydney card shows `'Tomorrow'`, `'+11h'`, `'Probably asleep'` and face has `face--night`; New York card shows `'Clocks went back 4 days ago'` and `'Working hours'`; London card shows `'📍'`/`You`; clicking Remove dispatches removal (card disappears in an integrated render); choosing "Flip" in menu switches face and persists override; saving custom hours shows `custom hours` marker and changes badge.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: JIRA add clock card with status, DST notice and menu`.

---

### Task 11: City search

**Files:** Create `src/components/CitySearch.tsx`; Test `tests/components/CitySearch.test.tsx`

**Interfaces:** `CitySearch({ cities: City[] | null; onAdd(id: string): void; addedIds: Set<string> })` — combobox (`role="combobox"`, listbox options, ↑/↓/Enter/Escape), placeholder `Add a city… (e.g. "Chen")`; each option shows `cityLabel`, current local time and offset; already-added options are `aria-disabled` and marked "Added"; shows "Loading cities…" while `cities` is null; debounced 100ms.

- [ ] **Step 1: Write failing tests:** type `chen` → option containing `Chennai, Tamil Nadu, India`; Enter calls `onAdd('chennai-tamil-nadu-in')`; added city option is `aria-disabled="true"` and click does nothing; Escape closes the list.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: JIRA add city search combobox`.

---

### Task 12: Dashboard shell — top bar, settings, theme, planner, reorder, first-run, share banner

**Files:** Create `src/components/TopBar.tsx`, `SettingsSheet.tsx`, `MeetingPlanner.tsx`, `ShareBanner.tsx`, `Dashboard.tsx`, `src/theme.css`, `src/App.css`; Modify `src/App.tsx`; Test `tests/components/Dashboard.test.tsx`

**Interfaces:**
- `App` = `AppStateProvider > TimeProvider > Dashboard`. `Dashboard` calls `loadCities()` once, builds `Map<id, City>`; on first load with `!state.initialised` dispatches `initHome(findHomeCity(cities, browserZone)?.id)`.
- Home zone for comparisons = home card's zone, else `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- `TopBar`: title "World Clock", `CitySearch`, default-style select, 12h/24h toggle, theme toggle (light/dark/system → sets `data-theme` on `<html>`), Settings button, Share button. Collapses secondary controls into a menu below 640px.
- `SettingsSheet`: 12h/24h, theme, default style, default `HoursEditor`, "Reset everything" with `window.confirm`.
- `MeetingPlanner`: `<input type="range" min=0 max=1440 step=15 aria-label="Meeting planner">` labelled Now…+24h; when > 0 shows banner `Previewing {EEE HH:mm} (your time)` and a "Back to now" button.
- Grid: `@dnd-kit/sortable` with Pointer, Touch and Keyboard sensors; `onDragEnd` dispatches `move`. Empty state: "Add your first city" pointing to search.
- Share: `navigator.share` if present else `navigator.clipboard.writeText` + toast "Link copied". `ShareBanner` on load if `parseShareHash` → non-null: "Someone shared N cities with you", list of labels, **Add to my dashboard** (dispatch `merge`, clear hash) and **Dismiss** (clear hash).
- Visual design: friendly, uncluttered, consistent with `.superpowers/brainstorm/58407-1793870051/content/dashboard-layout.html` (option A); CSS custom properties for light/dark in `theme.css`; system theme via `prefers-color-scheme`; safe-area padding; touch targets ≥ 44px.

- [ ] **Step 1: Write failing tests** (with fake time and a mocked `loadCities` returning a small fixture incl. London/Chennai/New York/Sydney):
  - AC14: fresh storage + mocked zone `Asia/Kolkata` → Chennai card appears with 📍 You; reload with Chennai removed → not re-added (`initialised`).
  - AC12: set range to 180 → every card's time text advances by 3h and the banner shows; click "Back to now" → banner gone, times restored.
  - AC13: `location.hash = buildShareUrl(['sydney-new-south-wales-au'], …)` hash → banner with 1 city; click Add → Sydney card present, no duplicates on second add; Dismiss clears the hash.
  - Theme toggle sets `document.documentElement.dataset.theme`; 12h/24h toggle switches card text format; default style select changes faces without overrides.
  - Reorder via keyboard sensor (focus handle, Space, ArrowRight, Space) changes order in state.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS; `npm run dev` and eyeball at 360px and desktop.
- [ ] **Step 5:** Commit `feat: JIRA add dashboard shell with planner, settings, reorder and sharing`.

---

### Task 13: PWA

**Files:** Modify `vite.config.ts`; Create `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `src/components/UpdatePrompt.tsx`; Test `tests/pwa/manifest.test.ts`, `e2e/offline.spec.ts`

**Interfaces:** `VitePWA({ registerType: 'prompt', manifest: { name: 'World Clock', short_name: 'Clocks', start_url: '/', display: 'standalone', theme_color, background_color, icons:[192, 512, 512 maskable] }, workbox: { globPatterns: ['**/*.{js,css,html,png,svg,json}'], maximumFileSizeToCacheInBytes: 4_000_000 } })` so the lazily-imported city chunk is precached. `UpdatePrompt` uses `useRegisterSW` from `virtual:pwa-register/react` → toast "Update available" + Reload button.

- [ ] **Step 1: Write failing tests:** `tests/pwa/manifest.test.ts` runs after `npm run build` (skip if `dist` missing) and reads `dist/manifest.webmanifest`: asserts the fields above and an icon with `purpose` containing `maskable`. `e2e/offline.spec.ts` (AC15): load preview, wait for `navigator.serviceWorker.ready`, add Chennai via search, `context.setOffline(true)`, reload → Chennai card visible and search for `tokyo` still returns Tokyo.
- [ ] **Step 2:** `npm run build && npm test tests/pwa && npm run e2e -- offline` → FAIL.
- [ ] **Step 3:** Implement config, generate icons (simple clock glyph SVG → PNG via any tool; commit PNGs), add `<meta name="theme-color">`, `apple-touch-icon`, `viewport-fit=cover`.
- [ ] **Step 4:** Re-run → PASS.
- [ ] **Step 5:** Commit `feat: JIRA make app an offline-capable installable PWA`.

---

### Task 14: End-to-end flows and mobile checks

**Files:** Create `e2e/persistence.spec.ts`, `e2e/share.spec.ts`, `e2e/mobile.spec.ts`

- [ ] **Step 1: Write tests:**
  - AC7: add 3 cities, drag to reorder, set one to LCD, set custom hours on another, switch to 24h and dark → reload → identical card order, faces, marker, settings.
  - AC13: build share URL in context A, open in fresh context B with an existing city → banner → Add → both cities, no duplicates.
  - AC16: viewport 360×740 with 6 cities: `document.documentElement.scrollWidth <= 360`; every `button`, `[role=combobox]`, `input[type=range]` has bounding box ≥ 44×44 (range: height ≥ 44 incl. hit area); planner slider can be dragged with `page.touchscreen`/mouse.
- [ ] **Step 2:** `npm run build && npm run e2e` → fix any failures in the owning component, re-run → PASS.
- [ ] **Step 3:** Manual (record result in PR description): install on one Android phone and one iPhone, check offline launch.
- [ ] **Step 4:** Commit `test: JIRA add end-to-end persistence, share and mobile checks`.
