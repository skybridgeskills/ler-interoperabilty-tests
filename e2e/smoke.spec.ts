import { expect, test } from '@playwright/test';

test('landing page renders heading + nav cards', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toContainText(
		'LER Interoperability Test Suite'
	);
	await expect(page.getByRole('link', { name: 'Wallet', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Verifier', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Issuer', exact: true })).toBeVisible();
});

test('/health returns 200 with status ok', async ({ request }) => {
	const res = await request.get('/health');
	expect(res.status()).toBe(200);
	const body = await res.json();
	expect(body.status).toBe('ok');
	expect(body.version).toBeDefined();
	expect(body.version.name).toBe('ler-interoperability-test-suite');
});
