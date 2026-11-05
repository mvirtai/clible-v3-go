import { vi } from 'vitest';

// Initialize global fetch as a mock function to prevent tests from trying
// to make actual network requests if a test forgets to mock it.
// This line is needed to satisfy the type checker for .test.ts files if
// they don't explicitly import/mock fetch themselves, although ideally all
// tests should explicitly mock their dependencies. This is a global guard.
if (!globalThis.fetch) {
  globalThis.fetch = vi.fn();
}

// Tell React that act() is being used in a test environment
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
