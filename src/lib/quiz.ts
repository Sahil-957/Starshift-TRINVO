import { products, type Product } from "@/data/products";

export type QuizOption = {
  id: string;
  label: string;
  hint: string;
  /** Trait tags this answer rewards, matched against Product.traits */
  traits: string[];
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  caption: string;
  options: QuizOption[];
};

export const quizQuestions: QuizQuestion[] = [
  {
    id: "where",
    prompt: "Where does it spend most of its day?",
    caption: "Be honest — the answer is usually one place.",
    options: [
      { id: "desk", label: "On a desk", hint: "Beside a keyboard, refilled twice a day", traits: ["desk", "minimal"] },
      { id: "commute", label: "In a bag or cup holder", hint: "Metro, car, the walk between both", traits: ["commute"] },
      { id: "outdoors", label: "Outside", hint: "Trails, sidelines, long weekends", traits: ["outdoors", "travel"] },
      { id: "gift", label: "Someone else's hands", hint: "It is a gift, and it has to land", traits: ["gift", "bold"] },
    ],
  },
  {
    id: "volume",
    prompt: "How loud should the design be?",
    caption: "One barrel, one size, across the whole range. Only the artwork changes.",
    options: [
      { id: "quiet", label: "Nearly invisible", hint: "One field, one line, nothing else", traits: ["minimal", "dark"] },
      { id: "warm", label: "Soft and textural", hint: "Layered tones you notice up close", traits: ["warm", "light"] },
      { id: "loud", label: "Unmissable", hint: "Reads like a poster from across the room", traits: ["bold"] },
    ],
  },
  {
    id: "palette",
    prompt: "Which palette pulls you in?",
    caption: "Every design is drawn around one of three.",
    options: [
      { id: "mono", label: "Monochrome", hint: "Graphite, black, a single metal line", traits: ["mono", "dark"] },
      { id: "earth", label: "Earth", hint: "Clay, sand, olive, burnt orange", traits: ["earth", "warm"] },
      { id: "cool", label: "Cool", hint: "Indigo, cobalt, violet, steel", traits: ["cool"] },
    ],
  },
];

export type QuizAnswers = Record<string, string>;

/** Scores every design against the selected traits; highest total wins. */
export function recommendProduct(answers: QuizAnswers): Product {
  const chosen = quizQuestions.flatMap((q) => {
    const option = q.options.find((o) => o.id === answers[q.id]);
    return option ? option.traits : [];
  });

  let best = products[0];
  let bestScore = -1;

  for (const product of products) {
    const score = chosen.reduce(
      (total, trait) => total + (product.traits.includes(trait) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      best = product;
      bestScore = score;
    }
  }

  return best;
}

/** The traits that actually matched, used to explain the result. */
export function matchedTraits(answers: QuizAnswers, product: Product): string[] {
  const chosen = quizQuestions.flatMap((q) => {
    const option = q.options.find((o) => o.id === answers[q.id]);
    return option ? option.traits : [];
  });
  return [...new Set(chosen.filter((t) => product.traits.includes(t)))];
}
