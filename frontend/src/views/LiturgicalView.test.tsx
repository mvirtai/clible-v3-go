import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LiturgicalView } from './LiturgicalView';
import { LanguageProvider } from '../context/LanguageContext';
import * as liturgicalApi from '../api/liturgical';
import type { LiturgicalDay } from '../types/liturgical';

const mockDay: LiturgicalDay = {
  date: '20.9.2026',
  iso_date: '2026-09-20',
  day_of_week: 'sunnuntai',
  day_title: 'Sunnuntai 20.9.2026',
  title: '17. sunnuntai helluntaista',
  subtitle: 'Jeesus antaa elämän',
  period: 'Helluntaijakso',
  color: 'vihreä',
  candles: 'Kaksi alttarikynttilää',
  current_volume: 'volume-2',
  day_psalm: {
    verse: 'Ps. 22:24–32',
    text: 'Ylistäkää Jumalaa, te Herran pal<u>ve</u>lijat! *',
  },
  prayer_offices: {
    morning: [
      { verse: 'Ps. 118:19–29', text: 'Avatkaa minulle vanhurskauden portit! *' },
    ],
    noon: [
      { verse: 'Ps. 150', text: 'Halleluja! Ylistäkää Jumalaa pyhäkössään *' },
    ],
    completorium: [
      { verse: 'Ps. 4:2–9', text: 'Vastaa minulle, kun huudan *' },
    ],
  },
  years: {
    II: {
      old_testament: ['Job 19:25–27'],
      epistle: ['2. Kor. 4:7–14'],
      gospel: ['Joh. 11:21–45'],
    },
  },
  prayers: ['Herra Jumala, taivaallinen Isä.'],
  hymns: [
    {
      group: 'Päivän virsiä',
      hymns: [
        { number: '242', name: 'Jo vaietkoon vaikerrus', url: 'https://virsikirja.fi/242' },
      ],
    },
  ],
};

