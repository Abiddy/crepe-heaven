import { quoteCart, squareConfig, SquareError } from "@/lib/square";
import { parseCart } from "../cart";

export async function POST(request: Request) {
  if (!squareConfig()) {
    return Response.json({ error: "Online ordering isn't set up yet." }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as { items?: unknown } | null;
  const lines = parseCart(body?.items);
  if (!lines) return Response.json({ error: "Your cart looks empty or invalid." }, { status: 400 });

  try {
    return Response.json(await quoteCart(lines));
  } catch (err) {
    const status = err instanceof SquareError && err.status === 409 ? 409 : 502;
    const message = err instanceof SquareError && status === 409 ? err.message : "Could not price your order.";
    return Response.json({ error: message }, { status });
  }
}
