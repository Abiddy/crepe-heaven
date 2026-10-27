// Read-only: lists review-drawing entrants and can pick a random winner.
// Usage: node scripts/square-drawing-entries.mjs [drawingId=2026-12] [--pick]
import { readFileSync } from "node:fs";
import { randomInt } from "node:crypto";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]),
);

const base =
  env.SQUARE_ENVIRONMENT === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
const drawing = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? "2026-12";

const entries = [];
let cursor;
do {
  const res = await fetch(`${base}/v2/customers/search`, {
    method: "POST",
    headers: {
      "Square-Version": "2026-09-16",
      Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      limit: 100,
      cursor,
      query: { filter: { reference_id: { exact: `review-drawing-${drawing}` } } },
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`customers/search ${res.status} ${body.errors?.map((e) => e.code).join(", ")}`);
  entries.push(...(body.customers ?? []));
  cursor = body.cursor;
} while (cursor);

console.log(`drawing ${drawing}: ${entries.length} entries`);
for (const c of entries) console.log(`  ${c.created_at.slice(0, 10)} | ${c.given_name} | ${c.phone_number}`);

if (process.argv.includes("--pick") && entries.length) {
  const w = entries[randomInt(entries.length)];
  console.log(`\nrandom pick: ${w.given_name} (${w.phone_number}). Check a Google review under this name exists.`);
}
