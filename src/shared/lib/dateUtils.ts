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

/** Format a date-only ISO string as "Monday, January 1, 2024" — for client-facing display */
export function formatDateLong(iso: string): string {
  const date = parseLocalDate(iso);
  if (!date) return '';
  return date.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

/** Format a date-only ISO string as "Mon, Jan 1, 2024" — for admin/compact display */
export function formatDateMedium(iso: string): string {
  const date = parseLocalDate(iso);
  if (!date) return '';
  return date.toLocaleDateString('en-CA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

/** Compute the time range for an appointment slot.
 *  Returns "HH:MM - HH:MM" (e.g. "10:00 - 14:00"). */
export function getSlotTimeRange(
  slotTime: string,
  isDraftMeeting: boolean,
  isFullDay: boolean
): string {
  const [h] = slotTime.split(':');
  const startHour = parseInt(h);
  let endHour: number;
  let endMin = 0;

  if (isDraftMeeting) {
    endHour = startHour;
    endMin = 30;
  } else if (isFullDay) {
    endHour = 18;
  } else {
    endHour = startHour + 4;
  }

  const fmt = (hr: number, min: number) =>
    `${hr.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

  return `${fmt(startHour, 0)} - ${fmt(endHour, endMin)}`;
}

/** Safely parse a timestamp string into a Date, returning null if invalid */
export function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Convert "HH:mm" or "HH:mm:ss" to "H:00 AM/PM" */
export function formatTime12h(time: string): string {
  const [h] = time.split(':');
  const hour = parseInt(h);
  if (hour === 0) return '12:00 AM';
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return '12:00 PM';
  return `${hour - 12}:00 PM`;
}
