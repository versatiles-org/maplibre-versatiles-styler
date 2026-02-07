import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	testMatch: 'screenshots.ts',
	use: {
		baseURL: 'http://localhost:5173',
	},
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				deviceScaleFactor: 1,
				launchOptions: { args: ['--use-gl=angle'] },
			},
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'], deviceScaleFactor: 1 },
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'], deviceScaleFactor: 1 },
		},
	],
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI,
	},
});
