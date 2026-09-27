import { describe, it, expect } from 'vitest';
import {
  liturgicalToISLA,
  formatIslaReference,
  formatPrayerLines,
  formatHymnLink,
  officesToISLA,
  isPsalmRef,
  isCanticleRef,
  cleanStopWordsAndUrls,
} from './liturgicalIslaExport';
import type { LiturgicalDay } from '../types/liturgical';

const sampleDay: LiturgicalDay = {
  date: '29.11.2026',
  iso_date: '2026-11-29',
  day_of_week: 'sunnuntai',
  day_title: 'Sunnuntai 29.11.2026',
  title: '1. adventtisunnuntai',
  subtitle: 'Kuninkaasi tulee nöyränä',
  period: 'Adventtiaika',
  color: 'valkoinen',
  candles: '4 alttarikynttilää',
  current_volume: 'volume-1',
  day_psalm: {
    verse: 'Ps. 24:7–10',
    text: 'Nostakaa päänne, te portit! *',
  },
  years: {
    I: {
      old_testament: ['Sak. 9:9–10'],
      epistle: ['Room. 13:11–14'],
      gospel: ['Matt. 21:1–9'],
    },
    II: {
      old_testament: ['Jes. 62:10–12'],
      epistle: ['Ilm. 3:20–22'],
      gospel: ['Luuk. 4:16–22'],
    },
  },
  prayers: [
    'Herra Jumala, taivaallinen Isä, sinä lähetit Poikasi vanhurskaana ja auttajana.\nMe rukoilemme sinua: valmista sydämemme ottamaan hänet vastaan.',
  ],
  hymns: [
    {
      group: 'Päivän virsiä',
      hymns: [
        { number: '13', name: 'Käy, kansa, laulamaan', url: 'https://virsikirja.fi/13' },
      ],
    },
  ],
  prayer_offices: {
    morning: [
      { verse: '1. Moos. 17:1–8', text: 'Kun Abram oli 99-vuotias' },
      { verse: 'Ps. 118:19–29', text: 'Avatkaa portit' },
    ],
    evening: [
      { verse: 'Ps. 71:14–23', text: 'Minä en luovu' },
    ],
    completorium: [
      { verse: 'Ps. 4:2–9', text: 'Vastaa minulle' },
      { verse: 'Ps. 91:1–16', text: 'Se joka asuu' },
      { verse: 'Ps. 134', text: 'Tulkaa kiittäkää' },
      { verse: 'Luuk. 2:29–32', text: 'Herra nyt sinä sallit' },
    ],
  },
};

