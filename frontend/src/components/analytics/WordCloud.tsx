import type { WordFrequency } from "../../types/bible";

/**
 * Properties for {@link WordCloud}.
 */
export interface WordCloudProps {
  /** Array of token frequencies containing word terms and their count values. */
  words: WordFrequency[];
}

const PALETTE = [
  'var(--text)',       // Standard readable text color
  'var(--accent)',     // Warm brand color token
  '#6b7280',           // Medium gray
  '#92400e',           // Rich amber/brown
  '#374151',           // Deep charcoal
  '#b45309',           // Vibrant orange/amber
];

// Simple deterministic hash function to ensure idempotent, stable sorting without Math.random
const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

/**
 * Renders a lightweight tag-cloud using proportional font sizing based on word frequencies.
 *
 * Words are sorted deterministically via string hashing to create a visually natural cloud layout without non-deterministic layout shifts.
 *
 * @param props - Component properties conforming to {@link WordCloudProps}.
 * @returns Responsive word cloud component or null if word list is empty.
 */
export const WordCloud = ({ words }: WordCloudProps) => {
  if (words.length === 0) {
    return null;
  }

  // Pure derived stable shuffle
  const shuffledWords = [...words].sort((a, b) => hashString(a.name) - hashString(b.name));

  const max = words[0]?.value ?? 1;
  const min = words[words.length - 1]?.value ?? 1;
  const range = max - min || 1;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-3 justify-center items-center p-4 leading-tight select-none">
      {shuffledWords.map((w, i) => {
        const ratio = (w.value - min) / range;
        const size = Math.round(13 + ratio * 36);
        const weight = ratio > 0.6 ? 700 : ratio > 0.3 ? 600 : 400;
        const color = PALETTE[i % PALETTE.length];
        const opacity = 0.55 + ratio * 0.45;

        return (
          <span
            key={w.name}
            title={`${w.name}: ${w.value}`}
            style={{ fontSize: `${size}px`, fontWeight: weight, color, opacity }}
            className="transition-opacity hover:opacity-100 cursor-default"
          >
            {w.name}
          </span>
        );
      })}
    </div>
  );
};

