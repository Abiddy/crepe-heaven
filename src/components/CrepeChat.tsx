"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BudgetId, MoodId, RestaurantConfig } from "@/lib/types";
import { budgetOptions, moods, partyOptions } from "@/lib/types";
import { type OrderCombo, formatPrice, generateRecommendations } from "@/lib/recommend";

import { CATERING } from "@/lib/restaurants/crepe-heaven-catering";

type ComboStep = "mood" | "party" | "budget";

type Widget =
  | { kind: "starters" }
  | { kind: "catering" }
  | { kind: "choices"; step: ComboStep }
  | { kind: "combos"; combos: OrderCombo[] };

type Lead = {
  email: string;
  marketingOptIn: boolean;
  restaurant: string;
  source: string;
  capturedAt: string;
};

const LEAD_KEY = "ch-chat-lead";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function loadLead(): Lead | null {
  try {
    const raw = window.localStorage.getItem(LEAD_KEY);
    return raw ? (JSON.parse(raw) as Lead) : null;
  } catch {
    return null;
  }
}

function saveLead(lead: Lead) {
  try {
    window.localStorage.setItem(LEAD_KEY, JSON.stringify(lead));
  } catch {
    /* ignore */
  }
  fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      restaurant: lead.restaurant,
      email: lead.email,
      marketingOptIn: lead.marketingOptIn,
      source: lead.source,
    }),
  }).catch(() => undefined);
}

type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
  widget?: Widget;
  stream?: boolean;
};

type Intent =
  | "catering"
  | "combo"
  | "hours"
  | "location"
  | "diet"
  | "menu"
  | "greet"
  | "fallback";

function detectIntent(input: string): Intent {
  const s = input.toLowerCase();
  if (/cater|party|event|office|wedding|shower|birthday|platter|large order/.test(s)) return "catering";
  if (/combo|build|bundle|meal for|order for|budget|people|family/.test(s)) return "combo";
  if (/hour|open|close|when/.test(s)) return "hours";
  if (/where|address|location|parking|direction|find you/.test(s)) return "location";
  if (/vegan|vegetarian|veggie|meatless|gluten|allerg/.test(s)) return "diet";
  if (/menu|price|cost|how much|popular|best/.test(s)) return "menu";
  if (/\b(hi|hello|hey|yo|sup)\b/.test(s)) return "greet";
  return "fallback";
}

const STEP_PROMPT: Record<ComboStep, string> = {
  mood: "Let’s build your combo. What are you in the mood for?",
  party: "Nice. How many people are eating?",
  budget: "And what budget per person feels right?",
};

function Icon({ name }: { name: "chat" | "close" | "send" | "combo" | "catering" | "spark" | "clock" | "refresh" | "phone" | "mail" | "check" | "menu" }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "chat":
      return (
        <svg {...common}>
          <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.1A8 8 0 1 1 20 12Z" />
          <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" strokeWidth={2.6} />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case "send":
      return (
        <svg {...common} strokeWidth={2}>
          <path d="M12 19V5M6 11l6-6 6 6" />
        </svg>
      );
    case "combo":
      return (
        <svg {...common}>
          <rect x="3.5" y="4" width="7" height="7" rx="2" />
          <rect x="13.5" y="4" width="7" height="7" rx="2" />
          <rect x="3.5" y="13" width="7" height="7" rx="2" />
          <path d="M17 14v6M14 17h6" />
        </svg>
      );
    case "catering":
      return (
        <svg {...common}>
          <path d="M4 17h16M5 17a7 7 0 0 1 14 0M12 7V5M10 5h4" />
          <path d="M3 20h18" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7L4.5 10.9 10.1 9 12 3.5Z" />
        </svg>
      );
    case "menu":
      return (
        <svg {...common}>
          <rect x="5" y="3.5" width="14" height="17" rx="2" />
          <path d="M8.5 8.25h7M8.5 12h7M8.5 15.75h4.5" />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l2.5 2" />
        </svg>
      );
    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v4.5h-4.5" />
        </svg>
      );
    case "phone":
      return (
        <svg {...common}>
          <path d="M5 4h3l1.5 4-2 1.3a11 11 0 0 0 5.2 5.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z" />
        </svg>
      );
    case "mail":
      return (
        <svg {...common}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
          <path d="m4.5 7 7.5 6 7.5-6" />
        </svg>
      );
    case "check":
      return (
        <svg {...common} width={14} height={14} strokeWidth={2.4}>
          <path d="m5 12.5 4.2 4L19 7" />
        </svg>
      );
  }
}

