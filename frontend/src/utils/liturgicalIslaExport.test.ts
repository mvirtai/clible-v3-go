import { describe, it, expect } from 'vitest';
import { liturgicalToISLA, formatIslaReference } from './liturgicalIslaExport';
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
    morning: [{ verse: 'Ps. 118:19–29', text: 'Avatkaa portit' }],
  },
};

describe('liturgicalIslaExport', () => {
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

  describe('liturgicalToISLA', () => {
    it('generates structured ISLA v2 markdown in Finnish', () => {
      const output = liturgicalToISLA(sampleDay, 'fi');

      expect(output).toContain('# 1. adventtisunnuntai – Kuninkaasi tulee nöyränä');
      expect(output).toContain('**Päivämäärä:** 29.11.2026 | **Liturginen väri:** valkoinen | **Alttarikynttilät:** 4 alttarikynttilää');
      expect(output).toContain('*Vuosikerta I*');
      expect(output).toContain('## Päivän psalmi (Ps. 24:7–10)');
      expect(output).toContain('Ps 24:7-10 >>');
      expect(output).toContain('## 1. Lukukappale (Sak. 9:9–10)');
      expect(output).toContain('Sak 9:9-10 >>');
      expect(output).toContain('## 2. Lukukappale / Epistola (Room. 13:11–14)');
      expect(output).toContain('Room 13:11-14 >>');
      expect(output).toContain('## Evankeliumi (Matt. 21:1–9)');
      expect(output).toContain('Matt 21:1-9 >>');
      expect(output).toContain('## Päivän rukous (Collecta)');
      expect(output).toContain('> Herra Jumala, taivaallinen Isä, sinä lähetit Poikasi vanhurskaana ja auttajana.');
      expect(output).toContain('> Me rukoilemme sinua: valmista sydämemme ottamaan hänet vastaan.');
      expect(output).toContain('## Päivän virsi');
      expect(output).toContain('- Virsi 13 (Käy, kansa, laulamaan)');
    });

    it('generates structured ISLA v2 markdown in English', () => {
      const output = liturgicalToISLA(sampleDay, 'en');

      expect(output).toContain('# 1. adventtisunnuntai – Kuninkaasi tulee nöyränä');
      expect(output).toContain('**Date:** 29.11.2026 | **Liturgical color:** valkoinen | **Altar candles:** 4 alttarikynttilää');
      expect(output).toContain('*Cycle I*');
      expect(output).toContain('## Psalm of the Day (Ps. 24:7–10)');
      expect(output).toContain('Ps 24:7-10 >>');
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
      expect(output).not.toContain('>>');
    });

    it('includes prayer offices when option is enabled', () => {
      const output = liturgicalToISLA(sampleDay, 'fi', { includeCollect: true, includeHymns: true, includeOffices: true });
      expect(output).toContain('## Hetkipalvelukset');
      expect(output).toContain('### Aamurukous (Laudes)');
      expect(output).toContain('Ps 118:19-29 >>');
    });
  });
});
