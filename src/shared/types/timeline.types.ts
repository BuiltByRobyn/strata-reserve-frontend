export interface TimelineData {
  serviceRequestId: number;
  requestDate: string;
  fiscalYearEnd: string | null;
  lastAgmDate: string | null;
  noAgmToDate: boolean;
  lastDepreciationReportDate: string | null;
  noReportToDate: boolean;
  targetDate: string | null;
}

export interface UpdateTimelinesInput {
  fiscalYearEnd?: string | null;
  lastAgmDate?: string | null;
  noAgmToDate?: boolean;
  lastDepreciationReportDate?: string | null;
  noReportToDate?: boolean;
  targetDate?: string | null;
}
