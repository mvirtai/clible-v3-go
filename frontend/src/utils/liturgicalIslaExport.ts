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
    lines.push(`! @(${formattedRef})`);
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
        lines.push(`! @(${formattedRef})`);
        lines.push('');
      }
    }

    // Epistle
    if (readings.epistle && readings.epistle.length > 0) {
      for (const epRef of readings.epistle) {
        const formattedRef = formatIslaReference(epRef);
        lines.push(`## ${isFi ? '2. Lukukappale / Epistola' : 'Second Reading / Epistle'} (${epRef})`);
        lines.push(`! @(${formattedRef})`);
        lines.push('');
      }
    }

    // Gospel
    if (readings.gospel && readings.gospel.length > 0) {
      for (const gospRef of readings.gospel) {
        const formattedRef = formatIslaReference(gospRef);
        lines.push(`## ${isFi ? 'Evankeliumi' : 'Gospel'} (${gospRef})`);
        lines.push(`! @(${formattedRef})`);
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
            lines.push(`! @(${formatIslaReference(it.verse)})`);
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

/**
 * Generates an interactive ISLA v2 Markdown note representation specifically for Prayer Offices (Hetkipalvelukset).
 * If specificOffice is provided, exports only that office; otherwise exports all available offices for the day.
 */
export function officesToISLA(
  day: LiturgicalDay,
  lang: UILanguage = 'fi',
  specificOffice?: 'morning' | 'noon' | 'evening' | 'eve' | 'completorium' | 'apocrypha'
): string {
  const isFi = lang === 'fi';
  const lines: string[] = [];

  const dayTitle = day.title || day.day_title || day.date;
  const offices = day.prayer_offices || {};

  const officeNames: Record<string, { fi: string; en: string }> = {
    morning: { fi: 'Aamurukous (Laudes)', en: 'Morning Prayer (Lauds)' },
    noon: { fi: 'Päivärukous (Ad Sextam)', en: 'Midday Prayer (Ad Sextam)' },
    evening: { fi: 'Iltarukous (Vesper)', en: 'Evening Prayer (Vespers)' },
    eve: { fi: 'Aattorukous (Vigilia)', en: 'Eve Prayer (Vigil)' },
    completorium: { fi: 'Yörukous (Completorium)', en: 'Night Prayer (Compline)' },
    apocrypha: { fi: 'Apokryfikirjojen lukukappaleet', en: 'Apocrypha Readings' },
  };

  if (specificOffice && officeNames[specificOffice]) {
    const name = isFi ? officeNames[specificOffice].fi : officeNames[specificOffice].en;
    lines.push(`# ${name} – ${dayTitle}`);
  } else {
    lines.push(`# ${isFi ? 'Hetkipalvelukset' : 'Prayer Offices'} – ${dayTitle}`);
  }

  // Metadata badge line
  const metaParts: string[] = [];
  if (day.date) {
    metaParts.push(`**${isFi ? 'Päivämäärä:' : 'Date:'}** ${day.date}`);
  }
  if (day.color) {
    metaParts.push(`**${isFi ? 'Liturginen väri:' : 'Liturgical color:'}** ${day.color}`);
  }
  if (metaParts.length > 0) {
    lines.push(metaParts.join(' | '));
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  const keysToProcess = specificOffice ? [specificOffice] : (['morning', 'noon', 'evening', 'eve', 'completorium', 'apocrypha'] as const);

  for (const key of keysToProcess) {
    const items = offices[key as keyof typeof offices];
    if (items && items.length > 0) {
      const officeTitle = isFi ? officeNames[key]?.fi || key : officeNames[key]?.en || key;
      lines.push(`## ${officeTitle}`);
      lines.push('');

      // 1. Alkusiunaus & Johdantolause (Invocatio & Invitatorium)
      lines.push(`### ${isFi ? 'Johdanto' : 'Opening Response'}`);
      if (key === 'completorium') {
        lines.push(`> *${isFi ? 'Jumala, tule minun avukseni. – Herra, riennä minua auttamaan.' : 'O God, come to my assistance. – O Lord, make haste to help me.'}*`);
        lines.push(`> *${isFi ? 'Kunnia Isälle ja Pojalle ja Pyhälle Hengelle, niin kuin oli alussa, nyt on ja aina, iankaikkisesta iankaikkiseen. Aamen. (Halleluja.)' : 'Glory to the Father and to the Son and to the Holy Spirit, as it was in the beginning, is now, and will be forever. Amen. (Alleluia.)'}*`);
      } else {
        lines.push(`> *${isFi ? 'Herra, avaa minun huuleni, – jotta suuni julistaisi sinun ylistystäsi.' : 'O Lord, open my lips, – and my mouth shall declare your praise.'}*`);
        lines.push(`> *${isFi ? 'Kunnia Isälle ja Pojalle ja Pyhälle Hengelle, niin kuin oli alussa, nyt on ja aina, iankaikkisesta iankaikkiseen. Aamen. Halleluja!' : 'Glory to the Father and to the Son and to the Holy Spirit, as it was in the beginning, is now, and will be forever. Amen. Alleluia!'}*`);
      }
      lines.push('');

      // 2. Lukukappaleet ja psalmit ISLA-syntaksilla
      lines.push(`### ${isFi ? 'Päivän psalmi ja lukukappaleet' : 'Psalms & Scripture Readings'}`);
      lines.push('');
      for (const it of items) {
        if (it.verse) {
          lines.push(`#### ${it.verse}`);
          lines.push(`! @(${formatIslaReference(it.verse)})`);
          lines.push('');
        }
      }

      // 3. Päivän rukoukset & Kollehtarukous (Collecta)
      if (day.prayers && day.prayers.length > 0) {
        lines.push(`### ${isFi ? 'Päivän rukous (Collecta)' : 'Collect Prayer of the Day'}`);
        for (const prayer of day.prayers) {
          const cleanPrayer = prayer.trim();
          if (cleanPrayer) {
            const pLines = cleanPrayer.split('\n');
            for (const pl of pLines) {
              lines.push(`> ${pl}`);
            }
            lines.push('');
          }
        }
      }

      // 4. Isä meidän ja Päätössiunaus (Benedictio)
      lines.push(`### ${isFi ? 'Isä meidän & Päätössiunaus' : 'The Lord\'s Prayer & Blessing'}`);
      if (isFi) {
        lines.push('> *Isä meidän, joka olet taivaissa.*');
        lines.push('> *Pyhitetty olkoon sinun nimesi. Tulkoon sinun valtakuntasi.*');
        lines.push('> *Tapahtukoon sinun tahtosi, myös maan päällä niin kuin taivaassa.*');
        lines.push('> *Anna meille tänä päivänä meidän jokapäiväinen leipämme.*');
        lines.push('> *Ja anna meille meidän syntimme anteeksi, niin kuin mekin anteeksi annamme niille, jotka ovat meitä vastaan rikkoneet.*');
        lines.push('> *Äläkä saata meitä kiusaukseen, vaan päästä meidät pahasta.*');
        lines.push('> *Sillä sinun on valtakunta ja voima ja kunnia iankaikkisesti. Aamen.*');
        lines.push('>');
        lines.push('> *Siunatkoon meitä kaikkivaltias ja laupias Jumala, Isä, Poika ja Pyhä Henki. – Aamen.*');
      } else {
        lines.push('> *Our Father, who art in heaven, hallowed be thy name.*');
        lines.push('> *Thy kingdom come, thy will be done on earth as it is in heaven.*');
        lines.push('> *Give us this day our daily bread, and forgive us our trespasses, as we forgive those who trespass against us.*');
        lines.push('> *And lead us not into temptation, but deliver us from evil.*');
        lines.push('> *For thine is the kingdom, and the power, and the glory, forever. Amen.*');
        lines.push('>');
        lines.push('> *May almighty God bless us, the Father, the Son, and the Holy Spirit. – Amen.*');
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}
