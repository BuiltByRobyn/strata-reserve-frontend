import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputField, FormRow } from '../../shared/components/FormField';
import { useClientServiceRequest } from '../../shared/hooks/useClientServiceRequest';
import { useTimelines } from '../../shared/hooks/useTimelines';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import type { UpdateTimelinesInput } from '../../shared/types/timeline.types';

const PLACEHOLDER_FILE_OPENED = '—';

function formatFileOpenedDate(isoDate: string | undefined): string {
  if (!isoDate) return PLACEHOLDER_FILE_OPENED;
  try {
    return new Date(isoDate).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return PLACEHOLDER_FILE_OPENED;
  }
}

/** Convert API ISO date to YYYY-MM-DD for input[type="date"] */
function toDateInputValue(iso: string | null): string {
  if (!iso) return '';
  try {
    return iso.split('T')[0];
  } catch {
    return '';
  }
}

/** Format date as "DD Month YYYY" (e.g. 14 May 2026) */
function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
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
  const navigate = useNavigate();
  const { activeRequest, serviceRequestId, loading: srLoading } = useClientServiceRequest();
  const { timelines, loading: timelinesLoading, error: loadError, updateTimelines } = useTimelines(serviceRequestId);

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

  useEffect(() => {
    if (timelines == null || initializedFromTimelines.current) return;
    initializedFromTimelines.current = true;
    setFiscalYearStart(toDateInputValue(timelines.fiscalYearEnd));
    setLastAGM(toDateInputValue(timelines.lastAgmDate));
    setNoAGMToDate(timelines.noAgmToDate);
    setLastDepreciationReport(toDateInputValue(timelines.lastDepreciationReportDate));
    setNoReportToDate(timelines.noReportToDate);
    setTargetDate(toDateInputValue(timelines.targetDate));
    if (timelines.targetDate) {
      setShowCalculatedResults(true);
    }
  }, [timelines]);

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
        'Please select date of last depreciation report or check "No report to date".';
    }

    if (targetDate.trim()) {
      const targetDateObj = new Date(targetDate + 'T00:00:00');
      if (targetDateObj < today) {
        newErrors.targetDate = 'Target date cannot be in the past.';
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setShowCalculatedResults(true);
  };

  const buildPayload = (): UpdateTimelinesInput => ({
    fiscalYearEnd: fiscalYearStart ? new Date(fiscalYearStart + 'T00:00:00').toISOString() : null,
    lastAgmDate: lastAGM ? new Date(lastAGM + 'T00:00:00').toISOString() : null,
    noAgmToDate: noAGMToDate,
    lastDepreciationReportDate: lastDepreciationReport ? new Date(lastDepreciationReport + 'T00:00:00').toISOString() : null,
    noReportToDate: noReportToDate,
    targetDate: targetDate ? new Date(targetDate + 'T00:00:00').toISOString() : null,
  });

  const handleConfirmTimelines = async () => {
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
        'Please select date of last depreciation report or check "No report to date".';
    }
    if (targetDate.trim()) {
      const targetDateObj = new Date(targetDate + 'T00:00:00');
      if (targetDateObj < today) {
        newErrors.targetDate = 'Target date cannot be in the past.';
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      await updateTimelines(buildPayload());
      navigate('/client/survey', { state: { fromTimelines: true } });
    } catch {
      setSaveError('Failed to save timelines. Please try again.');
    }
  };

  const loading = srLoading || (!!serviceRequestId && timelinesLoading);
  const fileOpenedDate = timelines?.requestDate ?? activeRequest?.requestDate;
  const maxDateToday = new Date().toISOString().split('T')[0];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Computed for display (only meaningful when showCalculatedResults)
  const fiscalYearStartDate = fiscalYearStart ? new Date(fiscalYearStart + 'T00:00:00') : null;
  const lastAGMDate = lastAGM && !noAGMToDate ? new Date(lastAGM + 'T00:00:00') : null;
  const nextProjectedAGMDate: Date | null =
    lastAGMDate
      ? getNextAnniversary(lastAGMDate, today)
      : noAGMToDate && fiscalYearStartDate
        ? getNextAnniversary(fiscalYearStartDate, today)
        : null;
  const autoTargetDate: Date | null = nextProjectedAGMDate
    ? addDays(nextProjectedAGMDate, -45)
    : null;
  const displayTargetDate: Date | null = targetDate.trim()
    ? new Date(targetDate + 'T00:00:00')
    : (autoTargetDate && autoTargetDate >= today)
      ? autoTargetDate
      : null;
  const nextFiscalYearStart = fiscalYearStartDate ? getNextAnniversary(fiscalYearStartDate, today) : null;
  const mostRecentFiscalYearStart = fiscalYearStartDate
    ? getMostRecentAnniversary(fiscalYearStartDate, today)
    : null;

  const daysIntoFiscalYear =
    mostRecentFiscalYearStart != null ? daysBetween(mostRecentFiscalYearStart, today) : null;
  const daysRemainingFiscalYear =
    nextFiscalYearStart != null ? daysBetween(today, nextFiscalYearStart) : null;
  const daysSinceLastAGM =
    lastAGMDate != null ? daysBetween(lastAGMDate, today) : null;

  const daysAway = (d: Date) => {
    const diff = daysBetween(today, d);
    return diff === 1 ? '1 day away' : `${diff} days away`;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!serviceRequestId) {
    return (
      <div className="page-container">
        <h1>Timelines</h1>
        <p>No active service request found. Please contact your administrator.</p>
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
                disabled={noAGMToDate}
                max={maxDateToday}
              />
              <div className="timelines-checkbox">
                <input
                  type="checkbox"
                  id="no-agm"
                  checked={noAGMToDate}
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
              <InputField
                label="Date of Last Depreciation Report"
                type="date"
                required={!noReportToDate}
                value={lastDepreciationReport}
                onChange={(e) => setLastDepreciationReport(e.target.value)}
                error={errors.lastDepreciationReport}
                disabled={noReportToDate}
                max={maxDateToday}
              />
              <div className="timelines-checkbox">
                <input
                  type="checkbox"
                  id="no-report"
                  checked={noReportToDate}
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
                min={maxDateToday}
              />
            </div>
          </FormRow>

          {saveError && (
            <p className="error-text" style={{ marginTop: '0.5rem' }}>
              {saveError}
            </p>
          )}
          <div className="timelines-submit">
            <button type="submit" className="btn btn-primary btn-full-width">
              Calculate Timelines
            </button>
          </div>
        </form>

        {showCalculatedResults && (
          <>
            <div className="timelines-divider" />
            <section className="timelines-calculated">
              <h2 className="timelines-calculated__title">Calculated Timelines For This Fiscal Year</h2>
              <div className="timelines-calculated__grid">
                {nextProjectedAGMDate != null && (
                  <div className="timelines-calculated__item">
                    <span className="timelines-calculated__label">Next Projected AGM</span>
                    <span className="timelines-calculated__date">{formatDisplayDate(nextProjectedAGMDate)}</span>
                    <span className="timelines-calculated__meta">
                      {nextProjectedAGMDate >= today ? daysAway(nextProjectedAGMDate) : `${Math.abs(daysBetween(today, nextProjectedAGMDate))} days ago`}
                    </span>
                  </div>
                )}
                {displayTargetDate != null && (
                  <div className="timelines-calculated__item">
                    <span className="timelines-calculated__label">Target Date</span>
                    <span className="timelines-calculated__date">{formatDisplayDate(displayTargetDate)}</span>
                    <span className="timelines-calculated__meta">
                      {displayTargetDate >= today ? daysAway(displayTargetDate) : `${Math.abs(daysBetween(today, displayTargetDate))} days ago`}
                    </span>
                  </div>
                )}
              </div>
            </section>

            <div className="timelines-divider" />
            <section className="timelines-overview">
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
                <div className="timelines-overview-card timelines-overview-card--red">
                  <span className="timelines-overview-card__value">{daysSinceLastAGM ?? '—'}</span>
                  <span className="timelines-overview-card__label">Days Since Last AGM</span>
                </div>
              </div>
            </section>

            {saveError && (
              <p className="error-text" style={{ marginTop: '0.5rem' }}>
                {saveError}
              </p>
            )}
            <div className="timelines-submit">
              <button type="button" className="btn btn-primary btn-full-width" onClick={handleConfirmTimelines}>
                Confirm Timelines
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Timelines;
