import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { NotebookTemplateModal } from './NotebookTemplateModal';
import { LanguageProvider } from '../../context/LanguageContext';
import { STUDY_TEMPLATES } from '../../data/studyTemplates';

describe('NotebookTemplateModal', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  it('renders nothing when isOpen is false', () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <NotebookTemplateModal
            isOpen={false}
            onClose={onClose}
            onSelectTemplate={onSelect}
          />
        </LanguageProvider>
      );
    });

    expect(container?.innerHTML).toBe('');
  });

  it('renders modal with templates and handles blank notebook selection', () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <NotebookTemplateModal
            isOpen={true}
            onClose={onClose}
            onSelectTemplate={onSelect}
          />
        </LanguageProvider>
      );
    });

    const text = container?.textContent || '';
    expect(text).toContain('Valitse muistikirjan mallipohja');
    expect(text).toContain('Tyhjä muistikirja');

    // Select blank notebook
    const buttons = container?.querySelectorAll('button');
    const blankBtn = Array.from(buttons || []).find((b) =>
      b.textContent?.includes('Tyhjä muistikirja')
    );
    expect(blankBtn).toBeDefined();

    act(() => {
      blankBtn?.click();
    });

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('handles selecting a specific study template and close button', () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();

    act(() => {
      root = createRoot(container!);
      root.render(
        <LanguageProvider>
          <NotebookTemplateModal
            isOpen={true}
            onClose={onClose}
            onSelectTemplate={onSelect}
          />
        </LanguageProvider>
      );
    });

    // Select the first popular template (e.g. SOAP)
    const soapTemplate = STUDY_TEMPLATES.find((t) => t.id === 'soap');
    expect(soapTemplate).toBeDefined();

    const buttons = container?.querySelectorAll('button');
    const templateBtn = Array.from(buttons || []).find((b) =>
      b.textContent?.includes('SOAP-menetelmä')
    );
    expect(templateBtn).toBeDefined();

    act(() => {
      templateBtn?.click();
    });

    expect(onSelect).toHaveBeenCalledWith(soapTemplate);

    // Close button
    const closeBtn = container?.querySelector('button[aria-label="Sulje"]');
    expect(closeBtn).not.toBeNull();
    act(() => {
      (closeBtn as HTMLButtonElement).click();
    });
    expect(onClose).toHaveBeenCalled();
  });
});
