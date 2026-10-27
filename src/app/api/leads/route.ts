import { clientIpFrom, devlyPost } from "@/lib/devly";
import { crepeHeaven } from "@/lib/restaurants/crepe-heaven";

const MAX_BODY_BYTES = 8_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SOURCE_RE = /^[a-z0-9-]{1,32}$/;

type LeadRequest = {
  restaurant?: unknown;
  email?: unknown;
  marketingOptIn?: unknown;
  source?: unknown;
  payload?: unknown;
};

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: LeadRequest;
  try {
    body = JSON.parse(raw) as LeadRequest;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = typeof body.restaurant === "string" ? body.restaurant : "";
  if (slug !== crepeHeaven.slug) {
    return Response.json({ error: "Unknown restaurant" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return Response.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const source =
    typeof body.source === "string" && SOURCE_RE.test(body.source) ? body.source : "chat";

  const result = await devlyPost(
    slug,
    "/api/v1/leads",
    {
      email,
      marketingOptIn: body.marketingOptIn === true,
      source,
      payload: body.payload,
    },
    clientIpFrom(request),
  );

  if (!result.configured) {
    return Response.json({ ok: false, stored: false }, { status: 503 });
  }
  if (!result.ok) {
    return Response.json(
      { ok: false, stored: false },
      { status: result.status === 429 ? 429 : 502 },
    );
  }
  return Response.json({ ok: true, stored: true });
}
