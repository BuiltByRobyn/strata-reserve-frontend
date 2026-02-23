import { useState, useEffect, useMemo } from 'react';
import { useServiceRequests } from '../../shared/hooks/useServiceRequests';
import { useAuthFetch } from '../../shared/hooks/useAuthFetch';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { Modal } from '../../shared/components/Modal';
import { InputField } from '../../shared/components/FormField';
import { Tabs } from '../../shared/components/Tabs';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import type { ServiceRequest } from '../../shared/types/entities.types';
import type { UpdateTimelinesInput, DeadlineType, DeadlineRow, EditFormData } from '../../shared/types/timeline.types';
import { API_BASE } from '../../shared/lib/api';

function buildAnniversaryDate(year: number, month: number, day: number): Date {
  const candidate = new Date(year, month, day);
  if (candidate.getMonth() !== month) {
    return new Date(year, month + 1, 0);
  }
  return candidate;
}

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

function parseLocalDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  try {
    const datePart = typeof iso === 'string' ? iso.split('T')[0] : '';
    if (!datePart || !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
    const [y, m, d] = datePart.split('-').map(Number);
    return new Date(y, m - 1, d);
  } catch {
    return null;
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  try { return iso.split('T')[0]; } catch { return ''; }
}

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


export default function TimelinesPage() {
  const { serviceRequests, loading, error, refetch } = useServiceRequests();
  const authFetch = useAuthFetch();
  const isDesktop = useMediaQuery('(min-width: 750px)');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ServiceRequest | null>(null);
  const [editingDeadlineType, setEditingDeadlineType] = useState<DeadlineType | null>(null);
  const [formData, setFormData] = useState<EditFormData>({
    fiscalYearEnd: '', lastAgmDate: '', noAgmToDate: false,
    lastDepreciationReportDate: '', noReportToDate: false, targetDate: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState('all');
  const [filterStrataName, setFilterStrataName] = useState('');
  const [filterStrataPlan, setFilterStrataPlan] = useState('');
  const [filterDeadlineType, setFilterDeadlineType] = useState('');

  const [showPastDates, setShowPastDates] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    refetch({ archived: false });
  }, [refetch]);

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

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const deadlineRows = useMemo(() => {
    const rows: DeadlineRow[] = [];

    for (const sr of confirmedList) {
      const strataId = sr.strata?.strataId ?? 0;
      const strataPlan = sr.strata?.strataPlan || '—';
      const complexName = sr.strata?.complexName || '—';
      const srId = sr.serviceRequestId;

      const fiscalDate = parseLocalDate(sr.fiscalYearEnd);
      const lastAgm = parseLocalDate(sr.lastAgmDate);
      const lastReport = parseLocalDate(sr.lastDepreciationReportDate);
      const target = parseLocalDate(sr.targetDate);

      // Last AGM Date (historical)
      if (lastAgm) {
        rows.push({ id: `${srId}-last-agm`, date: lastAgm, deadlineType: 'Last AGM Date', strataPlan, complexName, strataId, serviceRequest: sr });
      }

      // Next Projected AGM
      let nextAgm: Date | null = null;
      if (lastAgm) {
        nextAgm = getNextAnniversary(lastAgm, today);
      } else if (sr.noAgmToDate && fiscalDate) {
        nextAgm = getNextAnniversary(fiscalDate, today);
      }
      if (nextAgm) {
        rows.push({ id: `${srId}-agm`, date: nextAgm, deadlineType: 'Next Projected AGM', strataPlan, complexName, strataId, serviceRequest: sr });
      }

      // Last Depreciation Report Date (historical)
      if (lastReport) {
        rows.push({ id: `${srId}-last-dep`, date: lastReport, deadlineType: 'Last Depreciation Report Date', strataPlan, complexName, strataId, serviceRequest: sr });
      }

      // Next Projected Depreciation
      if (lastReport) {
        const nextReport = getNextAnniversary(lastReport, today);
        rows.push({ id: `${srId}-dep`, date: nextReport, deadlineType: 'Next Projected Depreciation', strataPlan, complexName, strataId, serviceRequest: sr });
      }

      // Target Date
      if (target) {
        rows.push({ id: `${srId}-target`, date: target, deadlineType: 'Target Date', strataPlan, complexName, strataId, serviceRequest: sr });
      }
    }

    rows.sort((a, b) => a.date.getTime() - b.date.getTime());
    return rows;
  }, [confirmedList, today]);

  const strataNameOptions = useMemo(() => {
    const seen = new Set<number>();
    return confirmedList
      .filter(sr => {
        if (!sr.strata || !sr.strata.complexName || seen.has(sr.strata.strataId)) return false;
        seen.add(sr.strata.strataId);
        return true;
      })
      .map(sr => ({ value: sr.strata!.strataId, label: sr.strata!.complexName! }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [confirmedList]);

  const strataPlanOptions = useMemo(() => {
    const seen = new Set<number>();
    return confirmedList
      .filter(sr => {
        if (!sr.strata || !sr.strata.strataPlan || seen.has(sr.strata.strataId)) return false;
        seen.add(sr.strata.strataId);
        return true;
      })
      .map(sr => ({ value: sr.strata!.strataId, label: sr.strata!.strataPlan! }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [confirmedList]);

  const filteredRows = useMemo(() => {
    let rows = deadlineRows;

    // Show Past Dates toggle
    if (!showPastDates) {
      rows = rows.filter(r => r.date >= today);
    }

    // Tab filters
    if (activeTab === 'overdue') {
      rows = rows.filter(r => r.date < today);
    } else if (activeTab === 'next7') {
      const in7 = new Date(today);
      in7.setDate(in7.getDate() + 7);
      rows = rows.filter(r => r.date >= today && r.date <= in7);
    } else if (activeTab === 'next30') {
      const in30 = new Date(today);
      in30.setDate(in30.getDate() + 30);
      rows = rows.filter(r => r.date >= today && r.date <= in30);
    }

    // Deadline Type dropdown
    if (filterDeadlineType) {
      const typeMap: Record<string, string[]> = {
        agm: ['Last AGM Date', 'Next Projected AGM'],
        depreciation: ['Last Depreciation Report Date', 'Next Projected Depreciation'],
        target: ['Target Date'],
      };
      const matches = typeMap[filterDeadlineType];
      if (matches) rows = rows.filter(r => matches.includes(r.deadlineType));
    }

    // Strata Name dropdown
    if (filterStrataName) {
      const id = parseInt(filterStrataName);
      rows = rows.filter(r => r.strataId === id);
    }

    // Strata Plan dropdown
    if (filterStrataPlan) {
      const id = parseInt(filterStrataPlan);
      rows = rows.filter(r => r.strataId === id);
    }

    // Date range
    if (dateFrom) {
      const from = new Date(dateFrom + 'T00:00:00');
      rows = rows.filter(r => r.date >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + 'T00:00:00');
      rows = rows.filter(r => r.date <= to);
    }

    return rows;
  }, [deadlineRows, showPastDates, activeTab, filterDeadlineType, filterStrataName, filterStrataPlan, dateFrom, dateTo, today]);

  const deadlineTabs = [
    { key: 'all', label: 'All Deadlines' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'next7', label: 'Next 7 Days' },
    { key: 'next30', label: 'Next 30 Days' },
  ];

  const maxDateToday = new Date().toISOString().split('T')[0];

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDeadlineType(null);
  };

  const openEditModal = (sr: ServiceRequest, deadlineType: DeadlineType) => {
    setEditingRecord(sr);
    setEditingDeadlineType(deadlineType);
    setFormData({
      fiscalYearEnd: toDateInputValue(sr.fiscalYearEnd),
      lastAgmDate: toDateInputValue(sr.lastAgmDate),
      noAgmToDate: sr.noAgmToDate ?? false,
      lastDepreciationReportDate: toDateInputValue(sr.lastDepreciationReportDate),
      noReportToDate: sr.noReportToDate ?? false,
      targetDate: toDateInputValue(sr.targetDate),
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const isAgmType = editingDeadlineType === 'Last AGM Date' || editingDeadlineType === 'Next Projected AGM';
  const isDepreciationType = editingDeadlineType === 'Last Depreciation Report Date' || editingDeadlineType === 'Next Projected Depreciation';
  const isTargetType = editingDeadlineType === 'Target Date';

  const getModalTitle = (type: DeadlineType | null): string => {
    switch (type) {
      case 'Last AGM Date':
      case 'Next Projected AGM':
        return 'Edit AGM Date';
      case 'Last Depreciation Report Date':
      case 'Next Projected Depreciation':
        return 'Edit Depreciation Report Date';
      case 'Target Date':
        return 'Edit Target Date';
      default: return 'Edit Timelines';
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const todayValidation = new Date();
    todayValidation.setHours(0, 0, 0, 0);

    if (isAgmType) {
      if (!formData.fiscalYearEnd.trim()) {
        setFormError('Fiscal year start date is required.');
        return;
      }
      if (!formData.noAgmToDate && !formData.lastAgmDate.trim()) {
        setFormError('Date of last AGM is required, or check "No AGM to date".');
        return;
      }
      if (formData.lastAgmDate.trim()) {
        const agmDate = new Date(formData.lastAgmDate + 'T00:00:00');
        if (agmDate > todayValidation) {
          setFormError('Last AGM date cannot be in the future.');
          return;
        }
      }
    }

    if (isDepreciationType) {
      if (!formData.noReportToDate && !formData.lastDepreciationReportDate.trim()) {
        setFormError('Date of last depreciation report is required, or check "No report to date".');
        return;
      }
    }

    if (isTargetType) {
      if (formData.targetDate.trim()) {
        const targetDateObj = new Date(formData.targetDate + 'T00:00:00');
        if (targetDateObj < todayValidation) {
          setFormError('Target date cannot be in the past.');
          return;
        }
      }
    }

    if (!editingRecord) return;

    setIsSubmitting(true);
    setFormError(null);

    let payload: UpdateTimelinesInput = {};

    if (isAgmType) {
      payload = {
        fiscalYearEnd: formData.fiscalYearEnd ? new Date(formData.fiscalYearEnd + 'T00:00:00').toISOString() : null,
        lastAgmDate: formData.lastAgmDate ? new Date(formData.lastAgmDate + 'T00:00:00').toISOString() : null,
        noAgmToDate: formData.noAgmToDate,
      };
    } else if (isDepreciationType) {
      payload = {
        lastDepreciationReportDate: formData.lastDepreciationReportDate ? new Date(formData.lastDepreciationReportDate + 'T00:00:00').toISOString() : null,
        noReportToDate: formData.noReportToDate,
      };
    } else if (isTargetType) {
      payload = {
        targetDate: formData.targetDate ? new Date(formData.targetDate + 'T00:00:00').toISOString() : null,
      };
    }

    try {
      const response = await authFetch(
        `${API_BASE}/admin/service-requests/${editingRecord.serviceRequestId}/timelines`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to update timelines');
      closeModal();
      refetch({ archived: false });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const desktopColumns: Column<DeadlineRow>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (row) => formatDate(row.date),
    },
    {
      key: 'deadlineType',
      header: 'Deadline Type',
      render: (row) => row.deadlineType,
    },
    {
      key: 'strataPlan',
      header: 'Strata Plan',
      render: (row) => row.strataPlan,
    },
    {
      key: 'complexName',
      header: 'Complex Name',
      render: (row) => row.complexName,
    },
  ];

  const mobileColumns: Column<DeadlineRow>[] = [
    {
      key: 'strataPlan',
      header: 'Strata Plan',
      render: (row) => row.strataPlan,
    },
    {
      key: 'complexName',
      header: 'Complex Name',
      render: (row) => row.complexName,
    },
  ];

  return (
    <div className="timelines-page">
      <h1>Timelines & Deadlines</h1>

      <Tabs
        tabs={deadlineTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        variant="pill"
      />

      <div className="filters-row">
        <SingleSelectDropdown
          label="Deadline Type"
          value={filterDeadlineType}
          onChange={setFilterDeadlineType}
          options={[
            { value: 'agm', label: 'AGM' },
            { value: 'depreciation', label: 'Depreciation Report' },
            { value: 'target', label: 'Target Date' },
          ]}
          placeholder="All Types"
        />
        <SingleSelectDropdown
          label="Strata Name"
          value={filterStrataName}
          onChange={setFilterStrataName}
          options={strataNameOptions}
          placeholder="All Strata"
        />
        <SingleSelectDropdown
          label="Strata Plan"
          value={filterStrataPlan}
          onChange={setFilterStrataPlan}
          options={strataPlanOptions}
          placeholder="All Plans"
        />
        <div className="date-range-filter">
          <InputField
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <InputField
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div className="form-field archived-toggle">
          <label>
            <input
              type="checkbox"
              checked={showPastDates}
              onChange={() => setShowPastDates(prev => !prev)}
            />
            Show Past Dates
          </label>
        </div>
      </div>

      {error && (
        <p className="error-message" style={{ marginBottom: '1rem' }}>
          {error}
        </p>
      )}

      <DataTable
        title={isDesktop ? undefined : 'Timelines'}
        columns={isDesktop ? desktopColumns : mobileColumns}
        data={filteredRows}
        keyExtractor={(row) => row.id}
        loading={loading}
        emptyMessage="No deadlines found."
        onRowClick={(row) => openEditModal(row.serviceRequest, row.deadlineType)}
        actions={(row) => (
          <button className="btn-edit" onClick={() => openEditModal(row.serviceRequest, row.deadlineType)}>Edit</button>
        )}
        actionsColumnHeader="Action"
      />

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={getModalTitle(editingDeadlineType)}
        size="medium"
        footer={
          <>
            <button className="btn-secondary" onClick={closeModal}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Update'}
            </button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit}>
          {formError && <div className="form-error">{formError}</div>}

          {isAgmType && (
            <>
              <InputField
                label="Fiscal year start date"
                type="date"
                required
                value={formData.fiscalYearEnd}
                onChange={(e) => setFormData(prev => ({ ...prev, fiscalYearEnd: e.target.value }))}
                max={maxDateToday}
              />
              <InputField
                label="Date of last AGM"
                type="date"
                required={!formData.noAgmToDate}
                value={formData.lastAgmDate}
                onChange={(e) => setFormData(prev => ({ ...prev, lastAgmDate: e.target.value }))}
                disabled={formData.noAgmToDate}
                max={maxDateToday}
              />
              <div className="timelines-checkbox">
                <input
                  type="checkbox"
                  id="edit-no-agm"
                  checked={formData.noAgmToDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, noAgmToDate: e.target.checked }))}
                />
                <label htmlFor="edit-no-agm">No AGM to date</label>
              </div>
            </>
          )}

          {isDepreciationType && (
            <>
              <InputField
                label="Date of last depreciation report"
                type="date"
                required={!formData.noReportToDate}
                value={formData.lastDepreciationReportDate}
                onChange={(e) => setFormData(prev => ({ ...prev, lastDepreciationReportDate: e.target.value }))}
                disabled={formData.noReportToDate}
                max={maxDateToday}
              />
              <div className="timelines-checkbox">
                <input
                  type="checkbox"
                  id="edit-no-report"
                  checked={formData.noReportToDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, noReportToDate: e.target.checked }))}
                />
                <label htmlFor="edit-no-report">No report to date</label>
              </div>
            </>
          )}

          {isTargetType && (
            <InputField
              label="Target date"
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
              min={maxDateToday}
            />
          )}
        </form>
      </Modal>
    </div>
  );
}
