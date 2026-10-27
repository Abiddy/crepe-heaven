"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { formatPrice } from "@/lib/recommend";
import { crepeHeavenMenu } from "@/lib/restaurants/crepe-heaven-menu";
import { keyForDish, useCrepeCart } from "@/components/CrepeCart";
import { Stepper } from "@/components/CrepeCheckout";
import { WavyEdge } from "@/components/WavyEdge";

const DISHES = [
  {
    name: "Nutella, Strawberry & Banana",
    description: "Nutella, banana and strawberries with whipped cream and a chocolate drizzle.",
    image: "/grape/loved/nutella-strawberry-banana.jpg",
    bg: "#feeda7",
  },
  {
    name: "Cheese, Ham & Egg",
    description: "A buckwheat crepe with ham, egg and melted cheese, with a fresh side salad.",
    image: "/grape/loved/ham-egg.jpg",
    bg: "#cee4b3",
  },
  {
    name: "Apple Delight",
    description: "Fresh apple, cinnamon and powdered sugar with a swirl of whipped cream.",
    image: "/grape/loved/apple-delight.jpg",
    bg: "#f2dfc6",
  },
  {
    name: "Waffle",
    description: "Golden waffle with strawberries, whipped cream and a chocolate drizzle.",
    image: "/grape/loved/waffle.jpg",
    bg: "#fdcfb6",
  },
  {
    name: "Açaí Bowl",
    description: "Chilled açaí topped with berries, granola, coconut and almonds.",
    image: "/grape/loved/acai.jpg",
    bg: "#d1b7e9",
  },
  {
    name: "Nutella & Raspberry",
    description: "Warm Nutella and fresh raspberries with whipped cream and powdered sugar.",
    image: "/grape/loved/nutella-raspberry.jpg",
    bg: "#f9c3c3",
  },
].map((dish) => ({
  ...dish,
  price: crepeHeavenMenu.flatMap((s) => s.items).find((item) => item.name === dish.name)?.price,
  key: keyForDish(dish.name),
}));

const COUNT = DISHES.length;
const SLIDES = [...DISHES, ...DISHES, ...DISHES];

export function CrepeLovedCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(COUNT);
  const { cart, change } = useCrepeCart();

  function scrollToIndex(index: number, behavior: ScrollBehavior = "smooth") {
    const track = trackRef.current;
    const slide = track?.children[index] as HTMLElement | undefined;
    if (!track || !slide) return;
    track.scrollTo({ left: slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2, behavior });
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    scrollToIndex(COUNT, "instant");

    let frame = 0;
    let settle = 0;
    const indexNow = () => {
      const slide = track.children[0] as HTMLElement;
      const center = track.scrollLeft + track.clientWidth / 2;
      return Math.round((center - slide.offsetLeft - slide.offsetWidth / 2) / slide.offsetWidth);
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setActive(indexNow()));
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        const i = indexNow();
        if (i < COUNT || i >= COUNT * 2) {
          const next = COUNT + (((i % COUNT) + COUNT) % COUNT);
          scrollToIndex(next, "instant");
          setActive(next);
        }
      }, 140);
    };
    const onResize = () => scrollToIndex(indexNow(), "instant");

    track.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      track.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const current = ((active % COUNT) + COUNT) % COUNT;

  return (
    <section className="uma-spec" id="loved" aria-roledescription="carousel" aria-label="Our most loved dishes">
      <WavyEdge color="#a5a887" position="top" flip className="uma-wave--drip" />
      <h2 className="uma-spec__label">Our most loved dishes</h2>

      <div className="uma-spec__stage">
        <div className="uma-spec__track" ref={trackRef}>
          {SLIDES.map((dish, i) => {
            const isCopy = i < COUNT || i >= COUNT * 2;
            return (
              <article
                key={`${dish.name}-${i}`}
                className={`uma-spec__panel${i === active ? " is-active" : ""}`}
                style={{ "--bg": dish.bg } as CSSProperties}
                aria-hidden={isCopy || undefined}
                onClick={() => i !== active && scrollToIndex(i)}
              >
                <h3>{dish.name}</h3>
                <div className="uma-spec__img">
                  <Image src={dish.image} alt={isCopy ? "" : dish.name} fill sizes="(max-width: 760px) 80vw, 40vw" />
                </div>
                <div className="uma-spec__info">
                  <p>{dish.description}</p>
                  <div className="uma-spec__buy" onClick={(e) => e.stopPropagation()}>
                    {dish.price !== undefined && <span className="uma-spec__price">{formatPrice(dish.price)}</span>}
                    {dish.key &&
                      (cart[dish.key] ? (
                        <Stepper qty={cart[dish.key]} label={dish.name} onChange={(d) => change(dish.key!, d)} />
                      ) : (
                        <button
                          type="button"
                          className="uma-spec__add"
                          tabIndex={i === active ? undefined : -1}
                          onClick={() => change(dish.key!, 1)}
                        >
                          Add to order
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M12 5v14M5 12h14" />
                          </svg>
                        </button>
                      ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <button
          type="button"
          className="uma-spec__arrow uma-spec__arrow--prev"
          aria-label="Previous dish"
          onClick={() => scrollToIndex(active - 1)}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          className="uma-spec__arrow uma-spec__arrow--next"
          aria-label="Next dish"
          onClick={() => scrollToIndex(active + 1)}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="uma-spec__controls">
          <div className="uma-spec__dots" role="tablist" aria-label="Choose a dish">
            {DISHES.map((dish, i) => (
              <button
                key={dish.name}
                type="button"
                role="tab"
                aria-selected={i === current}
                aria-label={dish.name}
                className={i === current ? "is-active" : ""}
                onClick={() => scrollToIndex(COUNT + i)}
              />
            ))}
          </div>
          <Link className="uma-pill" href="/menu">
            See full menu
          </Link>
        </div>
      </div>
    </section>
  );
}
