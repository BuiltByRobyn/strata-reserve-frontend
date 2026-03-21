import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './constants';

export const validateFileType = (file: File): string | null =>
  ALLOWED_MIME_TYPES.includes(file.type) ? null : 'Invalid file type. Allowed: PDF, Word, Excel, JPG, PNG.';

export const validateFileSize = (file: File): string | null =>
  file.size <= MAX_FILE_SIZE ? null : 'File too large. Maximum 10MB';
