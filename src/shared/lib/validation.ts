import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './constants';

export const validateFileType = (file: File): string | null =>
  ALLOWED_MIME_TYPES.includes(file.type) ? null : 'Only PDF, JPEG, XML and DOC/DOCX files are allowed';

export const validateFileSize = (file: File): string | null =>
  file.size <= MAX_FILE_SIZE ? null : 'File too large. Maximum 10MB';
