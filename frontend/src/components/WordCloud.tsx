import { useMemo } from 'react';
import type { WordFrequency } from "../types/bible";

interface WordCloudProps {
    // Array of words and their occurence counts.
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
 * WordCloud renders a lightweight tag-cloud using proportional font sizing
 * based on word frequencies.
 * Words are randomized deterministically to avoid alphabetical ordering.
 */
export const WordCloud = ({ words }: WordCloudProps) => {
    const shuffledWords = useMemo(() => {
        return [...words].sort((a, b) => hashString(a.name) - hashString(b.name));
    }, [words]);

    if (words.length === 0) {
        return null;
    }

    const max = words[0].value;
    const min = words[words.length - 1].value;
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
