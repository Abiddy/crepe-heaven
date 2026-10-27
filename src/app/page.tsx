import { Rubik, Space_Mono } from "next/font/google";
import { GrapePastelPage } from "@/components/GrapePastelPage";
import { SmoothScroll } from "@/components/SmoothScroll";
import { crepeHeaven } from "@/lib/restaurants/crepe-heaven";
import "./grape.css";
import "./chat.css";

const rubik = Rubik({
  variable: "--font-uma-display",
  subsets: ["latin"],
  weight: ["800", "900"],
});

const spaceMono = Space_Mono({
  variable: "--font-uma-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export default function HomePage() {
  return (
    <div className={`${rubik.variable} ${spaceMono.variable}`}>
      <SmoothScroll />
      <GrapePastelPage restaurant={crepeHeaven} />
    </div>
  );
}
