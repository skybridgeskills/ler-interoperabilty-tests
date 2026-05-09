import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	/** pino-pretty (dev) pulls in `colorette`; bundle for SSR. */
	ssr: {
		noExternal: ['colorette']
	},

	test: {
		expect: { requireAssertions: true },
		reporters: process.env.CI ? ['default', 'junit'] : ['default'],
		...(process.env.CI && {
			outputFile: {
				junit: './build/test-results/junit.xml'
			}
		}),
		coverage: {
			reporter: process.env.CI ? ['text', 'lcov', 'json'] : ['text'],
			reportsDirectory: './build/coverage'
		},

		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			},
			{
				extends: './vite.config.ts',
				plugins: [
					storybookTest({
						configDir: path.join(__dirname, '.storybook')
					})
				],
				test: {
					name: 'storybook',
					testTimeout: 60000,
					expect: { requireAssertions: false },
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [{ browser: 'chromium' }]
					},
					setupFiles: ['.storybook/vitest.setup.ts']
				}
			}
		]
	}
});
