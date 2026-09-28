export type StudyMethodId =
  | 'soap'
  | 'inductive'
  | 'swedish'
  | 'lectio'
  | 'hear'
  | 'word_topical';

export interface StudyTemplateCellDefinition {
  titleKey: string;
  placeholderKey: string;
  defaultContent: string;
  colSpan?: number;
  rowSpan?: number;
}

export interface StudyMethodTemplate {
  id: StudyMethodId;
  nameKey: string;
  descKey: string;
  badgeKey?: string;
  iconName: 'BookOpen' | 'Search' | 'Lightbulb' | 'Heart' | 'Flame' | 'Layers';
  isPopular: boolean;
  cells: StudyTemplateCellDefinition[];
}
