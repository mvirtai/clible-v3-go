import type { LiturgicalDay } from '../types/liturgical';
import type { UILanguage } from './i18n';

export interface IslaExportOptions {
  includeCollect?: boolean;
  includeHymns?: boolean;
  includeOffices?: boolean;
}

/**
 * Normalizes book abbreviations and range characters for ISLA v2 parser.
 * E.g.:
 * - 'Ps. 24:7–10' -> 'Ps 24:7-10'
 * - '1. Kor. 13:1–13' -> '1Kor 13:1-13'
 * - 'Joh. 3:16' -> 'Joh 3:16'
 */
export function formatIslaReference(rawRef: string): string {
  if (!rawRef) return '';

  return rawRef
    .trim()
    // Replace en-dash, em-dash, and minus variations with standard ASCII hyphen
    .replace(/[\u2013\u2014\u2212]/g, '-')
    // Replace numbered book dot and space: '1. Kor' -> '1Kor'
    .replace(/^(\d+)\.\s*/g, '$1')
    // Remove dot after abbreviation: 'Ps.' -> 'Ps', 'Joh.' -> 'Joh', 'Sak.' -> 'Sak'
    .replace(/([A-Za-z\u00C0-\u017F]+)\./g, '$1')
    // Collapse extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates an interactive ISLA v2 Markdown note representation from a LiturgicalDay object.
 */
export function liturgicalToISLA(
  day: LiturgicalDay,
  lang: UILanguage = 'fi',
  options: IslaExportOptions = { includeCollect: true, includeHymns: true, includeOffices: false }
): string {
  const isFi = lang === 'fi';
  const lines: string[] = [];

  // Header & Title
  const title = day.title || day.day_title || day.date;
  const subtitle = day.subtitle ? ` – ${day.subtitle}` : '';
  lines.push(`# ${title}${subtitle}`);

  // Metadata badge line
  const metaParts: string[] = [];
  if (day.date) {
    metaParts.push(`**${isFi ? 'Päivämäärä:' : 'Date:'}** ${day.date}`);
  }
  if (day.color) {
    metaParts.push(`**${isFi ? 'Liturginen väri:' : 'Liturgical color:'}** ${day.color}`);
  }
  if (day.candles) {
    metaParts.push(`**${isFi ? 'Alttarikynttilät:' : 'Altar candles:'}** ${day.candles}`);
  }
  if (metaParts.length > 0) {
    lines.push(metaParts.join(' | '));
  }

  // Volume / Year cycle
  let rawVolume = day.current_volume ? day.current_volume.replace(/^volume-/, '') : '';
  if (rawVolume === '1') rawVolume = 'I';
  else if (rawVolume === '2') rawVolume = 'II';
  else if (rawVolume === '3') rawVolume = 'III';
  const currentVolume = rawVolume.toUpperCase();
  if (currentVolume) {
    lines.push(`*${isFi ? 'Vuosikerta' : 'Cycle'} ${currentVolume}*`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  // 1. Day Psalm
  const dayPsalm = day.day_psalm || (day.psalms && day.psalms.length > 0 ? { verse: day.psalms[0], text: '' } : undefined);
  if (dayPsalm && dayPsalm.verse) {
    const formattedRef = formatIslaReference(dayPsalm.verse);
    lines.push(`## ${isFi ? 'Päivän psalmi' : 'Psalm of the Day'} (${dayPsalm.verse})`);
    lines.push(`${formattedRef} >>`);
    lines.push('');
  }

  // 2. Lectionary Readings (OT, Epistle, Gospel)
  // Look up current volume readings or first available cycle
  let readings = day.years && currentVolume && day.years[currentVolume.toUpperCase()];
  if (!readings && day.years) {
    const firstKey = Object.keys(day.years)[0];
    if (firstKey) readings = day.years[firstKey];
  }

  if (readings) {
    // Old Testament
    if (readings.old_testament && readings.old_testament.length > 0) {
      for (const otRef of readings.old_testament) {
        const formattedRef = formatIslaReference(otRef);
        lines.push(`## ${isFi ? '1. Lukukappale' : 'First Reading'} (${otRef})`);
        lines.push(`${formattedRef} >>`);
        lines.push('');
      }
    }

    // Epistle
    if (readings.epistle && readings.epistle.length > 0) {
      for (const epRef of readings.epistle) {
        const formattedRef = formatIslaReference(epRef);
        lines.push(`## ${isFi ? '2. Lukukappale / Epistola' : 'Second Reading / Epistle'} (${epRef})`);
        lines.push(`${formattedRef} >>`);
        lines.push('');
      }
    }

    // Gospel
    if (readings.gospel && readings.gospel.length > 0) {
      for (const gospRef of readings.gospel) {
        const formattedRef = formatIslaReference(gospRef);
        lines.push(`## ${isFi ? 'Evankeliumi' : 'Gospel'} (${gospRef})`);
        lines.push(`${formattedRef} >>`);
        lines.push('');
      }
    }
  }

  // 3. Optional Daily Offices (if requested)
  if (options.includeOffices && day.prayer_offices) {
    const offices = day.prayer_offices;
    const officeEntries: { name: string; items?: { verse: string }[] }[] = [
      { name: isFi ? 'Aamurukous (Laudes)' : 'Morning Prayer (Lauds)', items: offices.morning },
      { name: isFi ? 'Päivärukous (Ad Sextam)' : 'Midday Prayer (Ad Sextam)', items: offices.noon },
      { name: isFi ? 'Iltarukous (Vesper)' : 'Evening Prayer (Vespers)', items: offices.evening },
      { name: isFi ? 'Aattorukous (Vigilia)' : 'Eve Prayer (Vigil)', items: offices.eve },
      { name: isFi ? 'Yörukous (Completorium)' : 'Night Prayer (Compline)', items: offices.completorium },
    ];

    let hasOffices = false;
    for (const office of officeEntries) {
      if (office.items && office.items.length > 0) {
        if (!hasOffices) {
          lines.push('---');
          lines.push('');
          lines.push(`## ${isFi ? 'Hetkipalvelukset' : 'Daily Prayer Offices'}`);
          lines.push('');
          hasOffices = true;
        }
        lines.push(`### ${office.name}`);
        for (const it of office.items) {
          if (it.verse) {
            lines.push(`${formatIslaReference(it.verse)} >>`);
          }
        }
        lines.push('');
      }
    }
  }

  // 4. Collect Prayers
  if (options.includeCollect !== false && day.prayers && day.prayers.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push(`## ${isFi ? 'Päivän rukous (Collecta)' : 'Collect of the Day'}`);
    for (const prayer of day.prayers) {
      const cleanPrayer = prayer.trim();
      if (cleanPrayer) {
        const prayerLines = cleanPrayer.split('\n');
        for (const pLine of prayerLines) {
          lines.push(`> ${pLine}`);
        }
        lines.push('');
      }
    }
  }

  // 5. Hymns
  if (options.includeHymns !== false && day.hymns && day.hymns.length > 0) {
    lines.push(`## ${isFi ? 'Päivän virsi' : 'Hymns of the Day'}`);
    for (const group of day.hymns) {
      for (const hymn of group.hymns) {
        lines.push(`- Virsi ${hymn.number} (${hymn.name})`);
      }
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}
