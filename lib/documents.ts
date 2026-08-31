import mammoth from 'mammoth';
import { extractText, getDocumentProxy } from 'unpdf';
import { AppError } from '@/lib/server/errors';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_CHARS = 50_000;
const supported = new Set(['pdf', 'docx', 'txt']);
const allowedMime: Record<string, Set<string>> = {
  pdf: new Set(['application/pdf', 'application/octet-stream', '']),
  docx: new Set(['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream', 'application/zip', '']),
  txt: new Set(['text/plain', 'application/octet-stream', '']),
};

export function normalizeDocumentText(value: string) {
  return value
    .split('\u0000').join('')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_DOCUMENT_CHARS);
}

export async function extractDocument(file: File) {
  if (!file.size) throw new AppError(400, `${file.name || 'The file'} is empty.`, 'EMPTY_FILE');
  if (file.size > MAX_FILE_BYTES) throw new AppError(413, `${file.name} is larger than 5 MB.`, 'FILE_TOO_LARGE');
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!supported.has(extension)) throw new AppError(415, 'Use a PDF, DOCX, or TXT file.', 'UNSUPPORTED_FILE');
  if (!allowedMime[extension].has(file.type)) throw new AppError(415, `${file.name} does not match its expected file type.`, 'INVALID_FILE_TYPE');
  const bytes = await file.arrayBuffer();
  try {
    let text = '';
    if (extension === 'txt') text = new TextDecoder().decode(bytes);
    if (extension === 'docx') text = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
    if (extension === 'pdf') {
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      text = (await extractText(pdf, { mergePages: true })).text;
    }
    const normalized = normalizeDocumentText(text);
    if (normalized.length < 80) throw new AppError(422, `Athena could not find enough readable text in ${file.name}.`, 'INSUFFICIENT_TEXT');
    return { text: normalized, originalName: file.name, mimeType: file.type || `application/${extension}`, sourceType: 'upload' as const };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(422, `Athena could not read ${file.name}. Try saving it again or paste the text instead.`, 'EXTRACTION_FAILED');
  }
}

export async function documentFromForm(form: FormData, prefix: 'jd' | 'resume') {
  const raw = form.get(`${prefix}Text`);
  const pasted = normalizeDocumentText(typeof raw === 'string' ? raw : '');
  if (pasted.length >= 80) return { text: pasted, originalName: null, mimeType: 'text/plain', sourceType: 'paste' as const };
  const file = form.get(`${prefix}File`);
  if (file instanceof File && file.size) return extractDocument(file);
  throw new AppError(400, `Add ${prefix === 'jd' ? 'a job description' : 'your resume'} by pasting text or uploading a file.`, 'DOCUMENT_REQUIRED');
}