function CrepeMark() {
  return (
    <svg className="chc-crepe" viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M7 39.5 21.4 8.6c.6-1.3 2.3-1.5 3.2-.4C33 18.3 39.6 27.4 41.8 37.6c.3 1.3-.7 2.4-2 2.4H8.4c-1.1 0-1.9-1.4-1.4-2.5Z"
        fill="#f6c46a"
        stroke="#c98a2e"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M22.8 9.5c-1.2 9-2.3 19.5-2.6 30"
        fill="none"
        stroke="#c98a2e"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M24 16.5c3 1.8 5 .2 7.2 2.2 1.8 1.6 3.8 1 5 2.6"
        fill="none"
        stroke="#6b3a1f"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="26.6" cy="29" r="1.6" fill="#3a2414" />
      <circle cx="33.4" cy="29" r="1.6" fill="#3a2414" />
      <path
        d="M28 32.6c1.1 1.1 3 1.1 4.1 0"
        fill="none"
        stroke="#3a2414"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="24.6" cy="32" r="1.5" fill="#f28b82" opacity="0.75" />
      <circle cx="35.4" cy="32" r="1.5" fill="#f28b82" opacity="0.75" />
      <path
        d="M30.5 6.8c2.6-.9 5.4.8 5.6 3.6.2 3-2.8 5.8-4.9 6.6-1.8-1.3-4-4.6-3.4-7.4.3-1.3 1.3-2.4 2.7-2.8Z"
        fill="#e23b2c"
      />
      <path
        d="M29.4 6.4c.9-1.8 2.9-2.4 4.4-1.6-.6 1.3-1.9 2.2-3.4 2.4"
        fill="#3fae5a"
      />
      <circle cx="31.4" cy="10.6" r="0.6" fill="#ffd9d4" />
      <circle cx="33.4" cy="12.4" r="0.6" fill="#ffd9d4" />
    </svg>
  );
}

function StreamText({
  text,
  animate,
  onProgress,
  onDone,
}: {
  text: string;
  animate: boolean;
  onProgress: () => void;
  onDone: () => void;
}) {
  const tokens = text.split(/(\s+)/);
  const [count, setCount] = useState(animate ? 0 : tokens.length);

  useEffect(() => {
    if (!animate) {
      onDone();
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 2;
      setCount(Math.min(i, tokens.length));
      onProgress();
      if (i >= tokens.length) {
        window.clearInterval(id);
        onDone();
      }
    }, 34);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{tokens.slice(0, count).join("")}</>;
}

function EmailCapture({ onSubmit }: { onSubmit: (email: string, marketingOptIn: boolean) => void }) {
  const [value, setValue] = useState("");
  const [optIn, setOptIn] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="chc-email"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const email = value.trim();
        if (!EMAIL_RE.test(email)) {
          setError("Enter a valid email address.");
          return;
        }
        setError("");
        onSubmit(email, optIn);
      }}
    >
      <p className="chc-email__title">Want this sent to you? Leave your email.</p>
      <div className={`chc-email__row${error ? " has-error" : ""}`}>
        <span className="chc-email__icon" aria-hidden="true">
          <Icon name="mail" />
        </span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-label="Email address"
          aria-invalid={Boolean(error)}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError("");
          }}
        />
        <button type="submit" disabled={!value.trim()}>
          Send
        </button>
      </div>
      {error && (
        <p className="chc-email__error" role="alert">
          {error}
        </p>
      )}
      <label className="chc-email__consent">
        <input
          type="checkbox"
          checked={optIn}
          onChange={(e) => setOptIn(e.target.checked)}
        />
        <span>Send me Crepe Heaven offers and news</span>
      </label>
      <p className="chc-email__fine">We only use this to follow up on your request. Unsubscribe anytime.</p>
    </form>
  );
}

