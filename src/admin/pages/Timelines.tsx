import { useEffect, useMemo } from 'react';
import { useServiceRequests } from '../../shared/hooks/useServiceRequests';
import { DataTable, type Column } from '../../shared/components/DataTable';
import type { ServiceRequest } from '../../shared/types/entities.types';

/** Format API date (ISO or YYYY-MM-DD) as calendar date so it matches service_request table regardless of timezone */
function formatDateOrPlaceholder(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const datePart = typeof iso === 'string' ? iso.split('T')[0] : '';
    if (!datePart || !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return '—';
    const [y, m, d] = datePart.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

/** Service request has confirmed timelines if at least one timeline field is set or one "no … to date" is true */
function hasConfirmedTimelines(sr: ServiceRequest): boolean {
  return (
    sr.fiscalYearEnd != null ||
    sr.lastAgmDate != null ||
    sr.noAgmToDate === true ||
    sr.lastDepreciationReportDate != null ||
    sr.noReportToDate === true ||
    sr.targetDate != null
  );
}

function lastAGMDisplay(sr: ServiceRequest): string {
  if (sr.noAgmToDate) return 'No AGM to date';
  return formatDateOrPlaceholder(sr.lastAgmDate ?? null);
}

function lastReportDisplay(sr: ServiceRequest): string {
  if (sr.noReportToDate) return 'No report to date';
  return formatDateOrPlaceholder(sr.lastDepreciationReportDate ?? null);
}

export default function TimelinesPage() {
  const { serviceRequests, loading, error, refetch } = useServiceRequests();

  useEffect(() => {
    refetch({ archived: false });
  }, [refetch]);

  // Refetch when user returns to this tab so client-side timeline updates are visible
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refetch({ archived: false });
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [refetch]);

  const confirmedList = useMemo(() => {
    return serviceRequests.filter(hasConfirmedTimelines);
  }, [serviceRequests]);

  const columns: Column<ServiceRequest>[] = [
    {
      key: 'strata',
      header: 'Strata',
      render: (sr) =>
        [sr.strata?.strataPlan, sr.strata?.complexName].filter(Boolean).join(' – ') || '—',
    },
    {
      key: 'fiscalYearEnd',
      header: 'Fiscal year start',
      render: (sr) => formatDateOrPlaceholder(sr.fiscalYearEnd ?? null),
    },
    {
      key: 'lastAGM',
      header: 'Last AGM',
      render: lastAGMDisplay,
    },
    {
      key: 'lastDepreciationReport',
      header: 'Last depreciation report',
      render: lastReportDisplay,
    },
    {
      key: 'targetDate',
      header: 'Target date',
      render: (sr) => formatDateOrPlaceholder(sr.targetDate ?? null),
    },
    {
      key: 'requestDate',
      header: 'File opened',
      render: (sr) => formatDateOrPlaceholder(sr.requestDate),
    },
  ];

  return (
    <div className="page-container">
      <h1>Timelines & Deadlines</h1>

      {error && (
        <p className="error-message" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      <DataTable
        columns={columns}
        data={confirmedList}
        keyExtractor={(sr) => String(sr.serviceRequestId)}
        loading={loading}
        emptyMessage="No confirmed timelines yet."
      />
    </div>
  );
}
