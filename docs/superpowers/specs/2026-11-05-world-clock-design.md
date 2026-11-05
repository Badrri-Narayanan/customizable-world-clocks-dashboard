# World Clock: Design

Date: 2026-11-05
Status: Ready for owner review. Once approved, plan against this version.

## 1. Intent

The owner has teammates, relatives and friends in different time zones and wants to open one page, on a laptop or a phone, and see at a glance what time it is where each of them lives, and whether it's a sensible moment to reach out.

The app is a personal world-clock dashboard. The user picks cities, each city gets a clock card, and the selection is remembered in the browser so it's there the next time they open the app. It should look attractive, feel friendly, and install on a phone as a PWA.

Clocks are labeled by **city and country only**. The owner explicitly chose not to attach people's names to clocks.

## 2. Goals

1. Show a dashboard of clocks, one card per chosen city, live-updating.
2. Let the user search for and add any city from a dataset of about 7,000 cities, and remove cities.
3. Remember all user choices in the browser across sessions.
4. Handle daylight saving correctly for every city, always.
5. Offer six clock styles, with a dashboard default and a per-card override.
6. Help the user judge "is now a good time?" through working-hours status, the time difference, the day/date, and day/night faces.
7. Provide a meeting planner that scrubs all clocks forward together.
8. Share a city list with someone else through a link.
9. Work well on phones and install as a PWA that works offline.

## 3. Non-goals

- No accounts, no backend, no server-side storage. Everything is client-side.
- No people/contact names on clocks.
- No calendar integration, notifications or alarms.
- No live weather or other external data feeds.
- No syncing between devices beyond the share link.

## 4. Anti-goals (failure even if it "works")

- A wrong time for any city, including in the days around a daylight-saving change.
- A cluttered, hard-to-use or ugly UI, especially on a phone.
- An app that doesn't work offline once installed.

## 5. Constraints and decided tech

