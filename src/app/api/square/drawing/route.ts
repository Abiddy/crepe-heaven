import { addDrawingEntry, squareConfig } from "@/lib/square";
import { REVIEW_DRAWING } from "@/lib/restaurants/crepe-heaven-drawing";
import { parsePhone, readJson } from "../cart";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!squareConfig()) return Response.json({ error: "Entries aren't open yet." }, { status: 503 });

  const body = await readJson(request, 4_000);
  if (!body) return Response.json({ error: "Invalid request." }, { status: 400 });

  // Honeypot: real visitors never see or fill this field.
  if (typeof body.website === "string" && body.website) return Response.json({ ok: true });

  if (Date.now() > Date.parse(REVIEW_DRAWING.closesAt)) {
    return Response.json({ error: "This drawing has closed." }, { status: 410 });
  }

  const googleName = typeof body.googleName === "string" ? body.googleName.trim().slice(0, 60) : "";
  if (googleName.length < 2) return Response.json({ error: "Enter the name on your Google account." }, { status: 400 });

  const phone = parsePhone(body.phone);
  if (!phone) return Response.json({ error: "Enter a 10-digit phone number." }, { status: 400 });

  const email = typeof body.email === "string" ? body.email.trim().slice(0, 120) : "";
  if (email && !EMAIL_RE.test(email)) return Response.json({ error: "That email doesn't look right." }, { status: 400 });

  try {
    const result = await addDrawingEntry({ googleName, phone, email, drawing: REVIEW_DRAWING.id });
    return Response.json({ ok: true, ...result });
  } catch {
    return Response.json({ error: "We couldn't save your entry. Please try again." }, { status: 502 });
  }
}
