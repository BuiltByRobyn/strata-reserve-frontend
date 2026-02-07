export const STRATA_ID_PATTERN = /^[A-Za-z]{3}\s\d{5}$/;

export const formatStrataId = (value: string): string => {
  const raw = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const letters = raw.slice(0, 3).replace(/[^A-Z]/g, '');
  const digits = raw.slice(3).replace(/[^0-9]/g, '').slice(0, 5);
  if (digits.length > 0) return `${letters} ${digits}`;
  return letters;
};

export const validateStrataId = (strataId: string): boolean =>
  STRATA_ID_PATTERN.test(strataId);
