import { expect, test } from "@playwright/test";

test.describe("Topic form visual", () => {
  test.beforeEach(async ({ page }) => {
    await page.addStyleTag({
      content: "*, *::before, *::after { transition-duration: 0ms !important; animation-duration: 0ms !important; }"
    });
  });

  test("aligns with home page tokens", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Add new topic/i }).click();

    const form = page.locator('[data-testid="topic-form"]');
    await form.waitFor({ state: "visible" });
    await form.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
    await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      active?.blur();
    });
    await page.waitForTimeout(300);

    await expect(form).toHaveScreenshot();
  });
});
