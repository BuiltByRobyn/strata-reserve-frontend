export const STRATA_ID_PATTERN = /^[A-Za-z]{3}\s\d{1,5}$/;

export const formatStrataId = (value: string): string => {
  const raw = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const firstDigit = raw.search(/\d/);
  if (firstDigit === -1) return raw.slice(0, 3);
  const letters = raw.slice(0, firstDigit).replace(/[^A-Z]/g, '').slice(0, 3);
  const digits = raw.slice(firstDigit).replace(/[^0-9]/g, '').slice(0, 5);
  return digits.length > 0 ? `${letters} ${digits}` : letters;
};

export const validateStrataId = (strataId: string): boolean =>
  STRATA_ID_PATTERN.test(strataId);

export const formatPostalCode = (value: string, country?: string): string => {
  if (!country || country.trim().toLowerCase() !== 'canada') return value;
  const raw = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
  if (raw.length > 3) return `${raw.slice(0, 3)} ${raw.slice(3)}`;
  return raw;
};

export const formatPhoneNumber = (value: string): string => {
  const raw = value.replace(/\D/g, '').slice(0, 10);
  if (raw.length > 6) return `${raw.slice(0, 3)} ${raw.slice(3, 6)} ${raw.slice(6)}`;
  if (raw.length > 3) return `${raw.slice(0, 3)} ${raw.slice(3)}`;
  return raw;
};

export const validatePhoneNumber = (value: string): boolean =>
  /^\d{3} \d{3} \d{4}$/.test(value);

const POSTAL_CODE_PATTERN = [/[A-Z]/, /\d/, /[A-Z]/, /\d/, /[A-Z]/, /\d/];

export const validatePostalCodeFormat = (value: string, country?: string): string | null => {
  if (!country || country.trim().toLowerCase() !== 'canada') return null;
  const raw = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (raw.length === 0) return null;
  for (let i = 0; i < raw.length; i++) {
    if (!POSTAL_CODE_PATTERN[i].test(raw[i])) {
      return 'Format must be A1A 1A1 (alternating letters and digits)';
    }
  }
  return null;
};
