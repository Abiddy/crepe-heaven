export type MenuCategory =
  | "starter"
  | "salad"
  | "pizza"
  | "pasta"
  | "dinner"
  | "sandwich"
  | "side"
  | "dessert"
  | "drink"
  | "feast"
  | "bread"
  | "rice"
  | "tandoor"
  | "curry"
  | "crepe"
  | "bowl";

export type MoodId =
  | "comfort"
  | "light"
  | "indulgent"
  | "sharing"
  | "classic";

export type DietTag = "vegetarian" | "seafood" | "meat" | "vegan";

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  moods: MoodId[];
  diet: DietTag[];
  serves: number;
  shareable?: boolean;
  popular?: boolean;
};

export type RestaurantConfig = {
  slug: string;
  name: string;
  brandMark?: string;
  tagline: string;
  cuisineLabel: string;
  phone: string;
  phoneHref: string;
  email: string;
  emailHref: string;
  address: string;
  city: string;
  orderUrl: string;
  websiteUrl: string;
  hours: { days: string; time: string }[];
  story: {
    eyebrow: string;
    titleBefore: string;
    titleHighlight: string;
    paragraphs: string[];
    pullquote: string;
    cite: string;
  };
  images: {
    hero: string;
    story: string;
    feast: string;
    room: string;
    roomAlt: string;
    plating: string;
  };
  menuCategories: {
    title: string;
    description: string;
    image: string;
  }[];
  signatures: {
    badge: string;
    name: string;
    description: string;
    image: string;
  }[];
  reviews: { quote: string; name: string; source: string }[];
  marqueeWords: string[];
  stats: [string, string][];
  room: {
    eyebrow: string;
    titleBefore: string;
    titleHighlight: string;
    lede: string;
    captions: [string, string, string];
  };
  catering: {
    eyebrow: string;
    titleBefore: string;
    titleHighlight: string;
    lede: string;
  };
  dualCta: {
    dineTitle: string;
    dineBody: string;
    homeTitle: string;
    homeBody: string;
  };
  menuItems: MenuItem[];
};

export const moods: { id: MoodId; label: string; blurb: string }[] = [
  {
    id: "comfort",
    label: "Comfort craving",
    blurb: "Warm classics that hit like home.",
  },
  {
    id: "light",
    label: "Feeling light",
    blurb: "Fresher plates, salads, and lighter picks.",
  },
  {
    id: "indulgent",
    label: "Go all in",
    blurb: "Signatures, rich sauces, dessert energy.",
  },
  {
    id: "sharing",
    label: "Here to share",
    blurb: "Feasts, platters, and table-friendly plates.",
  },
  {
    id: "classic",
    label: "Keep it classic",
    blurb: "The house staples everyone returns for.",
  },
];

export const budgetOptions = [
  { id: "tight", label: "Under $20 / person", perPersonMax: 20 },
  { id: "balanced", label: "$20 – $35 / person", perPersonMax: 35 },
  { id: "generous", label: "$35 – $50 / person", perPersonMax: 50 },
  { id: "feast", label: "$50+ / person", perPersonMax: 85 },
] as const;

export const partyOptions = [
  { id: 1, label: "Just me", people: 1 },
  { id: 2, label: "Date night (2)", people: 2 },
  { id: 4, label: "Small group (3–4)", people: 4 },
  { id: 6, label: "Big table (5–6)", people: 6 },
] as const;

export type BudgetId = (typeof budgetOptions)[number]["id"];
