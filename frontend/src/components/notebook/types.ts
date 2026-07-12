export type CellType = 'markdown' | 'code';

export interface CellResult {
    type: string; // e.g. 'verse', 'verse_list', 'graph', 'error'
    data: unknown; // json data from backend
    output?: string; // raw output from CLI
}

export interface Cell {
    id: string;
    notebookId: string;
    type: CellType;
    content: string;
    position: number;
    resultJson?: CellResult | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface Notebook {
    id: string;
    title: string;
    description?: string;
    scopeId: string;
    cells: Cell[];
    createdAt: string;
    updatedAt: string;
}