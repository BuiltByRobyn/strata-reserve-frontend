export const TIME_REGEX = /(?:T|^)(\d{2}:\d{2})/;

export const extractTimeFromISO = (isoString: string | null | undefined): string => {
    if (!isoString) return '';
    const match = isoString.match(TIME_REGEX);
    return match ? match[1] : '';
};
