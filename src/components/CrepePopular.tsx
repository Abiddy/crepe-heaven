"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { menuKey, useCrepeCart } from "@/components/CrepeCart";
import { Stepper } from "@/components/CrepeCheckout";
import { WavyEdge } from "@/components/WavyEdge";
import { formatPrice } from "@/lib/recommend";
import { crepeHeavenMenu } from "@/lib/restaurants/crepe-heaven-menu";

const PICKS: { section: string; name: string; tag: string }[] = [
  { section: "sweet", name: "Nutella & Strawberry", tag: "Sweet" },
  { section: "sweet", name: "Berry Delight", tag: "Sweet" },
  { section: "sweet", name: "Nutella & Espresso", tag: "Sweet" },
  { section: "sweet", name: "Strawberry, Lemon & Sugar", tag: "Sweet" },
  { section: "savory", name: "Cheese, Ham & Egg", tag: "Savory" },
  { section: "sandwiches", name: "Fried Egg Sandwich", tag: "Savory" },
  { section: "bakery", name: "Mini Pancakes", tag: "Bakery" },
  { section: "bakery", name: "Croissant", tag: "Bakery" },
  { section: "bakery", name: "Cannelé", tag: "Bakery" },
  { section: "bowls", name: "Berry Smoothie", tag: "Drinks" },
  { section: "bowls", name: "Fresh Orange Juice", tag: "Drinks" },
  { section: "coffee", name: "Latte", tag: "Drinks" },
  { section: "ice-cream", name: "Ice Cream Sandwich", tag: "Sweet" },
];

const DISHES = PICKS.flatMap((pick) => {
  const section = crepeHeavenMenu.find((s) => s.id === pick.section);
  const item = section?.items.find((i) => i.name === pick.name);
  return section && item?.photo
    ? [{ ...item, photo: item.photo, tag: pick.tag, key: menuKey(section.title, item.name) }]
    : [];
});

const FILTERS = ["All", "Sweet", "Savory", "Bakery", "Drinks"];

export function CrepePopular() {
  const { cart, change } = useCrepeCart();
  const [filter, setFilter] = useState("All");
  const shown = filter === "All" ? DISHES : DISHES.filter((d) => d.tag === filter);

  return (
    <section className="uma-pop" id="popular" aria-labelledby="pop-title">
      <WavyEdge color="#fbf3e4" position="top" />
      <div className="uma-pop__head">
        <div>
          <p className="uma-kicker">Popular right now</p>
          <h2 id="pop-title">
            Add a few <em>more</em>
          </h2>
        </div>
        <div className="uma-pop__filters" role="tablist" aria-label="Filter dishes">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              className={filter === f ? "is-active" : undefined}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <ul className="uma-pop__grid">
        {shown.map((dish) => {
          const qty = cart[dish.key] ?? 0;
          return (
            <li key={dish.key} className={qty ? "is-in" : undefined}>
              <button
                type="button"
                className="uma-pop__img"
                onClick={() => change(dish.key, 1)}
                aria-label={`Add ${dish.name}`}
              >
                <Image src={dish.photo} alt="" fill sizes="(max-width: 760px) 45vw, 260px" />
              </button>
              <div className="uma-pop__act">
                <Stepper qty={qty} label={dish.name} onChange={(d) => change(dish.key, d)} />
              </div>
              <div className="uma-pop__meta">
                <h3>{dish.name}</h3>
                <span>{formatPrice(dish.price)}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="uma-pop__more">
        <Link className="uma-pill uma-pill--outline" href="/menu">
          See the full menu
        </Link>
      </div>
    </section>
  );
}
