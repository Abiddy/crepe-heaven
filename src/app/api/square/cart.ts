import type { CartLine } from "@/lib/square";

const MAX_LINES = 40;
const MAX_QTY = 20;

/** Validates untrusted cart input. Returns null when anything is off. */
export function parseCart(value: unknown): CartLine[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_LINES) return null;
  const lines: CartLine[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;
    const { key, qty } = entry as Record<string, unknown>;
    if (typeof key !== "string" || key.length > 160 || !key.includes("|")) return null;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) return null;
    lines.push({ key, qty });
  }
  return lines;
}

export function parsePhone(value: unknown) {
  const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return "";
}

const CARD_ERRORS: Record<string, string> = {
  CARD_DECLINED: "Your card was declined. Try another card.",
  GENERIC_DECLINE: "Your card was declined. Try another card.",
  CVV_FAILURE: "The security code didn't match. Check it and try again.",
  ADDRESS_VERIFICATION_FAILURE: "The ZIP code didn't match your card.",
  INVALID_EXPIRATION: "The expiration date looks wrong.",
  INSUFFICIENT_FUNDS: "The card has insufficient funds.",
};

export function cardErrorMessage(codes: string[]) {
  return codes.map((code) => CARD_ERRORS[code]).find(Boolean);
}

export async function readJson(request: Request, maxBytes = 16_000) {
  const raw = await request.text();
  if (raw.length > maxBytes) return null;
  try {
    const body = JSON.parse(raw) as unknown;
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
