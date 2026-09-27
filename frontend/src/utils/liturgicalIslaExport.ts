import type { LiturgicalDay, CleanTextItem } from '../types/liturgical';
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
 * Formats a prayer's stanzas into Markdown blockquote lines with proper hard breaks.
 */
export function formatPrayerLines(prayerText: string): string[] {
  const result: string[] = [];
  const clean = prayerText.trim();
  if (!clean) return result;

  const rawLines = clean.split('\n');
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (line === '') {
      result.push('>');
    } else {
      const nextLine = rawLines[i + 1]?.trim();
      const isLast = i === rawLines.length - 1 || nextLine === '';
      result.push(`> ${line}${isLast ? '' : '  '}`);
    }
  }
  return result;
}

/**
 * Formats a hymn reference with a direct markdown link to virsikirja.fi.
 */
export function formatHymnLink(hymn: { number: string; name?: string; url?: string }, lang: UILanguage = 'fi'): string {
  const isFi = lang === 'fi';
  const prefix = isFi ? 'Virsi' : 'Hymn';
  const url = hymn.url || `https://virsikirja.fi/${encodeURIComponent(hymn.number)}`;
  const label = hymn.name ? `${prefix} ${hymn.number} (${hymn.name})` : `${prefix} ${hymn.number}`;
  return `[${label}](${url})`;
}

/**
 * Checks if a reference string is a Psalm reference.
 */
export function isPsalmRef(ref: string): boolean {
  return /^(Ps\.?|Psalmi)\b/i.test(ref.trim());
}

/**
 * Checks if a reference string is an Evangelical Canticle (Magnificat, Benedictus, Nunc dimittis).
 */
export function isCanticleRef(ref: string): boolean {
  const norm = ref.toLowerCase().replace(/\s+/g, '');
  return norm.includes('luuk') && (norm.includes('1:46') || norm.includes('1:68') || norm.includes('2:29'));
}

/**
 * Returns standard Canticum info for an office.
 */
