export interface Scope {
  id: string;
  name: string;
  createdAt: string;
  userId: string;
}

export interface SavedSearch {
  id: string;
  scopeId: string;
  name: string;
  queryText: string;
  searchScope: string;
  scopeValue: string;
  translationId: string;
  resultJson: string; // Tallennettu hakutulos välimuistina
  createdAt: string;
}

export interface SavedAnalysis {
  id: string;
  scopeId: string;
  name: string;
  reference: string;
  analysisType: string;
  translationId: string;
  paramsJson: string;
  resultJson: string; // Tallennettu analyysitulos välimuistina
  createdAt: string;
}

export interface ScopeWorkspace {
  scope: Scope;
  searches: SavedSearch[];
  analyses: SavedAnalysis[];
}
