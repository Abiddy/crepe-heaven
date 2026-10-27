// Read-only: lists recent orders and payments at the configured location. node scripts/square-orders.mjs
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]),
);

const base =
  env.SQUARE_ENVIRONMENT === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com";
const locationId = env.NEXT_PUBLIC_SQUARE_LOCATION_ID;

async function square(path, init = {}) {
  const res = await fetch(base + path, {
    ...init,
    headers: {
      "Square-Version": "2026-09-16",
      Authorization: `Bearer ${env.SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${path} ${res.status} ${body.errors?.map((e) => e.code).join(", ")}`);
  return body;
}

const money = (m) => (m ? `$${(m.amount / 100).toFixed(2)}` : "-");

const { orders = [] } = await square("/v2/orders/search", {
  method: "POST",
  body: JSON.stringify({
    location_ids: [locationId],
    limit: 10,
    query: { sort: { sort_field: "CREATED_AT", sort_order: "DESC" } },
  }),
});
console.log(`environment: ${env.SQUARE_ENVIRONMENT}\n\nrecent orders: ${orders.length}`);
for (const o of orders) {
  const f = o.fulfillments?.[0];
  console.log(
    `  ${o.created_at} | ${o.state} | ${money(o.total_money)} | source: ${o.source?.name ?? "-"} | fulfillment: ${f ? `${f.type} ${f.state}` : "none"} | tenders: ${o.tenders?.length ?? 0}`,
  );
}

const { payments = [] } = await square(`/v2/payments?location_id=${locationId}&sort_order=DESC&limit=10`);
console.log(`\nrecent payments: ${payments.length}`);
for (const p of payments) {
  console.log(`  ${p.created_at} | ${p.status} | ${money(p.amount_money)} | order ${p.order_id?.slice(-6) ?? "-"}`);
}
