"use client";

import Image from "next/image";
import { useState } from "react";
import { keyForDish, useCrepeCart } from "@/components/CrepeCart";
import { formatPrice } from "@/lib/recommend";
import { crepeHeavenMenu, type MenuEntry } from "@/lib/restaurants/crepe-heaven-menu";
import { WavyEdge } from "@/components/WavyEdge";

type FaceId = "happy" | "sad" | "excited" | "confused" | "sleepy" | "stressed";

type Pick = { name: string; badges: string[]; why: string };

const MENU = new Map<string, MenuEntry>(
  crepeHeavenMenu.flatMap((section) => section.items.filter((item) => item.photo).map((item) => [item.name, item])),
);

type Mood = {
  id: FaceId;
  label: string;
  title: string;
  picks: Pick[];
};

const MOODS: Mood[] = [
  {
    id: "happy",
    label: "Happy",
    title: "Keep the good vibes going",
    picks: [
      { name: "Berry Delight", badges: ["Strawberry", "Blueberry", "Blackberry"], why: "Bright berries, bright day" },
      { name: "Mini Pancakes", badges: ["Bite-size", "Chocolate drizzle"], why: "Made for sharing smiles" },
      { name: "Fresh Orange Juice", badges: ["Fresh-squeezed", "Citrus"], why: "Sunshine in a glass" },
    ],
  },
  {
    id: "sad",
    label: "Sad",
    title: "A warm hug on a plate",
    picks: [
      { name: "Nutella & Strawberry", badges: ["Nutella", "Berries"], why: "Cocoa lifts your mood" },
      { name: "Banana Bread", badges: ["Warm", "Homemade"], why: "Tastes like home" },
      { name: "Latte", badges: ["Espresso", "Steamed milk"], why: "Warm cup, slower day" },
    ],
  },
  {
    id: "excited",
    label: "Excited",
    title: "Go big — you earned it",
    picks: [
      { name: "Waffle", badges: ["Strawberry", "Whipped cream", "Chocolate"], why: "Go all out" },
      { name: "Nutella, Banana, Blueberry & Blackberry", badges: ["Nutella", "Banana", "Berries"], why: "A loaded celebration" },
      { name: "Shakerato", badges: ["Iced espresso", "Shaken"], why: "A little buzz to match" },
    ],
  },
  {
    id: "confused",
    label: "Confused",
    title: "Can't decide? Start with favorites",
    picks: [
      { name: "Nutella, Strawberry & Banana", badges: ["Nutella", "Strawberry", "Banana"], why: "The crowd favorite" },
      { name: "Cheese, Ham & Egg", badges: ["Cheese", "Ham", "Egg"], why: "Savory and can't miss" },
      { name: "Croissant", badges: ["Buttery", "Flaky"], why: "Simple and classic" },
    ],
  },
  {
    id: "sleepy",
    label: "Sleepy",
    title: "Wake up gently",
    picks: [
      { name: "Nutella & Espresso", badges: ["Nutella", "Espresso"], why: "Dessert with a wake-up shot" },
      { name: "Fried Egg Sandwich", badges: ["Egg", "Spinach", "Tomato"], why: "Protein to power up" },
      { name: "Espresso", badges: ["Bold", "Single shot"], why: "Caffeine does the rest" },
    ],
  },
  {
    id: "stressed",
    label: "Stressed",
    title: "Something light to reset",
    picks: [
      { name: "Açaí Bowl", badges: ["Açaí", "Berries", "Granola"], why: "Cool, fresh, calming" },
      { name: "Berry Smoothie", badges: ["Mixed berries", "Blended"], why: "Sip and slow down" },
      { name: "Apple Delight", badges: ["Apple", "Cinnamon"], why: "A gentle, cozy reset" },
    ],
  },
];

const INK = "#5a3410";

