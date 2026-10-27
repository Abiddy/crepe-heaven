"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/recommend";

type SquareCard = {
  attach: (selector: string) => Promise<void>;
  tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>;
  destroy: () => Promise<void>;
};

declare global {
  interface Window {
    Square?: { payments: (appId: string, locationId: string) => { card: () => Promise<SquareCard> } };
  }
}

type Quote = { subtotal: number; tax: number; total: number };
type Placed = { orderId: string; total: number; receiptUrl: string | null };

const APP_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID ?? "";
const LOCATION_ID = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID ?? "";
export const SQUARE_SANDBOX = APP_ID.startsWith("sandbox-");
const SDK_URL = SQUARE_SANDBOX
  ? "https://sandbox.web.squarecdn.com/v1/square.js"
  : "https://web.squarecdn.com/v1/square.js";

const cents = (amount: number) => formatPrice(amount / 100);

let sdkPromise: Promise<void> | null = null;
function loadSquareSdk() {
  if (window.Square) return Promise.resolve();
  sdkPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.onload = () => resolve();
    script.onerror = () => {
      sdkPromise = null;
      reject(new Error("Square failed to load"));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

/** Mounts Square's card form into `selector` while `active` is true. */
export function useSquareCard(active: boolean, selector: string) {
  const cardRef = useRef<SquareCard | null>(null);
  const [cardReady, setCardReady] = useState(false);
  const [cardError, setCardError] = useState("");

  useEffect(() => {
    if (!active) return;
    if (!APP_ID || !LOCATION_ID) {
      setCardError("Online ordering isn't switched on yet. Please call to order.");
      return;
    }
    let cancelled = false;
    let card: SquareCard | null = null;
    (async () => {
      try {
        await loadSquareSdk();
        if (cancelled) return;
        const created = await window.Square!.payments(APP_ID, LOCATION_ID).card();
        if (cancelled) {
          void created.destroy();
          return;
        }
        await created.attach(selector);
        if (cancelled) {
          void created.destroy();
          return;
        }
        card = created;
        cardRef.current = created;
        setCardError("");
        setCardReady(true);
      } catch {
        if (!cancelled) setCardError("The card form couldn't load. Refresh and try again.");
      }
    })();
    return () => {
      cancelled = true;
      if (card) void card.destroy();
      cardRef.current = null;
      setCardReady(false);
    };
  }, [active, selector]);

  return { cardRef, cardReady, cardError };
}

export type CartLines = [key: string, qty: number][];

export function CrepeCheckout({
  open,
  onClose,
  lines,
  prices,
  change,
  onPlaced,
  pickupNote,
}: {
  open: boolean;
  onClose: () => void;
  lines: CartLines;
  prices: Map<string, number>;
  change: (key: string, delta: number) => void;
  onPlaced: () => void;
  pickupNote: string;
}) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [placed, setPlaced] = useState<Placed | null>(null);

  const linesKey = JSON.stringify(lines);
  useEffect(() => {
    if (!open || lines.length === 0) {
      setQuote(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setQuoteError("");
      try {
        const res = await fetch("/api/square/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: lines.map(([k, qty]) => ({ key: k, qty })) }),
          signal: controller.signal,
        });
        const data = (await res.json()) as Quote & { error?: string };
        if (!res.ok) throw new Error(data.error || "Could not price your order.");
        setQuote(data);
      } catch (err) {
        if (!controller.signal.aborted) setQuoteError(err instanceof Error ? err.message : "Could not price your order.");
      }
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, linesKey]);

  const { cardRef, cardReady, cardError } = useSquareCard(open && lines.length > 0 && !placed, "#mn-card");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close() {
    if (placed) setPlaced(null);
    onClose();
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!cardRef.current || !quote) return;
    setPaying(true);
    setPayError("");
    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== "OK" || !result.token) {
        setPayError(result.errors?.[0]?.message ?? "Check your card details.");
        return;
      }
      const res = await fetch("/api/square/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map(([k, qty]) => ({ key: k, qty })),
          name,
          phone,
          sourceId: result.token,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const data = (await res.json()) as Placed & { error?: string };
      if (!res.ok) {
        setPayError(data.error || "We couldn't place your order.");
        return;
      }
      setPlaced(data);
      onPlaced();
    } catch {
      setPayError("Something went wrong. Check your connection and try again.");
    } finally {
      setPaying(false);
    }
  }

  if (!open) return null;

  return (
    <div className="mn-drawer" role="dialog" aria-modal="true" aria-label="Your order">
      <button type="button" className="mn-drawer__scrim" aria-label="Close order" onClick={close} />
      <div className="mn-drawer__panel" data-lenis-prevent>
        <div className="mn-drawer__head">
          <div>
            <p className="uma-kicker">Pickup order</p>
            <h2>{placed ? "Order placed" : "Your order"}</h2>
          </div>
          <button type="button" className="mn-close" onClick={close} aria-label="Close">
            <Icon d="M6 6l12 12M18 6L6 18" />
          </button>
        </div>

        {SQUARE_SANDBOX && !placed && (
          <p className="mn-test">
            Test mode, no real charges. Card <strong>4111 1111 1111 1111</strong>, any future date, any CVV, ZIP{" "}
            <strong>12345</strong>.
          </p>
        )}

        {placed ? (
          <div className="mn-done">
            <p className="mn-done__big">Thank you!</p>
            <p>
              Your order of <strong>{cents(placed.total)}</strong> is in. It&apos;ll be ready for pickup in about 20
              minutes.
            </p>
            <p className="mn-done__id">Order #{placed.orderId.slice(-6).toUpperCase()}</p>
            {placed.receiptUrl && (
              <a href={placed.receiptUrl} target="_blank" rel="noopener noreferrer">
                View receipt ↗
              </a>
            )}
            <button type="button" className="mn-pay" onClick={close}>
              Back to menu
            </button>
          </div>
        ) : lines.length === 0 ? (
          <div className="mn-empty">
            <p>Your order is empty.</p>
            <span>Tap + on any dish to add it.</span>
          </div>
        ) : (
          <form onSubmit={pay} className="mn-form">
            <ul className="mn-lines">
              {lines.map(([k, qty]) => (
                <li key={k}>
                  <div>
                    <span>{k.split("|")[1]}</span>
                    <small>{k.split("|")[0]}</small>
                  </div>
                  <Stepper qty={qty} label={k.split("|")[1]} onChange={(d) => change(k, d)} small />
                  <strong>{formatPrice((prices.get(k) ?? 0) * qty)}</strong>
                </li>
              ))}
            </ul>

            <dl className="mn-totals">
              <div>
                <dt>Subtotal</dt>
                <dd>{quote ? cents(quote.subtotal) : "…"}</dd>
              </div>
              <div>
                <dt>Tax</dt>
                <dd>{quote ? cents(quote.tax) : "…"}</dd>
              </div>
              <div className="mn-totals__total">
                <dt>Total</dt>
                <dd>{quote ? cents(quote.total) : "…"}</dd>
              </div>
            </dl>
            {quoteError && <p className="mn-error">{quoteError}</p>}

            <fieldset className="mn-fields">
              <legend>Pickup details</legend>
              <input
                required
                autoComplete="name"
                placeholder="Name for the order"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                required
                type="tel"
                autoComplete="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </fieldset>

            <fieldset className="mn-fields">
              <legend>Card</legend>
              <div id="mn-card" className="mn-cardform" />
              {!cardReady && !cardError && <p className="mn-hint">Loading secure card form…</p>}
            </fieldset>

            {(payError || cardError) && !quoteError && <p className="mn-error">{payError || cardError}</p>}

            <button type="submit" className="mn-pay" disabled={!cardReady || !quote || paying}>
              {paying ? "Placing order…" : quote ? `Pay ${cents(quote.total)}` : "Pay"}
            </button>
            <p className="mn-hint">{pickupNote}</p>
          </form>
        )}
      </div>
    </div>
  );
}

export function Stepper({
  qty,
  label,
  onChange,
  small,
}: {
  qty: number;
  label: string;
  onChange: (delta: number) => void;
  small?: boolean;
}) {
  if (qty === 0) {
    return (
      <button type="button" className="mn-add" onClick={() => onChange(1)} aria-label={`Add ${label}`}>
        <Icon d={PLUS} />
      </button>
    );
  }
  return (
    <div className={`mn-step${small ? " mn-step--sm" : ""}`}>
      <button type="button" onClick={() => onChange(-1)} aria-label={`Remove one ${label}`}>
        <Icon d={MINUS} />
      </button>
      <span aria-live="polite">{qty}</span>
      <button type="button" onClick={() => onChange(1)} aria-label={`Add one ${label}`}>
        <Icon d={PLUS} />
      </button>
    </div>
  );
}

const PLUS = "M12 5v14M5 12h14";
const MINUS = "M5 12h14";

function Icon({ d }: { d: string }) {
  return (
    <svg className="mn-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