describe('liturgicalIslaExport', () => {
  describe('cleanStopWordsAndUrls', () => {
    it('unpacks markdown links into clean plain text', () => {
      const raw = '*Ehdotus: Aamuvirsi* – esim. [Virsi 547](https://virsikirja.fi/547) (*Joka aamu on armo uus*)';
      expect(cleanStopWordsAndUrls(raw)).toBe(
        '*Ehdotus: Aamuvirsi* – esim. Virsi 547 (*Joka aamu on armo uus*)'
      );
    });

    it('removes standalone http/https links and cleans excess spacing', () => {
      const text = 'Lue lisää https://virsikirja.fi/547 tai http://kirkkokasikirja.fi nyt.';
      expect(cleanStopWordsAndUrls(text)).toBe('Lue lisää tai nyt.');
    });

    it('handles empty or blank input gracefully', () => {
      expect(cleanStopWordsAndUrls('')).toBe('');
      expect(cleanStopWordsAndUrls('   ')).toBe('');
    });
  });

  describe('formatIslaReference', () => {
    it('normalizes Finnish abbreviation dots, en-dashes and numbers correctly', () => {
      expect(formatIslaReference('Ps. 24:7–10')).toBe('Ps 24:7-10');
      expect(formatIslaReference('1. Kor. 13:1–13')).toBe('1Kor 13:1-13');
      expect(formatIslaReference('Joh. 3:16')).toBe('Joh 3:16');
      expect(formatIslaReference('2. Moos. 20:1–17')).toBe('2Moos 20:1-17');
    });

    it('handles empty strings safely', () => {
      expect(formatIslaReference('')).toBe('');
    });
  });

  describe('formatPrayerLines', () => {
    it('formats prayer lines with double trailing space and blockquote prefix', () => {
      const prayer = 'Line one\nLine two\n\nStanza two';
      const formatted = formatPrayerLines(prayer);
      expect(formatted).toEqual([
        '> Line one  ',
        '> Line two',
        '>',
        '> Stanza two',
      ]);
    });
  });

  describe('formatHymnLink', () => {
    it('creates markdown links to virsikirja.fi with name and custom or default URL', () => {
      expect(formatHymnLink({ number: '13', name: 'Käy, kansa, laulamaan', url: 'https://virsikirja.fi/13' }, 'fi')).toBe(
        '[Virsi 13 (Käy, kansa, laulamaan)](https://virsikirja.fi/13)'
      );
      expect(formatHymnLink({ number: '547' }, 'fi')).toBe('[Virsi 547](https://virsikirja.fi/547)');
      expect(formatHymnLink({ number: '13', name: 'Käy, kansa, laulamaan' }, 'en')).toBe(
        '[Hymn 13 (Käy, kansa, laulamaan)](https://virsikirja.fi/13)'
      );
    });
  });

  describe('isPsalmRef & isCanticleRef', () => {
    it('identifies psalms correctly', () => {
      expect(isPsalmRef('Ps. 24:7–10')).toBe(true);
      expect(isPsalmRef('Ps 113')).toBe(true);
      expect(isPsalmRef('Psalmi 23')).toBe(true);
      expect(isPsalmRef('Luuk. 1:68–79')).toBe(false);
      expect(isPsalmRef('1. Moos. 17:1–8')).toBe(false);
    });

    it('identifies gospel canticles correctly', () => {
      expect(isCanticleRef('Luuk. 1:46–55')).toBe(true);
      expect(isCanticleRef('Luuk. 1:68–79')).toBe(true);
      expect(isCanticleRef('Luuk. 2:29–32')).toBe(true);
      expect(isCanticleRef('Luuk. 4:16–22')).toBe(false);
      expect(isCanticleRef('Ps. 113')).toBe(false);
    });
  });

  describe('liturgicalToISLA', () => {
    it('generates structured ISLA v2 markdown in Finnish', () => {
      const output = liturgicalToISLA(sampleDay, 'fi');

      expect(output).toContain('# 1. adventtisunnuntai – Kuninkaasi tulee nöyränä');
      expect(output).toContain('**Päivämäärä:** 29.11.2026 | **Liturginen väri:** valkoinen | **Alttarikynttilät:** 4 alttarikynttilää');
      expect(output).toContain('*Vuosikerta I*');
      expect(output).toContain('## Päivän psalmi (Ps. 24:7–10)');
      expect(output).toContain('! @(Ps 24:7-10)');
      expect(output).toContain('## 1. Lukukappale (Sak. 9:9–10)');
      expect(output).toContain('! @(Sak 9:9-10)');
      expect(output).toContain('## 2. Lukukappale / Epistola (Room. 13:11–14)');
      expect(output).toContain('! @(Room 13:11-14)');
      expect(output).toContain('## Evankeliumi (Matt. 21:1–9)');
      expect(output).toContain('! @(Matt 21:1-9)');
      expect(output).toContain('## Päivän rukous (Collecta)');
      expect(output).toContain('> Herra Jumala, taivaallinen Isä, sinä lähetit Poikasi vanhurskaana ja auttajana.');
      expect(output).toContain('> Me rukoilemme sinua: valmista sydämemme ottamaan hänet vastaan.');
      expect(output).toContain('## Päivän virret');
      expect(output).toContain('- [Virsi 13 (Käy, kansa, laulamaan)](https://virsikirja.fi/13)');
    });

    it('numbers multiple collect prayers cleanly', () => {
      const dayWithMultiplePrayers: LiturgicalDay = {
        ...sampleDay,
        prayers: ['Ensimmäinen rukous.', 'Toinen rukous.'],
      };
      const output = liturgicalToISLA(dayWithMultiplePrayers, 'fi');
      expect(output).toContain('## Päivän rukoukset (Collecta)');
      expect(output).toContain('### 1. Rukous');
      expect(output).toContain('> Ensimmäinen rukous.');
      expect(output).toContain('### 2. Rukous');
      expect(output).toContain('> Toinen rukous.');
    });

    it('generates structured ISLA v2 markdown in English', () => {
      const output = liturgicalToISLA(sampleDay, 'en');

      expect(output).toContain('# 1. adventtisunnuntai – Kuninkaasi tulee nöyränä');
      expect(output).toContain('**Date:** 29.11.2026 | **Liturgical color:** valkoinen | **Altar candles:** 4 alttarikynttilää');
      expect(output).toContain('*Cycle I*');
      expect(output).toContain('## Psalm of the Day (Ps. 24:7–10)');
      expect(output).toContain('! @(Ps 24:7-10)');
      expect(output).toContain('## First Reading (Sak. 9:9–10)');
      expect(output).toContain('## Second Reading / Epistle (Room. 13:11–14)');
      expect(output).toContain('## Gospel (Matt. 21:1–9)');
      expect(output).toContain('## Collect of the Day');
    });

    it('handles minimal/weekday data without errors', () => {
      const minimalDay: LiturgicalDay = {
        date: '25.09.2026',
        iso_date: '2026-09-25',
        day_of_week: 'perjantai',
        day_title: 'Perjantai 25.9.2026',
        title: 'Arki',
        subtitle: '',
        color: 'vihreä',
        candles: '',
        current_volume: '',
        prayer_offices: {},
      };

      const output = liturgicalToISLA(minimalDay, 'fi');
      expect(output).toContain('# Arki');
      expect(output).toContain('**Päivämäärä:** 25.09.2026 | **Liturginen väri:** vihreä');
      expect(output).not.toContain('! @(');
    });

    it('includes prayer offices when option is enabled', () => {
      const output = liturgicalToISLA(sampleDay, 'fi', { includeCollect: true, includeHymns: true, includeOffices: true });
      expect(output).toContain('## Hetkipalvelukset');
      expect(output).toContain('### Aamurukous (Laudes)');
      expect(output).toContain('! @(Ps 118:19-29)');
    });
  });

  describe('officesToISLA', () => {
    it('exports all offices with full 9-step liturgy structure, canticles and responsories', () => {
      const output = officesToISLA(sampleDay, 'fi');
      expect(output).toContain('# Hetkipalvelukset – 1. adventtisunnuntai');

      // Check Laudes
      expect(output).toContain('## Aamurukous (Laudes)');
      expect(output).toContain('### 1. Johdanto (Invitatorium)');
      expect(output).toContain('Herra, avaa minun huuleni');
      expect(output).toContain('niin suuni julistaa sinun kunniaasi');
      expect(output).toContain('Jumala, ole armollinen, pelasta minut');
      expect(output).toContain('Riennä avukseni, Herra');
      expect(output).toContain('Kunnia (+) Isälle ja Pojalle ja Pyhälle Hengelle');
      expect(output).toContain('### 2. Virsi (Hymnus)');
      expect(output).toContain('[Virsi 13 (Käy, kansa, laulamaan)](https://virsikirja.fi/13)');
      expect(output).toContain('https://virsikirja.fi/547');
      expect(output).toContain('### 3. Psalmi (Psalmodia)');
      expect(output).toContain('! @(Ps 118:19-29)');
      expect(output).toContain('### 4. Raamatunluku (Lectio)');
      expect(output).toContain('! @(1Moos 17:1-8)');
      expect(output).toContain('### 5. Responsorio (Vastauslaulu)');
      expect(output).toContain('Laupeuteesi minä turvaan jo varhaisesta aamusta');
      expect(output).toContain('### 6. Kiitosvirsi – Sakariaan kiitosvirsi (Benedictus)');
      expect(output).toContain('! @(Luuk 1:68-79)');
      expect(output).toContain('### 7. Rukousjakso & Päivän rukous (Preces & Collecta)');
      expect(output).toContain('Herra, armahda meitä');
      expect(output).toContain('### 8. Isä meidän (Oratio Dominica)');
      expect(output).toContain('### 9. Ylistys ja Päätössiunaus (Benedictio)');

      // Check Vesper
      expect(output).toContain('## Iltarukous (Vesper)');
      expect(output).toContain('Nouskoon minun rukoukseni suitsutuksena sinun kasvojesi eteen');
      expect(output).toContain('### 6. Kiitosvirsi – Marian kiitosvirsi (Magnificat)');
      expect(output).toContain('! @(Luuk 1:46-55)');

      // Check Completorium
      expect(output).toContain('## Yörukous (Completorium)');
      expect(output).toContain('Auttajaamme on Herra');
      expect(output).toContain('Synnintunnustus ja anteeksianto');
      expect(output).toContain('Sinun käsiisi, Herra, minä annan henkeni');
      expect(output).toContain('### 6. Kiitosvirsi – Simeonin kiitosvirsi (Nunc dimittis)');
      expect(output).toContain('! @(Luuk 2:29-32)');
      expect(output).toContain('Valaise pimeytemme, Herra');
      expect(output).toContain('Rauhassa minä käyn levolle ja nukahdan');
    });

    it('exports single specific office when selected with complete liturgy order', () => {
      const output = officesToISLA(sampleDay, 'fi', 'morning');
      expect(output).toContain('# Aamurukous (Laudes) – 1. adventtisunnuntai');
      expect(output).toContain('! @(Ps 118:19-29)');
      expect(output).toContain('! @(1Moos 17:1-8)');
      expect(output).toContain('! @(Luuk 1:68-79)');
      expect(output).toContain('Isä meidän');
      expect(output).not.toContain('## Iltarukous (Vesper)');
      expect(output).not.toContain('## Yörukous (Completorium)');
    });

    it('exports English prayer office liturgy correctly', () => {
      const output = officesToISLA(sampleDay, 'en', 'morning');
      expect(output).toContain('# Morning Prayer (Lauds) – 1. adventtisunnuntai');
      expect(output).toContain('1. Opening Response (Invitatorium)');
      expect(output).toContain('O Lord, open my lips');
      expect(output).toContain('2. Hymn (Hymnus)');
      expect(output).toContain('3. Psalm (Psalmodia)');
      expect(output).toContain('4. Scripture Reading (Lectio)');
      expect(output).toContain('5. Responsory (Responsorium)');
      expect(output).toContain('Satisfy us in the morning with your unfailing love');
      expect(output).toContain('6. Canticle – The Song of Zechariah (Benedictus)');
      expect(output).toContain('7. Prayers & Collect (Preces & Collecta)');
      expect(output).toContain('Lord, have mercy');
      expect(output).toContain('8. The Lord\'s Prayer (Oratio Dominica)');
      expect(output).toContain('9. Blessing (Benedictio)');
    });

    it('removes URLs and unpacks markdown links when stripLinks is true', () => {
      const output = officesToISLA(sampleDay, 'fi', { specificOffice: 'morning', stripLinks: true });
      expect(output).toContain('- Virsi 13 (Käy, kansa, laulamaan)');
      expect(output).not.toContain('https://virsikirja.fi');
      expect(output).toContain('Virsi 547 (*Joka aamu on armo uus*)');
      expect(output).toContain('(Aamuvirret 535–548)');
    });
  });

  describe('stripLinks in liturgicalToISLA', () => {
    it('strips hymn markdown links when stripLinks option is enabled', () => {
      const output = liturgicalToISLA(sampleDay, 'fi', { stripLinks: true });
      expect(output).toContain('- Virsi 13 (Käy, kansa, laulamaan)');
      expect(output).not.toContain('[Virsi 13');
      expect(output).not.toContain('https://virsikirja.fi');
    });
  });
});
