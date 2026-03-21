export const TIME_REGEX = /(?:T|^)(\d{2}:\d{2})/;

export function isWithin48Hours(appointmentDate: string, slotTime: string): boolean {
  const dateStr = appointmentDate.split('T')[0];
  const appointmentStart = new Date(`${dateStr}T${slotTime}:00Z`);
  const now = new Date();
  const diffMs = appointmentStart.getTime() - now.getTime();
  return diffMs < 48 * 60 * 60 * 1000;
}

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

export const isWeekend = (dateStr: string): boolean => {
    const d = new Date(dateStr + 'T12:00:00');
    const day = d.getDay();
    return day === 0 || day === 6;
};

export const expandWeekdayDateRange = (startDate: string, endDate: string): string[] =>
    expandDateRange(startDate, endDate).filter(d => !isWeekend(d));