export function CrepeChat({ restaurant }: { restaurant: RestaurantConfig }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [teaser, setTeaser] = useState(false);
  const [doneIds, setDoneIds] = useState<Set<number>>(() => new Set());
  const [lead, setLead] = useState<Lead | null>(null);
  const [savedOn, setSavedOn] = useState<number | null>(null);
  const leadSource = useRef("chat");

  const idRef = useRef(0);
  const timers = useRef<number[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const draft = useRef<{ mood?: MoodId; people?: number; budgetId?: BudgetId }>({});
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);

  useEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem("ch-chat-teaser") === "1";
    } catch {
      /* ignore */
    }
    if (seen) return;
    const t = window.setTimeout(() => setTeaser(true), 3500);
    return () => window.clearTimeout(t);
  }, []);

  const dismissTeaser = useCallback(() => {
    setTeaser(false);
    try {
      window.sessionStorage.setItem("ch-chat-teaser", "1");
    } catch {
      /* ignore */
    }
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const followStream = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, scrollToBottom]);

  useEffect(() => {
    if (!open) return;

    const mobile = window.matchMedia("(max-width: 560px)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const prevOverflow = document.body.style.overflow;
    if (mobile) document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      if (!coarse) inputRef.current?.focus();
    }, 260);

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  function openChat() {
    setLead((current) => current ?? loadLead());
    setOpen(true);
    dismissTeaser();
  }

  function close() {
    const hadFocus = panelRef.current?.contains(document.activeElement);
    setOpen(false);
    if (hadFocus) launcherRef.current?.focus();
  }

  function later(fn: () => void, ms: number) {
    const t = window.setTimeout(fn, ms);
    timers.current.push(t);
  }

  function pushUser(text: string) {
    const id = ++idRef.current;
    setMessages((m) => [...m, { id, role: "user", text }]);
  }

  function pushAssistant(text: string, widget?: Widget, delay = 650) {
    setTyping(true);
    later(() => {
      const id = ++idRef.current;
      setTyping(false);
      setMessages((m) => [
        ...m,
        { id, role: "assistant", text, widget, stream: !reducedMotion.current },
      ]);
    }, delay);
  }

  function proceed(intent: Intent, source: string) {
    leadSource.current = source;
    respond(intent);
  }

  function submitEmail(email: string, marketingOptIn: boolean, msgId: number) {
    const next: Lead = {
      email,
      marketingOptIn,
      restaurant: restaurant.slug,
      source: leadSource.current,
      capturedAt: new Date().toISOString(),
    };
    saveLead(next);
    setLead(next);
    setSavedOn(msgId);
  }

  function markDone(id: number) {
    setDoneIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function respond(intent: Intent) {
    switch (intent) {
      case "catering":
        pushAssistant(
          `Catering is ${formatPrice(CATERING.platePrice)} a plate with a ${CATERING.minPlates}-plate minimum. Every plate comes with a crepe and a drink, and you can pick up to ${CATERING.maxCrepes} crepes for your group. Order online at least ${CATERING.leadDays} days ahead and pick it up at the café.`,
          { kind: "catering" },
        );
        break;
      case "combo":
        draft.current = {};
        pushAssistant(STEP_PROMPT.mood, { kind: "choices", step: "mood" });
        break;
      case "hours":
        pushAssistant(
          `We’re open ${restaurant.hours.map((h) => `${h.days} ${h.time}`).join(", and ")}. You can order online for pickup right here on the site.`,
          { kind: "starters" },
        );
        break;
      case "location":
        pushAssistant(
          `You’ll find us at ${restaurant.address}, ${restaurant.city}. There’s lot parking right out front.`,
          { kind: "starters" },
        );
        break;
      case "diet": {
        const veg = restaurant.menuItems.filter((i) => i.diet.includes("vegetarian"));
        const names = veg
          .filter((i) => i.category === "crepe")
          .slice(0, 4)
          .map((i) => i.name.replace(" Crepe", ""));
        pushAssistant(
          `${veg.length} of our menu items are vegetarian — favorites include ${names.join(", ")}. The açaí bowl and house smoothie are fully vegan. For allergies, just let the café know when you order.`,
          { kind: "starters" },
        );
        break;
      }
      case "menu": {
        const prices = restaurant.menuItems.map((i) => i.price);
        const popular = restaurant.menuItems
          .filter((i) => i.popular)
          .slice(0, 3)
          .map((i) => i.name.replace(" Crepe", ""));
        pushAssistant(
          `Crepes run ${formatPrice(Math.min(...prices))}–${formatPrice(Math.max(...prices))}. Guests keep coming back for ${popular.join(", ")}. Want me to build a combo for your group?`,
          { kind: "starters" },
        );
        break;
      }
      case "greet":
        pushAssistant("Hey! I can build you a combo, walk you through catering, or answer anything about the café.", {
          kind: "starters",
        });
        break;
      default:
        pushAssistant(
          "I’m best at combos, catering, hours, and menu questions. Pick one below or ask me another way.",
          { kind: "starters" },
        );
    }
  }

  function send(text: string) {
    const clean = text.trim();
    if (!clean || typing) return;
    pushUser(clean);
    setInput("");
    proceed(detectIntent(clean), "typed");
  }

  function starter(action: "combo" | "catering" | "quiz" | "hours" | "menu") {
    if (action === "quiz") {
      close();
      window.setTimeout(() => {
        document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
      return;
    }
    const labels = {
      combo: "Build me a combo",
      catering: "Show catering options",
      hours: "When are you open?",
      menu: "Tell me about the menu",
    } as const;
    pushUser(labels[action]);
    proceed(action, action);
  }

  function choose(step: ComboStep, value: string, label: string) {
    pushUser(label);
    if (step === "mood") {
      draft.current.mood = value as MoodId;
      pushAssistant(STEP_PROMPT.party, { kind: "choices", step: "party" }, 450);
      return;
    }
    if (step === "party") {
      draft.current.people = Number(value);
      pushAssistant(STEP_PROMPT.budget, { kind: "choices", step: "budget" }, 450);
      return;
    }
    draft.current.budgetId = value as BudgetId;
    const { mood, people, budgetId } = draft.current;
    if (!mood || !people || !budgetId) return;
    const combos = generateRecommendations({
      mood,
      people,
      budgetId,
      menuItems: restaurant.menuItems,
    });
    if (!combos.length) {
      pushAssistant(
        "Nothing fit that range cleanly — try a slightly higher budget.",
        { kind: "choices", step: "budget" },
        900,
      );
      return;
    }
    pushAssistant(
      `Here ${combos.length === 1 ? "is a combo" : `are ${combos.length} combos`} for ${people === 1 ? "you" : `${people} people`}. Swipe to compare, then order the one you like.`,
      { kind: "combos", combos },
      1400,
    );
  }

  function resetChat() {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    draft.current = {};
    setSavedOn(null);
    setTyping(false);
    setMessages([]);
    setDoneIds(new Set());
    setInput("");
  }

  const lastId = messages[messages.length - 1]?.id;

  function renderWidget(msg: Message) {
    const w = msg.widget;
    if (!w) return null;
    const active = msg.id === lastId && !typing;

    if (w.kind === "starters") {
      return (
        <div className="chc-chips">
          <button type="button" className="chc-chip" disabled={!active} onClick={() => starter("combo")}>
            Build a combo
          </button>
          <button type="button" className="chc-chip" disabled={!active} onClick={() => starter("catering")}>
            Catering
          </button>
          <button type="button" className="chc-chip" disabled={!active} onClick={() => starter("menu")}>
            Menu info
          </button>
        </div>
      );
    }

    if (w.kind === "choices") {
      const opts =
        w.step === "mood"
          ? moods.map((m) => ({ value: m.id, label: m.label }))
          : w.step === "party"
            ? partyOptions.map((p) => ({ value: String(p.people), label: p.label }))
            : budgetOptions.map((b) => ({ value: b.id, label: b.label }));
      return (
        <div className="chc-chips">
          {opts.map((o) => (
            <button
              key={o.value}
              type="button"
              className="chc-chip"
              disabled={!active}
              onClick={() => choose(w.step, o.value, o.label)}
            >
              {o.label}
            </button>
          ))}
        </div>
      );
    }

    if (w.kind === "catering") {
      return (
        <>
          <article className="chc-card">
            <header className="chc-card__head">
              <h4>Crepe catering</h4>
              <span>{CATERING.minPlates}+ plates</span>
            </header>
            <p className="chc-card__price">
              <strong>{formatPrice(CATERING.platePrice)}</strong> / plate
            </p>
            <p className="chc-card__blurb">
              {CATERING.minPlates} plates is {formatPrice(CATERING.minPlates * CATERING.platePrice)} before tax.
            </p>
            <ul className="chc-card__list">
              {[
                "A crepe and a drink on every plate",
                `Choose up to ${CATERING.maxCrepes} sweet or savory crepes`,
                `Pickup at the café, booked ${CATERING.leadDays}+ days ahead`,
              ].map((line) => (
                <li key={line}>
                  <Icon name="check" />
                  {line}
                </li>
              ))}
            </ul>
            <a className="chc-card__cta chc-card__cta--solid" href="/catering">
              Build your catering order
            </a>
          </article>
          <div className="chc-actions">
            <a className="chc-btn" href={restaurant.phoneHref}>
              <Icon name="phone" />
              Questions? Call {restaurant.phone}
            </a>
          </div>
        </>
      );
    }

    if (w.kind === "combos") {
      return (
        <>
          <div className="chc-rail">
            {w.combos.map((combo, i) => (
              <article key={combo.id} className={`chc-card chc-combo${i === 0 ? " is-top" : ""}`}>
                <header className="chc-card__head">
                  <span className="chc-combo__badge">{i === 0 ? "Best match" : combo.title}</span>
                  <h4>{i === 0 ? combo.title : combo.subtitle}</h4>
                </header>
                <ul className="chc-combo__lines">
                  {combo.lines.map((line) => (
                    <li key={line.item.id}>
                      <span>
                        {line.qty > 1 && <em>{line.qty}×</em>}
                        {line.item.name}
                      </span>
                      <span>{formatPrice(line.lineTotal)}</span>
                    </li>
                  ))}
                </ul>
                <div className="chc-combo__total">
                  <div>
                    <strong>{formatPrice(combo.total)}</strong>
                    <span>{formatPrice(combo.perPerson)} / person</span>
                  </div>
                  <a
                    className="chc-card__cta chc-card__cta--solid"
                    href={restaurant.orderUrl}
                  >
                    Order
                  </a>
                </div>
              </article>
            ))}
          </div>
          {msg.id === lastId && !typing && (
            <div className="chc-chips">
              <button type="button" className="chc-chip" onClick={() => starter("combo")}>
                Build another
              </button>
              <button type="button" className="chc-chip" onClick={() => starter("catering")}>
                Catering for a group
              </button>
            </div>
          )}
        </>
      );
    }

    return null;
  }

  return (
    <div className={`chc${open ? " is-open" : ""}`}>
      <div
        ref={panelRef}
        className="chc-panel"
        role="dialog"
        aria-label={`${restaurant.name} assistant`}
        aria-hidden={!open}
        inert={!open}
      >
        <header className="chc-head">
          <div className="chc-head__id">
            <span className="chc-avatar" aria-hidden="true">
              <CrepeMark />
            </span>
            <strong>{restaurant.name}</strong>
          </div>
          <div className="chc-head__tools">
            {messages.length > 0 && (
              <button type="button" className="chc-icon-btn" onClick={resetChat} aria-label="New chat" title="New chat">
                <Icon name="refresh" />
              </button>
            )}
            <button type="button" className="chc-icon-btn" onClick={close} aria-label="Close chat">
              <Icon name="close" />
            </button>
          </div>
        </header>

        <div className="chc-body" ref={bodyRef}>
          {messages.length === 0 ? (
            <div className="chc-welcome">
              <span className="chc-logo" aria-hidden="true">
                <CrepeMark />
              </span>
              <p className="chc-welcome__hi">Hi there,</p>
              <h3>Welcome! How can I help?</h3>
              <p className="chc-welcome__sub">
                I&apos;m Crepe Heaven&apos;s personal assistant. Build a combo, plan catering, or ask
                me anything about the menu.
              </p>
              <div className="chc-pills">
                <button type="button" className="chc-pill" onClick={() => starter("combo")}>
                  <span className="chc-pill__icon chc-pill__icon--red">
                    <Icon name="combo" />
                  </span>
                  Build a combo
                </button>
                <button type="button" className="chc-pill" onClick={() => starter("catering")}>
                  <span className="chc-pill__icon chc-pill__icon--orange">
                    <Icon name="catering" />
                  </span>
                  Catering info
                </button>
                <button type="button" className="chc-pill" onClick={() => starter("menu")}>
                  <span className="chc-pill__icon chc-pill__icon--green">
                    <Icon name="menu" />
                  </span>
                  Menu info
                </button>
                <button type="button" className="chc-pill" onClick={() => starter("hours")}>
                  <span className="chc-pill__icon chc-pill__icon--blue">
                    <Icon name="clock" />
                  </span>
                  Hours & pickup
                </button>
              </div>
            </div>
          ) : (
            <div className="chc-thread" aria-live="polite">
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <div key={msg.id} className="chc-msg chc-msg--user">
                    <p>{msg.text}</p>
                  </div>
                ) : (
                  <div key={msg.id} className="chc-msg chc-msg--bot">
                    <span className="chc-avatar chc-avatar--sm" aria-hidden="true">
                      <CrepeMark />
                    </span>
                    <div className="chc-msg__content">
                      <p>
                        <StreamText
                          text={msg.text}
                          animate={Boolean(msg.stream)}
                          onProgress={followStream}
                          onDone={() => markDone(msg.id)}
                        />
                      </p>
                      {doneIds.has(msg.id) && msg.widget && <div className="chc-widget">{renderWidget(msg)}</div>}
                      {doneIds.has(msg.id) && !lead && msg.id === lastId && !typing && (
                        <EmailCapture onSubmit={(email, optIn) => submitEmail(email, optIn, msg.id)} />
                      )}
                      {lead && savedOn === msg.id && (
                        <p className="chc-email__saved" role="status">
                          Thanks! We&apos;ll follow up at {lead.email}.
                        </p>
                      )}
                    </div>
                  </div>
                ),
              )}
              {typing && (
                <div className="chc-msg chc-msg--bot">
                  <span className="chc-avatar chc-avatar--sm" aria-hidden="true">
                    <CrepeMark />
                  </span>
                  <div className="chc-typing" aria-label="Assistant is typing">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <form
          className="chc-composer"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <div className="chc-composer__box">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              placeholder="Ask about combos, catering, hours…"
              aria-label="Message"
              onChange={(e) => {
                setInput(e.target.value);
                const el = e.target;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
            <button
              type="submit"
              className="chc-send"
              disabled={!input.trim() || typing}
              aria-label="Send message"
            >
              <Icon name="send" />
            </button>
          </div>
        </form>
      </div>

      {teaser && !open && (
        <div className="chc-teaser" role="status">
          <button type="button" className="chc-teaser__body" onClick={openChat}>
            Planning a party? I can price out catering or build a combo.
          </button>
          <button type="button" className="chc-teaser__close" onClick={dismissTeaser} aria-label="Dismiss">
            <Icon name="close" />
          </button>
        </div>
      )}

      <button
        ref={launcherRef}
        type="button"
        className="chc-launcher"
        aria-label={open ? "Close chat" : "Open chat"}
        aria-expanded={open}
        onClick={() => (open ? close() : openChat())}
      >
        <span className="chc-launcher__pulse" aria-hidden="true" />
        <span className="chc-launcher__pulse chc-launcher__pulse--late" aria-hidden="true" />
        <span className="chc-launcher__icon">
          <Icon name="chat" />
        </span>
      </button>
    </div>
  );
}
