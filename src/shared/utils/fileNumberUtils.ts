export const FILE_NUMBER_REGEX = /^\d{5}-\d{2}$/;

/** Returns error message or null if valid */
export function validateFileNumber(value: string): string | null {
  if (!value.trim()) return 'File number is required.';
  if (!FILE_NUMBER_REGEX.test(value.trim())) return 'File number must be in the format 12345-01.';
  return null;
}

/** Auto-formats as user types — strips non-digits, inserts dash after position 5, caps at 8 chars */
export function formatFileNumberInput(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '').slice(0, 7);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  if (digits.length === 5 && raw.includes('-')) return `${digits}-`;
  return digits;
}
