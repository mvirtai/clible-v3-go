import type { Messages } from '../utils/i18n';

export type ReadingPlanCategory = 'all' | 'gospels' | 'nt' | 'ot' | 'devotional' | 'topical';

export interface ReadingPlanDay {
  day: number;
  titleKey?: keyof Messages;
  references: string[];
  theme?: string;
}

export interface ReadingPlan {
  id: string;
  titleKey: keyof Messages;
  descKey: keyof Messages;
  category: ReadingPlanCategory;
  durationDays: number;
  days: ReadingPlanDay[];
}

export interface ReadingPlanProgress {
  planId: string;
  completedDays: number[];
  lastReadDay: number;
  updatedAt: string;
}