describe('LiturgicalView', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.spyOn(liturgicalApi, 'getLiturgicalDay').mockResolvedValue(mockDay);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && document.body.contains(container)) {
      document.body.removeChild(container);
    }
    container = null;
    root = null;
    vi.restoreAllMocks();
  });

  it('renders liturgical day details and calls getLiturgicalDay', async () => {
    const onSelect = vi.fn();

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <LiturgicalView onSelectVerse={onSelect} initialDate="2026-09-20" />
        </LanguageProvider>
      );
    });

    const text = container?.textContent || '';
    expect(text).toContain('17. sunnuntai helluntaista');
    expect(text).toContain('Jeesus antaa elämän');
    expect(text).toContain('Kaksi alttarikynttilää');
    expect(text).toContain('vihreä');
    expect(text).toContain('Ps. 22:24–32');
  });

  it('triggers onSelectVerse when clicking a Scripture passage link', async () => {
    const onSelect = vi.fn();

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <LiturgicalView onSelectVerse={onSelect} initialDate="2026-09-20" />
        </LanguageProvider>
      );
    });

    // Find gospel button "Joh. 11:21–45"
    const gospelBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (b) => b.textContent?.includes('Joh. 11:21–45')
    );
    expect(gospelBtn).toBeDefined();

    act(() => {
      gospelBtn?.click();
    });

    expect(onSelect).toHaveBeenCalledWith('Joh. 11:21–45');
  });

  it('displays prayer offices and allows switching between tabs', async () => {
    const onSelect = vi.fn();

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <LiturgicalView onSelectVerse={onSelect} initialDate="2026-09-20" />
        </LanguageProvider>
      );
    });

    // Morning office is active by default
    expect(container?.textContent).toContain('Ps. 118:19–29');

    // Switch to noon office
    const noonBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Päivärukous') || b.textContent?.includes('Midday')
    );
    expect(noonBtn).toBeDefined();

    expect(noonBtn?.textContent).toContain('Ad Sextam');

    act(() => {
      noonBtn?.click();
    });

    expect(container?.textContent).toContain('Ps. 150');

    // Switch to completorium office
    const completoriumBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Completorium')
    );
    expect(completoriumBtn).toBeDefined();

    act(() => {
      completoriumBtn?.click();
    });

    expect(container?.textContent).toContain('Ps. 4:2–9');
  });

  it('renders liturgical cadence marks, allows toggling them and copying text', async () => {
    // Mock navigator.clipboard
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      writable: true,
      configurable: true,
    });

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <LiturgicalView onSelectVerse={vi.fn()} initialDate="2026-09-20" />
        </LanguageProvider>
      );
    });

    // 1. Cadence asterisk and underline are rendered
    const cadenceMarkers = container?.querySelectorAll('[aria-label="kadenssimerkki"]');
    expect(cadenceMarkers && cadenceMarkers.length > 0).toBe(true);
    expect(cadenceMarkers?.[0].textContent).toContain('*');

    const uEl = container?.querySelector('u');
    expect(uEl?.textContent).toBe('ve');

    // 2. Click "Piilota kadenssimerkit"
    const hideBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Piilota kadenssimerkit')
    );
    expect(hideBtn).toBeDefined();

    act(() => {
      hideBtn?.click();
    });

    // Button changes to "Näytä kadenssimerkit" and <u> is hidden
    expect(container?.textContent).toContain('Näytä kadenssimerkit');
    expect(container?.querySelector('u')).toBeNull();

    // 3. Click "Kopioi teksti"
    const copyBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.textContent?.includes('Kopioi teksti')
    );
    expect(copyBtn).toBeDefined();

    await act(async () => {
      copyBtn?.click();
    });

    expect(writeTextMock).toHaveBeenCalled();
    expect(writeTextMock.mock.calls[0][0]).not.toContain('<u>');
  });

  it('allows collapsing and expanding drawers and toggling view modes', async () => {
    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <LiturgicalView onSelectVerse={vi.fn()} initialDate="2026-09-20" />
        </LanguageProvider>
      );
    });

    // Readings drawer header
    const readingsBtn = Array.from(container?.querySelectorAll('button') || []).find(
      (b) => b.getAttribute('aria-expanded') === 'true' && b.textContent?.includes('lukukappaleet')
    );
    expect(readingsBtn).toBeDefined();

    // Collapse readings drawer
    act(() => {
      readingsBtn?.click();
    });
    expect(readingsBtn?.getAttribute('aria-expanded')).toBe('false');

    // Switch to Tabs mode
    const tabsBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.getAttribute('title')?.includes('Välilehdet') || b.textContent?.includes('Välilehdet')
    );
    expect(tabsBtn).toBeDefined();

    act(() => {
      tabsBtn?.click();
    });

    // In Tabs mode, tabs selector is visible
    expect(container?.textContent).toContain('Hetkipalvelukset');
    expect(container?.textContent).toContain('Päivän psalmi');
    expect(localStorage.getItem('clible_liturgical_view_mode')).toBe('tabs');
  });

  it('initializes display mode from localStorage when set to tabs', async () => {
    localStorage.setItem('clible_liturgical_view_mode', 'tabs');

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <LiturgicalView onSelectVerse={vi.fn()} initialDate="2026-09-20" />
        </LanguageProvider>
      );
    });

    // In tabs mode, tab bar exists
    expect(container?.querySelector('nav[aria-label="Kirkkovuoden osiot"]') || container?.textContent).toBeDefined();
    localStorage.removeItem('clible_liturgical_view_mode');
  });

  it('triggers onExportToNotebook when export button is clicked', async () => {
    const onExport = vi.fn();

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <LiturgicalView
            onSelectVerse={vi.fn()}
            initialDate="2026-09-20"
            onExportToNotebook={onExport}
          />
        </LanguageProvider>
      );
    });

    const exportBtn = Array.from(container?.querySelectorAll('button') || []).find((b) =>
      b.getAttribute('aria-label') === 'Vie muistikirjaksi' || b.textContent?.includes('Vie muistikirjaksi')
    );
    expect(exportBtn).toBeDefined();

    act(() => {
      exportBtn?.click();
    });

    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onExport).toHaveBeenCalledWith(mockDay);
  });

  it('triggers onExportToNotebook when Alt+N keyboard shortcut is pressed', async () => {
    const onExport = vi.fn();

    await act(async () => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <LiturgicalView
            onSelectVerse={vi.fn()}
            initialDate="2026-09-20"
            onExportToNotebook={onExport}
          />
        </LanguageProvider>
      );
    });

    // Simulate Alt+N keydown event on window
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'n',
          altKey: true,
          bubbles: true,
          cancelable: true,
        })
      );
    });

    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onExport).toHaveBeenCalledWith(mockDay);
  });
});

