import {
  type BudgetId,
  type MenuItem,
  type MoodId,
  budgetOptions,
} from "@/lib/types";

export type RecommendInput = {
  mood: MoodId;
  budgetId: BudgetId;
  people: number;
  vegetarianOnly?: boolean;
  menuItems: MenuItem[];
};

export type ComboLine = {
  item: MenuItem;
  qty: number;
  lineTotal: number;
};

export type OrderCombo = {
  id: string;
  title: string;
  subtitle: string;
  lines: ComboLine[];
  total: number;
  perPerson: number;
  budgetFit: "under" | "on" | "over";
  leftover: number;
  why: string[];
};

function money(n: number) {
  return Math.round(n * 100) / 100;
}

function scoreItem(item: MenuItem, mood: MoodId, vegetarianOnly: boolean) {
  if (
    vegetarianOnly &&
    !(item.diet.includes("vegetarian") || item.diet.includes("vegan"))
  ) {
    return -Infinity;
  }
  let score = 0;
  if (item.moods.includes(mood)) score += 6;
  if (item.popular) score += 2;
  if (mood === "sharing" && item.shareable) score += 3;
  if (
    mood === "light" &&
    (item.category === "salad" || item.diet.includes("vegetarian"))
  ) {
    score += 2;
  }
  if (
    mood === "indulgent" &&
    (item.category === "dinner" ||
      item.category === "dessert" ||
      item.category === "curry" ||
      item.category === "crepe")
  ) {
    score += 2;
  }
  if (
    mood === "comfort" &&
    (item.category === "pasta" ||
      item.category === "starter" ||
      item.category === "bread" ||
      item.category === "curry" ||
      item.category === "crepe")
  ) {
    score += 2;
  }
  if (item.category === "drink") score -= 1;
  return score;
}

function totalOf(lines: ComboLine[]) {
  return money(lines.reduce((sum, l) => sum + l.lineTotal, 0));
}

function addItem(lines: ComboLine[], item: MenuItem, qty = 1) {
  const existing = lines.find((l) => l.item.id === item.id);
  if (existing) {
    existing.qty += qty;
    existing.lineTotal = money(existing.qty * item.price);
  } else {
    lines.push({ item, qty, lineTotal: money(item.price * qty) });
  }
}

function fitsBudget(total: number, budget: number) {
  if (total <= budget * 0.92) return "under" as const;
  if (total <= budget * 1.05) return "on" as const;
  return "over" as const;
}

function buildSolo(pool: MenuItem[], budget: number): ComboLine[] {
  const lines: ComboLine[] = [];
  const main =
    pool.find((i) =>
      ["pasta", "dinner", "curry", "tandoor", "sandwich", "pizza"].includes(
        i.category,
      ),
    ) ?? pool[0];
  if (main) addItem(lines, main);
  const side = pool.find((i) =>
    ["starter", "bread", "salad", "side", "rice"].includes(i.category),
  );
  if (side && totalOf(lines) + side.price <= budget) addItem(lines, side);
  const drink = pool.find((i) => i.category === "drink");
  if (drink && totalOf(lines) + drink.price <= budget) addItem(lines, drink);
  const dessert = pool.find((i) => i.category === "dessert");
  if (dessert && totalOf(lines) + dessert.price <= budget * 1.02) {
    addItem(lines, dessert);
  }
  return lines;
}

function buildSharing(
  pool: MenuItem[],
  people: number,
  budget: number,
  mood: MoodId,
): ComboLine[] {
  const lines: ComboLine[] = [];
  const feast = pool.find(
    (i) => i.category === "feast" && i.serves >= Math.min(people, 4),
  );
  const pizza = pool.find((i) => i.category === "pizza");
  const platter = pool.find((i) => i.shareable && i.serves >= 2);

  if (people >= 2 && feast && feast.price <= budget * 0.7 && mood !== "light") {
    addItem(lines, feast);
  } else if (pizza) {
    const needed = Math.max(1, Math.ceil(people / 2.5));
    for (let n = 0; n < needed; n++) {
      if (totalOf(lines) + pizza.price <= budget) addItem(lines, pizza);
    }
  } else if (platter && totalOf(lines) + platter.price <= budget) {
    addItem(lines, platter);
  }

  const mains = pool.filter((i) =>
    ["pasta", "dinner", "curry", "tandoor", "sandwich"].includes(i.category),
  );
  let coverage = lines.reduce((s, l) => s + l.item.serves * l.qty, 0);
  for (const main of mains) {
    if (coverage >= people) break;
    if (totalOf(lines) + main.price > budget) continue;
    addItem(lines, main);
    coverage += main.serves;
  }

  const bread = pool.find((i) =>
    ["bread", "starter", "side", "rice"].includes(i.category),
  );
  if (bread && totalOf(lines) + bread.price <= budget) addItem(lines, bread);

  const drink = pool.find((i) => i.category === "drink");
  if (drink) {
    const qty = Math.min(
      people,
      Math.floor((budget - totalOf(lines)) / Math.max(drink.price, 0.01)),
    );
    if (qty > 0) addItem(lines, drink, qty);
  }

  const dessert = pool.find((i) => i.category === "dessert");
  if (dessert && people >= 2 && totalOf(lines) + dessert.price <= budget) {
    addItem(lines, dessert, people >= 4 ? 2 : 1);
  }
  return lines;
}

