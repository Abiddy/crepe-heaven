const SQUARE_VERSION = "2026-09-16";
const CATALOG_TTL_MS = 5 * 60 * 1000;

export type CartLine = { key: string; qty: number };

type Money = { amount: number; currency: string };

type CatalogEntry = { variationId: string; name: string };

type CatalogIndex = { items: Map<string, CatalogEntry>; taxIds: string[]; loadedAt: number };

export class SquareError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly codes: string[] = [],
  ) {
    super(message);
  }
}

export function squareConfig() {
  const token = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID;
  if (!token || !locationId) return null;
  const base =
    process.env.SQUARE_ENVIRONMENT === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";
  return { token, locationId, base };
}

async function square<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = squareConfig();
  if (!config) throw new SquareError("Square is not configured", 503);
  const res = await fetch(`${config.base}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Square-Version": SQUARE_VERSION,
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & { errors?: { code: string; detail?: string }[] };
  if (!res.ok) {
    const codes = body.errors?.map((e) => e.code) ?? [];
    console.error(`[square] ${path} ${res.status}`, body.errors);
    throw new SquareError(body.errors?.[0]?.detail ?? "Square request failed", res.status, codes);
  }
  return body;
}

/** Website menu items are matched to Square by "Category title|Item name". */
export function menuKey(category: string, name: string) {
  return `${category}|${name}`;
}

let cached: CatalogIndex | null = null;

async function catalogIndex(): Promise<CatalogIndex> {
  if (cached && Date.now() - cached.loadedAt < CATALOG_TTL_MS) return cached;

  type CatalogObject = {
    id: string;
    type: string;
    is_deleted?: boolean;
    category_data?: { name: string };
    item_data?: { name: string; categories?: { id: string }[]; variations?: { id: string }[] };
  };
  const objects: CatalogObject[] = [];
  let cursor: string | undefined;
  do {
    const page = await square<{ objects?: CatalogObject[]; cursor?: string }>(
      `/v2/catalog/list?types=ITEM,CATEGORY,TAX${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
    );
    objects.push(...(page.objects ?? []));
    cursor = page.cursor;
  } while (cursor);

  const live = objects.filter((o) => !o.is_deleted);
  const categories = new Map(live.filter((o) => o.type === "CATEGORY").map((o) => [o.id, o.category_data?.name ?? ""]));
  const items = new Map<string, CatalogEntry>();
  for (const obj of live) {
    if (obj.type !== "ITEM" || !obj.item_data?.variations?.[0]) continue;
    const category = categories.get(obj.item_data.categories?.[0]?.id ?? "") ?? "";
    items.set(menuKey(category, obj.item_data.name), {
      variationId: obj.item_data.variations[0].id,
      name: obj.item_data.name,
    });
  }
  const taxIds = live.filter((o) => o.type === "TAX").map((o) => o.id);

  cached = { items, taxIds, loadedAt: Date.now() };
  return cached;
}

type LineItem = Record<string, unknown>;

async function orderWith(lineItems: (index: CatalogIndex) => LineItem[]) {
  const config = squareConfig()!;
  const index = await catalogIndex();
  return {
    location_id: config.locationId,
    line_items: lineItems(index),
    taxes: index.taxIds.map((id) => ({ uid: `tax-${id}`, catalog_object_id: id, scope: "ORDER" })),
  };
}

function buildOrder(lines: CartLine[]) {
  return orderWith((index) => {
    const missing = lines.filter((line) => !index.items.has(line.key)).map((line) => line.key);
    if (missing.length) {
      throw new SquareError(`Some items are no longer available: ${missing.join(", ")}`, 409);
    }
    return lines.map((line) => ({
      catalog_object_id: index.items.get(line.key)!.variationId,
      quantity: String(line.qty),
    }));
  });
}

export type CateringSelection = { plates: number; platePrice: number; crepes: string[]; drinks: string[] };

function buildCateringOrder(selection: CateringSelection) {
  return orderWith(() => [
    {
      name: "Catering plate (crepe + drink)",
      quantity: String(selection.plates),
      base_price_money: { amount: Math.round(selection.platePrice * 100), currency: "USD" },
      note: `Crepes: ${selection.crepes.join(", ")}. Drinks: ${selection.drinks.join(", ")}`.slice(0, 2000),
    },
  ]);
}

type OrderTotals = {
  total_money: Money;
  total_tax_money?: Money;
};