| Area | Decision | Who decided |
|---|---|---|
| UI framework | **React** | Owner |
| Analog clock faces | **`react-clock`** library | Owner |
| Digital, Flip and LCD faces | Custom React components | Owner |
| City search scope | All cities in the dataset (~7k), searchable | Owner |
| Platform | Web app, mobile-friendly, installable **PWA** | Owner |
| Language | TypeScript | Claude's call |
| Build tool | Vite | Claude's call |
| Time-zone maths | **Luxon** (IANA tz via the browser's `Intl`) | Claude's call |
| City dataset | **`city-timezones`** npm package | Claude's call |
| PWA tooling | `vite-plugin-pwa` (Workbox) | Claude's call |
| Drag-to-reorder | `@dnd-kit` (touch and keyboard support) | Claude's call |
| Persistence | `localStorage` | Claude's call (owner said "browser cache") |
| Tests | Vitest + React Testing Library, plus Playwright for a few end-to-end flows | Claude's call |

**Spec-driven development.** The owner wants the work done spec-first. Every acceptance criterion in §7 should become one or more automated tests, written before the implementation (red, green, refactor).

### Time-zone rule (critical)

- Every clock is stored and computed by its **IANA zone ID** (for example `Asia/Kolkata`), never by a fixed UTC offset.
- All offset, day and DST calculations go through Luxon `DateTime.setZone(zone)`.
- `react-clock` renders a `Date` using the *browser's* local fields. To show another zone, pass it a `Date` whose local fields equal the target zone's wall-clock time, for example `new Date(y, m-1, d, h, min, s)` built from the Luxon zoned parts. This conversion lives in one tested helper.
- **Time-zone database source (Claude's call):** use the device's own IANA database through `Intl`. Evergreen browsers and OSes update it regularly, and rule changes are rare and announced in advance. Bundling our own database would add weight and complexity for little gain. Known limitation: a device with a very out-of-date OS could show a wrong time after a government changes its rules. The DST acceptance tests prove our logic is correct, not the device's data. Keep tz access behind the single helper so a bundled-data polyfill (e.g. `@formatjs/intl-datetimeformat` with tz data) could be dropped in later.

### Supported browsers (Claude's call)

The last two versions of Chrome, Edge, Firefox and Safari, plus **iOS Safari 16.4+** and Chrome for Android. Where the Web Share API is missing, fall back to copying to the clipboard.

## 6. Features

### 6.1 Layout (owner chose "Option A, card grid")

- **Top bar:** app name/logo, a city search box, a default-style picker, a 12h/24h toggle, a light/dark/system theme toggle, Settings, and Share.
- **Meeting planner bar** below the top bar (see 6.7).
- **Responsive card grid:** about 1 column on a phone, 2 on a tablet and 3 to 4 on a desktop.
- On a phone, the top-bar controls may collapse into a menu or sheet. The search stays easy to reach.

### 6.2 Clock card

Each card shows:
- The clock face in the effective style (the card override, or else the dashboard default).
- The **city name** (prominent) and the **country**. Show the province/state when it's needed to tell same-named cities apart.
- The time as text (respecting 12h/24h), the weekday, and the **date when it differs from the user's own date** (shown as "Thu", or "Tomorrow"/"Yesterday").
- The **time difference** from the user's home zone, for example `+5h 30m`, `−5h`, or `Same time`.
- A **status badge**: Working hours / Morning / Evening / Probably asleep / Weekend (see 6.6).
- A **day/night face:** when the city's local time falls in "asleep" or "evening" hours, the face uses a dark variant.
- A **DST notice** when that city's clocks change within the next 7 days or changed within the last 7 days, for example "Clocks go forward in 3 days" or "Clocks went back 4 days ago". Detect this by comparing the zone's offset across the window with Luxon. No hard-coded dates.
- A **remove (✕)** control and a **card menu** with: change style for this card, set custom hours for this city, and reset to defaults.
- The **home city** card shows a 📍 "You" marker.

### 6.3 Home city

- On first visit, detect the browser's zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and pick a matching city. Prefer the city named in the zone ID (`Europe/London` → London), otherwise the most populous city in that zone.
- The home city is added first and is the reference for time differences and "Tomorrow/Yesterday".
- The user can change which card is home (card menu: "Set as my city"). The home card can be removed. If it is, differences are computed against the browser's current zone.

### 6.4 Adding cities (search)

- A type-ahead search over the whole dataset, matching city name (accent-insensitive, prefix first, then substring), plus country and province.
- Results show `City, Province, Country`, the current local time and the offset, ranked by match quality and then population. Show a limited number of results (around 20).
- Selecting a result adds a card at the end. Cities already on the dashboard are marked and can't be added twice.
- Search must feel instant on a mid-range phone.

### 6.5 Clock styles (six)

| Style | Implementation | Notes |
|---|---|---|
| **Full numbers** (default) | react-clock | All 12 hour numbers, hour marks, second hand |
| **Classic** | react-clock | Only 12/3/6/9 numerals (via `formatHour`), minute and hour ticks, red second hand |
| **Minimal** | react-clock | No numbers, hairline hands, no second hand, light marks |
| **Modern digital** | custom | Large light type, date and offset underneath |
| **Flip** | custom | Split-flap tiles; a digit flips with an animation when it changes |
| **Retro LCD** | custom | Seven-segment look on a greenish screen, with seconds and the date |

- The dashboard default style lives in the top bar or Settings. A per-card override goes in the card menu.
- Every face supports light and dark themes and the night variant.
- Every face has an accessible label, for example `aria-label="Chennai, 10:10 PM Wednesday"`.
- Reference mockups: `.superpowers/brainstorm/58407-1793870051/content/clock-styles.html` and `dashboard-layout.html`.

### 6.6 Working hours and status badge

- **Global defaults:** Morning 07:00–09:00, Working 09:00–18:00, Evening 18:00–22:00, Asleep 22:00–07:00. Weekend days are **Saturday and Sunday**.
- The user can edit the global defaults in Settings, including which days are the weekend.
- **Per-city override:** set custom hours and weekend days for one card. An overridden card shows a small "custom hours" marker.
- On a weekend day, the "Working hours" range shows as **Weekend** instead. Evening and Asleep still apply.
- Status is computed in the city's local time and the city's effective rules.

### 6.7 Meeting planner

- A slider from **Now** to **+24h** in 15-minute steps.
- While it's away from Now, every card shows the **planned** moment (faces, text, badges, day labels), and a clear banner reads "Previewing Thu 09:30 (your time) · Back to now".
- A "Back to now" button resets it. The planner position is not persisted.
- On a phone, the slider must be easy to drag with a thumb.

### 6.8 Reordering

- Drag cards to reorder them, with touch and keyboard support. The order is persisted.

### 6.9 Settings

- 12h/24h (default: follow the browser locale).
- Theme: Light / Dark / System (default: System).
- Default clock style.
- Default working hours and weekend days.
- "Reset everything" (with a confirmation).

### 6.10 Share link

- The Share button builds a URL whose hash fragment encodes the ordered city list, for example `#/share?c=<id>,<id>,…`. Use the hash so this works on any static host.
- On a phone, use the Web Share API when it's available. Otherwise copy to the clipboard and confirm with a toast.
- Opening a share link shows a banner, "Someone shared N cities with you", with a preview and the buttons **Add to my dashboard** (merge and skip duplicates) and **Dismiss**. It never silently replaces the user's dashboard.
- Only cities are shared. Styles, hours and settings are not.

### 6.11 Persistence

- One `localStorage` key, for example `worldclock`, holding versioned JSON:
  ```ts
  {
    version: 1,
    cities: Array<{ id: string; style?: StyleId; hours?: HoursRule }>,  // ordered
    homeCityId?: string,
    settings: { hour12?: boolean; theme: 'light'|'dark'|'system'; defaultStyle: StyleId; hours: HoursRule }
  }
  ```
- Save on every change. On load, validate the data. If it's corrupt or from an unknown version, fall back to defaults without crashing, and include a migration hook for future versions.
- If `localStorage` is unavailable (for example in private mode), the app still works for the session.

### 6.12 PWA and mobile

- A web app manifest (name, short name, icons including maskable ones, theme colour, `display: standalone`), installable on Android and iOS.
- A service worker precaches the app shell and the city dataset, so the app works **fully offline** after the first load.
- When a new version is available, show an "Update available, reload" prompt.
- Respect safe-area insets, keep touch targets at least 44px, have no horizontal scroll at 360px width, and keep the clocks smooth on mobile. Use one shared ticking source for all cards, not one timer per card.

## 7. Acceptance criteria (each one becomes tests)

1. **DST correctness:** for a fixed instant just before and just after the 2026 US DST end (2026-11-01), the New York card shows the correct local time and offset. The same holds for the London (2026-03-29) and Sydney (2026-10-04) transitions.
2. **Half/quarter-hour zones:** Chennai shows `+5h 30m` relative to London in November, and Kathmandu shows `+5h 45m`.
3. **Day labels:** when home is London at Wed 16:40, Sydney shows Thu and "Tomorrow".
4. **DST notice:** a card shows "Clocks went back N days ago" or "go forward in N days" only inside the ±7-day window.
5. **Search:** typing "chen" lists Chennai, India in the top results, and "sao" matches "São Paulo".
6. **No duplicates:** a city already on the dashboard can't be added again.
7. **Persistence:** after adding, reordering, restyling and setting custom hours, then reloading, the dashboard is identical.
8. **Corrupt storage:** invalid JSON in storage loads defaults without an error screen.
9. **Styles:** each of the six styles renders for a card, and the per-card override beats the dashboard default.
10. **Analog correctness:** for a target zone time of 10:10:30, the react-clock hands show 10:10:30 whatever the browser's own time zone is. Test with at least two different test-runner `TZ` values.
11. **Status:** with default rules, Wed 10:00 local is "Working hours", Sat 10:00 is "Weekend", 23:00 is "Probably asleep", and per-city overrides change the result.
12. **Meeting planner:** moving the slider by +3h advances every card by 3h, and "Back to now" restores live time.
13. **Share:** a share link opened in a fresh browser shows the preview banner, and "Add" merges the cities into an existing dashboard without duplicates.
14. **Home detection:** with the browser zone set to `Asia/Kolkata`, a first visit adds an India city in that zone as home.
15. **PWA (Claude's call on how to verify; current Lighthouse no longer has a PWA category):**
   - An automated test checks that the built manifest has `name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, and 192px and 512px icons including a maskable one.
   - A Playwright test against the production build confirms the service worker registers, and that after one online visit, a reload with the network set offline still renders the dashboard, the saved cities and a working city search.
   - Before release, a manual install check on one real Android phone and one real iPhone.
16. **Mobile:** no horizontal scroll at 360px width, and every control is usable by touch.

## 8. Left to the builder

- The visual design system (colours, typography, spacing, icons, motion), within "friendly, attractive, uncluttered, great on a phone". It should be consistent with the mockups but polished beyond them.
- The stable city ID format, as long as it's deterministic for a given dataset entry and stable across app versions. It must also tell same-named cities apart.
- How to load the city dataset efficiently, such as lazy-loading it, using a worker, or pre-building a slimmed index at build time.
- Component and folder structure, state management (React context/reducer is enough), and routing.
- Hosting and deployment target (any static host).
- Exact flip and LCD animation details.
