import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // BASE_PATH lets the suite run against a sub-path build, as deployed on GitHub Pages.
  use: { baseURL: `http://localhost:4173${process.env.BASE_PATH ?? '/'}` },
  webServer: { command: 'npm run preview -- --port 4173 --strictPort', url: `http://localhost:4173${process.env.BASE_PATH ?? '/'}`, reuseExistingServer: false },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