function getCanticleForOffice(key: string, lang: UILanguage): { title: string; subtitle: string; ref: string } | null {
  const isFi = lang === 'fi';
  switch (key) {
    case 'morning':
      return {
        title: isFi ? '6. Kiitosvirsi – Sakariaan kiitosvirsi (Benedictus)' : '6. Canticle – The Song of Zechariah (Benedictus)',
        subtitle: isFi ? 'Sakariaan kiitosvirsi (Luuk. 1:68–79)' : 'The Song of Zechariah (Luke 1:68–79)',
        ref: 'Luuk 1:68-79',
      };
    case 'evening':
    case 'eve':
      return {
        title: isFi ? '6. Kiitosvirsi – Marian kiitosvirsi (Magnificat)' : '6. Canticle – The Song of Mary (Magnificat)',
        subtitle: isFi ? 'Marian kiitosvirsi (Luuk. 1:46–55)' : 'The Song of Mary (Luke 1:46–55)',
        ref: 'Luuk 1:46-55',
      };
    case 'completorium':
      return {
        title: isFi ? '6. Kiitosvirsi – Simeonin kiitosvirsi (Nunc dimittis)' : '6. Canticle – The Song of Simeon (Nunc dimittis)',
        subtitle: isFi ? 'Simeonin kiitosvirsi (Luuk. 2:29–32)' : 'The Song of Simeon (Luke 2:29–32)',
        ref: 'Luuk 2:29-32',
      };
    default:
      return null;
  }
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
  lines.push('');

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
    lines.push('');
    lines.push(`! @(${formattedRef})`);
    lines.push('');
  }

  // 2. Lectionary Readings (OT, Epistle, Gospel)
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
        lines.push('');
        lines.push(`! @(${formattedRef})`);
        lines.push('');
      }
    }

    // Epistle
    if (readings.epistle && readings.epistle.length > 0) {
      for (const epRef of readings.epistle) {
        const formattedRef = formatIslaReference(epRef);
        lines.push(`## ${isFi ? '2. Lukukappale / Epistola' : 'Second Reading / Epistle'} (${epRef})`);
        lines.push('');
        lines.push(`! @(${formattedRef})`);
        lines.push('');
      }
    }

    // Gospel
    if (readings.gospel && readings.gospel.length > 0) {
      for (const gospRef of readings.gospel) {
        const formattedRef = formatIslaReference(gospRef);
        lines.push(`## ${isFi ? 'Evankeliumi' : 'Gospel'} (${gospRef})`);
        lines.push('');
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
        lines.push('');
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
    const prayerHeader = isFi
      ? (day.prayers.length > 1 ? 'Päivän rukoukset (Collecta)' : 'Päivän rukous (Collecta)')
      : (day.prayers.length > 1 ? 'Collects of the Day' : 'Collect of the Day');
    lines.push(`## ${prayerHeader}`);
    lines.push('');

    day.prayers.forEach((prayer, idx) => {
      const pLines = formatPrayerLines(prayer);
      if (pLines.length > 0) {
        if (day.prayers!.length > 1) {
          lines.push(`### ${isFi ? `${idx + 1}. Rukous` : `Collect ${idx + 1}`}`);
          lines.push('');
        }
        lines.push(...pLines);
        lines.push('');
      }
    });
  }

  // 5. Hymns
  if (options.includeHymns !== false && day.hymns && day.hymns.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push(`## ${isFi ? 'Päivän virret' : 'Hymns of the Day'}`);
    lines.push('');
    for (const group of day.hymns) {
      if (group.group && group.group !== 'Päivän virsiä' && group.group !== 'Päivän virsi') {
        lines.push(`### ${group.group}`);
        lines.push('');
      }
      for (const hymn of group.hymns) {
        lines.push(`- ${formatHymnLink(hymn, lang)}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

/**
 * Generates an interactive ISLA v2 Markdown note representation specifically for Prayer Offices (Hetkipalvelukset).
 * If specificOffice is provided, exports only that office; otherwise exports all available offices for the day.
 * Implements the authentic Kirkkokäsikirja III liturgical structure:
 * 1. Johdanto (Invitatorium)
 * 2. Virsi (Hymnus)
 * 3. Psalmi (Psalmodia)
 * 4. Raamatunluku (Lectio)
 * 5. Responsorio (Vastauslaulu)
 * 6. Kiitosvirsi / Canticum (Benedictus / Magnificat / Nunc dimittis / Kiitos)
 * 7. Rukousjakso & Päivän rukous (Preces & Collecta)
 * 8. Isä meidän (Oratio Dominica)
 * 9. Ylistys ja Päätössiunaus (Benedictio)
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
  lines.push('');

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

  lines.push('');
  lines.push('---');
  lines.push('');

  const keysToProcess = specificOffice ? [specificOffice] : (['morning', 'noon', 'evening', 'eve', 'completorium', 'apocrypha'] as const);

  for (let kIdx = 0; kIdx < keysToProcess.length; kIdx++) {
    const key = keysToProcess[kIdx];
    const items = offices[key as keyof typeof offices];
    if (!items || items.length === 0) continue;

    const officeTitle = isFi ? officeNames[key]?.fi || key : officeNames[key]?.en || key;
    lines.push(`## ${officeTitle}`);
    lines.push('');

    // Separate Psalms, Canticles, and Scripture readings
    const psalmItems: CleanTextItem[] = [];
    const readingItems: CleanTextItem[] = [];
    let officeCanticleItem: CleanTextItem | undefined;

    for (const it of items) {
      if (!it.verse) continue;
      if (isCanticleRef(it.verse)) {
        officeCanticleItem = it;
      } else if (isPsalmRef(it.verse)) {
        psalmItems.push(it);
      } else {
        readingItems.push(it);
      }
    }

    // 1. Johdanto (Invitatorium)
    lines.push(`### ${isFi ? '1. Johdanto (Invitatorium)' : '1. Opening Response (Invitatorium)'}`);
    lines.push('');
    if (key === 'completorium') {
      if (isFi) {
        lines.push('> **V:** Auttajaamme on Herra,  ');
        lines.push('> **R:** joka on tehnyt taivaan ja maan.');
        lines.push('>');
        lines.push('> *Synnintunnustus ja anteeksianto:*  ');
        lines.push('> Tunnustan Jumalalle, Kaikkivaltiaalle, ja teille, sisaret ja veljet, että olen tehnyt syntiä ajatuksin, sanoin, teoin ja laiminlyönnein.  ');
        lines.push('> Kaikkivaltias Jumala armahtakoon meitä, antakoon syntimme anteeksi ja johdattakoon meidät iankaikkiseen elämään. Aamen.');
        lines.push('>');
        lines.push('> **V:** Jumala, tule minun avukseni.  ');
        lines.push('> **R:** Herra, riennä minua auttamaan.');
        lines.push('>');
        lines.push('> *Kunnia Isälle ja Pojalle ja Pyhälle Hengelle, niin kuin oli alussa, nyt on ja aina, iankaikkisesta iankaikkiseen. Aamen. (Halleluja.)*');
      } else {
        lines.push('> **V:** Our help is in the name of the Lord,  ');
        lines.push('> **R:** the maker of heaven and earth.');
        lines.push('>');
        lines.push('> *Confession of Sins & Absolution:*  ');
        lines.push('> I confess to Almighty God, and to you, brothers and sisters, that I have sinned in thought, word, deed, and omission.  ');
        lines.push('> May Almighty God have mercy on us, forgive us our sins, and bring us to everlasting life. Amen.');
        lines.push('>');
        lines.push('> **V:** O God, come to my assistance.  ');
        lines.push('> **R:** O Lord, make haste to help me.');
        lines.push('>');
        lines.push('> *Glory to the Father and to the Son and to the Holy Spirit, as it was in the beginning, is now, and will be forever. Amen. (Alleluia.)*');
      }
    } else if (key === 'morning') {
      if (isFi) {
        lines.push('> **V:** Herra, avaa minun huuleni,  ');
        lines.push('> **R:** jotta suuni julistaisi sinun ylistystäsi.');
        lines.push('>');
        lines.push('> **V:** Jumala, tule minun avukseni.  ');
        lines.push('> **R:** Herra, riennä minua auttamaan.');
        lines.push('>');
        lines.push('> *Kunnia Isälle ja Pojalle ja Pyhälle Hengelle, niin kuin oli alussa, nyt on ja aina, iankaikkisesta iankaikkiseen. Aamen. Halleluja!*');
      } else {
        lines.push('> **V:** O Lord, open my lips,  ');
        lines.push('> **R:** and my mouth shall declare your praise.');
        lines.push('>');
        lines.push('> **V:** O God, come to my assistance.  ');
        lines.push('> **R:** O Lord, make haste to help me.');
        lines.push('>');
        lines.push('> *Glory to the Father and to the Son and to the Holy Spirit, as it was in the beginning, is now, and will be forever. Amen. Alleluia!*');
      }
    } else {
      if (isFi) {
        lines.push('> **V:** Jumala, tule minun avukseni.  ');
        lines.push('> **R:** Herra, riennä minua auttamaan.');
        lines.push('>');
        lines.push('> *Kunnia Isälle ja Pojalle ja Pyhälle Hengelle, niin kuin oli alussa, nyt on ja aina, iankaikkisesta iankaikkiseen. Aamen. Halleluja!*');
      } else {
        lines.push('> **V:** O God, come to my assistance.  ');
        lines.push('> **R:** O Lord, make haste to help me.');
        lines.push('>');
        lines.push('> *Glory to the Father and to the Son and to the Holy Spirit, as it was in the beginning, is now, and will be forever. Amen. Alleluia!*');
      }
    }
    lines.push('');

    // 2. Virsi (Hymnus)
    lines.push(`### ${isFi ? '2. Virsi (Hymnus)' : '2. Hymn (Hymnus)'}`);
    lines.push('');
    if (day.hymns && day.hymns.length > 0) {
      lines.push(`*${isFi ? 'Päivän virret:' : 'Hymns of the Day:'}*`);
      for (const group of day.hymns) {
        for (const hymn of group.hymns) {
          lines.push(`- ${formatHymnLink(hymn, lang)}`);
        }
      }
      lines.push('');
    }
    // Specific recommendations with virsikirja.fi links
    if (key === 'morning') {
      if (isFi) {
        lines.push('*Ehdotus: Aamuvirsi* – esim. [Virsi 547](https://virsikirja.fi/547) (*Joka aamu on armo uus*), [Virsi 541](https://virsikirja.fi/541) tai [Virsi 538](https://virsikirja.fi/538) ([Aamuvirret 535–548](https://virsikirja.fi/535))');
      } else {
        lines.push('*Suggestion: Morning hymn* – e.g. [Hymn 547](https://virsikirja.fi/547) (*Every morning mercies new*), [Hymn 541](https://virsikirja.fi/541), or [Hymn 538](https://virsikirja.fi/538) ([Morning hymns 535–548](https://virsikirja.fi/535))');
      }
    } else if (key === 'noon') {
      if (isFi) {
        lines.push('*Ehdotus: Keskipäivän virsi tai päivän virsi* – esim. [Virsi 532](https://virsikirja.fi/532) tai [Virsi 531](https://virsikirja.fi/531)');
      } else {
        lines.push('*Suggestion: Midday hymn or hymn of the day* – e.g. [Hymn 532](https://virsikirja.fi/532) or [Hymn 531](https://virsikirja.fi/531)');
      }
    } else if (key === 'evening' || key === 'eve') {
      if (isFi) {
        lines.push('*Ehdotus: Iltavirsi* – esim. [Virsi 555](https://virsikirja.fi/555) (*Oi Herra, luoksein jää*), [Virsi 550](https://virsikirja.fi/550) tai [Virsi 563](https://virsikirja.fi/563) ([Iltavirret 550–564](https://virsikirja.fi/550))');
      } else {
        lines.push('*Suggestion: Evening hymn* – e.g. [Hymn 555](https://virsikirja.fi/555) (*Abide with me*), [Hymn 550](https://virsikirja.fi/550), or [Hymn 563](https://virsikirja.fi/563) ([Evening hymns 550–564](https://virsikirja.fi/550))');
      }
    } else if (key === 'completorium') {
      if (isFi) {
        lines.push('*Ehdotus: Yövirsi* – esim. [Virsi 552](https://virsikirja.fi/552) (*Mua siipeis suojaan kätke*), [Virsi 558](https://virsikirja.fi/558) tai [Virsi 559](https://virsikirja.fi/559)');
      } else {
        lines.push('*Suggestion: Night hymn* – e.g. [Hymn 552](https://virsikirja.fi/552) (*Keep me under thy wings*), [Hymn 558](https://virsikirja.fi/558), or [Hymn 559](https://virsikirja.fi/559)');
      }
    } else if (key === 'apocrypha') {
      if (isFi) {
        lines.push('*Ehdotus: Mietiskelyvirsi* – esim. [Virsi 440](https://virsikirja.fi/440)');
      } else {
        lines.push('*Suggestion: Meditation hymn* – e.g. [Hymn 440](https://virsikirja.fi/440)');
      }
    }
    lines.push('');

    // 3. Psalmi (Psalmodia)
    lines.push(`### ${isFi ? '3. Psalmi (Psalmodia)' : '3. Psalm (Psalmodia)'}`);
    lines.push('');
    if (psalmItems.length > 0) {
      for (const ps of psalmItems) {
        lines.push(`#### ${ps.verse}`);
        lines.push(`! @(${formatIslaReference(ps.verse)})`);
        lines.push('');
      }
    } else if (day.day_psalm?.verse && (key === 'morning' || key === 'evening')) {
      lines.push(`#### ${isFi ? 'Päivän psalmi' : 'Day Psalm'} (${day.day_psalm.verse})`);
      lines.push(`! @(${formatIslaReference(day.day_psalm.verse)})`);
      lines.push('');
    } else {
      lines.push(`*${isFi ? '(Päivän psalmi tai vapaavalintainen psalmi)' : '(Psalm of the day or chosen psalm)'}*`);
      lines.push('');
    }

    // 4. Raamatunluku (Lectio)
    lines.push(`### ${isFi ? '4. Raamatunluku (Lectio)' : '4. Scripture Reading (Lectio)'}`);
    lines.push('');
    if (readingItems.length > 0) {
      for (const rd of readingItems) {
        lines.push(`#### ${rd.verse}`);
        lines.push(`! @(${formatIslaReference(rd.verse)})`);
        lines.push('');
      }
    } else if (key === 'completorium') {
      lines.push(`*${isFi ? 'Lyhyt yörukouksen lukukappale (1. Piet. 5:8–9 tai Jer. 14:9):' : 'Short night reading (1 Peter 5:8–9 or Jeremiah 14:9):'}*`);
      lines.push('! @(1Piet 5:8-9)');
      lines.push('');
    } else {
      lines.push(`*${isFi ? '(Päivän lukukappale tai vapaavalintainen raamatunkohta)' : '(Day reading or chosen scripture passage)'}*`);
      lines.push('');
    }

    // 5. Responsorio (Vastauslaulu)
    lines.push(`### ${isFi ? '5. Responsorio (Vastauslaulu)' : '5. Responsory (Responsorium)'}`);
    lines.push('');
    if (key === 'morning') {
      if (isFi) {
        lines.push('> **V:** Sinun sanasi on lamppu, joka valaisee askeleeni,  ');
        lines.push('> **R:** ja valo minun matkallani.');
        lines.push('>');
        lines.push('> **V:** Kunnia Isälle ja Pojalle ja Pyhälle Hengelle.');
        lines.push('> **R:** Sinun sanasi on lamppu, joka valaisee askeleeni.');
      } else {
        lines.push('> **V:** Your word is a lamp to my feet,  ');
        lines.push('> **R:** and a light to my path.');
        lines.push('>');
        lines.push('> **V:** Glory to the Father and to the Son and to the Holy Spirit.');
        lines.push('> **R:** Your word is a lamp to my feet.');
      }
    } else if (key === 'noon') {
      if (isFi) {
        lines.push('> **V:** Herra, sinun armosi ulottuu taivaisiin,  ');
        lines.push('> **R:** sinun uskollisuutesi pilviin saakka.');
        lines.push('>');
        lines.push('> **V:** Kunnia Isälle ja Pojalle ja Pyhälle Hengelle.');
        lines.push('> **R:** Herra, sinun armosi ulottuu taivaisiin.');
      } else {
        lines.push('> **V:** Your love, Lord, reaches to the heavens,  ');
        lines.push('> **R:** your faithfulness to the skies.');
        lines.push('>');
        lines.push('> **V:** Glory to the Father and to the Son and to the Holy Spirit.');
        lines.push('> **R:** Your love, Lord, reaches to the heavens.');
      }
    } else if (key === 'completorium') {
      if (isFi) {
        lines.push('> **V:** Sinun käsiisi, Herra, minä annan henkeni.  ');
        lines.push('> **R:** Sinun käsiisi, Herra, minä annan henkeni.');
        lines.push('>');
        lines.push('> **V:** Sinä lunastat minut, Herra, uskollinen Jumala.  ');
        lines.push('> **R:** Minä annan henkeni.');
        lines.push('>');
        lines.push('> **V:** Kunnia Isälle ja Pojalle ja Pyhälle Hengelle.');
        lines.push('> **R:** Sinun käsiisi, Herra, minä annan henkeni.');
      } else {
        lines.push('> **V:** Into your hands, Lord, I commend my spirit.  ');
        lines.push('> **R:** Into your hands, Lord, I commend my spirit.');
        lines.push('>');
        lines.push('> **V:** You have redeemed me, Lord, faithful God.  ');
        lines.push('> **R:** I commend my spirit.');
        lines.push('>');
        lines.push('> **V:** Glory to the Father and to the Son and to the Holy Spirit.');
        lines.push('> **R:** Into your hands, Lord, I commend my spirit.');
      }
    } else {
      // Evening / Eve
      if (isFi) {
        lines.push('> **V:** Koko sydämestäni minä etsin sinua,  ');
        lines.push('> **R:** älä salli minun eksyä käskyistäsi.');
        lines.push('>');
        lines.push('> **V:** Kunnia Isälle ja Pojalle ja Pyhälle Hengelle.');
        lines.push('> **R:** Koko sydämestäni minä etsin sinua.');
      } else {
        lines.push('> **V:** With all my heart I seek you;  ');
        lines.push('> **R:** do not let me stray from your commands.');
        lines.push('>');
        lines.push('> **V:** Glory to the Father and to the Son and to the Holy Spirit.');
        lines.push('> **R:** With all my heart I seek you.');
      }
    }
    lines.push('');

    // 6. Kiitosvirsi / Canticum (tai Kiitos Ad Sextam)
    const canticleInfo = getCanticleForOffice(key, lang);
    if (canticleInfo) {
      lines.push(`### ${canticleInfo.title}`);
      lines.push('');
      lines.push(`*${canticleInfo.subtitle}*`);
      lines.push('');
      const targetRef = officeCanticleItem?.verse ? formatIslaReference(officeCanticleItem.verse) : canticleInfo.ref;
      lines.push(`! @(${targetRef})`);
      lines.push('');
    } else if (key === 'noon') {
      lines.push(`### ${isFi ? '6. Kiitoshymni (Kiitos)' : '6. Hymn of Praise (Kiitos)'}`);
      lines.push('');
      if (isFi) {
        lines.push('> *Ylistetty olkoon Herra, meidän Jumalamme, päivästä päivään!  ');
        lines.push('> Hän kantaa meidän kuormamme, Jumala, meidän pelastuksemme. Aamen.*');
      } else {
        lines.push('> *Praise be to the Lord, to God our Savior,  ');
        lines.push('> who daily bears our burdens. Amen.*');
      }
      lines.push('');
    }

    // 7. Rukousjakso & Päivän rukous (Preces & Collecta)
    lines.push(`### ${isFi ? '7. Rukousjakso & Päivän rukous (Preces & Collecta)' : '7. Prayers & Collect (Preces & Collecta)'}`);
    lines.push('');
    // Kyrie
    if (isFi) {
      lines.push('> **V:** Herra, armahda meitä.  ');
      lines.push('> **R:** Kristus, armahda meitä.  ');
      lines.push('> **V:** Herra, armahda meitä.');
    } else {
      lines.push('> **V:** Lord, have mercy.  ');
      lines.push('> **R:** Christ, have mercy.  ');
      lines.push('> **V:** Lord, have mercy.');
    }
    lines.push('');

    // Päivän kollehtarukous
    if (day.prayers && day.prayers.length > 0) {
      day.prayers.forEach((prayer, idx) => {
        const pLines = formatPrayerLines(prayer);
        if (pLines.length > 0) {
          const subTitle = isFi
            ? (day.prayers!.length > 1 ? `Päivän rukous ${idx + 1}` : 'Päivän rukous (Collecta)')
            : (day.prayers!.length > 1 ? `Collect of the Day ${idx + 1}` : 'Collect of the Day');
          lines.push(`#### ${subTitle}`);
          lines.push('');
          lines.push(...pLines);
          lines.push('');
        }
      });
    }

    // Yörukouksen perinteinen rukous
    if (key === 'completorium') {
      lines.push(`#### ${isFi ? 'Yörukous' : 'Night Prayer'}`);
      lines.push('');
      if (isFi) {
        lines.push('> Valaise pimeytemme, Herra.  ');
        lines.push('> Suojaa meitä kaikilta tämän yön vaaroilta ja onnettomuuksilta  ');
        lines.push('> rakkaan Poikasi, meidän Vapahtajamme Jeesuksen Kristuksen tähden.  ');
        lines.push('> Aamen.');
      } else {
        lines.push('> Lighten our darkness, Lord, and protect us this night from all perils and dangers,  ');
        lines.push('> for the love of your only Son, our Savior Jesus Christ.  ');
        lines.push('> Amen.');
      }
      lines.push('');
    }

    // 8. Isä meidän (Oratio Dominica)
    lines.push(`### ${isFi ? '8. Isä meidän (Oratio Dominica)' : '8. The Lord\'s Prayer (Oratio Dominica)'}`);
    lines.push('');
    if (isFi) {
      lines.push('> Isä meidän, joka olet taivaissa.  ');
      lines.push('> Pyhitetty olkoon sinun nimesi.  ');
      lines.push('> Tulkoon sinun valtakuntasi.  ');
      lines.push('> Tapahtukoon sinun tahtosi, myös maan päällä niin kuin taivaassa.  ');
      lines.push('> Anna meille tänä päivänä meidän jokapäiväinen leipämme.  ');
      lines.push('> Ja anna meille meidän syntimme anteeksi,  ');
      lines.push('> niin kuin mekin anteeksi annamme niille, jotka ovat meitä vastaan rikkoneet.  ');
      lines.push('> Äläkä saata meitä kiusaukseen, vaan päästä meidät pahasta.  ');
      lines.push('> Sillä sinun on valtakunta ja voima ja kunnia iankaikkisesti. Aamen.');
    } else {
      lines.push('> Our Father, who art in heaven, hallowed be thy name.  ');
      lines.push('> Thy kingdom come, thy will be done on earth as it is in heaven.  ');
      lines.push('> Give us this day our daily bread,  ');
      lines.push('> and forgive us our trespasses,  ');
      lines.push('> as we forgive those who trespass against us.  ');
      lines.push('> And lead us not into temptation, but deliver us from evil.  ');
      lines.push('> For thine is the kingdom, and the power, and the glory, forever. Amen.');
    }
    lines.push('');

    // 9. Ylistys ja Päätössiunaus (Benedictio)
    lines.push(`### ${isFi ? '9. Ylistys ja Päätössiunaus (Benedictio)' : '9. Blessing (Benedictio)'}`);
    lines.push('');
    if (key === 'completorium') {
      if (isFi) {
        lines.push('> **V:** Rauhassa minä käyn levolle ja nukahdan.  ');
        lines.push('> **R:** Sinä, Herra, annat minun asua turvassa.');
        lines.push('>');
        lines.push('> *Siunatkoon meitä kaikkivaltias ja laupias Jumala, Isä, Poika ja Pyhä Henki. Aamen.*');
      } else {
        lines.push('> **V:** In peace I will lie down and sleep.  ');
        lines.push('> **R:** For you alone, Lord, make me dwell in safety.');
        lines.push('>');
        lines.push('> *May the almighty and merciful God bless us: the Father, the Son, and the Holy Spirit. Amen.*');
      }
    } else {
      if (isFi) {
        lines.push('> **V:** Kiittäkäämme Herraa.  ');
        lines.push('> **R:** Jumalalle kiitos.');
        lines.push('>');
        lines.push('> *Herran Jeesuksen Kristuksen armo, Jumalan rakkaus ja Pyhän Hengen osallisuus olkoon meidän kaikkien kanssa. Aamen.*');
      } else {
        lines.push('> **V:** Let us bless the Lord.  ');
        lines.push('> **R:** Thanks be to God.');
        lines.push('>');
        lines.push('> *The grace of our Lord Jesus Christ, and the love of God, and the communion of the Holy Spirit be with us all. Amen.*');
      }
    }
    lines.push('');

    if (kIdx < keysToProcess.length - 1) {
      lines.push('---');
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}
