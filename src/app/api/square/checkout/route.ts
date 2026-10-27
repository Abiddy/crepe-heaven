import { placePickupOrder, squareConfig, SquareError } from "@/lib/square";
import { cardErrorMessage, parseCart, parsePhone, readJson } from "../cart";

const KEY_RE = /^[a-zA-Z0-9-]{8,40}$/;

export async function POST(request: Request) {
  if (!squareConfig()) {
    return Response.json({ error: "Online ordering isn't set up yet." }, { status: 503 });
  }

  const body = await readJson(request);
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });

  const lines = parseCart(body.items);
  if (!lines) return Response.json({ error: "Your cart looks empty or invalid." }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  if (!name) return Response.json({ error: "Enter a name for the pickup." }, { status: 400 });

  const phone = parsePhone(body.phone);
  if (!phone) return Response.json({ error: "Enter a 10-digit phone number." }, { status: 400 });

  const sourceId = typeof body.sourceId === "string" ? body.sourceId : "";
  if (!sourceId || sourceId.length > 300) return Response.json({ error: "Card details are missing." }, { status: 400 });

  const idempotencyKey = typeof body.idempotencyKey === "string" && KEY_RE.test(body.idempotencyKey) ? body.idempotencyKey : "";
  if (!idempotencyKey) return Response.json({ error: "Invalid request." }, { status: 400 });

  const verificationToken =
    typeof body.verificationToken === "string" && body.verificationToken.length < 2000 ? body.verificationToken : undefined;

  try {
    const result = await placePickupOrder({ lines, name, phone, sourceId, verificationToken, idempotencyKey });
    return Response.json(result);
  } catch (err) {
    if (err instanceof SquareError) {
      const cardMessage = cardErrorMessage(err.codes);
      if (cardMessage) return Response.json({ error: cardMessage }, { status: 402 });
      if (err.status === 409) return Response.json({ error: err.message }, { status: 409 });
    }
    return Response.json({ error: "We couldn't place your order. You haven't been charged." }, { status: 502 });
  }
}
