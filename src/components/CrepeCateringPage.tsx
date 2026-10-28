"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CrepeChat } from "@/components/CrepeChat";
import { SQUARE_SANDBOX, useSquareCard } from "@/components/CrepeCheckout";
import { formatPrice } from "@/lib/recommend";
import { CATERING, cateringCrepes, cateringDrinks } from "@/lib/restaurants/crepe-heaven-catering";
import type { RestaurantConfig } from "@/lib/types";

type Quote = { subtotal: number; tax: number; total: number };
type Placed = { orderId: string; total: number; receiptUrl: string | null };

const cents = (amount: number) => formatPrice(amount / 100);

const TIMES = Array.from({ length: 18 }, (_, i) => {
  const minutes = 9 * 60 + i * 30;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const label = `${h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  return { value, label };
});

function earliestDate() {
  const date = new Date(Date.now() + CATERING.leadDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: CATERING.timeZone }).format(date);
}

function toggle(list: string[], value: string, max: number) {
  if (list.includes(value)) return list.filter((v) => v !== value);
  return list.length >= max ? list : [...list, value];
}

export function CrepeCateringPage({ restaurant }: { restaurant: RestaurantConfig }) {
  const [plates, setPlates] = useState(CATERING.minPlates);
  const [platesText, setPlatesText] = useState(String(CATERING.minPlates));
  const [crepes, setCrepes] = useState<string[]>([]);
  const [drinks, setDrinks] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("12:00");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [fulfillment, setFulfillment] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [address, setAddress] = useState({ street: "", unit: "", city: "", zip: "" });
  const [crepeFilter, setCrepeFilter] = useState<"Sweet" | "Savory">("Sweet");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [placed, setPlaced] = useState<(Placed & { when: string }) | null>(null);
  const [minDate, setMinDate] = useState("");

  useEffect(() => setMinDate(earliestDate()), []);

  const ready = crepes.length > 0 && drinks.length > 0;
  const estimate = plates * CATERING.platePrice;
  const { cardRef, cardReady, cardError } = useSquareCard(ready && !placed, "#ct-card");

  const selectionKey = JSON.stringify([plates, crepes, drinks]);
  useEffect(() => {
    if (!ready) {
      setQuote(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setQuoteError("");
      try {
        const res = await fetch("/api/square/catering", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "quote", plates, crepes, drinks }),
          signal: controller.signal,
        });
        const data = (await res.json()) as Quote & { error?: string };
        if (!res.ok) throw new Error(data.error || "Could not price your order.");
        setQuote(data);
      } catch (err) {
        if (!controller.signal.aborted) setQuoteError(err instanceof Error ? err.message : "Could not price your order.");
      }
    }, 350);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey, ready]);

  function setPlateCount(next: number) {
    const clamped = Math.min(Math.max(next, CATERING.minPlates), CATERING.maxPlates);
    setPlates(clamped);
    setPlatesText(String(clamped));
  }

  const shownCrepes = useMemo(() => cateringCrepes.filter((c) => c.kind === crepeFilter), [crepeFilter]);

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
      const res = await fetch("/api/square/catering", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plates,
          crepes,
          drinks,
          date,
          time,
          name,
          phone,
          email,
          notes,
          fulfillment,
          address: fulfillment === "DELIVERY" ? address : undefined,
          sourceId: result.token,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const data = (await res.json()) as Placed & { error?: string };
      if (!res.ok) {
        setPayError(data.error || "We couldn't place your catering order.");
        return;
      }
      const when = new Date(`${date}T${time}:00`).toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      setPlaced({ ...data, when });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setPayError("Something went wrong. Check your connection and try again.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="uma ct">
      <header className="uma-nav">
        <Link href="/" className="uma-nav__logo">
          Crepe Heaven
        </Link>
        <nav className="uma-nav__links" aria-label="Primary">
          <Link href="/">Home</Link>
          <Link href="/menu">Menu</Link>
          <Link href="/#visit">Visit</Link>
        </nav>
        <div className="uma-nav__end">
          <a className="uma-pill" href={restaurant.phoneHref}>
            Call {restaurant.phone}
          </a>
        </div>
      </header>

      <main>
        <section className="ct-hero">
          <div className="ct-hero__copy">
            <p className="uma-kicker">Catering</p>
            <h1>
              Crepes for a <em>crowd</em>
            </h1>
            <p>
              Birthdays, office lunches, showers and parties. Pick up to {CATERING.maxCrepes} crepes for your group,
              add drinks, and we&apos;ll deliver it to your event or have it ready for pickup.
            </p>
            <ul className="ct-facts">
              <li>
                <strong>{formatPrice(CATERING.platePrice)}</strong>
                <span>per plate</span>
              </li>
              <li>
                <strong>{CATERING.minPlates}+</strong>
                <span>plate minimum</span>
              </li>
              <li>
                <strong>Crepe + drink</strong>
                <span>in every plate</span>
              </li>
              <li>
                <strong>{CATERING.leadDays} days</strong>
                <span>notice needed</span>
              </li>
            </ul>
          </div>
          <div className="ct-hero__photo">
            <Image src="/grape/loved/nutella-strawberry-banana.jpg" alt="Nutella, strawberry and banana crepe" fill sizes="(max-width: 900px) 90vw, 460px" priority />
          </div>
        </section>

        {placed ? (
          <section className="ct-done">
            <p className="uma-kicker">You&apos;re booked</p>
            <h2>Thank you, {name.split(" ")[0]}!</h2>
            <p>
              Your catering order for <strong>{plates} plates</strong> is confirmed.{" "}
              {fulfillment === "DELIVERY" ? (
                <>
                  We&apos;ll deliver it <strong>{placed.when}</strong> to {address.street}
                  {address.unit && `, ${address.unit}`}, {address.city}.
                </>
              ) : (
                <>
                  Pickup is <strong>{placed.when}</strong> at {restaurant.address}.
                </>
              )}
            </p>
            <p className="ct-done__id">
              Order #{placed.orderId.slice(-6).toUpperCase()} · {cents(placed.total)} paid
            </p>
            {placed.receiptUrl && (
              <a href={placed.receiptUrl} target="_blank" rel="noopener noreferrer">
                View receipt ↗
              </a>
            )}
            <p className="ct-done__fine">Questions or changes? Call us at {restaurant.phone}.</p>
          </section>
        ) : (
          <form className="ct-build" onSubmit={pay}>
            <div className="ct-steps">
              <section className="ct-step">
                <header>
                  <span>1</span>
                  <div>
                    <h2>How many plates?</h2>
                    <p>Minimum {CATERING.minPlates}. One plate per guest is a good rule.</p>
                  </div>
                </header>
                <div className="ct-plates">
                  <button type="button" onClick={() => setPlateCount(plates - 5)} aria-label="5 fewer plates">
                    −5
                  </button>
                  <button type="button" onClick={() => setPlateCount(plates - 1)} aria-label="One fewer plate">
                    −1
                  </button>
                  <label>
                    <input
                      inputMode="numeric"
                      value={platesText}
                      onChange={(e) => {
                        const text = e.target.value.replace(/\D/g, "").slice(0, 3);
                        setPlatesText(text);
                        const n = Number(text);
                        if (n >= CATERING.minPlates && n <= CATERING.maxPlates) setPlates(n);
                      }}
                      onBlur={() => setPlateCount(Number(platesText) || CATERING.minPlates)}
                      aria-label="Number of plates"
                    />
                    <span>plates</span>
                  </label>
                  <button type="button" onClick={() => setPlateCount(plates + 1)} aria-label="One more plate">
                    +1
                  </button>
                  <button type="button" onClick={() => setPlateCount(plates + 5)} aria-label="5 more plates">
                    +5
                  </button>
                </div>
                <p className="ct-step__sum">
                  {plates} × {formatPrice(CATERING.platePrice)} = <strong>{formatPrice(estimate)}</strong>
                </p>
              </section>

              <section className="ct-step">
                <header>
                  <span>2</span>
                  <div>
                    <h2>Choose your crepes</h2>
                    <p>
                      Pick up to {CATERING.maxCrepes}. Your guests choose from these.{" "}
                      <b>
                        {crepes.length}/{CATERING.maxCrepes} picked
                      </b>
                    </p>
                  </div>
                </header>
                <div className="ct-tabs" role="tablist" aria-label="Crepe type">
                  {(["Sweet", "Savory"] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      role="tab"
                      aria-selected={crepeFilter === kind}
                      className={crepeFilter === kind ? "is-active" : undefined}
                      onClick={() => setCrepeFilter(kind)}
                    >
                      {kind}
                    </button>
                  ))}
                </div>
                <ul className="ct-chips">
                  {shownCrepes.map((crepe) => {
                    const on = crepes.includes(crepe.name);
                    const full = !on && crepes.length >= CATERING.maxCrepes;
                    return (
                      <li key={crepe.name}>
                        <button
                          type="button"
                          className={on ? "is-on" : undefined}
                          disabled={full}
                          aria-pressed={on}
                          onClick={() => setCrepes((list) => toggle(list, crepe.name, CATERING.maxCrepes))}
                        >
                          {crepe.photo ? (
                            <span className="ct-chip__img">
                              <Image src={crepe.photo} alt="" fill sizes="44px" />
                            </span>
                          ) : (
                            <span className="ct-chip__dot" aria-hidden="true" />
                          )}
                          {crepe.name}
                          {on && <i aria-hidden="true">✓</i>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="ct-step">
                <header>
                  <span>3</span>
                  <div>
                    <h2>Choose the drinks</h2>
                    <p>
                      Each plate comes with a drink. Pick up to {CATERING.maxDrinks} options.{" "}
                      <b>
                        {drinks.length}/{CATERING.maxDrinks} picked
                      </b>
                    </p>
                  </div>
                </header>
                <ul className="ct-chips ct-chips--text">
                  {cateringDrinks.map((drink) => {
                    const on = drinks.includes(drink);
                    const full = !on && drinks.length >= CATERING.maxDrinks;
                    return (
                      <li key={drink}>
                        <button
                          type="button"
                          className={on ? "is-on" : undefined}
                          disabled={full}
                          aria-pressed={on}
                          onClick={() => setDrinks((list) => toggle(list, drink, CATERING.maxDrinks))}
                        >
                          {drink}
                          {on && <i aria-hidden="true">✓</i>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="ct-step">
                <header>
                  <span>4</span>
                  <div>
                    <h2>Delivery or pickup</h2>
                    <p>
                      {fulfillment === "DELIVERY"
                        ? "We bring it to your event."
                        : `Pick up at ${restaurant.address}.`}{" "}
                      At least {CATERING.leadDays} days&apos; notice, please.
                    </p>
                  </div>
                </header>
                <div className="ct-tabs" role="tablist" aria-label="Delivery or pickup">
                  {(
                    [
                      ["DELIVERY", "Delivery"],
                      ["PICKUP", "Pickup"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={fulfillment === value}
                      className={fulfillment === value ? "is-active" : undefined}
                      onClick={() => setFulfillment(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="ct-fields">
                  {fulfillment === "DELIVERY" && (
                    <>
                      <label className="ct-fields__wide">
                        <span>Event address</span>
                        <input
                          required
                          autoComplete="address-line1"
                          placeholder="Street address"
                          value={address.street}
                          onChange={(e) => setAddress({ ...address, street: e.target.value })}
                        />
                      </label>
                      <label className="ct-fields__wide">
                        <span>Apt, suite, building (optional)</span>
                        <input
                          autoComplete="address-line2"
                          value={address.unit}
                          onChange={(e) => setAddress({ ...address, unit: e.target.value })}
                        />
                      </label>
                      <label>
                        <span>City</span>
                        <input
                          required
                          autoComplete="address-level2"
                          value={address.city}
                          onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        />
                      </label>
                      <label>
                        <span>ZIP</span>
                        <input
                          required
                          inputMode="numeric"
                          pattern="\d{5}"
                          maxLength={5}
                          autoComplete="postal-code"
                          value={address.zip}
                          onChange={(e) => setAddress({ ...address, zip: e.target.value.replace(/\D/g, "") })}
                        />
                      </label>
                    </>
                  )}
                  <label>
                    <span>Date</span>
                    <input required type="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} />
                  </label>
                  <label>
                    <span>Time</span>
                    <select value={time} onChange={(e) => setTime(e.target.value)}>
                      {TIMES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Name</span>
                    <input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                  </label>
                  <label>
                    <span>Phone</span>
                    <input required type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </label>
                  <label className="ct-fields__wide">
                    <span>Email (for updates)</span>
                    <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </label>
                  <label className="ct-fields__wide">
                    <span>Notes (allergies, gate codes, event details)</span>
                    <textarea rows={3} maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </label>
                </div>
              </section>
            </div>

            <aside className="ct-summary">
              <div className="ct-summary__card">
                <p className="uma-kicker">Your catering order</p>
                <h2>
                  {plates} plates <small>× {formatPrice(CATERING.platePrice)}</small>
                </h2>
                <dl>
                  <div>
                    <dt>Crepes</dt>
                    <dd>{crepes.length ? crepes.join(", ") : "Pick up to 5"}</dd>
                  </div>
                  <div>
                    <dt>Drinks</dt>
                    <dd>{drinks.length ? drinks.join(", ") : "Pick up to 5"}</dd>
                  </div>
                  <div>
                    <dt>{fulfillment === "DELIVERY" ? "Delivery" : "Pickup"}</dt>
                    <dd>
                      {fulfillment === "DELIVERY"
                        ? [address.street, address.city].filter(Boolean).join(", ") || "Add the event address"
                        : restaurant.address}
                    </dd>
                  </div>
                </dl>
                <dl className="mn-totals">
                  <div>
                    <dt>Subtotal</dt>
                    <dd>{quote ? cents(quote.subtotal) : formatPrice(estimate)}</dd>
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

                {ready ? (
                  <>
                    {SQUARE_SANDBOX && (
                      <p className="mn-test">
                        Test mode. Card <strong>4111 1111 1111 1111</strong>, any future date, any CVV, ZIP{" "}
                        <strong>12345</strong>.
                      </p>
                    )}
                    <div id="ct-card" className="mn-cardform" />
                    {!cardReady && !cardError && <p className="mn-hint">Loading secure card form…</p>}
                    {(payError || cardError) && <p className="mn-error">{payError || cardError}</p>}
                    <button type="submit" className="mn-pay" disabled={!cardReady || !quote || paying}>
                      {paying ? "Booking…" : quote ? `Pay ${cents(quote.total)} & book` : "Pay & book"}
                    </button>
                  </>
                ) : (
                  <p className="ct-summary__hint">Choose at least one crepe and one drink to check out.</p>
                )}
                <p className="mn-hint">Paid in full when you book. Need changes? Call {restaurant.phone}.</p>
              </div>
            </aside>
          </form>
        )}
      </main>

      <footer className="mn-foot">
        <strong>Crepe Heaven</strong>
        <span>
          {restaurant.address}, {restaurant.city}
        </span>
        <a href={restaurant.phoneHref}>{restaurant.phone}</a>
      </footer>

      <CrepeChat restaurant={restaurant} />
    </div>
  );
}
