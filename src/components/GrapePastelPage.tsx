"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CrepeChat } from "@/components/CrepeChat";
import { CrepeDrawingModal } from "@/components/CrepeDrawingModal";
import { CrepeHeroPoster } from "@/components/CrepeHeroPoster";
import { CrepeLovedCarousel } from "@/components/CrepeLovedCarousel";
import { CrepeMoodPicker } from "@/components/CrepeMoodPicker";
import { CrepeMoodQuiz } from "@/components/CrepeMoodQuiz";
import { CrepePopular } from "@/components/CrepePopular";
import { WavyEdge } from "@/components/WavyEdge";
import type { RestaurantConfig } from "@/lib/types";
const PHOTO = {
  hero: "/grape/crepe-coffee.png",
  berry: "/grape/crepe-coffee.png",
  savory: "/grape/savory-crepe.png",
  room: "/grape/cafe-interior.png",
  cafe: "/grape/coffee-cup.png",
  plate: "/grape/crepe-plate.png",
  crepeCoffee: "/grape/crepe-coffee.png",
};

function FoodOrb({
  src,
  alt,
  size = 56,
}: {
  src: string;
  alt: string;
  size?: number;
}) {
  return (
    <span className="uma-orb" style={{ width: size, height: size }}>
      <Image src={src} alt={alt} fill sizes={`${size}px`} />
    </span>
  );
}

