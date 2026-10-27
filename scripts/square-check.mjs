// Read-only credentials check: node scripts/square-check.mjs
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]),
);

const prod = env.SQUARE_ENVIRONMENT === "production";
const base = prod ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
const appId = env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? "";
const locationId = env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "";

console.log("environment:", env.SQUARE_ENVIRONMENT);
console.log("app id prefix ok:", prod ? appId.startsWith("sq0idp-") : appId.startsWith("sandbox-"));
console.log("token present:", Boolean(env.SQUARE_ACCESS_TOKEN), "length:", env.SQUARE_ACCESS_TOKEN?.length ?? 0);

const get = async (path) => {
  const res = await fetch(base + path, {
    headers: { "Square-Version": "2026-09-16", Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status} ${body.errors?.map((e) => e.code).join(", ")}`);
  return body;
};

const { locations = [] } = await get("/v2/locations");
console.log("\nlocations on this account:", locations.length);
for (const loc of locations) {
  const a = loc.address ?? {};
  console.log(
    `${loc.id === locationId ? "->" : "  "} ${loc.name} | ${loc.status} | ${[a.address_line_1, a.locality, a.administrative_district_level_1].filter(Boolean).join(", ")} | currency ${loc.currency} | online card payments: ${loc.capabilities?.includes("CREDIT_CARD_PROCESSING") ? "yes" : "NO"}`,
  );
}
console.log("location id matches:", locations.some((l) => l.id === locationId));

let items = 0;
let taxes = [];
let categories = 0;
let cursor;
do {
  const page = await get(`/v2/catalog/list?types=ITEM,TAX,CATEGORY${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
  for (const o of page.objects ?? []) {
    if (o.is_deleted) continue;
    if (o.type === "ITEM") items++;
    if (o.type === "CATEGORY") categories++;
    if (o.type === "TAX") taxes.push(`${o.tax_data?.name} ${o.tax_data?.percentage}%`);
  }
  cursor = page.cursor;
} while (cursor);
console.log("\ncatalog: items", items, "| categories", categories, "| taxes", taxes.length ? taxes.join(", ") : "none");
