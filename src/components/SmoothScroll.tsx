"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    root.style.scrollBehavior = "auto";

    const lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 1,
      prevent: (node) => Boolean(node.closest?.(".chc-panel, .chc-rail, .uma-drawer")),
      virtualScroll: ({ deltaX, deltaY, event }) => {
        const inCarousel = (event.target as Element | null)?.closest?.(".uma-spec__track");
        return !(inCarousel && Math.abs(deltaX) > Math.abs(deltaY));
      },
    });

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const link = (e.target as Element | null)?.closest?.('a[href^="#"]');
      const hash = link?.getAttribute("href");
      if (!hash || hash === "#") return;
      const target = hash === "#top" ? 0 : document.getElementById(hash.slice(1));
      if (target === null) return;
      e.preventDefault();
      lenis.scrollTo(target);
      history.replaceState(null, "", hash);
    }
    document.addEventListener("click", onClick);

    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });

    return () => {
      document.removeEventListener("click", onClick);
      cancelAnimationFrame(frame);
      lenis.destroy();
      root.style.scrollBehavior = "";
    };
  }, []);

  return null;
}