function totals(order: OrderTotals) {
  const total = order.total_money.amount;
  const tax = order.total_tax_money?.amount ?? 0;
  return { subtotal: total - tax, tax, total };
}

async function calculate(order: object) {
  const { order: priced } = await square<{ order: OrderTotals }>("/v2/orders/calculate", {
    method: "POST",
    body: JSON.stringify({ order }),
  });
  return totals(priced);
}

/** Prices the cart using Square's catalog, so the customer sees exactly what will be charged. */
export async function quoteCart(lines: CartLine[]) {
  return calculate(await buildOrder(lines));
}

export async function quoteCatering(selection: CateringSelection) {
  return calculate(await buildCateringOrder(selection));
}

type Payer = {
  name: string;
  phone: string;
  sourceId: string;
  verificationToken?: string;
  idempotencyKey: string;
};

export type DeliveryAddress = { street: string; unit: string; city: string; zip: string };

export async function placePickupOrder(input: Payer & { lines: CartLine[] }) {
  return createAndPay(await buildOrder(input.lines), input, {
    type: "PICKUP",
    pickup_details: {
      schedule_type: "ASAP",
      prep_time_duration: "PT20M",
      recipient: { display_name: input.name, phone_number: input.phone },
    },
  });
}

export async function placeCateringOrder(
  input: Payer & {
    selection: CateringSelection;
    at: string;
    delivery: DeliveryAddress | null;
    email: string;
    notes: string;
  },
) {
  const note = [
    `CATERING ${input.delivery ? "DELIVERY" : "PICKUP"} for ${input.selection.plates}`,
    input.email && `Email: ${input.email}`,
    input.notes,
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 500);
  const recipient = { display_name: input.name, phone_number: input.phone };
  const fulfillment = input.delivery
    ? {
        type: "DELIVERY",
        delivery_details: {
          schedule_type: "SCHEDULED",
          deliver_at: input.at,
          note,
          recipient: {
            ...recipient,
            address: {
              address_line_1: input.delivery.street,
              address_line_2: input.delivery.unit || undefined,
              locality: input.delivery.city,
              administrative_district_level_1: "CA",
              postal_code: input.delivery.zip,
              country: "US",
            },
          },
        },
      }
    : {
        type: "PICKUP",
        pickup_details: { schedule_type: "SCHEDULED", pickup_at: input.at, note, recipient },
      };
  return createAndPay(await buildCateringOrder(input.selection), input, fulfillment);
}

/** Saves a review-drawing entrant as a Square customer. One entry per phone number per drawing. */
export async function addDrawingEntry(input: { googleName: string; phone: string; email: string; drawing: string }) {
  const referenceId = `review-drawing-${input.drawing}`;
  const { customers = [] } = await square<{ customers?: { id: string }[] }>("/v2/customers/search", {
    method: "POST",
    body: JSON.stringify({
      limit: 1,
      query: { filter: { phone_number: { exact: input.phone }, reference_id: { exact: referenceId } } },
    }),
  });
  if (customers.length) return { alreadyEntered: true };

  await square("/v2/customers", {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      given_name: input.googleName,
      phone_number: input.phone,
      email_address: input.email || undefined,
      reference_id: referenceId,
      note: `Review drawing ${input.drawing}. Google name: ${input.googleName}`,
    }),
  });
  return { alreadyEntered: false };
}

async function createAndPay(order: object, input: Payer, fulfillment: { type: string } & Record<string, unknown>) {
  const config = squareConfig()!;
  const { order: created } = await square<{ order: OrderTotals & { id: string } }>("/v2/orders", {
    method: "POST",
    body: JSON.stringify({
      idempotency_key: `${input.idempotencyKey}-order`,
      order: {
        ...order,
        source: { name: "Crepe Heaven website" },
        fulfillments: [{ ...fulfillment, state: "PROPOSED" }],
      },
    }),
  });

  const { payment } = await square<{ payment: { id: string; status: string; receipt_url?: string } }>(
    "/v2/payments",
    {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: `${input.idempotencyKey}-pay`,
        source_id: input.sourceId,
        verification_token: input.verificationToken,
        amount_money: created.total_money,
        order_id: created.id,
        location_id: config.locationId,
        autocomplete: true,
        buyer_phone_number: input.phone,
        note: `${fulfillment.type === "DELIVERY" ? "Delivery" : "Pickup"} for ${input.name}`,
      }),
    },
  );

  return { orderId: created.id, paymentStatus: payment.status, receiptUrl: payment.receipt_url ?? null, ...totals(created) };
}
