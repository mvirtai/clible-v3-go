import type { ReactNode } from 'react';

export interface ThemeAvatar {
  id: string;
  nameFi: string;
  nameEn: string;
  render: () => ReactNode;
}

/**
 * 10 aesthetic, thematic, minimalist vector SVG icons for user avatars.
 */
export const THEME_AVATARS: ThemeAvatar[] = [
  {
    id: 'scroll',
    nameFi: 'Käärö',
    nameEn: 'Ancient Scroll',
    render: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-1.5">
        <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
        <path d="M19 17V5a2 2 0 0 0-2-2H4" />
        <path d="M15 8h-5" />
        <path d="M15 12h-5" />
      </svg>
    ),
  },
  {
    id: 'dove',
    nameFi: 'Rauhankyyhky',
    nameEn: 'Dove of Peace',
    render: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-1.5">
        <path d="M10 16c-3.3 0-6-2.7-6-6 0-1.7.7-3.2 1.8-4.2L7 7l4 4-1 5z" />
        <path d="M14 8a4 4 0 0 1 6 3.5c0 3-3 6.5-8 7.5" />
        <path d="M17 5l3 3" />
      </svg>
    ),
  },
  {
    id: 'olive',
    nameFi: 'Öljypuun oksa',
    nameEn: 'Olive Branch',
    render: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-1.5">
        <path d="M3 21c8-2 14-8 18-18" />
        <path d="M8 13c-2-2-2-5 0-7s5-2 7 0" />
        <path d="M13 18c-2-2-2-5 0-7s5-2 7 0" />
        <path d="M6 8c-1.5-1.5-1.5-3.5 0-5s3.5-1.5 5 0" />
      </svg>
    ),
  },
  {
    id: 'codex',
    nameFi: 'Avoin kirja',
    nameEn: 'Open Codex',
    render: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-1.5">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    id: 'quill',
    nameFi: 'Kirjoitussulka',
    nameEn: 'Quill & Ink',
    render: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-1.5">
        <path d="M20 3a5 5 0 0 0-5 5v3L3 21l3-1 7-7h3a5 5 0 0 0 5-5V3z" />
        <path d="M10 14l4 4" />
      </svg>
    ),
  },
  {
    id: 'menorah',
    nameFi: 'Kynttelikkö',
    nameEn: 'Menorah',
    render: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-1.5">
        <path d="M12 3v18" />
        <path d="M8 21h8" />
        <path d="M8 8v4a4 4 0 0 0 8 0V8" />
        <path d="M5 6v6a7 7 0 0 0 14 0V6" />
      </svg>
    ),
  },
  {
    id: 'alpha-omega',
    nameFi: 'Alfa ja Omega',
    nameEn: 'Alpha & Omega',
    render: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-1.5">
        <path d="M4 18L8.5 6 13 18" />
        <path d="M6 14h5.5" />
        <path d="M15 18h2a3 3 0 1 0 2.5-4.5A3 3 0 0 0 17 9a3 3 0 0 0-2.5 4.5A3 3 0 1 0 17 18h2" />
      </svg>
    ),
  },
  {
    id: 'flame',
    nameFi: 'Viisauden liekki',
    nameEn: 'Flame of Wisdom',
    render: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-1.5">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
    ),
  },
  {
    id: 'anchor',
    nameFi: 'Toivon ankkuri',
    nameEn: 'Anchor of Hope',
    render: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-1.5">
        <circle cx="12" cy="5" r="3" />
        <line x1="12" y1="8" x2="12" y2="21" />
        <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
      </svg>
    ),
  },
  {
    id: 'cornerstone',
    nameFi: 'Kulmakivi',
    nameEn: 'Cornerstone',
    render: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full p-1.5">
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  },
];

/**
 * Palette gradients for monogram avatars and icon backgrounds.
 */
export const AVATAR_GRADIENTS = [
  'from-amber-600 to-orange-700',
  'from-emerald-600 to-teal-700',
  'from-blue-600 to-indigo-700',
  'from-violet-600 to-purple-800',
  'from-rose-600 to-pink-700',
  'from-cyan-600 to-blue-700',
  'from-amber-500 to-yellow-600',
  'from-teal-500 to-emerald-700',
  'from-indigo-500 to-purple-700',
  'from-fuchsia-600 to-rose-700',
];

/**
 * Returns a stable 0-9 index calculated from string hash.
 */
export function getAvatarIndex(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % THEME_AVATARS.length;
}

/**
 * Extracts 1-2 uppercase initials if a human name is provided,
 * otherwise returns null indicating a thematic SVG icon should be used.
 */
export function getUserInitials(name?: string | null): string | null {
  if (!name || typeof name !== 'string') {
    return null;
  }
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
