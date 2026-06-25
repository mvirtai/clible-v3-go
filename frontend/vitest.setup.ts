import { vi } from 'vitest';

// Initialize global fetch as a mock function to prevent tests from trying
// to make actual network requests if a test forgets to mock it.
// This line is needed to satisfy the type checker for .test.ts files if
// they don't explicitly import/mock fetch themselves, although ideally all
// tests should explicitly mock their dependencies. This is a global guard.
if (!globalThis.fetch) {
  globalThis.fetch = vi.fn();
}

// Add other global setups, teardowns, or API mocks here if needed in the future.
