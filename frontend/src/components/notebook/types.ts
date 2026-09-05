/**
 * Supported cell types within a notebook.
 */
export type CellType = 'markdown';

/**
 * Preset column width designations for cells.
 */
export type CellWidth = 'full' | 'half' | 'third' | 'twothirds';

/**
 * Encapsulates the execution result payload returned from the backend for a cell.
 */
export interface CellResult {
    /** Result category (e.g. 'verse', 'verse_list', 'graph', 'error') */
    type: string;
    /** Arbitrary JSON response data from backend */
    data: unknown;
    /** Raw CLI output string if applicable */
    output?: string;
}

/**
 * Represents an individual block/cell within a notebook.
 */
export interface Cell {
    /** Unique identifier for the cell */
    id: string;
    /** Associated notebook identifier */
    notebookId: string;
    /** Type of content renderable by this cell */
    type: CellType;
    /** Text content or command script */
    content: string;
    /** Width preset identifier */
    width?: CellWidth;
    /** Grid column span (1 - 12, default is 12) */
    colSpan?: number;
    /** Grid starting row position (1 - 12, default is 1) */
    colStart?: number;
    /** Grid starting row position (1 - N, default is automatic) */
    rowStart?: number;
    /** Grid row height span (1 - N units of 24px, default is automatic) */
    rowSpan?: number;
    /** Custom height override in pixels */
    customHeight?: number;
    /** Position index within the notebook */
    position?: number;
    /** Last execution result payload */
    resultJson?: CellResult | null;
    /** ISO timestamp string for creation date */
    createdAt?: string;
    /** ISO timestamp string for last modification date */
    updatedAt?: string;
}

/**
 * Summary count of cells grouped by type.
 */
export interface CellCounts {
    /** Number of markdown cells */
    markdown: number;
    /** Optional legacy code count */
    code?: number;
}

/**
 * Represents a user notebook containing interactive markdown and CLI cells.
 */
export interface Notebook {
    /** Unique identifier for the notebook */
    id: string;
    /** User-assigned title */
    title: string;
    /** Target scope/workspace identifier */
    scopeId: string;
    /** List of contained cells */
    cells?: Cell[];
    /** Card grid column span (6 - 24, default is 12 = 50%) */
    colSpan?: number;
    /** Card grid starting column position (1 - 24) */
    colStart?: number;
    /** Card grid starting row position (1 - N, default is 1) */
    rowStart?: number;
    /** Card grid row span (units of 24px) */
    rowSpan?: number;
    /** Card height in pixels (undefined for automatic height) */
    colHeight?: number;
    /** Aggregated cell counts */
    cellCounts?: CellCounts;
    /** ISO timestamp string for creation date */
    createdAt: string;
    /** ISO timestamp string for last modification date */
    updatedAt: string;
}

/**
 * Represents a guest notebook (not registered user).
 */
export interface GuestNotebookStore {
    /** ISO timestamp string for expiration date */
    expiresAt: number;
    /** List of contained notebooks */
    notebooks: Notebook[];
}