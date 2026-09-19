import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	// A GitHub runner has four cores, and the map renders in software there: two workers halve the wall
	// time, more would contend for the CPU the rendering needs.
	workers: process.env.CI ? 2 : undefined,
	// `open: 'never'` keeps the report from launching a browser on failure. `line` prints each test as
	// it finishes: the html reporter alone writes nothing until the end, which makes a slow run in CI
	// look like a hung one.
	reporter: [['line'], ['html', { open: 'never' }]],
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				launchOptions: {
					args: ['--use-gl=angle'],
				},
			},
		},
		// Layout and stability in the other engines: form controls and flexbox differ between browsers.
		{
			name: 'firefox',
			testMatch: /(layout|stability|paint)\.spec\.ts/,
			use: { ...devices['Desktop Firefox'] },
		},
		{
			name: 'webkit',
			testMatch: /(layout|stability|paint)\.spec\.ts/,
			use: { ...devices['Desktop Safari'] },
		},
	],
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
	},
});
