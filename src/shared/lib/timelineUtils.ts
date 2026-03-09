import type { FileNumber } from '../types/entities.types';
import type { DeadlineType } from '../types/timeline.types';

export function buildAnniversaryDate(year: number, month: number, day: number): Date {
  const candidate = new Date(year, month, day);
  if (candidate.getMonth() !== month) {
    return new Date(year, month + 1, 0);
  }
  return candidate;
}

export function getNextAnniversary(baseDate: Date, referenceDate: Date): Date {
  const month = baseDate.getMonth();
  const day = baseDate.getDate();
  let year = referenceDate.getFullYear();
  for (let i = 0; i < 10; i++) {
    const candidate = buildAnniversaryDate(year, month, day);
    if (candidate > referenceDate) return candidate;
    year++;
  }
  return buildAnniversaryDate(referenceDate.getFullYear() + 1, month, day);
}

export function formatDateDisplay(date: Date): string {
  return date.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatYMD(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDeadlineAbbrev(deadlineType: DeadlineType): 'D' | 'O' | 'T' {
  if (deadlineType === 'Target Date') return 'T';
  if (deadlineType === 'File Opened' || deadlineType === 'Most Recent Document Upload') return 'D';
  return 'O';
}

export function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function hasConfirmedTimelines(sr: FileNumber): boolean {
  return (
    sr.fiscalYearEnd != null ||
    sr.lastAgmDate != null ||
    sr.noAgmToDate === true ||
    sr.lastDepreciationReportDate != null ||
    sr.noReportToDate === true ||
    sr.targetDate != null
  );
}
