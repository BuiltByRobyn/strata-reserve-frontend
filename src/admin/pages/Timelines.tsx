import { useState, useEffect, useMemo } from 'react';
import { useFileNumbers } from '../../shared/hooks/useFileNumbers';
import { usePermissions } from '../../shared/hooks/usePermissions';
import { useAuthFetch } from '../../shared/hooks/useAuthFetch';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Modal } from '../../shared/components/Modal';
import { InputField } from '../../shared/components/FormField';
import { Tabs } from '../../shared/components/Tabs';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import BookingCalendar from '../../shared/components/BookingCalendar';
import type { FileNumber } from '../../shared/types/entities.types';
import type { UpdateTimelinesInput, DeadlineType, DeadlineRow, EditFormData } from '../../shared/types/timeline.types';
import type { CalendarMilestone } from '../../shared/types/appointment.types';
import { API_BASE } from '../../shared/lib/api';
import { parseLocalDate, toDateInputValue } from '../../shared/utils/dateUtils';
import { getNextAnniversary, formatDateDisplay, formatYMD, getDeadlineAbbrev, daysBetween, hasConfirmedTimelines } from '../../shared/utils/timelineUtils';


export default function TimelinesPage() {
  const { fileNumbers, loading, error, refetch } = useFileNumbers();
  const { canDelete } = usePermissions();
  const authFetch = useAuthFetch();
  const isDesktop = useMediaQuery('(min-width: 900px)');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingRows, setViewingRows] = useState<DeadlineRow[] | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FileNumber | null>(null);
  const [editingDeadlineType, setEditingDeadlineType] = useState<DeadlineType | null>(null);
  const [formData, setFormData] = useState<EditFormData>({
    fiscalYearEnd: '', lastAgmDate: '', noAgmToDate: false,
    lastDepreciationReportDate: '', noReportToDate: false, targetDate: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCreateSrId, setSelectedCreateSrId] = useState('');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<FileNumber | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState('all');
  const [filterStrataName, setFilterStrataName] = useState('');
  const [filterStrataPlan, setFilterStrataPlan] = useState('');
  const [filterDeadlineType, setFilterDeadlineType] = useState('');

  const [showPastDates, setShowPastDates] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

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
    return fileNumbers.filter(hasConfirmedTimelines);
  }, [fileNumbers]);



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
      const srId = sr.fileId;

      const fiscalDate = parseLocalDate(sr.fiscalYearEnd);
      const lastAgm = parseLocalDate(sr.lastAgmDate);
      const target = parseLocalDate(sr.targetDate);

      // Fiscal Year Start
      if (fiscalDate) {
        rows.push({ id: `${srId}-fiscal-year`, date: fiscalDate, deadlineType: 'Fiscal Year Start', strataPlan, complexName, strataId, fileNumber: sr });
      }

      // Last AGM Date (historical)
      if (lastAgm) {
        rows.push({ id: `${srId}-last-agm`, date: lastAgm, deadlineType: 'Last AGM Date', strataPlan, complexName, strataId, fileNumber: sr });
      }

      // Next Projected AGM
      let nextAgm: Date | null = null;
      if (lastAgm) {
        nextAgm = getNextAnniversary(lastAgm, today);
      } else if (sr.noAgmToDate && fiscalDate) {
        nextAgm = getNextAnniversary(fiscalDate, today);
      }
      if (nextAgm) {
        rows.push({ id: `${srId}-agm`, date: nextAgm, deadlineType: 'Next Projected AGM', strataPlan, complexName, strataId, fileNumber: sr });
      }

      // Target Date
      if (target) {
        rows.push({ id: `${srId}-target`, date: target, deadlineType: 'Target Date', strataPlan, complexName, strataId, fileNumber: sr });
      }

      // File Opened
      const fileOpened = parseLocalDate(sr.requestDate);
      if (fileOpened) {
        rows.push({ id: `${srId}-file-opened`, date: fileOpened, deadlineType: 'File Opened', strataPlan, complexName, strataId, fileNumber: sr });
      }

      // Documents Finalized
      const latestDocFinalized = parseLocalDate(sr.latestDocumentFinalizedDate);
      if (latestDocFinalized) {
        rows.push({ id: `${srId}-doc-finalized`, date: latestDocFinalized, deadlineType: 'Documents Finalized', strataPlan, complexName, strataId, fileNumber: sr });
      }

      // Survey Answers Finalized
      const surveySubmitted = parseLocalDate(sr.submittedForReviewDate);
      if (surveySubmitted) {
        rows.push({ id: `${srId}-survey-submitted`, date: surveySubmitted, deadlineType: 'Survey Answers Finalized', strataPlan, complexName, strataId, fileNumber: sr });
      }

      // Last Depreciation Report Date
      const lastDeprec = parseLocalDate(sr.lastDepreciationReportDate);
      if (lastDeprec) {
        rows.push({ id: `${srId}-last-depreciation`, date: lastDeprec, deadlineType: 'Last Depreciation Report Date', strataPlan, complexName, strataId, fileNumber: sr });
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
    const pastFirst = ['fiscalYear', 'fileOpened', 'surveySubmitted', 'documentUpload', 'depreciation'].includes(filterDeadlineType);
    if (activeTab === 'overdue') {
      rows = rows.filter(r => r.date < today);
    } else if (activeTab === 'next7') {
      if (pastFirst) {
        const past7 = new Date(today);
        past7.setDate(past7.getDate() - 7);
        rows = rows.filter(r => r.date >= past7 && r.date <= today);
      } else {
        const in7 = new Date(today);
        in7.setDate(in7.getDate() + 7);
        rows = rows.filter(r => r.date >= today && r.date <= in7);
      }
    } else if (activeTab === 'next30') {
      if (pastFirst) {
        const past30 = new Date(today);
        past30.setDate(past30.getDate() - 30);
        rows = rows.filter(r => r.date >= past30 && r.date <= today);
      } else {
        const in30 = new Date(today);
        in30.setDate(in30.getDate() + 30);
        rows = rows.filter(r => r.date >= today && r.date <= in30);
      }
    }

    // Deadline Type dropdown
    if (filterDeadlineType) {
      const typeMap: Record<string, string[]> = {
        fiscalYear: ['Fiscal Year Start'],
        agm: ['Last AGM Date', 'Next Projected AGM'],
        depreciation: ['Last Depreciation Report Date', 'Next Projected Depreciation'],
        target: ['Target Date'],
        fileOpened: ['File Opened'],
        documentUpload: ['Documents Finalized'],
        surveySubmitted: ['Survey Answers Finalized'],
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

  const isPastFirstType = ['fiscalYear', 'fileOpened', 'surveySubmitted', 'documentUpload'].includes(filterDeadlineType);

  const deadlineTabs = [
    { key: 'all', label: 'All Deadlines' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'next7', label: isPastFirstType ? 'Last 7 Days' : 'Next 7 Days' },
    { key: 'next30', label: isPastFirstType ? 'Last 30 Days' : 'Next 30 Days' },
  ];

  const calendarMilestones = useMemo((): CalendarMilestone[] => {
    return filteredRows.map(row => ({
      date: formatYMD(row.date),
      label: `${(row.fileNumber.fileNumber ?? '—')}\n${row.strataPlan}:${getDeadlineAbbrev(row.deadlineType)}`,
    }));
  }, [filteredRows]);

  const maxDateToday = new Date().toISOString().split('T')[0];
  const minTargetDate = (() => { const d = new Date(); d.setDate(d.getDate() + 45); return d.toISOString().split('T')[0]; })();

  const getViewTimelineRows = (row: DeadlineRow) => {
    const opened = parseLocalDate(row.fileNumber.requestDate);
    return [
      { label: 'Strata Plan', value: row.strataPlan },
      { label: 'Complex Name', value: row.complexName },
      { label: 'File Number', value: (row.fileNumber.fileNumber ?? '—') },
      { label: 'Deadline Type', value: row.deadlineType },
      { label: 'Date', value: formatDateDisplay(row.date) },
      { label: 'Days Open', value: opened ? String(daysBetween(opened, today)) : '—' },
    ];
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDeadlineType(null);
    setIsCreating(false);
    setSelectedCreateSrId('');
  };

  const openCreateModal = () => {
    setIsCreating(true);
    setEditingRecord(null);
    setEditingDeadlineType(null);
    setSelectedCreateSrId('');
    setFormData({
      fiscalYearEnd: '', lastAgmDate: '', noAgmToDate: false,
      lastDepreciationReportDate: '', noReportToDate: false, targetDate: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openDeleteModal = (sr: FileNumber) => {
    setRecordToDelete(sr);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!recordToDelete || !editingDeadlineType) return;
    setDeleteSubmitting(true);
    try {
      const payload: UpdateTimelinesInput = {};
      if (editingDeadlineType === 'Last AGM Date' || editingDeadlineType === 'Next Projected AGM') {
        payload.lastAgmDate = null;
        payload.noAgmToDate = false;
      } else if (editingDeadlineType === 'Last Depreciation Report Date' || editingDeadlineType === 'Next Projected Depreciation') {
        payload.lastDepreciationReportDate = null;
        payload.noReportToDate = false;
      } else if (editingDeadlineType === 'Target Date') {
        payload.targetDate = null;
      }
      const response = await authFetch(
        `${API_BASE}/admin/file-numbers/${recordToDelete.fileId}/timelines`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete timeline');
      closeModal();
      refetch({ archived: false });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setDeleteSubmitting(false);
      setDeleteModalOpen(false);
      setRecordToDelete(null);
    }
  };

  const openEditModal = (sr: FileNumber, deadlineType: DeadlineType) => {
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

  const isAgmType = editingDeadlineType === 'Fiscal Year Start' || editingDeadlineType === 'Last AGM Date' || editingDeadlineType === 'Next Projected AGM';
  const isDepreciationType = editingDeadlineType === 'Last Depreciation Report Date' || editingDeadlineType === 'Next Projected Depreciation';
  const isTargetType = editingDeadlineType === 'Target Date';

  const getModalTitle = (type: DeadlineType | null): string => {
    if (isCreating) return 'Add New Date';
    switch (type) {
      case 'Fiscal Year Start':
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

    if (isCreating) {
      if (!selectedCreateSrId) {
        setFormError('Please select a file number.');
        return;
      }
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
      if (!formData.noReportToDate && !formData.lastDepreciationReportDate.trim()) {
        setFormError('Date of last depreciation report is required, or check "No report to date".');
        return;
      }
      if (formData.targetDate.trim()) {
        const targetDateObj = new Date(formData.targetDate + 'T00:00:00');
        const minTarget = new Date(todayValidation);
        minTarget.setDate(minTarget.getDate() + 45);
        if (targetDateObj < minTarget) {
          setFormError('Target date must be at least 45 days from today.');
          return;
        }
      }
    } else {
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
          const minTarget = new Date(todayValidation);
          minTarget.setDate(minTarget.getDate() + 45);
          if (targetDateObj < minTarget) {
            setFormError('Target date must be at least 45 days from today.');
            return;
          }
        }
      }
    }

    const targetSrId = isCreating ? parseInt(selectedCreateSrId) : editingRecord?.fileId;
    if (!targetSrId) return;

    setIsSubmitting(true);
    setFormError(null);

    let payload: UpdateTimelinesInput;

    if (isCreating) {
      payload = {
        fiscalYearEnd: formData.fiscalYearEnd || null,
        lastAgmDate: formData.lastAgmDate || null,
        noAgmToDate: formData.noAgmToDate,
        lastDepreciationReportDate: formData.lastDepreciationReportDate || null,
        noReportToDate: formData.noReportToDate,
        targetDate: formData.targetDate || null,
      };
    } else if (isAgmType) {
      payload = {
        fiscalYearEnd: formData.fiscalYearEnd || null,
        lastAgmDate: formData.lastAgmDate || null,
        noAgmToDate: formData.noAgmToDate,
      };
    } else if (isDepreciationType) {
      payload = {
        lastDepreciationReportDate: formData.lastDepreciationReportDate || null,
        noReportToDate: formData.noReportToDate,
      };
    } else {
      payload = {
        targetDate: formData.targetDate || null,
      };
    }

    try {
      const response = await authFetch(
        `${API_BASE}/admin/file-numbers/${targetSrId}/timelines`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.error || isCreating ? 'Failed to create timeline' : 'Failed to update timelines');
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
      render: (row) => formatDateDisplay(row.date),
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
      key: 'date',
      header: 'Date',
      render: (row) => formatDateDisplay(row.date),
    },
    {
      key: 'strataPlan',
      header: 'Strata Plan',
      render: (row) => row.strataPlan,
    },
    {
      key: 'deadlineType',
      header: 'Deadline Type',
      render: (row) => row.deadlineType,
    },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="timelines-page">
      <div className="page-header">
        <h1>Timelines & Deadlines</h1>
        <div className="create-user-button-desktop timelines-view-actions">
          <button
            type="button"
            className={`timelines-view-toggle ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('list')}
          >
            List View
          </button>
          <button
            type="button"
            className={`timelines-view-toggle ${viewMode === 'calendar' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('calendar')}
          >
            Calendar View
          </button>
          <button className="btn-primary" onClick={openCreateModal}>
            + Add New Date
          </button>
        </div>
      </div>

      <div className="create-user-button timelines-view-actions">
        <button
          type="button"
          className={`timelines-view-toggle ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setViewMode('list')}
        >
          List View
        </button>
        <button
          type="button"
          className={`timelines-view-toggle ${viewMode === 'calendar' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setViewMode('calendar')}
        >
          Calendar View
        </button>
        <button className="btn-primary" onClick={openCreateModal}>
          + Add New Date
        </button>
      </div>

      {viewMode === 'list' && (
      <>
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
          onChange={(val) => {
            setFilterDeadlineType(val);
            if (['fiscalYear', 'fileOpened', 'surveySubmitted', 'documentUpload', 'depreciation'].includes(val)) {
              setShowPastDates(true);
            } else {
              setShowPastDates(false);
            }
          }}
          options={[
            { value: 'fiscalYear', label: 'Fiscal Year Start' },
            { value: 'agm', label: 'AGM' },
            { value: 'depreciation', label: 'Depreciation Report' },
            { value: 'target', label: 'Target Date' },
            { value: 'fileOpened', label: 'File Opened' },
            { value: 'documentUpload', label: 'Documents Finalized' },
            { value: 'surveySubmitted', label: 'Survey Answers Finalized' },
          ]}
          placeholder="All Types"
        />
        <SingleSelectDropdown
          label="Strata Name"
          value={filterStrataName}
          onChange={(val) => { setFilterStrataName(val); setFilterStrataPlan(val); }}
          options={strataNameOptions}
          placeholder="All Strata"
        />
        <SingleSelectDropdown
          label="Strata Plan"
          value={filterStrataPlan}
          onChange={(val) => { setFilterStrataPlan(val); setFilterStrataName(val); }}
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
        onRowClick={(row) => {
          setViewingRows([row]);
          setIsViewModalOpen(true);
        }}
        actions={isDesktop ? (row) => {
          const nonEditable: DeadlineType[] = ['File Opened', 'Documents Finalized', 'Survey Answers Finalized'];
          if (nonEditable.includes(row.deadlineType)) return <span className="text-muted">N/A</span>;
          return <button className="btn-edit" onClick={() => openEditModal(row.fileNumber, row.deadlineType)}>Edit</button>;
        } : undefined}
        actionsColumnHeader="Action"
      />
      </>
      )}

      {viewMode === 'calendar' && (
        <div className="timelines-calendar-wrap">
          <BookingCalendar
            variant="timelines"
            availability={[]}
            selectedDate={null}
            onSelectDate={() => {}}
            loading={false}
            milestones={calendarMilestones}
            bookedDate={null}
            onMilestoneCellClick={(date) => {
              const rowsForDate = filteredRows.filter(r => formatYMD(r.date) === date);
              if (rowsForDate.length > 0) {
                setViewingRows(rowsForDate);
                setIsViewModalOpen(true);
              }
            }}
          />
        </div>
      )}

      <Modal
        isOpen={isViewModalOpen && viewingRows !== null && viewingRows.length > 0}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingRows(null);
        }}
        title={viewingRows && viewingRows.length > 1 ? `View Timelines (${viewingRows.length})` : 'View Timeline'}
        size="medium"
        footer={
          <>
            <button
              className="btn-secondary"
              onClick={() => {
                setIsViewModalOpen(false);
                setViewingRows(null);
              }}
            >
              Close
            </button>
            {viewingRows && viewingRows.length === 1 && viewMode === 'list' && !isDesktop && !['File Opened', 'Documents Finalized', 'Survey Answers Finalized'].includes(viewingRows[0].deadlineType) && (
              <button
                className="btn-primary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  openEditModal(viewingRows[0].fileNumber, viewingRows[0].deadlineType);
                  setViewingRows(null);
                }}
              >
                Edit
              </button>
            )}
          </>
        }
      >
        {viewingRows && viewingRows.map((viewRow, idx) => (
          <div key={idx} className="view-modal-item">
            {viewingRows.length > 1 && <h4 className="view-modal-item-title">Item {idx + 1} of {viewingRows.length}</h4>}
            <table className="view-detail-table">
              <tbody>
                {getViewTimelineRows(viewRow).map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </Modal>

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
            {canDelete && !isCreating && editingRecord && (
              editingDeadlineType === 'Last AGM Date' ||
              editingDeadlineType === 'Last Depreciation Report Date' ||
              isTargetType
            ) && (
              <button
                className="btn-delete"
                onClick={() => openDeleteModal(editingRecord)}
                disabled={isSubmitting}
              >
                Delete
              </button>
            )}
            <button className="btn-primary" onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isCreating ? 'Add Date' : 'Update'}
            </button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit}>
          {formError && <div className="form-error">{formError}</div>}

          {isCreating && (
            <>
              <SingleSelectDropdown
                label="Strata"
                required
                value={selectedCreateSrId}
                onChange={(val) => {
                  setSelectedCreateSrId(val);
                  const sr = fileNumbers.find(f => f.fileId === parseInt(val));
                  if (sr) {
                    setFormData(prev => ({
                      ...prev,
                      fiscalYearEnd: sr.fiscalYearEnd ? formatYMD(parseLocalDate(sr.fiscalYearEnd)!) : prev.fiscalYearEnd,
                      lastAgmDate: sr.lastAgmDate ? formatYMD(parseLocalDate(sr.lastAgmDate)!) : prev.lastAgmDate,
                      noAgmToDate: sr.noAgmToDate ?? prev.noAgmToDate,
                      lastDepreciationReportDate: sr.lastDepreciationReportDate ? formatYMD(parseLocalDate(sr.lastDepreciationReportDate)!) : prev.lastDepreciationReportDate,
                      noReportToDate: sr.noReportToDate ?? prev.noReportToDate,
                      targetDate: sr.targetDate ? formatYMD(parseLocalDate(sr.targetDate)!) : prev.targetDate,
                    }));
                  }
                }}
                options={fileNumbers.filter(sr => !sr.archived).map(sr => ({
                  value: sr.fileId,
                  label: `${sr.strata?.strataPlan || ''} — ${sr.strata?.complexName || ''}`.trim().replace(/^— /, '').replace(/ —$/, ''),
                })).sort((a, b) => a.label.localeCompare(b.label))}
                placeholder="Select a strata"
              />
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
                  id="create-no-agm"
                  checked={formData.noAgmToDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, noAgmToDate: e.target.checked }))}
                />
                <label htmlFor="create-no-agm">No AGM to date</label>
              </div>
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
                  id="create-no-report"
                  checked={formData.noReportToDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, noReportToDate: e.target.checked }))}
                />
                <label htmlFor="create-no-report">No report to date</label>
              </div>
              <InputField
                label="Target date (optional)"
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
                min={minTargetDate}
              />
            </>
          )}

          {!isCreating && isAgmType && (
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

          {!isCreating && isDepreciationType && (
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

          {!isCreating && isTargetType && (
            <InputField
              label="Target date"
              type="date"
              value={formData.targetDate}
              onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
              min={minTargetDate}
            />
          )}
        </form>
      </Modal>

      {canDelete && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => { setDeleteModalOpen(false); setRecordToDelete(null); }}
          title="Delete Timeline"
          size="small"
          footer={
            <>
              <button className="btn-secondary" onClick={() => { setDeleteModalOpen(false); setRecordToDelete(null); }}>
                Cancel
              </button>
              <button
                className="btn-delete"
                onClick={handleDelete}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? 'Deleting...' : 'Delete Timeline'}
              </button>
            </>
          }
        >
          <div className="delete-confirmation">
            <p>Are you sure you want to delete this {editingDeadlineType?.toLowerCase() || 'date'} for "{recordToDelete?.strata?.complexName || recordToDelete?.strata?.strataPlan || ''}"?</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
