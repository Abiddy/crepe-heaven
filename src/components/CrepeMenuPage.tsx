"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { menuKey, useCrepeCart } from "@/components/CrepeCart";
import { CrepeChat } from "@/components/CrepeChat";
import { SQUARE_SANDBOX, Stepper } from "@/components/CrepeCheckout";
import { formatPrice } from "@/lib/recommend";
import type { MenuSection } from "@/lib/restaurants/crepe-heaven-menu";
import type { RestaurantConfig } from "@/lib/types";

export function CrepeMenuPage({
  restaurant,
  sections,
}: {
  restaurant: RestaurantConfig;
  sections: MenuSection[];
}) {
  const { cart, count, estimate, change, setOpen } = useCrepeCart();
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-180px 0px -55% 0px" },
    );
    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    const bar = tabsRef.current;
    const tab = bar?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (bar && tab) bar.scrollTo({ left: tab.offsetLeft - bar.clientWidth / 2 + tab.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  return (
    <div className="uma mn">
      <header className="uma-nav">
        <Link href="/" className="uma-nav__logo">
          Crepe Heaven
        </Link>
        <nav className="uma-nav__links" aria-label="Primary">
          <Link href="/">Home</Link>
          <Link href="/#moods">Mood menu</Link>
          <Link href="/catering">Catering</Link>
          <Link href="/#visit">Visit</Link>
        </nav>
        <div className="uma-nav__end">
          <button type="button" className="mn-bag" onClick={() => setOpen(true)} aria-label={`Your order, ${count} items`}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 8h12l-1 12H7L6 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            <span>Your order</span>
            {count > 0 && (
              <b key={count} className="mn-bag__count">
                {count}
              </b>
            )}
          </button>
        </div>
      </header>

      <main>
        <section className="mn-hero">
          <p className="uma-kicker">Order for pickup</p>
          <h1>
            Explore <em>our</em> menu
          </h1>
          <p>
            Sweet and savory crepes, sandwiches, waffles, açaí, and coffee, folded and poured fresh every day in
            Lawndale. Tap <span className="mn-hero__plus">+</span> to add anything to your order.
          </p>
          <ul className="mn-facts">
            <li>
              <strong>~20 min</strong>
              <span>Ready for pickup</span>
            </li>
            <li>
              <strong>{restaurant.address}</strong>
              <span>{restaurant.city}</span>
            </li>
            <li>
              <strong>Pay online</strong>
              <span>Secure checkout by Square</span>
            </li>
          </ul>
          {SQUARE_SANDBOX && <p className="mn-test mn-test--hero">Test mode: orders here aren&apos;t real yet.</p>}
        </section>

        <nav className="mn-tabs" aria-label="Menu sections">
          <div className="mn-tabs__inner" ref={tabsRef}>
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                data-tab={section.id}
                className={active === section.id ? "is-active" : undefined}
              >
                {section.title}
              </a>
            ))}
          </div>
        </nav>

        {sections.map((section) => {
          const photos = section.items.filter((item) => item.photo);
          const rest = section.items.filter((item) => !item.photo);
          const split = photos.length < 3;
          return (
            <section
              key={section.id}
              id={section.id}
              className={`mn-section${split ? " mn-section--split" : ""}`}
            >
              <header className="mn-section__head">
                <h2>{section.title}</h2>
                <p>{section.blurb}</p>
              </header>
              <div className="mn-section__body">
                {photos.length > 0 && (
                  <ul className="mn-cards">
                    {photos.map((item) => {
                      const k = menuKey(section.title, item.name);
                      const qty = cart[k] ?? 0;
                      return (
                        <li key={item.name} className={`mn-card${qty ? " is-in" : ""}`}>
                          <button
                            type="button"
                            className="mn-card__img"
                            onClick={() => change(k, 1)}
                            aria-label={`Add ${item.name}`}
                          >
                            <Image
                              src={item.photo!}
                              alt=""
                              fill
                              sizes={split ? "(max-width: 760px) 90vw, 420px" : "(max-width: 760px) 45vw, 280px"}
                            />
                          </button>
                          <div className="mn-card__act">
                            <Stepper qty={qty} label={item.name} onChange={(d) => change(k, d)} />
                          </div>
                          <div className="mn-card__meta">
                            <h3>{item.name}</h3>
                            <span>{formatPrice(item.price)}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {rest.length > 0 && (
                  <ul className="mn-list">
                    {rest.map((item) => {
                      const k = menuKey(section.title, item.name);
                      const qty = cart[k] ?? 0;
                      return (
                        <li key={item.name} className={qty ? "is-in" : undefined}>
                          <span>{item.name}</span>
                          <i aria-hidden="true" />
                          <strong>{formatPrice(item.price)}</strong>
                          <Stepper qty={qty} label={item.name} onChange={(d) => change(k, d)} small />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {section.note && <p className="mn-note">{section.note}</p>}
            </section>
          );
        })}

        <section className="mn-cta">
          <p className="uma-kicker">Pickup in Lawndale</p>
          <h2>Hungry yet?</h2>
          <p>
            Pay online and pick it up warm at {restaurant.address}, {restaurant.city}. Questions? Call{" "}
            <a href={restaurant.phoneHref}>{restaurant.phone}</a>.
          </p>
          <div className="mn-cta__actions">
            {count > 0 ? (
              <button type="button" className="uma-pill uma-pill--lg" onClick={() => setOpen(true)}>
                Review your order · {formatPrice(estimate)}
              </button>
            ) : (
              <a className="uma-pill uma-pill--lg" href={`#${sections[0]?.id}`}>
                Start your order
              </a>
            )}
            <Link className="uma-text-btn" href="/">
              Back to home
            </Link>
          </div>
          <p className="mn-cta__fine">Prices may change. Tax is added at checkout.</p>
        </section>
      </main>

      <footer className="mn-foot">
        <strong>Crepe Heaven</strong>
        <span>
          {restaurant.address}, {restaurant.city}
        </span>
        <a href={restaurant.phoneHref}>{restaurant.phone}</a>
        <span>{restaurant.hours.map((h) => `${h.days} ${h.time}`).join(" · ")}</span>
      </footer>

      <CrepeChat restaurant={restaurant} />
    </div>
  );
}
