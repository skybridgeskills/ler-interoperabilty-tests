import type { StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
	stories: [
		'../src/routes/**/*.stories.@(js|ts|svelte)',
		'../src/lib/components/**/*.stories.@(js|ts|svelte)',
		'../src/lib/pages/**/*.stories.@(js|ts|svelte)',
		// `Theme/Palette` lives here, and was unindexed until 2026-08-21 — the design
		// system doc has always pointed at a story Storybook could not see.
		'../src/lib/storybook/**/*.stories.@(js|ts|svelte)'
	],
	addons: [
		'@storybook/addon-svelte-csf',
		'@storybook/addon-a11y',
		'@storybook/addon-docs',
		'@storybook/addon-vitest'
	],
	framework: {
		name: '@storybook/sveltekit',
		options: {}
	}
};

export default config;
