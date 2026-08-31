import { describe, expect, it } from 'vitest';
import { MAX_DOCUMENT_CHARS, normalizeDocumentText } from '@/lib/documents';

describe('document normalization', () => {
  it('removes control bytes and collapses noisy whitespace', () => {
    expect(normalizeDocumentText('Role\u0000\r\n\r\n\r\n  TypeScript    APIs ')).toBe('Role\n\n TypeScript APIs');
  });

  it('caps documents to the supported context size', () => {
    expect(normalizeDocumentText('x'.repeat(MAX_DOCUMENT_CHARS + 100)).length).toBe(MAX_DOCUMENT_CHARS);
  });
});
