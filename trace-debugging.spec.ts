import { expect, test } from "@playwright/test";

test("debugs a lifecycle, proves idempotency, and explains domain failure", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Recipient").fill("reviewer@example.com");
  await page.getByLabel("Subject").fill("Resend-style observability review");
  await page.getByRole("button", { name: "Create local trace" }).click();

  await expect(page).toHaveURL(/\/traces\/trace_/);
  await expect(page.getByText("REQUEST CORRELATION")).toBeVisible();
  await expect(page.getByText("MESSAGE CORRELATION")).toBeVisible();

  await page.getByRole("button", { name: "delivered" }).click();
  await expect(page.locator(".status-delivered").first()).toBeVisible();
  await expect(page.getByText(/fixture accepted/i)).toBeVisible();
  await expect(page.getByText("Inspect raw webhook payload")).toHaveCount(1);

  await page.getByRole("button", { name: "delivered" }).click();
  await expect(page.getByText(/idempotently ignored as a duplicate/i)).toBeVisible();
  await expect(page.getByText("Inspect raw webhook payload")).toHaveCount(1);

  await page.getByRole("link", { name: /All traces/i }).click();
  await page.getByLabel("Fixture").selectOption("missing-spf");
  await page.getByRole("button", { name: "Run diagnostic" }).click();
  await expect(page.getByText("No SPF fixture record")).toBeVisible();
  await expect(page.getByText(/Publish one SPF TXT record/i)).toBeVisible();
  await expect(page.getByText(/not a live DNS lookup/i)).toBeVisible();
});
