import type { JSX } from 'react';
import { THEME_AVATARS, AVATAR_GRADIENTS, getAvatarIndex, getUserInitials } from './avatars';
import { User } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  avatarId?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
};

const ICON_PADDING = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-2',
};

export function UserAvatar({
  name,
  email,
  avatarId,
  size = 'md',
  className = '',
}: UserAvatarProps): JSX.Element {
  const { lang, strings } = useLanguage();
  const initials = getUserInitials(name);
  const seed = email || name || 'guest';
  const defaultIndex = getAvatarIndex(seed);
  const sizeClass = SIZE_CLASSES[size];

  // 1. Explicitly selected theme SVG avatar (not 'initials')
  if (avatarId && avatarId !== 'initials') {
    const avatarIdx = THEME_AVATARS.findIndex((a) => a.id === avatarId);
    if (avatarIdx !== -1) {
      const avatar = THEME_AVATARS[avatarIdx];
      const gradient = AVATAR_GRADIENTS[avatarIdx % AVATAR_GRADIENTS.length];
      const avatarTitle = lang === 'en' ? avatar.nameEn : avatar.nameFi;
      return (
        <div
          className={`rounded-full bg-gradient-to-br ${gradient} text-white flex
          items-center justify-center border border-black/10 dark:border-white/20 shadow-xs
          shrink-0 ${sizeClass} ${ICON_PADDING[size]} ${className}`}
          title={avatarTitle}
          aria-label={avatarTitle}
        >
          {avatar.render()}
        </div>
      );
    }
  }

  // 2. Monogram initials (when avatarId is 'initials' or unset, and name is present)
  if (initials) {
    const gradient = AVATAR_GRADIENTS[defaultIndex];
    return (
      <div
        className={`rounded-full bg-gradient-to-br ${gradient} text-white
        font-semibold flex items-center justify-center border 
        border-black/10 dark:border-white/20 shadow-xs select-none shrink-0
        ${sizeClass} ${className}`}
      >
        {initials}
      </div>
    );
  }

  // 3. Logged-in user without a name: deterministic theme-SVG
  if (email) {
    const avatar = THEME_AVATARS[defaultIndex];
    const gradient = AVATAR_GRADIENTS[defaultIndex];
    const avatarTitle = lang === 'en' ? avatar.nameEn : avatar.nameFi;
    return (
      <div
        className={`rounded-full bg-gradient-to-br ${gradient} text-white flex
        items-center justify-center border border-black/10 dark:border-white/20 shadow-xs
        shrink-0 ${sizeClass} ${ICON_PADDING[size]} ${className}`}
        title={avatarTitle}
        aria-label={avatarTitle}
      >
        {avatar.render()}
      </div>
    );
  }

  // 4. Vierailija / Guest
  return (
    <div
      className={`rounded-full bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--border)] flex items-center justify-center shrink-0 ${sizeClass} ${className}`}
      aria-label={strings.userAccountGuest}
    >
      <User size={size === 'sm' ? 14 : size === 'md' ? 17 : 22} />
    </div>
  );
}
