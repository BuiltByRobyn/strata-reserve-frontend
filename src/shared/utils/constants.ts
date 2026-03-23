export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const LOCATION_OPTIONS = [
    { key: 'LM', label: 'LM' },
    { key: 'VI', label: 'VI' },
    { key: 'OK', label: 'OK' },
    { key: 'TH', label: 'TH' },
    { key: 'N/BC', label: 'N/BC' },
    { key: 'Virtual', label: 'Virtual' }
];

export const LOCATION_DISPLAY_ORDER = ['LM', 'VI', 'OK', 'TH', 'N/BC', 'Virtual'];

export const PHYSICAL_LOCATION_OPTIONS = LOCATION_OPTIONS.filter(l => l.key !== 'Virtual');
export const VIRTUAL_LOCATION_OPTION = LOCATION_OPTIONS.find(l => l.key === 'Virtual')!;

export const SLOT_END_TIMES: Record<string, string> = {
  '10:00': '14:00',
  '14:00': '18:00',
  '19:00': '20:00',
};
