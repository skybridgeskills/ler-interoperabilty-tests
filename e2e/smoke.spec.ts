import { expect, test } from '@playwright/test';

// A returning reader: the first-visit gate would otherwise cover every page and
// intercept the clicks below. The gate has its own test at the end.
test.beforeEach(async ({ context, baseURL }, testInfo) => {
	if (testInfo.title.startsWith('first visit')) return;
	await context.addCookies([{ name: 'lits.perspective', value: 'dismissed', url: baseURL! }]);
});

test('landing page renders heading + nav cards', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toContainText(
		'LER Interoperability Test Suite'
	);
	await expect(page.getByRole('link', { name: 'Wallet', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Verifier', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Issuer', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'About', exact: true })).toBeVisible();
});

test('About nav link opens the about page', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: 'About', exact: true }).click();
	await expect(page.getByRole('heading', { level: 1 })).toContainText(
		'About the LER Interoperability Test Suite'
	);
});

test('/health returns 200 with status ok', async ({ request }) => {
	const res = await request.get('/health');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.status).toBe('ok');
	expect(body.version).toBeDefined();
	expect(body.version.name).toBe('ler-interoperability-test-suite');
});

test('first visit shows the Perspective gate; choosing Building closes it', async ({ page }) => {
	await page.goto('/');
	const gate = page.getByRole('dialog', { name: 'How are you using LER Tests?' });
	await expect(gate).toBeVisible();
	await expect(gate.locator(':focus')).toHaveCount(1);
	await gate.getByRole('button', { name: /Building/ }).click();
	await expect(gate).toBeHidden();
	await expect(page.getByRole('radio', { name: 'I’m building' })).toHaveAttribute(
		'aria-checked',
		'true'
	);
	const cookies = await page.context().cookies();
	expect(cookies.find((c) => c.name === 'lits.perspective')?.value).toBe('builder');
});
