export type CellType = 'markdown' | 'code';
export type CellWidth = 'full' | 'half' | 'third' | 'twothirds'
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
    width?: CellWidth;
    colSpan?: number; // 1 - 12 (oletus 12 eli 100%)
    customHeight?: number; // pikseleinä
    position?: number;
    resultJson?: CellResult | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface Notebook {
    id: string;
    title: string;
    scopeId: string;
    cells: Cell[];
    createdAt: string;
    updatedAt: string;
}