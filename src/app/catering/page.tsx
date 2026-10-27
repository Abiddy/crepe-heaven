import { CrepeCateringPage } from "@/components/CrepeCateringPage";
import { SmoothScroll } from "@/components/SmoothScroll";
import { crepeHeaven } from "@/lib/restaurants/crepe-heaven";
import "../grape.css";
import "../chat.css";
import "../menu/menu.css";
import "./catering.css";

export const metadata = {
  title: "Catering — Crepe Heaven",
  description:
    "Crepe Heaven catering in Lawndale: $22 per plate, 25 plate minimum. Choose up to 5 crepes plus drinks and book online for pickup.",
};

export default function CateringRoute() {
  return (
    <>
      <SmoothScroll />
      <CrepeCateringPage restaurant={crepeHeaven} />
    </>
  );
}
