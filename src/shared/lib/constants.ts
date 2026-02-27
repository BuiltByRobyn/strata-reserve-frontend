export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const LOCATION_OPTIONS = [
    { key: 'OK', label: 'OK' },
    { key: 'TH', label: 'TH' },
    { key: 'LM', label: 'LM' },
    { key: 'LLVI', label: 'LLVI' },
    { key: 'NB', label: 'NB' },
    { key: 'Virtual', label: 'Virtual' }
];
