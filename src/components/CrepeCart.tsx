"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { CrepeCheckout, type CartLines } from "@/components/CrepeCheckout";
import { formatPrice } from "@/lib/recommend";
import { crepeHeaven } from "@/lib/restaurants/crepe-heaven";
import { crepeHeavenMenu } from "@/lib/restaurants/crepe-heaven-menu";

const STORAGE_KEY = "ch-cart";

export const menuKey = (sectionTitle: string, name: string) => `${sectionTitle}|${name}`;

const PRICES = new Map<string, number>();
for (const section of crepeHeavenMenu)
  for (const item of section.items) PRICES.set(menuKey(section.title, item.name), item.price);

export function keyForDish(name: string) {
  const section = crepeHeavenMenu.find((s) => s.items.some((item) => item.name === name));
  return section ? menuKey(section.title, name) : undefined;
}

type CartContext = {
  cart: Record<string, number>;
  lines: CartLines;
  count: number;
  estimate: number;
  change: (key: string, delta: number) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const Ctx = createContext<CartContext | null>(null);

export function useCrepeCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCrepeCart must be used inside CrepeCartProvider");
  return ctx;
}

export function CrepeCartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, unknown>;
      const valid: Record<string, number> = {};
      for (const [k, qty] of Object.entries(saved)) {
        if (PRICES.has(k) && Number.isInteger(qty) && (qty as number) > 0) valid[k] = Math.min(qty as number, 20);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCart(valid);
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart, loaded]);

  const value = useMemo<CartContext>(() => {
    const lines: CartLines = Object.entries(cart).filter(([, qty]) => qty > 0);
    return {
      cart,
      lines,
      count: lines.reduce((n, [, qty]) => n + qty, 0),
      estimate: lines.reduce((sum, [k, qty]) => sum + (PRICES.get(k) ?? 0) * qty, 0),
      change: (k, delta) =>
        setCart((prev) => {
          const next = { ...prev, [k]: Math.min(Math.max((prev[k] ?? 0) + delta, 0), 20) };
          if (next[k] === 0) delete next[k];
          return next;
        }),
      open,
      setOpen,
    };
  }, [cart, open]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <CrepeCheckout
        open={open}
        onClose={() => setOpen(false)}
        lines={value.lines}
        prices={PRICES}
        change={value.change}
        onPlaced={() => setCart({})}
        pickupNote={`Pickup at ${crepeHeaven.address}, ready in about 20 minutes.`}
      />
      <CrepeCartButton />
    </Ctx.Provider>
  );
}

function CrepeCartButton() {
  const { count, estimate, open, setOpen } = useCrepeCart();
  if (open || count === 0) return null;
  return (
    <button type="button" className="ch-bar" onClick={() => setOpen(true)}>
      <b key={count}>{count}</b>
      <span>View your order</span>
      <strong>{formatPrice(estimate)}</strong>
    </button>
  );
}
