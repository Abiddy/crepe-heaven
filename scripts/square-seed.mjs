// One-time: copies the Crepe Heaven website menu into a Square catalog.
// Usage: node scripts/square-seed.mjs   (reads .env.local; refuses to run if the catalog already has items)
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]),
);

const BASE =
  env.SQUARE_ENVIRONMENT === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
const TAX_PERCENT = "11";

async function square(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Square-Version": "2026-09-16",
      Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status}: ${JSON.stringify(body.errors ?? body)}`);
  return body;
}

const source = readFileSync(new URL("../src/lib/restaurants/crepe-heaven-menu.ts", import.meta.url), "utf8");
const sections = [];
for (const block of source.split(/\n  \{\n    id: "/).slice(1)) {
  const id = block.slice(0, block.indexOf('"'));
  const title = block.match(/title: "([^"]+)"/)[1];
  const items = [...block.matchAll(/\{ name: "([^"]+)", price: ([\d.]+)/g)].map((m) => ({
    name: m[1],
    cents: Math.round(Number(m[2]) * 100),
  }));
  sections.push({ id, title, items });
}

const existing = await square("/v2/catalog/list?types=ITEM");
if (existing.objects?.length) {
  console.log(`Catalog already has ${existing.objects.length} items. Nothing to do.`);
  process.exit(0);
}

const objects = [
  {
    type: "TAX",
    id: "#tax",
    tax_data: {
      name: "Sales Tax",
      percentage: TAX_PERCENT,
      calculation_phase: "TAX_SUBTOTAL_PHASE",
      inclusion_type: "ADDITIVE",
      applies_to_custom_amounts: true,
      enabled: true,
    },
  },
];

for (const section of sections) {
  objects.push({ type: "CATEGORY", id: `#cat-${section.id}`, category_data: { name: section.title } });
  section.items.forEach((item, i) => {
    const ref = `#item-${section.id}-${i}`;
    objects.push({
      type: "ITEM",
      id: ref,
      item_data: {
        name: item.name,
        categories: [{ id: `#cat-${section.id}` }],
        reporting_category: { id: `#cat-${section.id}` },
        tax_ids: ["#tax"],
        variations: [
          {
            type: "ITEM_VARIATION",
            id: `${ref}-v`,
            item_variation_data: {
              name: "Regular",
              pricing_type: "FIXED_PRICING",
              price_money: { amount: item.cents, currency: "USD" },
            },
          },
        ],
      },
    });
  });
}

const result = await square("/v2/catalog/batch-upsert", {
  method: "POST",
  body: JSON.stringify({ idempotency_key: randomUUID(), batches: [{ objects }] }),
});

const itemCount = sections.reduce((n, s) => n + s.items.length, 0);
console.log(`Created ${sections.length} categories, ${itemCount} items and a ${TAX_PERCENT}% tax.`);
console.log(`Square returned ${result.id_mappings?.length ?? 0} id mappings.`);
