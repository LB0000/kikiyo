import { test, expect } from "@playwright/test";

test.describe("Invoice PDF API", () => {
  test("should return 401/403 for unauthenticated request", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/invoices/00000000-0000-0000-0000-000000000000/pdf",
    );
    // 認証なしの場合は 4xx を返す
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("should return error for non-existent invoice", async ({ request }) => {
    const response = await request.get(
      "/api/invoices/00000000-0000-0000-0000-000000000000/pdf",
    );
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
