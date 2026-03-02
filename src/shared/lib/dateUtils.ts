/** Parse a date-only ISO string (from @db.Date fields) into a local-midnight Date without timezone shift */
export function parseLocalDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const datePart = typeof iso === 'string' ? iso.split('T')[0] : '';
  if (!datePart || !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format a date-only ISO string for display as "DD Mon YY" (e.g. "01 Jul 26") — timezone-safe */
export function formatDateShort(iso: string): string {
  const date = parseLocalDate(iso);
  if (!date) return '';
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear().toString().slice(-2);
  return `${day} ${month} ${year}`;
}

/** Format a date-only ISO string for display as "DD/MM/YYYY" — timezone-safe */
export function formatDate(iso: string): string {
  const date = parseLocalDate(iso);
  if (!date) return '';
  return date.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Extract YYYY-MM-DD from an ISO string for use in <input type="date"> */
export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  try { return iso.split('T')[0]; } catch { return ''; }
}
