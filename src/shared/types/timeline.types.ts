import type { FileNumber } from './entities.types';

export interface TimelineData {
  fileId: number;
  requestDate: string;
  fiscalYearEnd: string | null;
  lastAgmDate: string | null;
  noAgmToDate: boolean;
  lastDepreciationReportDate: string | null;
  noReportToDate: boolean;
  targetDate: string | null;
  timelinesSubmittedAt: string | null;
}

export interface UpdateTimelinesInput {
  fiscalYearEnd?: string | null;
  lastAgmDate?: string | null;
  noAgmToDate?: boolean;
  lastDepreciationReportDate?: string | null;
  noReportToDate?: boolean;
  targetDate?: string | null;
}

export type DeadlineType = 'Fiscal Year Start' | 'Last AGM Date' | 'Next Projected AGM' | 'Last Depreciation Report Date' | 'Next Projected Depreciation' | 'Target Date' | 'File Opened' | 'Most Recent Document Upload' | 'Survey Submitted' | 'Last Survey Answer Date';

export interface DeadlineRow {
  id: string;
  date: Date;
  deadlineType: DeadlineType;
  strataPlan: string;
  complexName: string;
  strataId: number;
  fileNumber: FileNumber;
}

export interface EditFormData {
  fiscalYearEnd: string;
  lastAgmDate: string;
  noAgmToDate: boolean;
  lastDepreciationReportDate: string;
  noReportToDate: boolean;
  targetDate: string;
}
