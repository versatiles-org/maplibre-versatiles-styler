import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	// A run with this many failures is broken rather than flaky: stop instead of spending twenty
	// minutes proving it. Ten is above the handful a single genuine regression produces.
	maxFailures: process.env.CI ? 10 : 0,
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
			use: {
				...devices['Desktop Firefox'],
				// A CI runner has no GPU, and Firefox then refuses WebGL rather than falling back to
				// software — MapLibre 6 needs WebGL2 and throws before the control is ever added, so every
				// test times out waiting for a sidebar that was never mounted. Chromium avoids this with
				// `--use-gl=angle` below; these are the equivalent.
				launchOptions: {
					firefoxUserPrefs: {
						'webgl.force-enabled': true,
						'webgl.disabled': false,
						'gfx.webrender.software': true,
					},
				},
			},
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
