import { CrepeMenuPage } from "@/components/CrepeMenuPage";
import { SmoothScroll } from "@/components/SmoothScroll";
import { crepeHeaven } from "@/lib/restaurants/crepe-heaven";
import { crepeHeavenMenu } from "@/lib/restaurants/crepe-heaven-menu";
import "../grape.css";
import "../chat.css";
import "./menu.css";

export const metadata = {
  title: "Menu — Crepe Heaven",
  description:
    "The full Crepe Heaven menu: sweet and savory crepes, sandwiches, waffles, açaí, smoothies, and coffee in Lawndale.",
};

export default function MenuRoute() {
  return (
    <>
      <SmoothScroll />
      <CrepeMenuPage restaurant={crepeHeaven} sections={crepeHeavenMenu} />
    </>
  );
}
