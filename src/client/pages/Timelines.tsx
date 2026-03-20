import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { InputField, FormRow } from '../../shared/components/FormField';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { useClientFileNumber } from '../../shared/hooks/useClientFileNumber';
import { useTimelines } from '../../shared/hooks/useTimelines';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { NoFileNumberState } from '../../shared/components/NoFileNumberState';
import { parseLocalDate, toDateInputValue } from '../../shared/utils/dateUtils';
import type { UpdateTimelinesInput } from '../../shared/types/timeline.types';

const PLACEHOLDER_FILE_OPENED = '—';

function formatFileOpenedDate(isoDate: string | undefined): string {
  const date = parseLocalDate(isoDate);
  if (!date) return PLACEHOLDER_FILE_OPENED;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/** Add days to a date (returns new Date) */
function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

/** Difference in calendar days (floor) from a to b */
function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Build a date for the given month/day in the specified year, clamping Feb 29 to Feb 28 in non-leap years */
function buildAnniversaryDate(year: number, month: number, day: number): Date {
  const candidate = new Date(year, month, day);
  // If the month rolled over (e.g. Feb 29 → Mar 1), clamp to last day of intended month
  if (candidate.getMonth() !== month) {
    return new Date(year, month + 1, 0); // last day of the intended month
  }
  return candidate;
}

/** Next anniversary of baseDate that is strictly after referenceDate */
function getNextAnniversary(baseDate: Date, referenceDate: Date): Date {
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

/** Most recent anniversary of baseDate that is on or before referenceDate */
function getMostRecentAnniversary(baseDate: Date, referenceDate: Date): Date {
  const month = baseDate.getMonth();
  const day = baseDate.getDate();
  let year = referenceDate.getFullYear();

  for (let i = 0; i < 10; i++) {
    const candidate = buildAnniversaryDate(year, month, day);
    if (candidate <= referenceDate) return candidate;
    year--;
  }
  return baseDate;
}

const Timelines = () => {
  const location = useLocation();
  const { activeRequest, fileId, loading: srLoading } = useClientFileNumber();
  const { timelines, loading: timelinesLoading, error: loadError, updateTimelines } = useTimelines(fileId);
  const [fiscalYearStart, setFiscalYearStart] = useState('');
  const [lastAGM, setLastAGM] = useState('');
  const [lastDepreciationReport, setLastDepreciationReport] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [noAGMToDate, setNoAGMToDate] = useState(false);
  const [noReportToDate, setNoReportToDate] = useState(false);

  const [errors, setErrors] = useState<{
    fiscalYearStart?: string;
    lastAGM?: string;
    lastDepreciationReport?: string;
    targetDate?: string;
  }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showCalculatedResults, setShowCalculatedResults] = useState(false);

  const initializedFromTimelines = useRef(false);
  const deadlinesSectionRef = useRef<HTMLElement>(null);
  const scrolledToDeadlines = useRef(false);

  useEffect(() => {
    if (timelines == null || initializedFromTimelines.current) return;
    initializedFromTimelines.current = true;
    setFiscalYearStart(toDateInputValue(timelines.fiscalYearEnd));
    setLastAGM(toDateInputValue(timelines.lastAgmDate));
    setNoAGMToDate(timelines.noAgmToDate);
    setLastDepreciationReport(timelines.lastDepreciationReportDate ? timelines.lastDepreciationReportDate.substring(0, 4) : '');
    setNoReportToDate(timelines.noReportToDate);
    setTargetDate(toDateInputValue(timelines.targetDate));
    const hasRequiredFields =
      (timelines.lastAgmDate || timelines.noAgmToDate) &&
      (timelines.lastDepreciationReportDate || timelines.noReportToDate);
    if (timelines.timelinesSubmittedAt || hasRequiredFields) {
      setShowCalculatedResults(true);
    }
  }, [timelines]);

  useEffect(() => {
    if (!location.state?.scrollToDeadlines || scrolledToDeadlines.current || !showCalculatedResults) return;
    if (!deadlinesSectionRef.current) return;
    scrolledToDeadlines.current = true;
    deadlinesSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.state, showCalculatedResults]);

  const buildPayload = (): UpdateTimelinesInput => ({
    fiscalYearEnd: fiscalYearStart || null,
    lastAgmDate: lastAGM || null,
    noAgmToDate: noAGMToDate,
    lastDepreciationReportDate: lastDepreciationReport ? `${lastDepreciationReport}-01-01` : null,
    noReportToDate: noReportToDate,
    targetDate: targetDate || null,
  });

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    const newErrors: typeof errors = {};

    if (!fiscalYearStart.trim()) {
      newErrors.fiscalYearStart = 'Please select a fiscal year start date.';
    }
    if (!noAGMToDate && !lastAGM.trim()) {
      newErrors.lastAGM = 'Please select date of last AGM or check "No AGM to date".';
    }
    if (!noReportToDate && !lastDepreciationReport.trim()) {
      newErrors.lastDepreciationReport =
        'Please select the year of the last depreciation report or check "No report to date".';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      await updateTimelines(buildPayload());
      setShowCalculatedResults(true);
    } catch {
      setSaveError('Failed to save timelines. Please try again.');
    }
  };

  const isLocked = !!timelines?.timelinesSubmittedAt;
  const loading = srLoading || (!!fileId && timelinesLoading);
  const fileOpenedDate = timelines?.requestDate ?? activeRequest?.requestDate;
  const maxDateToday = new Date().toISOString().split('T')[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fiscalYearStartDate = fiscalYearStart ? new Date(fiscalYearStart + 'T00:00:00') : null;
  const nextFiscalYearStart = fiscalYearStartDate ? getNextAnniversary(fiscalYearStartDate, today) : null;
  const mostRecentFiscalYearStart = fiscalYearStartDate ? getMostRecentAnniversary(fiscalYearStartDate, today) : null;
  const currentYear = today.getFullYear();
  const fiscalYearStartYear = fiscalYearStartDate?.getFullYear() ?? null;
  const maxTargetDate =
    fiscalYearStartDate !== null &&
    fiscalYearStartYear !== null &&
    (fiscalYearStartYear === currentYear || fiscalYearStartYear === currentYear - 1)
      ? addDays(fiscalYearStartDate, 395)
      : null;
  const autoTargetDate: Date | null = nextFiscalYearStart ? addDays(nextFiscalYearStart, -30) : null;
  const displayTargetDate: Date | null = targetDate.trim()
    ? new Date(targetDate + 'T00:00:00')
    : (autoTargetDate && autoTargetDate >= today) ? autoTargetDate : null;

  const daysIntoFiscalYear = mostRecentFiscalYearStart != null ? daysBetween(mostRecentFiscalYearStart, today) : null;
  const daysRemainingFiscalYear = nextFiscalYearStart != null ? daysBetween(today, nextFiscalYearStart) : null;
  const daysUntilTargetDate = displayTargetDate != null ? daysBetween(today, displayTargetDate) : null;

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!fileId) {
    return (
      <div className="page-container page-container--full">
        <h1>Timelines</h1>
        <NoFileNumberState />
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>Timelines</h1>
      <p className="page-subtitle">
        Please confirm the following important dates so we can ensure that we meet your timelines
      </p>

      {loadError && (
        <p className="error-message" style={{ marginBottom: '1rem' }}>
          {loadError}
        </p>
      )}

      <div className="timelines-card">
        <div className="timelines-file-opened">
          <span className="timelines-file-opened__label">File Opened</span>
          <span className="timelines-file-opened__value">
            {formatFileOpenedDate(fileOpenedDate) || PLACEHOLDER_FILE_OPENED}
          </span>
        </div>

        <form onSubmit={handleCalculate} noValidate>
          <FormRow>
            <div>
              <InputField
                label="Current Fiscal Year Start Date"
                type="date"
                required
                value={fiscalYearStart}
                onChange={(e) => setFiscalYearStart(e.target.value)}
                error={errors.fiscalYearStart}
                max={maxDateToday}
                disabled={isLocked}
              />
            </div>

            <div>
              <InputField
                label="Date of Last AGM?"
                type="date"
                required={!noAGMToDate}
                value={lastAGM}
                onChange={(e) => setLastAGM(e.target.value)}
                error={errors.lastAGM}
                disabled={noAGMToDate || isLocked}
                max={maxDateToday}
              />
              <div className="timelines-checkbox">
                <input
                  type="checkbox"
                  id="no-agm"
                  checked={noAGMToDate}
                  disabled={isLocked}
                  onChange={(e) => {
                    setNoAGMToDate(e.target.checked);
                    if (e.target.checked) setErrors((prev) => ({ ...prev, lastAGM: undefined }));
                  }}
                />
                <label htmlFor="no-agm">No AGM to date</label>
              </div>
            </div>
          </FormRow>

          <FormRow>
            <div>
              <SingleSelectDropdown
                label="Year of Last Depreciation Report"
                required={!noReportToDate}
                value={lastDepreciationReport}
                onChange={(val) => setLastDepreciationReport(val ?? '')}
                options={Array.from({ length: 41 }, (_, i) => new Date().getFullYear() - i).map(y => ({ value: String(y), label: String(y) }))}
                placeholder="Select year"
                disabled={noReportToDate || isLocked}
                error={errors.lastDepreciationReport}
              />
              <div className="timelines-checkbox">
                <input
                  type="checkbox"
                  id="no-report"
                  checked={noReportToDate}
                  disabled={isLocked}
                  onChange={(e) => {
                    setNoReportToDate(e.target.checked);
                    if (e.target.checked) setErrors((prev) => ({ ...prev, lastDepreciationReport: undefined }));
                  }}
                />
                <label htmlFor="no-report">No report to date</label>
              </div>
            </div>

            <div>
              <InputField
                label="Target Date (if applicable)"
                type="date"
                value={targetDate}
                onChange={(e) => {
                  setTargetDate(e.target.value);
                  if (errors.targetDate) setErrors((prev) => ({ ...prev, targetDate: undefined }));
                }}
                error={errors.targetDate}
                disabled={isLocked || (daysIntoFiscalYear !== null && daysIntoFiscalYear > 395)}
                max={maxTargetDate ? maxTargetDate.toISOString().split('T')[0] : undefined}
              />
            </div>
          </FormRow>

          {saveError && (
            <p className="error-text" style={{ marginTop: '0.5rem' }}>
              {saveError}
            </p>
          )}
          <div className="timelines-submit">
            <button type="submit" className="btn btn-primary btn-full-width" disabled={isLocked}>
              Calculate Timelines
            </button>
          </div>
        </form>

        {showCalculatedResults && (
          <>
            <div className="timelines-divider" />
            <section className="timelines-overview" ref={deadlinesSectionRef}>
              <h2 className="timelines-overview__title">Timeline Overview</h2>
              <div className="timelines-overview__cards">
                <div className="timelines-overview-card timelines-overview-card--green">
                  <span className="timelines-overview-card__value">{daysIntoFiscalYear ?? '—'}</span>
                  <span className="timelines-overview-card__label">Days Into Current Fiscal Year</span>
                </div>
                <div className="timelines-overview-card timelines-overview-card--green">
                  <span className="timelines-overview-card__value">{daysRemainingFiscalYear ?? '—'}</span>
                  <span className="timelines-overview-card__label">Days Remaining Until Next Fiscal Year</span>
                </div>
                <div className="timelines-overview-card timelines-overview-card--green">
                  <span className="timelines-overview-card__title">
                    {targetDate.trim() ? 'Your Target Date' : 'Our Target Date'}
                  </span>
                  <span className="timelines-overview-card__value">
                    {displayTargetDate
                      ? displayTargetDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long' })
                      : '—'}
                  </span>
                  {!targetDate.trim() && (
                    <span className="timelines-overview-card__label">(30 days before fiscal year end)</span>
                  )}
                  {daysUntilTargetDate != null && (
                    <span className="timelines-overview-card__subvalue">{daysUntilTargetDate} days remaining</span>
                  )}
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default Timelines;
