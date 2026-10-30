import { expect, it, vi } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
vi.mock("server-only", () => ({}));

it("reloads a persisted receipt after a module restart and isolates browser owners", async () => {
  const folder = await mkdtemp(path.join(tmpdir(), "trustpay-receipt-test-"));
  const cwd = vi.spyOn(process, "cwd").mockReturnValue(folder);
  try {
    vi.resetModules();
    const { persistReceipt } = await import("./receipts");
    const receipt = {
      assessmentId: "11111111-1111-4111-8111-111111111111",
      acknowledgedAt: "2026-10-30T03:58:00.000Z",
      capturedAt: "2026-10-30T04:00:00.000Z",
      review: { summary: "Essential terms stated", findings: [], questions: [] },
      payment: { orderId: "ORDER123456", captureId: "CAPTURE123456", status: "COMPLETED", amount: "5.00", currency: "USD" },
    };
    await persistReceipt("test-owner", receipt);
    const ownerHash = createHash("sha256").update("test-owner").digest("hex");
    expect(JSON.parse(await readFile(path.join(folder, ".trustpay-data", "receipts", ownerHash, `${receipt.assessmentId}.json`), "utf8"))).toEqual(receipt);
    vi.resetModules();
    const { readReceipts } = await import("./receipts");
    expect(await readReceipts("test-owner")).toEqual([receipt]);
    expect(await readReceipts("another-owner")).toEqual([]);
  } finally { cwd.mockRestore(); }
});
