import { expect, test } from '@playwright/test';
import { prisma } from '@tcg-hobby/database';
import { E2E_STAFF_EMAIL, E2E_STAFF_PASSWORD } from './global-setup';

const pitchBlackSlug = 'pokemon-mega-evolution-pitch-black-booster-pack';
const pitchBlackId = 'cmrrz1uzr000jvz14mm9assgu';
const pitchBlackPath = `/catalogue/${pitchBlackSlug}`;
const greninjaPath =
  '/catalogue/pokemon-tcg-mega-greninja-ex-premium-collection';

test.describe('WP12 operational storefront checks', () => {
  test('catalogue card opens the routeable no-image Pitch Black product detail page', async ({
    page,
  }) => {
    await page.goto('/catalogue?q=Pitch%20Black');

    const productLink = page
      .locator(`a[href="${pitchBlackPath}"]`)
      .filter({ hasText: /Pitch Black Booster Pack/i })
      .first();
    await expect(productLink).toBeVisible();
    await expect(productLink).toHaveAttribute('href', pitchBlackPath);

    await productLink.click();
    await expect(page).toHaveURL(new RegExp(`${pitchBlackSlug}$`));
    await expect(
      page.getByRole('button', {
        name: 'Product image unavailable',
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText(/4\.99/).first()).toBeVisible();
    await page
      .getByRole('complementary')
      .getByRole('button', { name: /add to basket/i })
      .click();
    await expect
      .poll(
        async () =>
          (await page.context().cookies()).find(
            (cookie) => cookie.name === 'tcg-hobby-basket',
          )?.value ?? '',
      )
      .toContain(pitchBlackId);
    await page.goto('/cart');
    await expect(
      page.getByText(/Pitch Black Booster Pack/i).first(),
    ).toBeVisible();
  });

  test('Greninja product resolves with configured imagery instead of the placeholder', async ({
    page,
  }) => {
    await page.goto(greninjaPath);

    await expect(
      page
        .getByRole('heading', { name: /Mega Greninja ex Premium Collection/i })
        .first(),
    ).toBeVisible();
    const primaryImage = page
      .getByRole('img', { name: /Mega Greninja ex Premium Collection/i })
      .first();
    await expect(primaryImage).toBeVisible();
    await expect(primaryImage).toHaveAttribute(
      'src',
      /pokemon-tcg-mega-greninja-ex-premium-collection(?:%2F|\/)primary\.webp/,
    );
  });

  test('catalogue search and game filters return database products', async ({
    page,
  }) => {
    await page.goto('/catalogue?q=mega');
    await expect(
      page
        .locator(`a[href="${greninjaPath}"]`)
        .filter({ hasText: /Mega Greninja ex Premium Collection/i })
        .first(),
    ).toBeVisible();

    await page.goto('/catalogue?game=pokemon-tcg');
    await expect(
      page
        .locator(`a[href="${pitchBlackPath}"]`)
        .filter({ hasText: /Pitch Black Booster Pack/i })
        .first(),
    ).toBeVisible();
    await expect(
      page
        .locator(`a[href="${greninjaPath}"]`)
        .filter({ hasText: /Mega Greninja ex Premium Collection/i })
        .first(),
    ).toBeVisible();
    await expect(page.getByText('No products match those filters')).toHaveCount(
      0,
    );
  });

  test('payment SVG assets are served as transparent browser-ready SVG XML', async ({
    request,
  }) => {
    for (const assetPath of [
      '/payments/visa.svg',
      '/payments/mastercard.svg',
    ]) {
      const response = await request.get(assetPath);
      expect(response.ok()).toBe(true);
      expect(response.headers()['content-type']).toContain('image/svg+xml');
      await expect(response.text()).resolves.toContain('<svg');
    }
  });

  test('desktop and mobile storefront layouts avoid horizontal overflow', async ({
    page,
  }) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/catalogue');
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
});

test.describe('WP12 operational admin checks', () => {
  test('unauthenticated Admin access is redirected to sign in', async ({
    page,
  }) => {
    await page.goto('http://127.0.0.1:3001/admin');
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
    await expect(
      page.getByRole('heading', { name: 'Admin sign in', exact: true }),
    ).toBeVisible();
  });
  test('admin storefront preview points to the storefront product route', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name.includes('mobile'),
      'Admin product editing is validated in the desktop admin viewport.',
    );
    const staffFixture = await prisma.user.findUnique({
      where: { email: E2E_STAFF_EMAIL },
      select: { id: true },
    });
    test.skip(
      !staffFixture,
      'The canonical STAFF E2E fixture is not present in the configured database.',
    );

    await page.goto(
      `http://127.0.0.1:3001/login?callbackUrl=${encodeURIComponent(`/admin/products/${pitchBlackId}`)}`,
    );
    await page
      .getByRole('textbox', { name: 'Email', exact: true })
      .fill(E2E_STAFF_EMAIL);
    await page.getByLabel('Password').fill(E2E_STAFF_PASSWORD);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page).toHaveURL(
      new RegExp(`/admin/products/${pitchBlackId}`),
      { timeout: 30_000 },
    );

    const preview = page.getByRole('link', { name: /preview product/i });
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute(
      'href',
      `http://localhost:3000${pitchBlackPath}`,
    );
  });
});
