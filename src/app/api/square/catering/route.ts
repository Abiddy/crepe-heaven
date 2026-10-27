import { CATERING, cateringCrepes, cateringDrinks } from "@/lib/restaurants/crepe-heaven-catering";
import { placeCateringOrder, quoteCatering, squareConfig, SquareError, type CateringSelection } from "@/lib/square";
import { cardErrorMessage, parsePhone, readJson } from "../cart";

const KEY_RE = /^[a-zA-Z0-9-]{8,40}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;
const CREPES = new Set(cateringCrepes.map((c) => c.name));
const DRINKS = new Set(cateringDrinks);

function pickList(value: unknown, allowed: Set<string>, max: number) {
  if (!Array.isArray(value) || value.length === 0 || value.length > max) return null;
  const list = [...new Set(value)];
  return list.every((v) => typeof v === "string" && allowed.has(v)) ? (list as string[]) : null;
}

function parseSelection(body: Record<string, unknown>): CateringSelection | string {
  const plates = body.plates;
  if (typeof plates !== "number" || !Number.isInteger(plates) || plates < CATERING.minPlates || plates > CATERING.maxPlates) {
    return `Catering starts at ${CATERING.minPlates} plates.`;
  }
  const crepes = pickList(body.crepes, CREPES, CATERING.maxCrepes);
  if (!crepes) return `Pick 1 to ${CATERING.maxCrepes} crepes.`;
  const drinks = pickList(body.drinks, DRINKS, CATERING.maxDrinks);
  if (!drinks) return `Pick 1 to ${CATERING.maxDrinks} drinks.`;
  return { plates, platePrice: CATERING.platePrice, crepes, drinks };
}

function zoneParts(ts: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CATERING.timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(ts));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour"), mi: get("minute") };
}

/** Converts a restaurant-local date ("2026-11-02") and time ("14:30") to an RFC 3339 UTC timestamp. */
function pickupTime(date: unknown, time: unknown) {
  const dm = typeof date === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(date) : null;
  const tm = typeof time === "string" ? /^(\d{2}):(\d{2})$/.exec(time) : null;
  if (!dm || !tm) return null;
  const [y, mo, d, h, mi] = [...dm.slice(1), ...tm.slice(1)].map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offset = (ts: number) => {
    const p = zoneParts(ts);
    return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - ts;
  };
  let utc = guess - offset(guess);
  utc = guess - offset(utc);
  const check = zoneParts(utc);
  if (check.y !== y || check.mo !== mo || check.d !== d || check.h !== h || check.mi !== mi) return null;
  return utc;
}

export async function POST(request: Request) {
  if (!squareConfig()) {
    return Response.json({ error: "Online ordering isn't set up yet." }, { status: 503 });
  }

  const body = await readJson(request);
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });

  const selection = parseSelection(body);
  if (typeof selection === "string") return Response.json({ error: selection }, { status: 400 });

  if (body.mode === "quote") {
    try {
      return Response.json(await quoteCatering(selection));
    } catch {
      return Response.json({ error: "Could not price your catering order." }, { status: 502 });
    }
  }

  const pickup = pickupTime(body.date, body.time);
  const hour = typeof body.time === "string" ? Number(body.time.slice(0, 2)) : -1;
  if (!pickup || hour < 9 || hour > 17) return Response.json({ error: "Choose a pickup date and time." }, { status: 400 });
  const leadMs = CATERING.leadDays * 24 * 60 * 60 * 1000;
  if (pickup < Date.now() + leadMs - 60 * 60 * 1000 || pickup > Date.now() + 180 * 24 * 60 * 60 * 1000) {
    return Response.json(
      { error: `Catering needs at least ${CATERING.leadDays} days' notice. Please pick a later date.` },
      { status: 400 },
    );
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  if (!name) return Response.json({ error: "Enter a name for the order." }, { status: 400 });

  const phone = parsePhone(body.phone);
  if (!phone) return Response.json({ error: "Enter a 10-digit phone number." }, { status: 400 });

  const email = typeof body.email === "string" ? body.email.trim().slice(0, 254) : "";
  if (email && !EMAIL_RE.test(email)) return Response.json({ error: "That email doesn't look right." }, { status: 400 });

  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 300) : "";

  const sourceId = typeof body.sourceId === "string" ? body.sourceId : "";
  if (!sourceId || sourceId.length > 300) return Response.json({ error: "Card details are missing." }, { status: 400 });

  const idempotencyKey = typeof body.idempotencyKey === "string" && KEY_RE.test(body.idempotencyKey) ? body.idempotencyKey : "";
  if (!idempotencyKey) return Response.json({ error: "Invalid request." }, { status: 400 });

  try {
    const result = await placeCateringOrder({
      selection,
      pickupAt: new Date(pickup).toISOString(),
      name,
      phone,
      email,
      notes,
      sourceId,
      idempotencyKey,
    });
    return Response.json(result);
  } catch (err) {
    if (err instanceof SquareError) {
      const cardMessage = cardErrorMessage(err.codes);
      if (cardMessage) return Response.json({ error: cardMessage }, { status: 402 });
    }
    return Response.json({ error: "We couldn't place your catering order. You haven't been charged." }, { status: 502 });
  }
}