export function GrapePastelPage({ restaurant }: { restaurant: RestaurantConfig }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawingOpen, setDrawingOpen] = useState(false);
  const closeDrawing = useCallback(() => setDrawingOpen(false), []);

  useEffect(() => {
    if (window.location.hash !== "#win") return;
    const id = window.setTimeout(() => setDrawingOpen(true), 0);
    return () => window.clearTimeout(id);
  }, []);
  const tickerQuotes = [...restaurant.reviews, ...restaurant.reviews].map((r) => r.quote);

  return (
    <div className="uma">
      <header className={`uma-nav uma-nav--over${menuOpen ? " is-solid" : ""}`}>
        <a href="#top" className="uma-nav__logo">
          Crepe Heaven
        </a>
        <nav className="uma-nav__links" aria-label="Primary">
          <a href="#quiz">find your crepe</a>
          <Link href="/menu">Menu</Link>
          <a href="#loved">Dishes</a>
          <Link href="/catering">Catering</Link>
          <a href="#visit">Visit</a>
        </nav>
        <div className="uma-nav__end">
          <Link className="uma-pill uma-pill--outline uma-nav__order" href="/menu">
            Order online
          </Link>
          <button
            type="button"
            className="uma-nav__burger"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <i />
            <i />
          </button>
        </div>
      {menuOpen && (
        <div className="uma-drawer">
          <a href="#quiz" onClick={() => setMenuOpen(false)}>
            find your crepe
          </a>
          <Link href="/menu" onClick={() => setMenuOpen(false)}>
            Full menu
          </Link>
          <a href="#loved" onClick={() => setMenuOpen(false)}>
            Dishes
          </a>
          <Link href="/catering" onClick={() => setMenuOpen(false)}>
            Catering
          </Link>
          <Link href="/menu" onClick={() => setMenuOpen(false)}>
            Order Online
          </Link>
          <a href="#visit" onClick={() => setMenuOpen(false)}>
            Visit
          </a>
        </div>
      )}
      </header>

      <main>
        <CrepeHeroPoster restaurant={restaurant} onEnterDrawing={() => setDrawingOpen(true)} />

        <CrepeLovedCarousel />

        <CrepePopular />

        <CrepeMoodPicker />

        <CrepeMoodQuiz restaurant={restaurant} />

        <section className="uma-cater" id="catering">
          <WavyEdge color="#6e1f2b" position="top" />
          <div className="uma-cater__copy">
            <p className="uma-kicker">Catering</p>
            <h2>
              Crepes for <em>25 or more</em>
            </h2>
            <p>
              Every plate includes a crepe and a drink. Pick up to 5 crepes for your group, choose the drinks, and
              book your pickup online.
            </p>
            <ul className="uma-cater__facts">
              <li>
                <strong>$22</strong> per plate
              </li>
              <li>
                <strong>25</strong> plate minimum
              </li>
              <li>
                <strong>5</strong> crepe choices
              </li>
            </ul>
            <Link className="uma-pill uma-pill--lg" href="/catering">
              Build a catering order
            </Link>
          </div>
          <div className="uma-cater__photos" aria-hidden="true">
            <figure>
              <Image src="/grape/loved/ham-egg.jpg" alt="" fill sizes="(max-width: 760px) 45vw, 260px" />
            </figure>
            <figure>
              <Image src="/grape/loved/nutella-raspberry.jpg" alt="" fill sizes="(max-width: 760px) 45vw, 260px" />
            </figure>
            <figure>
              <Image src="/grape/loved/apple-delight.jpg" alt="" fill sizes="(max-width: 760px) 45vw, 260px" />
            </figure>
          </div>
        </section>

        <section className="uma-story" id="story">
          <WavyEdge color="#f4efe6" position="top" />
          <h2>
            Where{" "}
            <FoodOrb src={PHOTO.savory} alt="" size={72} /> Great Crepes
            <br />
            Bring People <FoodOrb src={PHOTO.berry} alt="" size={72} /> Together
          </h2>
          <p>
            {restaurant.story.paragraphs[0]}
          </p>
          <div className="uma-story__meta">
            <span>Daily service · {restaurant.hours[0].time}</span>
            <a className="uma-text-btn" href="#visit">
              About us
            </a>
          </div>
          <div className="uma-story__photos">
            <figure>
              <Image src={PHOTO.room} alt="Inside Crepe Heaven café" fill sizes="40vw" />
            </figure>
            <figure>
              <Image src={PHOTO.savory} alt="Savory crepe with salad" fill sizes="40vw" />
            </figure>
            <figure>
              <Image src={PHOTO.crepeCoffee} alt="Sweet crepe with berries and coffee" fill sizes="40vw" />
            </figure>
          </div>
        </section>

        <section className="uma-visit" id="visit">
          <WavyEdge color="#feeda7" position="top" />
          <div>
            <p className="uma-kicker">Find the table</p>
            <h2>Come fold one with us</h2>
            <p className="uma-visit__address">
              {restaurant.address}
              <br />
              {restaurant.city}
            </p>
            <ul className="uma-hours">
              {restaurant.hours.map((row) => (
                <li key={row.days}>
                  <span>{row.days}</span>
                  <span>{row.time}</span>
                </li>
              ))}
            </ul>
            <div className="uma-visit__actions">
              <a className="uma-pill" href={restaurant.phoneHref}>
                Call {restaurant.phone}
              </a>
              <a
                className="uma-text-btn"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Crepe Heaven Café, ${restaurant.address}, ${restaurant.city}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get directions
              </a>
            </div>
          </div>
          <div className="uma-visit__photo">
            <Image
              src="/grape/loved/nutella-strawberry-banana.jpg"
              alt="Nutella, strawberry and banana crepe"
              fill
              sizes="(max-width: 960px) 420px, 560px"
            />
          </div>
        </section>
      </main>

      <footer className="uma-footer">
        <WavyEdge color="#141210" position="top" />
        <div className="uma-footer__top">
          <strong>Crepe Heaven</strong>
          <p>{restaurant.tagline}</p>
        </div>
        <div className="uma-footer__grid">
          <div>
            <h4>Company</h4>
            <a href="#top">Home</a>
            <a href="#story">About us</a>
            <Link href="/menu">Menu</Link>
            <a href="#quiz">find your crepe</a>
          </div>
          <div>
            <h4>Opening time</h4>
            {restaurant.hours.map((row) => (
              <p key={row.days}>
                {row.days}: {row.time}
              </p>
            ))}
          </div>
          <div>
            <h4>Contact</h4>
            <a href={restaurant.phoneHref}>{restaurant.phone}</a>
            <a href={restaurant.emailHref}>{restaurant.email}</a>
          </div>
          <div>
            <h4>Social</h4>
            <a
              href="https://www.instagram.com/crepeheaven1/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram
            </a>
            <Link href="/menu">Order online</Link>
          </div>
        </div>
        <div className="uma-footer__bottom">
          <span>© {new Date().getFullYear()} Crepe Heaven Café</span>
          <a
            className="uma-footer__ig"
            href="https://www.instagram.com/crepeheaven1/"
            target="_blank"
            rel="noopener noreferrer"
          >
            @crepeheaven1
          </a>
          <span>{restaurant.city}</span>
        </div>
      </footer>

      <div className="uma-ticker" role="region" aria-label="Guest reviews">
        <div className="uma-ticker__track">
          {[0, 1].map((copy) => (
            <div key={copy} className="uma-ticker__group" aria-hidden={copy === 1 || undefined}>
              {tickerQuotes.map((quote, i) => (
                <span key={i} className="uma-ticker__item">
                  “{quote}”
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <CrepeChat restaurant={restaurant} />
      <CrepeDrawingModal open={drawingOpen} onClose={closeDrawing} />
    </div>
  );
}
