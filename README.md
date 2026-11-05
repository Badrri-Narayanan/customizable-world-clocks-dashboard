# World Clock

A personal world-clock dashboard: pick cities, see their time as analog, digital, flip or retro-LCD clocks, check who's in working hours, scrub a meeting planner, and share your city list by link. Choices are saved in the browser, and it installs as an offline-capable PWA.

**Live:** https://badrri-narayanan.github.io/customizable-world-clocks-dashboard/

## Develop

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit + component tests (Vitest)
npm run test:tz      # same suite under two other system time zones
npm run build && npm run e2e   # Playwright end-to-end tests against the production build
```

## Deploy

Pushes to `main` run `.github/workflows/ci-deploy.yml`, which tests, builds with `BASE_PATH=/<repo>/` and deploys to GitHub Pages (repo Settings → Pages → Source: **GitHub Actions**).

Design and plan: `docs/superpowers/specs/` and `docs/superpowers/plans/`.
