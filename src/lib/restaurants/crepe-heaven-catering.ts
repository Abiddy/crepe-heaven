import { crepeHeavenMenu } from "@/lib/restaurants/crepe-heaven-menu";

export const CATERING = {
  minPlates: 25,
  maxPlates: 500,
  platePrice: 22,
  maxCrepes: 5,
  maxDrinks: 5,
  leadDays: 2,
  timeZone: "America/Los_Angeles",
};

const section = (id: string) => crepeHeavenMenu.find((s) => s.id === id)?.items ?? [];

export const cateringCrepes = [
  ...section("sweet").map((item) => ({ name: item.name, photo: item.photo, kind: "Sweet" as const })),
  ...section("savory").map((item) => ({ name: item.name, photo: item.photo, kind: "Savory" as const })),
];

const DRINK_EXCLUDE = new Set(["Açaí Bowl", "Water", "Steamed or Cold Milk", "Espresso Affogato"]);

export const cateringDrinks = [...section("coffee"), ...section("bowls")]
  .map((item) => item.name)
  .filter((name) => !DRINK_EXCLUDE.has(name));
