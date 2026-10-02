import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';
import {
  Activity,
  BookOpen,
  Calendar,
  CalendarCheck,
  ChevronDown,
  FileText,
  GitCompare,
  Languages,
  Search,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { ViewMode } from './AppHeader';

/**
 * Props for the {@link ViewModeTabs} component.
 */
export interface ViewModeTabsProps {
  /** Currently active view mode */
  viewMode: ViewMode;
  /** Callback triggered when user selects a view mode */
  onSelectViewMode: (mode: ViewMode) => void;
  /** Callback triggered when resetting or selecting active notebook */
  onSelectNotebookId: (id: string | null) => void;
}

interface ViewOption {
  id: ViewMode;
  labelKey:
    | 'tabReader'
    | 'tabLiturgical'
    | 'tabSearch'
    | 'tabReadingPlans'
    | 'tabAnalytics'
    | 'tabCompare'
    | 'tabOriginal'
    | 'tabNotebooks';
  icon: typeof BookOpen;
}

interface ViewGroup {
  id: 'explore' | 'planning';
  labelKey: 'navExplore' | 'navPlanning';
  icon: typeof Search;
  options: ViewOption[];
}

const READER_OPTION: ViewOption = { id: 'reader', labelKey: 'tabReader', icon: BookOpen };
const LITURGICAL_OPTION: ViewOption = { id: 'liturgical', labelKey: 'tabLiturgical', icon: Calendar };
const SEARCH_OPTION: ViewOption = { id: 'search', labelKey: 'tabSearch', icon: Search };
const PLANS_OPTION: ViewOption = { id: 'plans', labelKey: 'tabReadingPlans', icon: CalendarCheck };
const ANALYTICS_OPTION: ViewOption = { id: 'analytics', labelKey: 'tabAnalytics', icon: Activity };
const COMPARE_OPTION: ViewOption = { id: 'compare', labelKey: 'tabCompare', icon: GitCompare };
const ORIGINAL_OPTION: ViewOption = { id: 'original', labelKey: 'tabOriginal', icon: Languages };
const NOTEBOOKS_OPTION: ViewOption = { id: 'notebooks', labelKey: 'tabNotebooks', icon: FileText };

const VIEW_GROUPS: ViewGroup[] = [
  {
    id: 'explore',
    labelKey: 'navExplore',
    icon: Search,
    options: [SEARCH_OPTION, COMPARE_OPTION, ORIGINAL_OPTION, ANALYTICS_OPTION],
  },
  {
    id: 'planning',
    labelKey: 'navPlanning',
    icon: CalendarCheck,
    options: [PLANS_OPTION, LITURGICAL_OPTION],
  },
];

const MENU_OPTIONS = [READER_OPTION, ...VIEW_GROUPS.flatMap((group) => group.options), NOTEBOOKS_OPTION];

type OpenMenu = 'mobile' | ViewGroup['id'] | null;
type PendingArrowFocus = {
  menu: Exclude<OpenMenu, null>;
  optionId: ViewMode;
};

const getMenuId = (menu: Exclude<OpenMenu, null>) =>
  menu === 'mobile' ? 'mobile-view-options' : `${menu}-view-options`;

const focusMenuOption = (
  navigation: HTMLDivElement | null,
  { menu, optionId }: PendingArrowFocus,
) => {
  navigation
    ?.querySelector<HTMLButtonElement>(`#${getMenuId(menu)} [data-view-option="${optionId}"]`)
    ?.focus();
};

/**
 * Grouped navigation for workspace views.
 * Mobile keeps a compact selector; desktop exposes Reader and Notebooks directly
 * and groups the remaining views under Explore and Planning.
 */
export function ViewModeTabs({
  viewMode,
  onSelectViewMode,
  onSelectNotebookId,
}: ViewModeTabsProps) {
  const { strings } = useLanguage();
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const navigationRef = useRef<HTMLDivElement>(null);
  const pendingArrowFocus = useRef<PendingArrowFocus | null>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const exploreTriggerRef = useRef<HTMLButtonElement>(null);
  const planningTriggerRef = useRef<HTMLButtonElement>(null);

  const activeOption = MENU_OPTIONS.find((option) => option.id === viewMode) ?? READER_OPTION;
  const ActiveIcon = activeOption.icon;

  const getOpenTrigger = () => {
    if (openMenu === 'mobile') return mobileTriggerRef.current;
    if (openMenu === 'explore') return exploreTriggerRef.current;
    if (openMenu === 'planning') return planningTriggerRef.current;
    return null;
  };

  const closeMenu = (restoreFocus = false) => {
    if (restoreFocus) getOpenTrigger()?.focus();
    setOpenMenu(null);
  };

  const toggleMenu = (menu: Exclude<OpenMenu, null>) => {
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  const handleSelect = (mode: ViewMode) => {
    onSelectViewMode(mode);
    if (mode === 'notebooks') {
      onSelectNotebookId(null);
    }
    if (openMenu) {
      getOpenTrigger()?.focus();
      setOpenMenu(null);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && openMenu) {
      event.preventDefault();
      closeMenu(true);
      return;
    }

    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const target = event.target instanceof HTMLButtonElement ? event.target : null;
    const isArrowNavigationKey = ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key);
    if (!isArrowNavigationKey || !target) return;

    const controlledMenu = target.getAttribute('aria-controls');
    const triggerMenu =
      controlledMenu === 'mobile-view-options'
        ? 'mobile'
        : controlledMenu === 'explore-view-options'
          ? 'explore'
          : controlledMenu === 'planning-view-options'
            ? 'planning'
            : null;

    if (
      !openMenu &&
      !triggerMenu &&
      target.dataset.viewVariant === 'desktop' &&
      (event.key === 'ArrowDown' || event.key === 'ArrowUp')
    ) {
      const currentIndex = MENU_OPTIONS.findIndex((option) => option.id === target.dataset.viewMode);
      if (currentIndex < 0) return;

      event.preventDefault();
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (currentIndex + offset + MENU_OPTIONS.length) % MENU_OPTIONS.length;
      const nextOption = MENU_OPTIONS[nextIndex];
      const group = VIEW_GROUPS.find((item) =>
        item.options.some((option) => option.id === nextOption.id),
      );

      if (group) {
        pendingArrowFocus.current = { menu: group.id, optionId: nextOption.id };
        setOpenMenu(group.id);
      } else {
        navigationRef.current
          ?.querySelector<HTMLButtonElement>(
            `[data-view-mode="${nextOption.id}"][data-view-variant="desktop"]`,
          )
          ?.focus();
      }
      return;
    }

    if (!openMenu && triggerMenu && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const menuOptions =
        triggerMenu === 'mobile'
          ? MENU_OPTIONS
          : VIEW_GROUPS.find((group) => group.id === triggerMenu)?.options ?? [];
      const option =
        event.key === 'ArrowDown' ? menuOptions[0] : menuOptions[menuOptions.length - 1];
      if (!option) return;
      pendingArrowFocus.current = {
        menu: triggerMenu,
        optionId: option.id,
      };
      setOpenMenu(triggerMenu);
      return;
    }

    if (!openMenu) return;

    const openMenuId = getMenuId(openMenu);
    const openMenuTrigger =
      triggerMenu === openMenu
        ? target
        : null;
    const optionButtons = Array.from(
      navigationRef.current?.querySelectorAll<HTMLButtonElement>(
        `#${openMenuId} [data-view-option]`,
      ) ?? [],
    );

    if (openMenuTrigger && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const index = event.key === 'ArrowDown' ? 0 : optionButtons.length - 1;
      optionButtons[index]?.focus();
      return;
    }

    const currentIndex = optionButtons.indexOf(target);
    if (currentIndex < 0 || optionButtons.length === 0) return;

    let nextIndex: number;
    if (event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % optionButtons.length;
    } else if (event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + optionButtons.length) % optionButtons.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = optionButtons.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    optionButtons[nextIndex]?.focus();
  };

  useLayoutEffect(() => {
    const request = pendingArrowFocus.current;
    if (!request || request.menu !== openMenu) return;

    focusMenuOption(navigationRef.current, request);
    pendingArrowFocus.current = null;
  }, [openMenu]);

  useEffect(() => {
    const handleBodyArrowKey = (event: globalThis.KeyboardEvent) => {
      if (
        event.target !== document.body ||
        document.activeElement !== document.body ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')
      ) {
        return;
      }

      const currentIndex = MENU_OPTIONS.findIndex((option) => option.id === viewMode);
      if (currentIndex < 0) return;

      const offset = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (currentIndex + offset + MENU_OPTIONS.length) % MENU_OPTIONS.length;
      const nextOption = MENU_OPTIONS[nextIndex];
      event.preventDefault();

      if (window.innerWidth < 640) {
        const request: PendingArrowFocus = { menu: 'mobile', optionId: nextOption.id };
        if (openMenu === 'mobile') {
          focusMenuOption(navigationRef.current, request);
        } else {
          pendingArrowFocus.current = request;
          setOpenMenu('mobile');
        }
        return;
      }

      const group = VIEW_GROUPS.find((item) =>
        item.options.some((option) => option.id === nextOption.id),
      );
      if (group) {
        const request: PendingArrowFocus = { menu: group.id, optionId: nextOption.id };
        if (openMenu === group.id) {
          focusMenuOption(navigationRef.current, request);
        } else {
          pendingArrowFocus.current = request;
          setOpenMenu(group.id);
        }
        return;
      }

      setOpenMenu(null);
      navigationRef.current
        ?.querySelector<HTMLButtonElement>(
          `[data-view-mode="${nextOption.id}"][data-view-variant="desktop"]`,
        )
        ?.focus();
    };

    document.addEventListener('keydown', handleBodyArrowKey);
    return () => document.removeEventListener('keydown', handleBodyArrowKey);
  }, [openMenu, viewMode]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (openMenu && !(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) {
      setOpenMenu(null);
    }
  };

  const renderOption = (option: ViewOption, variant: 'desktop' | 'mobile') => {
    const Icon = option.icon;
    const isSelected = viewMode === option.id;
    const className =
      variant === 'mobile'
        ? `w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer min-h-[42px] ${
            isSelected
              ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
              : 'text-[var(--text)] hover:bg-[var(--surface-2)]'
          }`
        : `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors cursor-pointer min-h-[40px] ${
            isSelected
              ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
              : 'text-[var(--text)] hover:bg-[var(--surface-2)]'
          }`;

    return (
      <li key={option.id}>
        <button
          type="button"
          onClick={() => handleSelect(option.id)}
          className={className}
          aria-current={isSelected ? 'page' : undefined}
          data-view-mode={option.id}
          data-view-option={option.id}
          data-view-variant={variant}
        >
          <Icon
            size={variant === 'mobile' ? 17 : 16}
            className={isSelected ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}
            aria-hidden="true"
          />
          <span>{strings[option.labelKey]}</span>
        </button>
      </li>
    );
  };

  const renderDirectOption = (option: ViewOption) => {
    const Icon = option.icon;
    const isSelected = viewMode === option.id;

    return (
      <button
        key={option.id}
        type="button"
        onClick={() => handleSelect(option.id)}
        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-all btn-tactile cursor-pointer min-h-[44px] ${
          isSelected
            ? 'bg-[var(--surface)] shadow-xs text-[var(--text)] border border-[var(--border-soft)]'
            : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
        }`}
        aria-current={isSelected ? 'page' : undefined}
        data-view-mode={option.id}
        data-view-variant="desktop"
      >
        <Icon size={16} className="shrink-0" aria-hidden="true" />
        <span>{strings[option.labelKey]}</span>
      </button>
    );
  };

  return (
    <div
      ref={navigationRef}
      className="relative mb-6 sm:mb-8"
      onKeyDownCapture={handleKeyDown}
      onBlurCapture={handleBlur}
    >
      <nav aria-label={strings.primaryNavigation}>
        <div className={`relative sm:hidden ${openMenu === 'mobile' ? 'z-50' : ''}`}>
          <button
            ref={mobileTriggerRef}
            type="button"
            onClick={() => toggleMenu('mobile')}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-sm font-semibold shadow-xs btn-tactile cursor-pointer min-h-[44px]"
            aria-expanded={openMenu === 'mobile'}
            aria-controls="mobile-view-options"
          >
            <span className="flex items-center gap-2.5">
              <ActiveIcon size={18} className="text-[var(--accent)]" aria-hidden="true" />
              <span className="text-[var(--text)]">{strings[activeOption.labelKey]}</span>
            </span>
            <ChevronDown
              size={16}
              className={`text-[var(--muted)] transition-transform duration-200 ${
                openMenu === 'mobile' ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {openMenu === 'mobile' && (
            <div
              className="fixed inset-0 z-40"
              aria-hidden="true"
              onClick={() => closeMenu(true)}
            />
          )}
          <div
            id="mobile-view-options"
            hidden={openMenu !== 'mobile'}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 p-1.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl animate-fade-in"
          >
            <ul className="space-y-1 list-none m-0 p-0">
              {renderOption(READER_OPTION, 'mobile')}
              {VIEW_GROUPS.map((group) => (
                <li key={group.id}>
                  <p className="px-3.5 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {strings[group.labelKey]}
                  </p>
                  <ul className="space-y-1 list-none m-0 p-0">
                    {group.options.map((option) => renderOption(option, 'mobile'))}
                  </ul>
                </li>
              ))}
              {renderOption(NOTEBOOKS_OPTION, 'mobile')}
            </ul>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-2xl w-fit bg-[var(--surface-2)] border border-[var(--border-soft)] select-none">
          {renderDirectOption(READER_OPTION)}
          {VIEW_GROUPS.map((group) => {
            const GroupIcon = group.icon;
            const isGroupActive = group.options.some((option) => option.id === viewMode);
            const isOpen = openMenu === group.id;
            const triggerRef =
              group.id === 'explore' ? exploreTriggerRef : planningTriggerRef;

            return (
              <div key={group.id} className={`relative ${isOpen ? 'z-50' : ''}`}>
                <button
                  ref={triggerRef}
                  type="button"
                  onClick={() => toggleMenu(group.id)}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0 transition-all btn-tactile cursor-pointer min-h-[44px] ${
                    isGroupActive
                      ? 'bg-[var(--surface)] shadow-xs text-[var(--accent)] border border-[var(--border-soft)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
                  }`}
                  aria-expanded={isOpen}
                  aria-controls={`${group.id}-view-options`}
                  aria-current={isGroupActive ? 'page' : undefined}
                >
                  <GroupIcon size={16} className="shrink-0" aria-hidden="true" />
                  <span>{strings[group.labelKey]}</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>

                {isOpen && (
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden="true"
                    onClick={() => closeMenu(true)}
                  />
                )}
                <div
                  id={`${group.id}-view-options`}
                  hidden={!isOpen}
                  className="absolute left-0 top-full z-50 mt-1.5 min-w-full p-1.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xl animate-fade-in"
                >
                  <ul
                    className="space-y-1 list-none m-0 p-0"
                    aria-label={strings[group.labelKey]}
                  >
                    {group.options.map((option) => renderOption(option, 'desktop'))}
                  </ul>
                </div>
              </div>
            );
          })}
          {renderDirectOption(NOTEBOOKS_OPTION)}
        </div>
      </nav>
    </div>
  );
}