function Face({ id }: { id: FaceId }) {
  return (
    <svg viewBox="0 0 64 64" className="mp-face" aria-hidden="true">
      <defs>
        <radialGradient id={`mp-g-${id}`} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#ffe879" />
          <stop offset="60%" stopColor="#ffcc33" />
          <stop offset="100%" stopColor="#f5a623" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill={`url(#mp-g-${id})`} />
      <ellipse cx="24" cy="15" rx="9" ry="4.5" fill="#fff" opacity="0.35" />
      {id === "happy" && (
        <>
          <path d="M20 27q4-5 8 0M36 27q4-5 8 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M19 36q13 14 26 0Z" fill={INK} />
          <path d="M25 42q7 4 14 0" stroke="#ff7a7a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <circle cx="16" cy="36" r="4" fill="#ff8a7a" opacity="0.45" />
          <circle cx="48" cy="36" r="4" fill="#ff8a7a" opacity="0.45" />
        </>
      )}
      {id === "sad" && (
        <>
          <path d="M19 24l7 3M45 24l-7 3" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="24" cy="31" r="3.2" fill={INK} />
          <circle cx="40" cy="31" r="3.2" fill={INK} />
          <path d="M23 47q9-8 18 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M42 35q3 5 0 8q-3-3 0-8Z" fill="#5ab4ff" />
        </>
      )}
      {id === "excited" && (
        <>
          <path d="m24 21 2 4.3 4.7.6-3.4 3.2.9 4.6L24 31.5l-4.2 2.2.9-4.6-3.4-3.2 4.7-.6Z" fill="#ff5a3c" />
          <path d="m40 21 2 4.3 4.7.6-3.4 3.2.9 4.6L40 31.5l-4.2 2.2.9-4.6-3.4-3.2 4.7-.6Z" fill="#ff5a3c" />
          <path d="M20 38h24q-2 12-12 12t-12-12Z" fill={INK} />
          <path d="M22 38h20v3H22Z" fill="#fff" />
        </>
      )}
      {id === "confused" && (
        <>
          <path d="M18 22q5-4 10-1M37 25h9" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <circle cx="24" cy="30" r="3.4" fill={INK} />
          <circle cx="41" cy="31" r="2.6" fill={INK} />
          <path d="M22 44q4-4 8 0t8 0 6-1" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}
      {id === "sleepy" && (
        <>
          <path d="M19 30q5 4 10 0M35 30q5 4 10 0" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="32" cy="44" rx="4" ry="5" fill={INK} />
          <path d="M46 10h7l-7 8h7" stroke="#6b7cff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {id === "stressed" && (
        <>
          <path d="M18 23l8 4M46 23l-8 4" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="24" cy="31" r="3" fill={INK} />
          <circle cx="40" cy="31" r="3" fill={INK} />
          <rect x="20" y="40" width="24" height="9" rx="3" fill="#fff" stroke={INK} strokeWidth="2.4" />
          <path d="M26 40v9M32 40v9M38 40v9" stroke={INK} strokeWidth="1.6" />
          <path d="M50 16q4 6 0 9q-4-3 0-9Z" fill="#5ab4ff" />
        </>
      )}
    </svg>
  );
}

export function CrepeMoodPicker() {
  const [active, setActive] = useState<FaceId | null>(null);
  const mood = MOODS.find((m) => m.id === active) ?? null;
  const { change, setOpen } = useCrepeCart();

  return (
    <section className="mp" id="moods" aria-labelledby="mp-title">
      <WavyEdge color="#f4efe6" position="top" />
      <p className="uma-kicker">Mood menu</p>
      <h2 id="mp-title">
        How are you <em>feeling?</em>
      </h2>

      <div className="mp-faces" role="tablist" aria-label="Pick your mood">
        {MOODS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={active === m.id}
            aria-controls="mp-panel"
            className={`mp-face-btn${active === m.id ? " is-active" : ""}`}
            onClick={() => setActive(m.id)}
          >
            <Face id={m.id} />
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      <div id="mp-panel" className="mp-panel" role="tabpanel" aria-live="polite">
        {mood ? (
          <div key={mood.id} className="mp-result">
            <h3>{mood.title}</h3>
            <ul className="mp-picks">
              {mood.picks.map((pick, i) => {
                const item = MENU.get(pick.name);
                if (!item?.photo) return null;
                return (
                  <li key={pick.name} className="mp-pick" style={{ animationDelay: `${i * 70}ms` }}>
                    <div className="mp-pick__img">
                      <Image src={item.photo} alt={item.name} fill sizes="112px" />
                    </div>
                    <div className="mp-pick__body">
                      <div className="mp-pick__head">
                        <strong>{item.name}</strong>
                        <span className="mp-pick__price">{formatPrice(item.price)}</span>
                      </div>
                      <div className="mp-badges">
                        {pick.badges.map((b) => (
                          <span key={b}>{b}</span>
                        ))}
                      </div>
                      <p>{pick.why}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              className="mp-order"
              onClick={() => {
                for (const pick of mood.picks) {
                  const key = keyForDish(pick.name);
                  if (key) change(key, 1);
                }
                setOpen(true);
              }}
            >
              Add these to my order
            </button>
          </div>
        ) : (
          <p className="mp-hint">Tap a face to see what to order.</p>
        )}
      </div>
    </section>
  );
}
