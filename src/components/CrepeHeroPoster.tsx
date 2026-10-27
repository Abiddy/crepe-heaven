import Image from "next/image";
import Link from "next/link";
import { REVIEW_DRAWING } from "@/lib/restaurants/crepe-heaven-drawing";
import type { RestaurantConfig } from "@/lib/types";

const INGREDIENTS = [
  ["Crepe batter", "90.0g"],
  ["Nutella", "45.0g"],
  ["Fresh strawberries", "60.0g"],
  ["Dark chocolate drizzle", "15.0g"],
  ["White chocolate drizzle", "15.0g"],
  ["Powdered sugar", "5.0g"],
] as const;

export function CrepeHeroPoster({
  restaurant,
  onEnterDrawing,
}: {
  restaurant: RestaurantConfig;
  onEnterDrawing: () => void;
}) {
  return (
    <section className="uma-hero uma-hero--poster" id="top">
      <div className="uma-poster__photo">
        <Image
          src="/grape/hero-crepe.jpg"
          alt="Nutella and strawberry crepe with chocolate drizzle"
          fill
          priority
          sizes="(max-width: 960px) 140vw, 80vw"
        />
      </div>

      <h1 className="uma-poster__title">
        <span className="uma-poster__line">There&apos;s a crepe</span>
        <span className="uma-poster__line">
          for every <a href="#moods">mood</a>
        </span>
      </h1>

      <div className="uma-receipt">
        <div className="uma-receipt__paper">
          <h2>Ingredients</h2>
          <p className="uma-receipt__meta">Crepe : Nutella &amp; Strawberry</p>
          <p className="uma-receipt__meta">Chef : Crepe Heaven</p>
          <ul>
            {INGREDIENTS.map(([name, weight]) => (
              <li key={name}>
                <span>{name}</span>
                <span>{weight}</span>
              </li>
            ))}
          </ul>
          <div className="uma-receipt__totals">
            <p>
              <span>Total weight</span>
              <span>230.0g</span>
            </p>
            <p>
              <span>Calories</span>
              <span>540kcal</span>
            </p>
          </div>
          <p className="uma-receipt__allergens">Allergens: dairy, gluten, nuts, egg.</p>
        </div>
      </div>

      <div className="uma-poster__side">
        <button
          type="button"
          className="uma-poster__promo"
          onClick={onEnterDrawing}
          aria-label={`Win ${REVIEW_DRAWING.prize}: leave a review to enter. Drawing on ${REVIEW_DRAWING.drawDate}.`}
        >
          <svg className="uma-poster__badge" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="58" />
            <defs>
              <path id="uma-badge-ring" d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1 -90 0" />
            </defs>
            <g className="uma-poster__badge-spin">
              <text className="uma-poster__badge-ring">
                <textPath href="#uma-badge-ring" textLength="276">
                  LEAVE A REVIEW • ENTER TO WIN •
                </textPath>
              </text>
            </g>
            <text className="uma-poster__badge-win" x="60" y="52">
              WIN
            </text>
            <text className="uma-poster__badge-prize" x="60" y="75">
              {REVIEW_DRAWING.prize}
            </text>
          </svg>
        </button>
      </div>

      <div className="uma-poster__cta">
        <Link href="/menu" className="uma-poster__btn">
          Full Menu
        </Link>
        <Link href="/catering" className="uma-poster__btn uma-poster__btn--ghost">
          Catering
        </Link>
      </div>

      <div className="uma-poster__social">
        <a
          href="https://www.instagram.com/crepeheaven1/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
          </svg>
        </a>
        <a href={restaurant.phoneHref} aria-label={`Call ${restaurant.phone}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
          </svg>
        </a>
      </div>
    </section>
  );
}