function buildLight(pool: MenuItem[], people: number, budget: number): ComboLine[] {
  const lines: ComboLine[] = [];
  const lightMains = pool.filter(
    (i) =>
      i.moods.includes("light") &&
      ["dinner", "pasta", "salad", "curry", "tandoor", "pizza"].includes(
        i.category,
      ),
  );
  for (let p = 0; p < people; p++) {
    const main = lightMains[p % Math.max(lightMains.length, 1)] ?? pool[0];
    if (main && totalOf(lines) + main.price <= budget) addItem(lines, main);
  }
  const salad = pool.find((i) => i.category === "salad");
  if (salad && people >= 2 && totalOf(lines) + salad.price <= budget) {
    addItem(lines, salad);
  }
  const drink = pool.find((i) => i.category === "drink");
  if (drink) {
    const qty = Math.min(
      people,
      Math.max(1, Math.floor((budget - totalOf(lines)) / drink.price)),
    );
    if (qty > 0) addItem(lines, drink, qty);
  }
  return lines;
}

function buildValue(pool: MenuItem[], people: number, budget: number): ComboLine[] {
  const lines: ComboLine[] = [];
  const valueMains = pool
    .filter((i) =>
      ["pasta", "sandwich", "pizza", "curry", "dinner", "tandoor"].includes(
        i.category,
      ),
    )
    .sort((a, b) => a.price / a.serves - b.price / b.serves);

  let covered = 0;
  for (const main of valueMains) {
    while (covered < people && totalOf(lines) + main.price <= budget) {
      addItem(lines, main);
      covered += main.serves;
      if (main.serves >= 2) break;
    }
    if (covered >= people) break;
  }

  const side = pool.find((i) =>
    ["bread", "starter", "side", "rice"].includes(i.category),
  );
  if (side && totalOf(lines) + side.price <= budget) addItem(lines, side);

  const drink = pool.find((i) => i.category === "drink");
  if (drink) {
    const qty = Math.min(
      people,
      Math.floor((budget - totalOf(lines)) / drink.price),
    );
    if (qty > 0) addItem(lines, drink, qty);
  }
  return lines;
}

function finalize(
  id: string,
  title: string,
  subtitle: string,
  lines: ComboLine[],
  people: number,
  budget: number,
  why: string[],
): OrderCombo | null {
  if (!lines.length) return null;
  const total = totalOf(lines);
  if (total <= 0) return null;
  return {
    id,
    title,
    subtitle,
    lines: lines.map((l) => ({ ...l, item: l.item })),
    total,
    perPerson: money(total / people),
    budgetFit: fitsBudget(total, budget),
    leftover: money(Math.max(0, budget - total)),
    why,
  };
}

export function generateRecommendations(input: RecommendInput): OrderCombo[] {
  const {
    mood,
    budgetId,
    people,
    vegetarianOnly = false,
    menuItems,
  } = input;
  const budgetMeta =
    budgetOptions.find((b) => b.id === budgetId) ?? budgetOptions[1];
  const budget = money(budgetMeta.perPersonMax * people);

  const ranked = [...menuItems]
    .map((item) => ({ item, score: scoreItem(item, mood, vegetarianOnly) }))
    .filter((r) => r.score > -Infinity)
    .sort((a, b) => b.score - a.score || a.item.price - b.item.price)
    .map((r) => r.item);

  if (!ranked.length) return [];

  const combos: OrderCombo[] = [];
  const primaryLines =
    mood === "light"
      ? buildLight(ranked, people, budget)
      : people === 1
        ? buildSolo(ranked, budget)
        : buildSharing(ranked, people, budget, mood);

  const primary = finalize(
    "best-match",
    mood === "sharing" ? "Table feast" : "Best match",
    "Tuned to how you’re feeling and your budget.",
    primaryLines,
    people,
    budget,
    [
      `Matched to “${mood}” picks from the menu.`,
      `Built for ${people} ${people === 1 ? "guest" : "guests"} within ~$${budget.toFixed(0)}.`,
    ],
  );
  if (primary) combos.push(primary);

  const value = finalize(
    "best-value",
    "Best value",
    "Maximum flavor per dollar.",
    buildValue(ranked, people, budget),
    people,
    budget,
    ["Lean favorites to stretch the budget.", "Still hits the house classics."],
  );
  if (value && value.total !== primary?.total) combos.push(value);

  const signaturePool = ranked.filter(
    (i) =>
      i.popular ||
      i.category === "dinner" ||
      i.category === "feast" ||
      i.category === "tandoor",
  );
  const signature = finalize(
    "signature-night",
    "Signature night",
    "The plates guests come back for.",
    people >= 2
      ? buildSharing(
          signaturePool.length ? signaturePool : ranked,
          people,
          budget,
          "indulgent",
        )
      : buildSolo(signaturePool.length ? signaturePool : ranked, budget),
    people,
    budget,
    [
      "Leans on house hits and chef signatures.",
      "A little more special without leaving your range.",
    ],
  );
  if (
    signature &&
    !combos.some(
      (c) =>
        c.total === signature.total &&
        c.lines.map((l) => `${l.item.id}x${l.qty}`).join() ===
          signature.lines.map((l) => `${l.item.id}x${l.qty}`).join(),
    )
  ) {
    combos.push(signature);
  }

  return combos.slice(0, 3);
}

export function formatPrice(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}
