import { expect, test } from '@playwright/test';
import { prisma } from '@tcg-hobby/database';
import {
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_STAFF_EMAIL,
  E2E_STAFF_PASSWORD,
} from './global-setup';

const megaGreninjaProductId = 'prod-mega-greninja-ex-premium-collection';
const megaGreninjaSlug = 'pokemon-tcg-mega-greninja-ex-premium-collection';
const megaGreninjaPath = `/catalogue/${megaGreninjaSlug}`;

test.describe('Sprint 14 storefront navigation', () => {
  test('header search stays in place until submission and preserves the query on Shop All', async ({ page }) => {
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Search products', exact: true });
    await trigger.click();

    const headerSearch = page.getByRole('search').getByLabel('Search products', { exact: true });
    await expect(headerSearch).toBeFocused();
    await expect(page).toHaveURL('/');
    await headerSearch.fill('Mega Greninja');
    await headerSearch.press('Enter');

    await expect(page).toHaveURL(/\/shop\?search=Mega(?:\+|%20)Greninja/);
    await expect(page.locator('input[name="q"]')).toHaveValue('Mega Greninja');
    await expect(page.getByRole('heading', { name: 'Find your next TCG favourite' })).toBeVisible();
  });

  test('dedicated Pokémon page remains scoped and hides the game switcher', async ({ page }) => {
    await page.goto('/shop/pokemon');

    await expect(page.getByRole('heading', { name: 'Explore Pokémon TCG' })).toBeVisible();
    await expect(page.getByLabel('Filter by game')).toHaveCount(0);
    await expect(page.locator('form[action="/shop/pokemon"]')).toBeVisible();
  });

  test('homepage and dedicated game listings share the white contain-fit product image stage', async ({ page }) => {
    await page.goto('/');
    const homepageCard = page.locator('[data-merchandising-placement="HOMEPAGE_FEATURED"]').first();
    const homepageImage = homepageCard.getByRole('img').first();
    await expect(homepageImage).toHaveClass(/object-contain/);
    await expect(homepageImage.locator('..')).toHaveCSS('background-color', 'rgb(255, 255, 255)');

    await page.goto('/shop/pokemon');
    const gamePageImage = page.getByRole('img', { name: /Mega Greninja ex Premium Collection image 1/ }).first();
    await expect(gamePageImage).toHaveClass(/object-contain/);
    await expect(gamePageImage.locator('..')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  });

  test('site-wide delivery banner and Shop All route render without horizontal overflow', async ({ page }) => {
    await page.goto('/shop');

    await expect(page.getByText(/Free Standard UK Delivery on orders over £50(?:\.00)?/i)).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('Mega Greninja uses a full-bleed hero composition at desktop and mobile widths', async ({ page }) => {
    await page.goto('/');

    const hero = page.locator('section[aria-roledescription="carousel"]');
    await expect(hero).toHaveAttribute('data-hero-display-mode', 'FULL_BLEED');
    await expect(hero).toHaveAttribute('data-hero-focal-point', 'RIGHT');
    await expect(hero).toHaveAttribute('data-hero-overlay-strength', 'BALANCED');
    await expect(hero.getByRole('heading', { name: /Mega Greninja ex Premium Collection/ })).toBeVisible();
    await expect(hero.getByRole('link', { name: 'Shop now' })).toBeVisible();

    const heroImage = hero.getByRole('img').first();
    await expect(heroImage).toHaveClass(/object-cover/);
    await expect(heroImage).not.toHaveClass(/object-contain/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
      .toBeLessThanOrEqual(1);
  });

  test('long and short product heroes keep CTA, controls and following content stable', async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    test.skip(testInfo.project.name.includes('mobile'), 'Responsive geometry is measured at all required widths in Chromium.');

    const pitchBlackSlug = 'pokemon-mega-evolution-pitch-black-booster-pack';
    const [megaPlacement, pitchBlackProduct] = await Promise.all([
      prisma.homepageHeroPlacement.findUnique({ where: { productId: megaGreninjaProductId } }),
      prisma.product.findUnique({
        where: { slug: pitchBlackSlug },
        select: { id: true, name: true },
      }),
    ]);
    test.skip(!megaPlacement || !pitchBlackProduct, 'Mega Greninja and Pitch Black fixtures must exist in the configured development database.');

    const pitchBlackPlacement = await prisma.homepageHeroPlacement.findUnique({
      where: { productId: pitchBlackProduct!.id },
    });

    const placementData = (placement: NonNullable<typeof megaPlacement>) => ({
      headline: placement.headline,
      supportingText: placement.supportingText,
      ctaLabel: placement.ctaLabel,
      ctaHref: placement.ctaHref,
      imageUrl: placement.imageUrl,
      imageAlt: placement.imageAlt,
      displayMode: placement.displayMode,
      focalPoint: placement.focalPoint,
      overlayStrength: placement.overlayStrength,
      active: placement.active,
      startsAt: placement.startsAt,
      endsAt: placement.endsAt,
      sortOrder: placement.sortOrder,
    });

    try {
      await prisma.homepageHeroPlacement.update({
      where: { id: megaPlacement!.id },
      data: { active: true, startsAt: null, endsAt: null, sortOrder: 0 },
    });
    await prisma.homepageHeroPlacement.upsert({
      where: { productId: pitchBlackProduct!.id },
      update: {
        headline: pitchBlackProduct!.name,
        supportingText: 'Discover the latest Pokémon TCG booster release for collectors and players.',
        ctaLabel: 'Shop now',
        ctaHref: `/catalogue/${pitchBlackSlug}`,
        displayMode: 'FULL_BLEED',
        focalPoint: 'RIGHT',
        overlayStrength: 'BALANCED',
        active: true,
        startsAt: null,
        endsAt: null,
        sortOrder: 1,
      },
      create: {
        productId: pitchBlackProduct!.id,
        headline: pitchBlackProduct!.name,
        supportingText: 'Discover the latest Pokémon TCG booster release for collectors and players.',
        ctaLabel: 'Shop now',
        ctaHref: `/catalogue/${pitchBlackSlug}`,
        displayMode: 'FULL_BLEED',
        focalPoint: 'RIGHT',
        overlayStrength: 'BALANCED',
        active: true,
        sortOrder: 1,
      },
    });

      for (const width of [1440, 1280, 1024, 768, 390, 320]) {
        await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
        await page.goto('/');

        const hero = page.locator('section[aria-roledescription="carousel"]');
        const nextButton = hero.getByRole('button', { name: 'Show next hero slide' });
        await expect(nextButton).toBeVisible();

        const readGeometry = () => hero.evaluate((element) => {
          const frameBox = element.querySelector('[data-hero-frame]')?.getBoundingClientRect();
          if (!frameBox) throw new Error('Missing hero frame.');
          const rectangle = (selector: string) => {
            const target = element.querySelector(selector);
            if (!target) throw new Error(`Missing hero region: ${selector}`);
            const box = target.getBoundingClientRect();
            return {
              top: box.top - frameBox.top,
              bottom: box.bottom - frameBox.top,
              height: box.height,
            };
          };
          const nextSection = element.nextElementSibling?.getBoundingClientRect();
          return {
            frame: rectangle('[data-hero-frame]'),
            headline: rectangle('[data-hero-headline-region]'),
            description: rectangle('[data-hero-description-region]'),
            commerce: rectangle('[data-hero-commerce-region]'),
            cta: rectangle('[data-hero-cta-region]'),
            controls: rectangle('[data-hero-controls-region]'),
            nextSectionTop: nextSection ? nextSection.top - frameBox.top : null,
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          };
        });

        const firstHeading = await hero.getByRole('heading', { level: 1 }).textContent();
        const first = await readGeometry();
        await nextButton.click();
        await expect.poll(() => hero.getByRole('heading', { level: 1 }).textContent())
          .not.toBe(firstHeading);
        const secondHeading = await hero.getByRole('heading', { level: 1 }).textContent();
        const second = await readGeometry();

        expect([firstHeading, secondHeading].join(' ')).toContain('Mega Greninja');
        expect([firstHeading, secondHeading].join(' ')).toContain('Pitch Black');
        expect(Math.abs(first.frame.height - second.frame.height)).toBeLessThanOrEqual(1);
        expect(Math.abs(first.cta.top - second.cta.top)).toBeLessThanOrEqual(1);
        expect(Math.abs(first.controls.top - second.controls.top)).toBeLessThanOrEqual(1);
        expect(Math.abs((first.nextSectionTop ?? 0) - (second.nextSectionTop ?? 0)))
          .toBeLessThanOrEqual(1);
        expect(first.headline.bottom).toBeLessThanOrEqual(first.description.top);
        expect(first.description.bottom).toBeLessThanOrEqual(first.commerce.top);
        expect(first.commerce.bottom).toBeLessThanOrEqual(first.cta.top);
        expect(first.cta.bottom).toBeLessThanOrEqual(first.controls.top);
        expect(second.headline.bottom).toBeLessThanOrEqual(second.description.top);
        expect(second.description.bottom).toBeLessThanOrEqual(second.commerce.top);
        expect(second.commerce.bottom).toBeLessThanOrEqual(second.cta.top);
        expect(second.cta.bottom).toBeLessThanOrEqual(second.controls.top);
        expect(first.overflow).toBeLessThanOrEqual(1);
        expect(second.overflow).toBeLessThanOrEqual(1);
      }
    } finally {
      await prisma.homepageHeroPlacement.update({
        where: { id: megaPlacement!.id },
        data: placementData(megaPlacement!),
      });
      if (pitchBlackPlacement) {
        await prisma.homepageHeroPlacement.update({
          where: { id: pitchBlackPlacement.id },
          data: placementData(pitchBlackPlacement),
        });
      } else {
        await prisma.homepageHeroPlacement.delete({
          where: { productId: pitchBlackProduct!.id },
        });
      }
    }
  });

  test('promotional banner remains directly beneath the header while scrolling', async ({ page }) => {
    test.setTimeout(180_000);
    for (const route of [
      '/',
      '/shop',
      '/catalogue/pokemon-tcg-mega-greninja-ex-premium-collection',
      '/cart',
      '/checkout',
      '/account',
    ]) {
      await page.goto(route);
      await page.evaluate(() => {
        const spacer = document.createElement('div');
        spacer.style.height = '1600px';
        spacer.dataset.stickyTestSpacer = 'true';
        document
          .querySelector('[data-storefront-sticky-header]')
          ?.parentElement?.appendChild(spacer);
      });
      await page.evaluate(() => window.scrollTo(0, 900));
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(800);

      const shell = page.locator('[data-storefront-sticky-header]');
      const promotion = shell.locator('[data-storefront-promotion]');
      await expect(shell).toBeVisible();
      await expect(promotion).toBeVisible();
      const geometry = await shell.evaluate((element) => {
        const header = element.querySelector('header');
        const banner = element.querySelector('[data-storefront-promotion]');
        return {
          shellTop: element.getBoundingClientRect().top,
          headerBottom: header?.getBoundingClientRect().bottom ?? -1,
          bannerTop: banner?.getBoundingClientRect().top ?? -2,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      expect(Math.abs(geometry.shellTop)).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.headerBottom - geometry.bannerTop)).toBeLessThanOrEqual(1);
      expect(geometry.overflow).toBeLessThanOrEqual(1);
    }
  });

  test('Escape closes header search and returns focus to its trigger', async ({ page }) => {
    await page.goto('/shop');
    const trigger = page.getByRole('button', { name: 'Search products', exact: true });
    await trigger.click();
    await page.getByRole('search').getByLabel('Search products', { exact: true }).press('Escape');

    await expect(page.getByRole('search')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Search products', exact: true })).toBeFocused();
  });
});

test.describe('Sprint 14 Admin navigation', () => {
  test('expanded and collapsed navigation retain compact icons and usable content', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    test.skip(testInfo.project.name.includes('mobile'), 'Desktop collapse behaviour is covered in the desktop project.');
    const staffFixture = await prisma.user.findUnique({
      where: { email: E2E_STAFF_EMAIL },
      select: { id: true },
    });
    test.skip(!staffFixture, 'The canonical STAFF E2E fixture is not present in the configured database.');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://127.0.0.1:3001/login?callbackUrl=${encodeURIComponent('/admin/products')}`);
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(E2E_STAFF_EMAIL);
    await page.getByLabel('Password').fill(E2E_STAFF_PASSWORD);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/products/, { timeout: 30_000 });

    const icons = page.locator('[data-admin-nav-icon]');
    await expect(icons.first()).toHaveCSS('width', '20px');
    await expect(icons.first()).toHaveCSS('height', '20px');
    await page.getByRole('button', { name: 'Collapse Admin navigation' }).click();
    await expect(page.getByRole('button', { name: 'Expand Admin navigation' })).toBeVisible();
    await expect(icons.first()).toHaveCSS('width', '20px');
    await expect(icons.first()).toHaveCSS('height', '20px');

    const sidebar = page.getByRole('complementary', { name: 'Admin navigation' });
    const sidebarWidth = await sidebar.evaluate((element) => element.getBoundingClientRect().width);
    expect(sidebarWidth).toBeLessThanOrEqual(84);
    await page.getByRole('link', { name: 'Orders' }).click();
    await expect(page).toHaveURL(/\/admin\/orders/, { timeout: 30_000 });
    await expect(page.getByRole('link', { name: 'Orders' })).toHaveAttribute(
      'aria-current',
      'page',
      { timeout: 30_000 },
    );
    await page.reload();
    await expect(page.getByRole('button', { name: 'Expand Admin navigation' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('mobile Admin uses a compact drawer and restores focus when closed', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'Mobile drawer behaviour is covered in the mobile project.');
    const staffFixture = await prisma.user.findUnique({
      where: { email: E2E_STAFF_EMAIL },
      select: { id: true },
    });
    test.skip(!staffFixture, 'The canonical STAFF E2E fixture is not present in the configured database.');

    await page.goto(`http://127.0.0.1:3001/login?callbackUrl=${encodeURIComponent('/admin/products')}`);
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(E2E_STAFF_EMAIL);
    await page.getByLabel('Password').fill(E2E_STAFF_PASSWORD);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    const menu = page.getByRole('button', { name: 'Open Admin navigation' });
    await menu.click();
    const sidebar = page.getByRole('complementary', { name: 'Admin navigation' });
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('[data-admin-nav-icon]').first()).toHaveCSS('width', '20px');
    expect(await sidebar.evaluate((element) => element.getBoundingClientRect().width))
      .toBeLessThanOrEqual(page.viewportSize()?.width ?? 390);
    await page.getByRole('button', { name: 'Close Admin navigation' }).last().click();
    await expect(menu).toBeFocused();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe('Sprint 14 homepage hero placement', () => {
  test('switches between canonical and existing custom product media without changing the product gallery', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    test.skip(testInfo.project.name.includes('mobile'), 'The authenticated mutation is covered once in the desktop project.');
    const [adminFixture, placement] = await Promise.all([
      prisma.user.findUnique({ where: { email: E2E_ADMIN_EMAIL }, select: { id: true } }),
      prisma.homepageHeroPlacement.findUnique({
        where: { productId: megaGreninjaProductId },
        include: {
          product: {
            include: {
              images: {
                where: { deletionState: 'ACTIVE' },
                orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
              },
            },
          },
        },
      }),
    ]);
    test.skip(!adminFixture, 'The canonical ADMIN E2E fixture is not present in the configured database.');
    test.skip(!placement || placement.product.images.length < 2, 'Mega Greninja requires two active image fixtures.');

    const original = {
      imageSource: placement!.imageSource,
      selectedProductImageId: placement!.selectedProductImageId,
      imageUrl: placement!.imageUrl,
      imageAlt: placement!.imageAlt,
    };
    const productImagesBefore = placement!.product.images.map((image) => ({
      id: image.id,
      isPrimary: image.isPrimary,
      sortOrder: image.sortOrder,
      url: image.url,
    }));
    const customImage = placement!.product.images[1]!;

    try {
      await page.goto(`http://127.0.0.1:3001/login?callbackUrl=${encodeURIComponent(`/admin/storefront?hero=${placement!.id}`)}`);
      await page.getByRole('textbox', { name: 'Email', exact: true }).fill(E2E_ADMIN_EMAIL);
      await page.getByLabel('Password').fill(E2E_ADMIN_PASSWORD);
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/admin/storefront\\?hero=${placement!.id}`), { timeout: 30_000 });

      let editor = page.getByRole('form', { name: 'Homepage hero placement editor' });
      const productSource = editor.getByLabel(/^Use product image/);
      const customSource = editor.getByLabel(/^Use custom hero image/);
      await expect(productSource).toBeChecked();
      await expect(editor.getByText('Automatically uses the selected product')).toBeVisible();

      await customSource.check();
      const imageSelect = editor.getByLabel('Select existing product image');
      await expect(imageSelect).toBeVisible();
      await imageSelect.selectOption(customImage.id);
      await expect(editor.getByLabel('Hero preview').locator('img').first())
        .toHaveAttribute('src', new RegExp(customImage.url.split('/').pop()!.replace('.', '\\.')));
      await editor.getByRole('button', { name: 'Save hero placement' }).click();
      await expect(page).toHaveURL(/\/admin\/storefront\?saved=hero/, { timeout: 30_000 });

      await page.goto(`http://127.0.0.1:3001/admin/storefront?hero=${placement!.id}`);
      editor = page.getByRole('form', { name: 'Homepage hero placement editor' });
      await expect(editor.getByLabel(/^Use custom hero image/)).toBeChecked();
      await expect(editor.getByLabel('Select existing product image')).toHaveValue(customImage.id);
      await editor.getByLabel(/^Use product image/).check();
      await expect(editor.getByLabel('Hero preview').locator('img').first()).toHaveAttribute('src', /primary\.webp/);
      await editor.getByRole('button', { name: 'Save hero placement' }).click();
      await expect(page).toHaveURL(/\/admin\/storefront\?saved=hero/, { timeout: 30_000 });

      await page.goto(`http://127.0.0.1:3001/admin/storefront?hero=${placement!.id}`);
      editor = page.getByRole('form', { name: 'Homepage hero placement editor' });
      await expect(editor.getByLabel(/^Use product image/)).toBeChecked();
      await editor.getByLabel(/^Use custom hero image/).check();
      await expect(editor.getByLabel('Select existing product image')).toHaveValue(customImage.id);

      const productImagesAfter = await prisma.productImage.findMany({
        where: { productId: megaGreninjaProductId, deletionState: 'ACTIVE' },
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { id: 'asc' }],
        select: { id: true, isPrimary: true, sortOrder: true, url: true },
      });
      expect(productImagesAfter).toEqual(productImagesBefore);
    } finally {
      await prisma.homepageHeroPlacement.update({
        where: { id: placement!.id },
        data: original,
      });
    }
  });

  test('uses canonical product defaults and returns invalid CTA paths inline', async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    test.skip(testInfo.project.name.includes('mobile'), 'The Admin mutation is covered once in the desktop project.');
    const [adminFixture, placement] = await Promise.all([
      prisma.user.findUnique({ where: { email: E2E_ADMIN_EMAIL }, select: { id: true } }),
      prisma.homepageHeroPlacement.findUnique({
        where: { productId: megaGreninjaProductId },
        select: { id: true },
      }),
    ]);
    test.skip(!adminFixture, 'The canonical ADMIN E2E fixture is not present in the configured database.');
    expect(placement).toBeTruthy();

    await page.goto(`http://127.0.0.1:3001/login?callbackUrl=${encodeURIComponent(`/admin/storefront?hero=${placement!.id}`)}`);
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill(E2E_ADMIN_EMAIL);
    await page.getByLabel('Password').fill(E2E_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/storefront\\?hero=${placement!.id}`), { timeout: 30_000 });

    const heroEditor = page.getByRole('form', { name: 'Homepage hero placement editor' });
    const productSelect = heroEditor.getByLabel('Associated product');
    const headline = heroEditor.getByLabel('Headline');
    const ctaPath = heroEditor.getByLabel('Internal CTA path');
    const preview = heroEditor.getByLabel('Hero preview');
    await expect(productSelect).toHaveValue(megaGreninjaProductId);
    await expect(preview.locator('img').first()).toHaveAttribute('src', /primary\.webp/);
    await expect(heroEditor.getByLabel('Display mode')).toHaveValue('FULL_BLEED');
    await expect(heroEditor.getByLabel('Image focal point')).toHaveValue('RIGHT');
    await expect(heroEditor.getByLabel('Overlay strength')).toHaveValue('BALANCED');

    await headline.fill('');
    await productSelect.selectOption('');
    await productSelect.selectOption(megaGreninjaProductId);
    await expect(headline).toHaveValue(/Mega Greninja ex Premium Collection/);
    await expect(ctaPath).toHaveValue(megaGreninjaPath);

    await heroEditor.getByRole('button', { name: 'Save hero placement' }).click();
    await expect(page).toHaveURL(/\/admin\/storefront\?saved=hero/, { timeout: 30_000 });

    await page.goto(`http://127.0.0.1:3001/admin/storefront?hero=${placement!.id}`);
    const validationEditor = page.getByRole('form', { name: 'Homepage hero placement editor' });
    const validationCtaPath = validationEditor.getByLabel('Internal CTA path');
    await validationCtaPath.fill('https://external.example/product');
    await validationEditor.getByRole('button', { name: 'Save hero placement' }).click();
    await expect(validationEditor.getByRole('alert')).toContainText('Hero placement could not be saved');
    await expect(validationCtaPath).toHaveAttribute('aria-invalid', 'true');
    await expect(validationCtaPath).toHaveValue('https://external.example/product');
    await expect(page.getByText('Hero CTA must use an internal storefront path.')).toHaveCount(0);

    await page.goto('/');
    const hero = page.locator('section[aria-roledescription="carousel"]');
    await expect(hero.getByRole('heading', { name: /Mega Greninja ex Premium Collection/ })).toBeVisible();
    await expect(hero).toHaveAttribute('data-hero-display-mode', 'FULL_BLEED');
    await expect(hero).toHaveAttribute('data-hero-focal-point', 'RIGHT');
    await expect(hero).toHaveAttribute('data-hero-overlay-strength', 'BALANCED');
    const productImage = hero.getByRole('img').first();
    await expect(productImage).toBeVisible();
    await expect(productImage).toHaveClass(/object-cover/);
    await expect(productImage).toHaveClass(/object-\[70%_center\]/);
    await expect(productImage).not.toHaveClass(/object-contain/);
    await expect(hero.getByRole('link', { name: 'Shop now' })).toHaveAttribute('href', megaGreninjaPath);
  });
});
