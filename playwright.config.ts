import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'pnpm preview',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	testDir: 'e2e',
	use: { baseURL: 'http://localhost:4173' }
});
