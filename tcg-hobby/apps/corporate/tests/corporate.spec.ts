import { expect, test } from "@playwright/test";

test.describe("Capital Hobby Group corporate site", () => {
  test("homepage presents the approved identity and working division state", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Parent company for specialist hobby divisions." })).toBeVisible();
    await expect(page.getByTestId("corporate-frame")).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Capital Hobby Group home" })).toBeVisible();
    await expect(page.locator(".division-card")).toHaveCount(2);
    await expect(page.locator(".credibility-strip article")).toHaveCount(4);
    await expect(page.getByRole("link", { name: /Visit TCG Hobby/ })).toHaveAttribute("href", "https://tcg-hobby.co.uk");
    await expect(page.getByText("Launching Soon")).toBeVisible();
    await expect(page.getByRole("link", { name: /Visit Iron Sprue/ })).toHaveAttribute("href", "https://www.ironsprue.co.uk");
    await expect(page.getByText("Company number 17336948")).toBeVisible();
    await expect(page.getByText("VAT No. 525 2040 33")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Primary navigation" }).getByText("Our Brands")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Legal links" }).getByText("Cookies")).toBeVisible();
    await expect(page.locator("img")).toHaveCount(3);
    for (const image of await page.locator("img").all()) {
      await expect(image).toHaveJSProperty("complete", true);
      await expect(image).toHaveCSS("object-fit", "contain");
      expect(await image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
    const cardHeights = await page.locator(".division-card").evaluateAll((cards) =>
      cards.map((card) => Math.round(card.getBoundingClientRect().height)),
    );
    expect(new Set(cardHeights).size).toBe(1);
    await expect(page.locator(".division-logo-tcg")).toHaveCSS("background-color", "rgb(9, 11, 13)");
    expect(errors).toEqual([]);
  });

  test("Home, About and Contact routes are keyboard reachable", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop navigation check; the mobile drawer is covered separately");
    await page.goto("/");
    const navigation = page.getByRole("navigation", { name: "Primary navigation" });
    await expect(navigation.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    await navigation.getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Built from the hobbies, not outside them.");
    await page.getByRole("link", { name: "Contact" }).first().click();
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Direct your enquiry.");
  });

  test("mobile menu opens, routes and never overflows", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Mobile navigation check");
    await page.goto("/");
    const menu = page.locator("button[aria-controls='corporate-navigation']");
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "About" }).click();
    await expect(page).toHaveURL(/\/about$/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });

  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    test(`keeps the framed composition and logos contained at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
      await page.goto("/");
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
      await expect(page.getByTestId("corporate-frame")).toBeVisible();
      const croppedImages = await page.locator("img").evaluateAll((images) =>
        images.filter((image) => {
          const imageRect = image.getBoundingClientRect();
          const parentRect = image.parentElement?.getBoundingClientRect();
          return !parentRect || imageRect.left < parentRect.left || imageRect.right > parentRect.right;
        }).length,
      );
      expect(croppedImages).toBe(0);
      if (width >= 1280) {
        const frame = await page.getByTestId("corporate-frame").boundingBox();
        expect(frame?.y ?? 901).toBeLessThan(200);
        expect((frame?.y ?? 0) + (frame?.height ?? 901)).toBeLessThanOrEqual(900);
      }
    });
  }

  test("honours reduced-motion preferences", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const transitionDuration = await page.locator(".division-card").first().evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).transitionDuration),
    );
    expect(transitionDuration).toBeLessThanOrEqual(0.00001);
  });
});
