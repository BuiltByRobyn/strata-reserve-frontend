export const TIME_REGEX = /(?:T|^)(\d{2}:\d{2})/;

export const extractTimeFromISO = (isoString: string | null | undefined): string => {
    if (!isoString) return '';
    const match = isoString.match(TIME_REGEX);
    return match ? match[1] : '';
};

export const expandDateRange = (startDate: string, endDate: string): string[] => {
    const dates: string[] = [];
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
};
