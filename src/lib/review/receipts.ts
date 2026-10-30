import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CaptureReceipt } from "@/lib/paypal/order-data";
import type { TransactionReview } from "./policy";

export type SavedReceipt = { assessmentId: string; acknowledgedAt?: string; capturedAt: string; review: TransactionReview; payment: CaptureReceipt };
const directory = path.join(process.cwd(), ".trustpay-data", "receipts");
function ownerDirectory(owner: string) {
  return path.join(directory, createHash("sha256").update(owner).digest("hex"));
}

export async function persistReceipt(owner: string, receipt: SavedReceipt) {
  if (!/^[a-f0-9-]{36}$/.test(receipt.assessmentId)) throw new Error("Invalid review ID");
  const folder = ownerDirectory(owner);
  await mkdir(folder, { recursive: true });
  const destination = path.join(folder, `${receipt.assessmentId}.json`);
  const temporary = `${destination}.tmp`;
  await writeFile(temporary, JSON.stringify(receipt), { mode: 0o600 });
  await rename(temporary, destination);
}

export async function readReceipts(owner: string): Promise<SavedReceipt[]> {
  const folder = ownerDirectory(owner);
  let names: string[];
  try { names = await readdir(folder); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  const records = await Promise.all(names.filter((name) => /^[a-f0-9-]{36}\.json$/.test(name)).map(async (name) => JSON.parse(await readFile(path.join(folder, name), "utf8")) as SavedReceipt));
  return records.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)).slice(0, 10);
}
