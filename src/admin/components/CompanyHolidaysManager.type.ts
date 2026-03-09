import type { CompanyHoliday } from '../../shared/types/entities.types';

export type DisplayHoliday = CompanyHoliday & { displayYear: number; displayDate: string };
