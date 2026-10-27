"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { MenuItem, RestaurantConfig } from "@/lib/types";
import { formatPrice } from "@/lib/recommend";
import { WavyEdge } from "@/components/WavyEdge";
import { keyForDish, useCrepeCart } from "@/components/CrepeCart";

function crepeImage(item: MenuItem) {
  const n = item.name.toLowerCase();
  if (
    n.includes("nutella") ||
    n.includes("berry") ||
    n.includes("strawberry") ||
    n.includes("lechera") ||
    n.includes("honey") ||
    n.includes("belgium") ||
    n.includes("banana")
  ) {
    return "/grape/crepe-coffee.png";
  }
  if (n.includes("sandwich") || n.includes("panini")) {
    return "/grape/sandwich.png";
  }
  if (n.includes("açaí") || n.includes("acai") || n.includes("coffee") || n.includes("latte")) {
    return "/grape/coffee-cup.png";
  }
  return "/grape/savory-crepe.png";
}

type QuizOption = {
  id: string;
  label: string;
  tags: string[];
  tone: "cream" | "blush" | "gold" | "ink" | "mint" | "sky";
};

type QuizQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
};

const STEP_META = [
  {
    id: "mood",
    label: "Mood",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 20s-7-4.4-7-9.2A3.9 3.9 0 0 1 12 8.1a3.9 3.9 0 0 1 7 2.7C19 15.6 12 20 12 20Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "yesterday",
    label: "Yesterday",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 8.2V12l2.6 1.7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: "weather",
    label: "Weather",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 5v1.4M12 17.6V19M5 12h1.4M17.6 12H19M7.05 7.05l1 1M15.95 15.95l1 1M7.05 16.95l1-1M15.95 8.05l1-1"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "stomach",
    label: "Craving",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7.2 5.5v5.2c0 1.5.9 2.4 2.2 2.4h.2V18.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M16.8 5.5c0 3.2-1.6 4.6-1.6 7.4v5.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M14.4 5.5v6.2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "drama",
    label: "Finale",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 4.2 13.7 9h4.8l-3.9 3 1.5 4.8L12 14.2 7.9 16.8 9.4 12l-3.9-3h4.8L12 4.2Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
] as const;

const QUESTIONS: QuizQuestion[] = [
  {
    id: "mood",
    prompt: "What energy are you bringing to the table today?",
    options: [
      {
        id: "soft",
        label: "Chaotic soft — I need sugar and a hug",
        tags: ["sweet", "indulgent", "comfort"],
        tone: "blush",
      },
      {
        id: "main",
        label: "Main character brunch energy",
        tags: ["indulgent", "popular", "sweet"],
        tone: "gold",
      },
      {
        id: "gremlin",
        label: "Sleepy gremlin who barely woke up",
        tags: ["comfort", "savory", "classic"],
        tone: "cream",
      },
      {
        id: "demon",
        label: "Productivity demon — feed me fast",
        tags: ["savory", "hearty", "classic"],
        tone: "ink",
      },
    ],
  },
  {
    id: "yesterday",
    prompt: "Be honest — what did yesterday’s meals look like?",
    options: [
      {
        id: "savory-day",
        label: "All savory, all day, no dessert remorse",
        tags: ["savory", "hearty"],
        tone: "mint",
      },
      {
        id: "sweet-crimes",
        label: "Sweet crimes — dessert was the lifestyle",
        tags: ["sweet", "indulgent"],
        tone: "blush",
      },
      {
        id: "salad",
        label: "Salad and regret — now I want chaos",
        tags: ["indulgent", "sweet", "popular"],
        tone: "gold",
      },
      {
        id: "forget",
        label: "I genuinely forgot what I ate",
        tags: ["classic", "popular", "comfort"],
        tone: "sky",
      },
    ],
  },
  {
    id: "weather",
    prompt: "What’s the weather inside your head right now?",
    options: [
      {
        id: "sunny",
        label: "Sunny and slightly unhinged",
        tags: ["sweet", "popular", "indulgent"],
        tone: "gold",
      },
      {
        id: "foggy",
        label: "Foggy — need a warm savory hug",
        tags: ["savory", "comfort", "classic"],
        tone: "cream",
      },
      {
        id: "stormy",
        label: "Stormy — make it dramatic and berry",
        tags: ["indulgent", "sweet", "sharing"],
        tone: "blush",
      },
      {
        id: "crisp",
        label: "Crisp and clean — keep it bright",
        tags: ["light", "fresh", "savory"],
        tone: "mint",
      },
    ],
  },
  {
    id: "stomach",
    prompt: "If your stomach could text you right now…",
    options: [
      {
        id: "chocolate",
        label: "Need chocolate ASAP — don’t negotiate",
        tags: ["sweet", "indulgent", "chocolate"],
        tone: "ink",
      },
      {
        id: "cheese",
        label: "Need melted cheese like, immediately",
        tags: ["savory", "comfort", "cheese"],
        tone: "gold",
      },
      {
        id: "fresh",
        label: "Need something bright and fresh",
        tags: ["light", "fresh", "savory"],
        tone: "mint",
      },
      {
        id: "therapy",
        label: "Need therapy and also a crepe",
        tags: ["comfort", "classic", "popular"],
        tone: "sky",
      },
    ],
  },
  {
    id: "drama",
    prompt: "How theatrical should this crepe be?",
    options: [
      {
        id: "lowkey",
        label: "Lowkey cute — quiet excellence only",
        tags: ["classic", "light", "comfort"],
        tone: "cream",
      },
      {
        id: "medium",
        label: "Slightly unhinged — a little extra please",
        tags: ["indulgent", "popular", "sweet"],
        tone: "blush",
      },
      {
        id: "broadway",
        label: "Full Broadway — berries and standing ovation",
        tags: ["indulgent", "sharing", "sweet"],
        tone: "gold",
      },
      {
        id: "savory-show",
        label: "Savory showstopper — main-event energy",
        tags: ["savory", "hearty", "popular"],
        tone: "ink",
      },
    ],
  },
];

const LOADING_LINES = [
  "Consulting the crepe council…",
  "Whisking your answers into batter…",
  "Asking yesterday’s leftovers for forgiveness…",
  "Folding fate into a warm crepe…",
  "Almost there — don’t panic-order yet…",
];

const ARCHETYPES: Record<
  string,
  { title: string; subtitle: string; vibe: string }
> = {
  sweet: {
    title: "The Berry Daydreamer",
    subtitle: "Soft chaos. Maximum sugar diplomacy.",
    vibe: "sweet · indulgent",
  },
  savory: {
    title: "The Savory Strategist",
    subtitle: "Cheese first. Feelings second.",
    vibe: "savory · hearty",
  },
  comfort: {
    title: "The Soft Landing",
    subtitle: "You need a warm fold and zero judgment.",
    vibe: "comfort classic",
  },
  indulgent: {
    title: "The Extra Credit",
    subtitle: "You came to win brunch, not participate.",
    vibe: "main character",
  },
  light: {
    title: "The Fresh Fold",
    subtitle: "Bright, clean, still deliciously unserious.",
    vibe: "light · fresh",
  },
  classic: {
    title: "The Reliable Icon",
    subtitle: "Timeless picks. Zero regrets.",
    vibe: "house classic",
  },
};

function scoreCrepes(answers: QuizOption[], menu: MenuItem[]) {
  const tagCount: Record<string, number> = {};
  for (const a of answers) {
    for (const t of a.tags) tagCount[t] = (tagCount[t] ?? 0) + 1;
  }

  const ranked = menu
    .filter((m) => m.category === "crepe" || m.category === "bowl")
    .map((item) => {
      let score = 0;
      const name = item.name.toLowerCase();
      const diet = item.diet.join(" ");
      if (
        tagCount.sweet &&
        (name.includes("nutella") ||
          name.includes("berry") ||
          name.includes("honey") ||
          name.includes("lechera") ||
          name.includes("belgium"))
      )
        score += 4 * (tagCount.sweet ?? 0);
      if (
        tagCount.chocolate &&
        (name.includes("nutella") || name.includes("belgium") || name.includes("chocolate"))
      )
        score += 5;
      if (
        tagCount.savory &&
        (name.includes("cheese") ||
          name.includes("chicken") ||
          name.includes("turkey") ||
          name.includes("ham") ||
          name.includes("avocado"))
      )
        score += 4 * (tagCount.savory ?? 0);
      if (tagCount.cheese && name.includes("cheese")) score += 3;
      if (
        tagCount.hearty &&
        (name.includes("chicken") || name.includes("special") || name.includes("turkey"))
      )
        score += 4;
      if (
        tagCount.light &&
        (name.includes("avocado") ||
          name.includes("spinach") ||
          name.includes("honey") ||
          name.includes("açaí") ||
          name.includes("acai"))
      )
        score += 3;
      if (
        tagCount.fresh &&
        (name.includes("avocado") || name.includes("tomato") || name.includes("berry"))
      )
        score += 2;
      if (tagCount.comfort && item.moods.includes("comfort")) score += 3;
      if (tagCount.indulgent && item.moods.includes("indulgent")) score += 3;
      if (tagCount.classic && item.moods.includes("classic")) score += 2;
      if (tagCount.popular && item.popular) score += 3;
      if (tagCount.sharing && item.shareable) score += 2;
      if (tagCount.savory && diet.includes("meat")) score += 1;
      if (tagCount.sweet && diet.includes("vegetarian")) score += 1;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score);

  return {
    tagCount,
    top: ranked.slice(0, 3).map((r) => r.item),
  };
}

function dominantArchetype(tagCount: Record<string, number>) {
  const keys = ["sweet", "savory", "indulgent", "comfort", "light", "classic"] as const;
  let best: (typeof keys)[number] = "classic";
  let max = -1;
  for (const k of keys) {
    const v = tagCount[k] ?? 0;
    if (v > max) {
      max = v;
      best = k;
    }
  }
  return ARCHETYPES[best];
}

export function CrepeMoodQuiz({ restaurant }: { restaurant: RestaurantConfig }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizOption[]>([]);
  const [phase, setPhase] = useState<"quiz" | "loading" | "result">("quiz");
  const [loadLine, setLoadLine] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [enterKey, setEnterKey] = useState(0);
  const { change, setOpen } = useCrepeCart();

  const total = QUESTIONS.length;
  const question = QUESTIONS[step];
  const progress = phase === "result" ? 100 : Math.round((step / total) * 100);

  const result = useMemo(() => {
    if (answers.length < total) return null;
    return scoreCrepes(answers, restaurant.menuItems);
  }, [answers, restaurant.menuItems, total]);

  const archetype = result ? dominantArchetype(result.tagCount) : null;

  useEffect(() => {
    if (phase !== "loading") return;
    setLoadLine(0);
    const lineTimer = window.setInterval(() => {
      setLoadLine((i) => (i + 1) % LOADING_LINES.length);
    }, 700);
    const done = window.setTimeout(() => setPhase("result"), 3200);
    return () => {
      window.clearInterval(lineTimer);
      window.clearTimeout(done);
    };
  }, [phase]);

  function choose(option: QuizOption) {
    setPicked(option.id);
    window.setTimeout(() => {
      const nextAnswers = [...answers.slice(0, step), option];
      setAnswers(nextAnswers);
      setPicked(null);
      if (step + 1 >= total) {
        setPhase("loading");
      } else {
        setStep(step + 1);
        setEnterKey((k) => k + 1);
      }
    }, 280);
  }

  function reset() {
    setStep(0);
    setAnswers([]);
    setPhase("quiz");
    setPicked(null);
    setEnterKey((k) => k + 1);
  }

  function goBack() {
    if (step === 0 || phase !== "quiz") return;
    setAnswers((a) => a.slice(0, -1));
    setStep((s) => s - 1);
    setEnterKey((k) => k + 1);
  }

  return (
    <section
      className={`cq${phase === "result" ? " cq--result" : ""}${phase === "loading" ? " cq--loading" : ""}`}
      id="quiz"
    >
      <WavyEdge color="#e23b2c" position="top" />

      <div className="cq__shell">
        <div className="cq__intro" aria-hidden={phase === "result" || phase === "loading"}>
          <p className="cq__kicker">The crepe compass</p>
          <h2>
            Find what crepe
            <br />
            <em>fits you today.</em>
          </h2>
        </div>

        {phase !== "result" ? (
          <div className="cq__card" aria-live="polite">
            <div className="cq__progress" aria-hidden="true">
              <div className="cq__progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <div className="cq__meta">
              {phase === "quiz" ? (
                <ol className="cq__steps" aria-label={`Step ${step + 1} of ${total}`}>
                  {STEP_META.map((item, i) => {
                    const done = i < step;
                    const current = i === step;
                    return (
                      <li
                        key={item.id}
                        className={`cq__step${done ? " is-done" : ""}${current ? " is-current" : ""}`}
                        aria-current={current ? "step" : undefined}
                        title={item.label}
                      >
                        <span className="cq__step-icon">{item.icon}</span>
                        <span className="sr-only">
                          {item.label}
                          {done ? ", completed" : current ? ", current" : ""}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <span>Reading the batter…</span>
              )}
              {phase === "quiz" && step > 0 && (
                <button type="button" className="cq__back" onClick={goBack}>
                  ← Back
                </button>
              )}
            </div>

            {phase === "quiz" && question && (
              <div className="cq__panel" key={`${question.id}-${enterKey}`}>
                <h3 className="cq__prompt">{question.prompt}</h3>
                <div className="cq__options">
                  {question.options.map((opt, i) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`cq__option cq__option--${opt.tone}${picked === opt.id ? " is-picked" : ""}`}
                      style={{ animationDelay: `${i * 60}ms` }}
                      onClick={() => choose(opt)}
                    >
                      <span className="cq__option-copy">
                        <strong>{opt.label}</strong>
                      </span>
                      <span className="cq__option-arrow" aria-hidden="true">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M4 2.5 8 6l-4 3.5"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {phase === "loading" && (
              <div className="cq__loading">
                <div className="cq__spinner" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
                <p className="cq__loading-line">{LOADING_LINES[loadLine]}</p>
              </div>
            )}
          </div>
        ) : (
          result &&
          archetype && (
            <div className="cq__result" aria-live="polite">
              <p className="cq__result-kicker">Personality unlocked</p>
              <h3 className="cq__result-title">{archetype.title}</h3>
              <p className="cq__result-sub">{archetype.subtitle}</p>
              <span className="cq__vibe">{archetype.vibe}</span>

              <div className="cq__podium">
                {result.top[1] && (
                  <article className="cq__side cq__side--left">
                    <span className="cq__side-label">Also try</span>
                    <div className="cq__side-media">
                      <Image
                        src={crepeImage(result.top[1])}
                        alt={result.top[1].name}
                        fill
                        sizes="160px"
                      />
                    </div>
                    <h4>{result.top[1].name}</h4>
                    <strong>{formatPrice(result.top[1].price)}</strong>
                  </article>
                )}

                {result.top[0] && (
                  <article className="cq__hero-match">
                    <div className="cq__glow" aria-hidden="true" />
                    <span className="cq__hero-badge">Your #1 fold</span>
                    <div className="cq__hero-media">
                      <Image
                        src={crepeImage(result.top[0])}
                        alt={result.top[0].name}
                        fill
                        sizes="280px"
                        priority
                      />
                    </div>
                    <h4>{result.top[0].name}</h4>
                    <p>{result.top[0].description}</p>
                    <strong className="cq__hero-price">{formatPrice(result.top[0].price)}</strong>
                  </article>
                )}

                {result.top[2] && (
                  <article className="cq__side cq__side--right">
                    <span className="cq__side-label">Also try</span>
                    <div className="cq__side-media">
                      <Image
                        src={crepeImage(result.top[2])}
                        alt={result.top[2].name}
                        fill
                        sizes="160px"
                      />
                    </div>
                    <h4>{result.top[2].name}</h4>
                    <strong>{formatPrice(result.top[2].price)}</strong>
                  </article>
                )}
              </div>

              <div className="cq__actions">
                {result.top[0] && keyForDish(result.top[0].name) ? (
                  <button
                    type="button"
                    className="cq__order"
                    onClick={() => {
                      change(keyForDish(result.top[0].name)!, 1);
                      setOpen(true);
                    }}
                  >
                    Add to my order
                  </button>
                ) : (
                  <a className="cq__order" href="/menu">
                    Order this online
                  </a>
                )}
                <button type="button" className="cq__again-btn" onClick={reset}>
                  Try Again
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}
