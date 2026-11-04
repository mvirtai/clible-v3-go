import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { act } from 'react';
import { useDeepDiveChain, chainReducer } from './useDeepDiveChain';
import { apiService } from '@/services/api';
import type { NextFocusItem } from '@/types/ai';

vi.mock('@/services/api', () => ({
  apiService: {
    getAiDeepDive: vi.fn(),
  },
}));

// @ts-expect-error React testing environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('useDeepDiveChain', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  describe('chainReducer unit tests', () => {
    it('handles remove action cleanly', async () => {
      const state = {
        source: null,
        scope: 'scope-1',
        entries: [
          {
            id: 'id-1',
            parentId: null,
            depth: 0,
            topic: 'Topic 1',
            text: 'Text 1',
            nextFocus: [],
          },
        ],
        error: null,
        focusId: null,
      };

      const res = await chainReducer(state, {
        type: 'remove',
        id: 'id-1',
        source: null,
        scope: 'scope-1',
      });

      expect(res.entries).toHaveLength(0);
      expect(res.error).toBeNull();
    });

    it('handles successful pick action', async () => {
      vi.mocked(apiService.getAiDeepDive).mockResolvedValueOnce({
        text: 'Deep dive response text',
        nextFocus: [{ label: 'Subtopic 1', kind: 'theme', reason: 'Why' }],
        geminiUsageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
      });

      const state = {
        source: null,
        scope: 'scope-1',
        entries: [],
        error: null,
        focusId: null,
      };

      const res = await chainReducer(state, {
        type: 'pick',
        item: { label: 'Topic A', kind: 'theme', reason: 'Relevant' },
        parentId: null,
        language: 'fi',
        context: { reference: 'GEN 1:1' },
        source: null,
        scope: 'scope-1',
      });

      expect(res.entries).toHaveLength(1);
      expect(res.entries[0].topic).toBe('Topic A');
      expect(res.entries[0].text).toBe('Deep dive response text');
      expect(res.entries[0].nextFocus).toHaveLength(1);
      expect(res.error).toBeNull();
    });

    it('captures api errors into state', async () => {
      vi.mocked(apiService.getAiDeepDive).mockRejectedValueOnce(new Error('Network failure'));

      const state = {
        source: null,
        scope: 'scope-1',
        entries: [],
        error: null,
        focusId: null,
      };

      const res = await chainReducer(state, {
        type: 'pick',
        item: { label: 'Topic Fail', kind: 'theme', reason: 'Error test' },
        parentId: null,
        language: 'fi',
        context: { reference: 'GEN 1:1' },
        source: null,
        scope: 'scope-1',
      });

      expect(res.entries).toHaveLength(0);
      expect(res.error?.message).toBe('Network failure');
    });
  });

  describe('hook component integration', () => {
    function TestConsumer({
      savedText,
      scope,
      onHookState,
    }: {
      savedText: string | null;
      scope: unknown;
      onHookState: (hook: ReturnType<typeof useDeepDiveChain>) => void;
    }) {
      const hook = useDeepDiveChain({ savedText, scope });
      onHookState(hook);

      return (
        <div>
          <span data-testid="pending">{String(hook.isPending)}</span>
          <span data-testid="pending-topic">{hook.pendingTopic ?? ''}</span>
          <span data-testid="entries-count">{hook.entries.length}</span>
          <button
            data-testid="pick-btn"
            onClick={() => {
              const item: NextFocusItem = { label: 'Grace', kind: 'theme', reason: 'Core' };
              hook.pick(item, { language: 'fi', context: { reference: 'JHN 1:1' } });
            }}
          >
            Pick
          </button>
          {hook.entries[0] && (
            <button
              data-testid="remove-btn"
              onClick={() => hook.remove(hook.entries[0].id)}
            >
              Remove
            </button>
          )}
        </div>
      );
    }

    it('initializes from savedText and switches scope cleanly', async () => {
      const hookHolder = { current: null as ReturnType<typeof useDeepDiveChain> | null };
      const initialScope = { id: 1 };
      const savedMock = '<!-- deepdive {"id":"saved-1","parentId":null,"depth":0,"topic":"Saved Topic"} -->\nSaved text body';

      await act(async () => {
        root.render(
          <TestConsumer
            savedText={savedMock}
            scope={initialScope}
            onHookState={(h) => {
              hookHolder.current = h;
            }}
          />,
        );
      });

      expect(hookHolder.current?.entries).toHaveLength(1);
      expect(hookHolder.current?.entries[0]?.topic).toBe('Saved Topic');

      // Change scope (new analysis arrives)
      const newScope = { id: 2 };
      await act(async () => {
        root.render(
          <TestConsumer
            savedText={null}
            scope={newScope}
            onHookState={(h) => {
              hookHolder.current = h;
            }}
          />,
        );
      });

      // Chain belongs to the analysis result scope: switching scope resets entries
      expect(hookHolder.current?.entries).toHaveLength(0);
    });

    it('executes pick and remove through React action transition', async () => {
      vi.mocked(apiService.getAiDeepDive).mockResolvedValueOnce({
        text: 'Insight on Grace',
        nextFocus: [],
      });

      const hookHolder = { current: null as ReturnType<typeof useDeepDiveChain> | null };
      const scope = { id: 'scope-a' };

      await act(async () => {
        root.render(
          <TestConsumer
            savedText={null}
            scope={scope}
            onHookState={(h) => {
              hookHolder.current = h;
            }}
          />,
        );
      });

      const pickBtn = container.querySelector('[data-testid="pick-btn"]') as HTMLButtonElement;
      await act(async () => {
        pickBtn.click();
      });

      expect(hookHolder.current?.entries).toHaveLength(1);
      expect(hookHolder.current?.entries[0]?.topic).toBe('Grace');

      const removeBtn = container.querySelector('[data-testid="remove-btn"]') as HTMLButtonElement;
      await act(async () => {
        removeBtn.click();
      });

      expect(hookHolder.current?.entries).toHaveLength(0);
    });

    it('identifies duplicate topic picks without duplicate network calls and sets focusId', async () => {
      vi.mocked(apiService.getAiDeepDive).mockResolvedValue({
        text: 'Insight on Grace',
        nextFocus: [],
      });

      const hookHolder = { current: null as ReturnType<typeof useDeepDiveChain> | null };
      const scope = { id: 'scope-b' };

      await act(async () => {
        root.render(
          <TestConsumer
            savedText={null}
            scope={scope}
            onHookState={(h) => {
              hookHolder.current = h;
            }}
          />,
        );
      });

      const pickBtn = container.querySelector('[data-testid="pick-btn"]') as HTMLButtonElement;
      // First pick: should trigger API call
      await act(async () => {
        pickBtn.click();
      });

      expect(apiService.getAiDeepDive).toHaveBeenCalledTimes(1);
      const firstEntryId = hookHolder.current?.entries[0]?.id;
      expect(firstEntryId).toBeDefined();
      expect(hookHolder.current?.focusId).toBe(firstEntryId);

      // Second pick with same topic: should NOT trigger API call, but set focusId
      await act(async () => {
        pickBtn.click();
      });

      expect(apiService.getAiDeepDive).toHaveBeenCalledTimes(1);
      expect(hookHolder.current?.entries).toHaveLength(1);
      expect(hookHolder.current?.focusId).toBe(firstEntryId);
    });
  });
});
