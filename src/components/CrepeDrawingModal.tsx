"use client";

import { FormEvent, useEffect, useState } from "react";
import { REVIEW_DRAWING } from "@/lib/restaurants/crepe-heaven-drawing";

const STEPS = ["Enter below", "Review us on Google", `Winner drawn ${REVIEW_DRAWING.drawDate}`];

export function CrepeDrawingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [googleName, setGoogleName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [entered, setEntered] = useState<null | { alreadyEntered: boolean }>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/square/drawing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleName, phone, email, website }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; alreadyEntered?: boolean };
      if (!res.ok) throw new Error(data.error || "We couldn't save your entry. Please try again.");
      setEntered({ alreadyEntered: Boolean(data.alreadyEntered) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save your entry. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="dw" role="dialog" aria-modal="true" aria-labelledby="dw-title">
      <button type="button" className="dw__scrim" aria-label="Close" onClick={onClose} />
      <div className="dw__panel" data-lenis-prevent>
        <button type="button" className="dw__close" aria-label="Close" onClick={onClose}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {entered ? (
          <div className="dw__done">
            <span className="dw__check" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <h2 id="dw-title">{entered.alreadyEntered ? "You're already in!" : "You're entered!"}</h2>
            <p>
              Last step: post your review on Google as <strong>{googleName.trim()}</strong> so we can match it to your
              entry. We&apos;ll text the winner on {REVIEW_DRAWING.drawDate}.
            </p>
            <a className="dw__btn" href={REVIEW_DRAWING.googleReviewUrl} target="_blank" rel="noopener noreferrer">
              Write your Google review
            </a>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="dw__form">
            <p className="dw__kicker">Review drawing</p>
            <h2 id="dw-title">
              Win <em>{REVIEW_DRAWING.prize}</em>
            </h2>
            <ol className="dw__steps">
              {STEPS.map((step, i) => (
                <li key={step}>
                  <span>{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>

            <label className="dw__field">
              <span>Your name as it shows on Google</span>
              <input
                type="text"
                value={googleName}
                onChange={(e) => setGoogleName(e.target.value)}
                autoComplete="name"
                placeholder="e.g. Maria G."
                maxLength={60}
                required
              />
            </label>
            <label className="dw__field">
              <span>Phone number</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                inputMode="tel"
                placeholder="(310) 555-0123"
                required
              />
            </label>
            <label className="dw__field">
              <span>
                Email <em>optional</em>
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@email.com"
              />
            </label>
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="dw__hp"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />

            {error && <p className="dw__error">{error}</p>}

            <button type="submit" className="dw__btn" disabled={sending}>
              {sending ? "Saving…" : "Enter & continue to Google"}
            </button>
            <p className="dw__fine">
              No purchase necessary. One entry per person. Any honest review counts, good or bad.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
