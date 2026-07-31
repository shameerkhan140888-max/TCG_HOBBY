import { expect, test } from '@playwright/test';

test.describe('transactional email previews', () => {
  test('renders branded order and signup previews at desktop and mobile widths', async ({ page }) => {
    await page.goto('/api/dev/email-preview?template=order&scenario=multiple');
    await expect(page.getByRole('heading', { name: 'Your TCG Hobby order is confirmed' })).toBeVisible();
    await expect(page.getByText('Pokemon TCG: Preview Booster Bundle')).toBeVisible();
    await expect(page.getByText('Collector Card Sleeves')).toBeVisible();
    await expect(page.getByText('Total paid')).toBeVisible();

    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/api/dev/email-preview?template=order&scenario=missing-image');
    await expect(page.getByText('Product image unavailable')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    await page.goto('/api/dev/email-preview?template=signup');
    await expect(page.getByRole('heading', { name: 'Welcome to TCG Hobby' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Visit TCG Hobby' })).toBeVisible();
    await expect(page.getByText(/Company number 17336948/i)).toBeVisible();
  });
});
