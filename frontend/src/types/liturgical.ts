export interface CleanTextItem {
  verse: string;
  text: string;
}

export interface CleanPrayerOffices {
  morning?: CleanTextItem[];
  noon?: CleanTextItem[];
  evening?: CleanTextItem[];
  eve?: CleanTextItem[];
  completorium?: CleanTextItem[];
  apocrypha?: CleanTextItem[];
}

export interface CleanHymn {
  number: string;
  name: string;
  url: string;
}

export interface CleanHymnGroup {
  group: string;
  hymns: CleanHymn[];
}

export interface Cycle {
  old_testament?: string[];
  epistle?: string[];
  gospel?: string[];
}

export interface CleanCelebration {
  title: string;
  subtitle: string;
  period?: string;
  color: string;
  candles: string;
  description?: string;
  image?: string;
  altar_image?: string;
  day_psalm?: CleanTextItem;
  week_psalm?: CleanTextItem;
  prayer_offices: CleanPrayerOffices;
  years?: Record<string, Cycle>;
  prayers?: string[];
  hymns?: CleanHymnGroup[];
  url?: string;
}

export interface LiturgicalDay {
  date: string;
  iso_date: string;
  day_of_week: string;
  day_title: string;
  title: string;
  subtitle: string;
  period?: string;
  color: 'vihreä' | 'valkoinen' | 'punainen' | 'violetti' | 'musta' | string;
  candles: string;
  current_volume: string;
  image?: string;
  altar_image?: string;
  psalms?: string[];
  day_psalm?: CleanTextItem;
  week_psalm?: CleanTextItem;
  prayer_offices: CleanPrayerOffices;
  years?: Record<string, Cycle>;
  prayers?: string[];
  hymns?: CleanHymnGroup[];
  celebrations?: CleanCelebration[];
}
