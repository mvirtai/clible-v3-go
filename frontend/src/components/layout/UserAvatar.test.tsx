import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { UserAvatar } from './UserAvatar';
import { LanguageProvider } from '@/context/LanguageContext';

describe('UserAvatar', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
    localStorage.clear();
  });

  it('renders monogram initials when user name is provided', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <UserAvatar name="Matti Meikäläinen" />
        </LanguageProvider>
      );
    });

    expect(container?.textContent).toContain('MM');
  });

  it('renders thematic SVG avatar with localized title for email-only user', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <UserAvatar email="user@example.com" />
        </LanguageProvider>
      );
    });

    const avatarDiv = container?.querySelector('div[title]');
    expect(avatarDiv).not.toBeNull();
    expect(avatarDiv?.getAttribute('title')).toBeTruthy();
  });

  it('renders guest avatar with localized aria-label', () => {
    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <UserAvatar />
        </LanguageProvider>
      );
    });

    const guestDiv = container?.querySelector('div[aria-label]');
    expect(guestDiv).not.toBeNull();
    // Default language is 'fi' -> 'Vierailija'
    expect(guestDiv?.getAttribute('aria-label')).toBe('Vierailija');
  });
});
