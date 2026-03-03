import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useAppointments } from '../../shared/hooks/useAppointments';
import { useUsers } from '../../shared/hooks/useUsers';
import { useLookups } from '../../shared/hooks/useLookups';
import { useServiceRequests } from '../../shared/hooks/useServiceRequests';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { InputField } from '../../shared/components/FormField';
import { Tabs } from '../../shared/components/Tabs';
import { Modal } from '../../shared/components/Modal';
import RescheduleAppointmentModal from '../components/RescheduleAppointmentModal';
import CancelAppointmentModal from '../components/CancelAppointmentModal';
import type { AppointmentWithDetails, AppointmentRequest, ProfileBasic } from '../../shared/types/entities.types';
import type { UnifiedRow, SelectedItem } from '../../shared/types/appointment.types';
import { formatDateShort, formatTime12h } from '../../shared/lib/formatters';
import { getSlotTimeRange } from '../../shared/lib/dateUtils';

const getStatusClass = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'scheduled': return 'status-scheduled';
    case 'requested':
    case 'pending review': return 'status-requested';
    case 'rejected':
    case 'cancelled': return 'status-rejected';
    case 'completed': return 'status-completed';
    case 'rescheduled': return 'status-rescheduled';
    default: return '';
  }
};

const getProfileName = (p?: ProfileBasic | null): string => {
  if (!p) return '-';
  if (p.displayName) return p.displayName;
  return `${p.firstName || ''} ${p.lastName || ''}`.trim() || '-';
};

const getInspectorNames = (
  inspector?: ProfileBasic | null,
  secondInspector?: ProfileBasic | null
): string => {
  const names: string[] = [];
  if (inspector) names.push(getProfileName(inspector));
  if (secondInspector) names.push(getProfileName(secondInspector));
  return names.length > 0 ? names.join(', ') : '-';
};

export default function AppointmentsPage() {
  const {
    appointments, loading, error,
    requests, requestsLoading,
    cancelAppointment, rescheduleAppointment, requestRebooking,
    createAppointment, fetchTimeSlots, fetchAppointmentTypes,
    fetchAppointmentRequests, reviewAppointmentRequest,
    checkInspectorAvailability, createInspectorAvailability,
  } = useAppointments();
  const { users, loading: usersLoading } = useUsers();
  const { locations, loading: lookupsLoading } = useLookups();
  const { serviceRequests, refetch: fetchServiceRequests } = useServiceRequests();

  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [rescheduleApt, setRescheduleApt] = useState<AppointmentWithDetails | null>(null);
  const [cancelApt, setCancelApt] = useState<AppointmentWithDetails | null>(null);

  // Review state
  const [inspectorId, setInspectorId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [showRejectSection, setShowRejectSection] = useState(false);

  // Filters
  const [filterStrataName, setFilterStrataName] = useState('');
  const [filterStrataPlan, setFilterStrataPlan] = useState('');
  const [filterInspector, setFilterInspector] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showPastDates, setShowPastDates] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ serviceRequestId: '', appointmentDate: '', timeSlotId: '', appointmentTypeId: '', inspectorProfileId: '' });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [showAvailabilityWarning, setShowAvailabilityWarning] = useState(false);
  const [allTimeSlots, setAllTimeSlots] = useState<any[]>([]);
  const [allAppointmentTypes, setAllAppointmentTypes] = useState<any[]>([]);

  const openCreateModal = useCallback(async () => {
    setCreateForm({ serviceRequestId: '', appointmentDate: '', timeSlotId: '', appointmentTypeId: '', inspectorProfileId: '' });
    setCreateError(null);
    setShowAvailabilityWarning(false);
    setShowCreateModal(true);
    fetchServiceRequests({ archived: false });
    const [slots, types] = await Promise.all([fetchTimeSlots(), fetchAppointmentTypes()]);
    setAllTimeSlots(slots || []);
    setAllAppointmentTypes(types || []);
  }, [fetchServiceRequests, fetchTimeSlots, fetchAppointmentTypes]);

  const validateCreateForm = useCallback(() => {
    const missing: string[] = [];
    if (!createForm.serviceRequestId) missing.push('Strata');
    if (!createForm.appointmentTypeId) missing.push('Appointment Type');
    if (!createForm.appointmentDate) missing.push('Date');
    if (!createForm.timeSlotId) missing.push('Time Slot');
    if (!createForm.inspectorProfileId) missing.push('Inspector');
    return missing;
  }, [createForm]);

  const submitAppointment = useCallback(async () => {
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await createAppointment({
        serviceRequestId: parseInt(createForm.serviceRequestId),
        appointmentDate: createForm.appointmentDate,
        timeSlotId: parseInt(createForm.timeSlotId),
        appointmentTypeId: parseInt(createForm.appointmentTypeId),
        inspectorProfileId: createForm.inspectorProfileId,
      });
      setShowCreateModal(false);
      setShowAvailabilityWarning(false);
      toast.success('Appointment created successfully');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create appointment');
    } finally {
      setCreateSubmitting(false);
    }
  }, [createForm, createAppointment]);

  const handleCreateAppointment = useCallback(async () => {
    const missing = validateCreateForm();
    if (missing.length > 0) {
      setCreateError(`Please select: ${missing.join(', ')}`);
      return;
    }
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const isAvailable = await checkInspectorAvailability(createForm.inspectorProfileId, createForm.appointmentDate);
      if (isAvailable) {
        await submitAppointment();
      } else {
        setCreateSubmitting(false);
        setShowAvailabilityWarning(true);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create appointment');
      setCreateSubmitting(false);
    }
  }, [validateCreateForm, checkInspectorAvailability, createForm, submitAppointment]);

  const handleConfirmUnavailable = useCallback(async () => {
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      await createInspectorAvailability(createForm.inspectorProfileId, createForm.appointmentDate);
      await submitAppointment();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create appointment');
      setCreateSubmitting(false);
    }
  }, [createForm, createInspectorAvailability, submitAppointment]);

  // Fetch requests on mount (no longer tab-gated)
  useEffect(() => {
    fetchAppointmentRequests('Pending Review');
  }, [fetchAppointmentRequests]);

  useEffect(() => {
    fetchTimeSlots().then(slots => setAllTimeSlots(slots || []));
  }, [fetchTimeSlots]);

  // Pre-fill inspector from offer when selecting a request
  useEffect(() => {
    if (selectedItem?.type === 'request') {
      const sr = selectedItem.data.serviceRequest;
      const offerInspector = sr?.appointmentOfferInspector;
      if (offerInspector?.id) {
        setInspectorId(offerInspector.id);
      }
    }
  }, [selectedItem]);

  const inspectorOptions = useMemo(() =>
    users
      .filter(u => u.isAdmin || ['Inspector', 'Admin'].includes(u.userType?.userTypeName ?? ''))
      .map(u => ({
        value: u.id,
        label: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
      })),
    [users]
  );

  const getTimeRange = (slotTime: string, aptType?: { durationType: string; isDraftMeeting: boolean }) => {
    if (!aptType) return formatTime12h(slotTime);
    const isFullDay = aptType.durationType?.toLowerCase() === 'full day';
    return getSlotTimeRange(slotTime, aptType.isDraftMeeting, isFullDay);
  };

  // ─── Unified rows: merge appointments + requests ────────────
  const unifiedRows = useMemo<UnifiedRow[]>(() => {
    const rows: UnifiedRow[] = [];

    for (const apt of appointments) {
      const sr = apt.serviceRequest;
      rows.push({
        id: `apt-${apt.appointmentId}`,
        type: 'appointment',
        date: apt.appointmentDate,
        time: getTimeRange(apt.timeSlot.slotTime, apt.appointmentType),
        appointmentTypeName: apt.appointmentType.typeName,
        strataPlan: sr.strata.strataPlan || '-',
        strataName: sr.strata.complexName || '-',
        strataId: sr.strata.strataId,
        location: (sr.strata as any).location?.locationName || sr.strata.town || '-',
        inspectorNames: getInspectorNames(apt.inspector, sr.appointmentOfferSecondInspector),
        inspectorId: apt.inspectorProfileId,
        status: apt.status,
        original: apt,
      });
    }

    for (const req of requests) {
      const sr = req.serviceRequest;
      const inspector1 = sr?.appointmentOfferInspector;
      const inspector2 = sr?.appointmentOfferSecondInspector;
      rows.push({
        id: `req-${req.appointmentRequestId}`,
        type: 'request',
        date: req.firstChoiceDate,
        time: 'TBC',
        appointmentTypeName: req.appointmentType?.typeName || '-',
        strataPlan: sr?.strata?.strataPlan || '-',
        strataName: sr?.strata?.complexName || '-',
        strataId: sr?.strata?.strataId || 0,
        location: (sr?.strata as any)?.location?.locationName || sr?.strata?.town || '-',
        inspectorNames: getInspectorNames(inspector1, inspector2),
        inspectorId: inspector1?.id || null,
        status: req.status,
        original: req,
      });
    }

    return rows;
  }, [appointments, requests]);

  // ─── Filter options derived from data ───────────────────────
  const strataNameOptions = useMemo(() => {
    const seen = new Set<number>();
    return unifiedRows
      .filter(r => {
        if (r.strataName === '-' || seen.has(r.strataId)) return false;
        seen.add(r.strataId);
        return true;
      })
      .map(r => ({ value: r.strataId, label: r.strataName }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [unifiedRows]);

  const strataPlanOptions = useMemo(() => {
    const seen = new Set<number>();
    return unifiedRows
      .filter(r => {
        if (r.strataPlan === '-' || seen.has(r.strataId)) return false;
        seen.add(r.strataId);
        return true;
      })
      .map(r => ({ value: r.strataId, label: r.strataPlan }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [unifiedRows]);

  const locationTabs = useMemo(() => {
    const tabs = [{ key: 'all', label: 'All Locations' }];
    const sorted = [...locations].sort((a, b) => a.locationName.localeCompare(b.locationName));
    for (const l of sorted) {
      tabs.push({ key: l.locationName, label: l.locationName });
    }
    return tabs;
  }, [locations]);

  // ─── Filtered rows ──────────────────────────────────────────
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const filteredRows = useMemo(() => {
    let rows = unifiedRows;

    if (!showPastDates) {
      rows = rows.filter(r => new Date(r.date) >= today);
    }

    if (!showCancelled) {
      rows = rows.filter(r => r.status.toLowerCase() !== 'cancelled');
    }

    if (filterStrataName) {
      const id = parseInt(filterStrataName);
      rows = rows.filter(r => r.strataId === id);
    }

    if (filterStrataPlan) {
      const id = parseInt(filterStrataPlan);
      rows = rows.filter(r => r.strataId === id);
    }

    if (filterInspector) {
      rows = rows.filter(r => r.inspectorId === filterInspector);
    }

    if (filterLocation && filterLocation !== 'all') {
      rows = rows.filter(r => r.location === filterLocation);
    }

    if (dateFrom) {
      const from = new Date(dateFrom + 'T00:00:00');
      rows = rows.filter(r => new Date(r.date) >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo + 'T00:00:00');
      rows = rows.filter(r => new Date(r.date) <= to);
    }

    // Sort: future dates soonest-first, past dates most-recent-first
    const now = today.getTime();
    rows = [...rows].sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      const aFuture = aTime >= now;
      const bFuture = bTime >= now;

      if (aFuture !== bFuture) return aFuture ? -1 : 1;
      if (aFuture) return aTime - bTime;
      return bTime - aTime;
    });

    return rows;
  }, [unifiedRows, showPastDates, showCancelled, filterStrataName, filterStrataPlan, filterInspector, filterLocation, dateFrom, dateTo, today]);

  // ─── Columns ────────────────────────────────────────────────
  const unifiedColumns: Column<UnifiedRow>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDateShort(r.date) },
    {
      key: 'time', header: 'Time',
      render: (r) => r.time === 'TBC'
        ? <span className="status-badge status-requested">TBC</span>
        : <span>{r.time}</span>
    },
    { key: 'type', header: 'Type', render: (r) => r.appointmentTypeName },
    { key: 'strataPlan', header: 'Strata Plan', render: (r) => r.strataPlan },
    { key: 'location', header: 'Location', render: (r) => r.location },
    { key: 'inspector', header: 'Inspector(s)', render: (r) => r.inspectorNames },
    {
      key: 'status', header: 'Status',
      render: (r) => <span className={`status-badge ${getStatusClass(r.status)}`}>{r.status}</span>
    },
  ];

  // ─── Row click handler ──────────────────────────────────────
  const handleRowClick = (row: UnifiedRow) => {
    if (row.type === 'appointment') {
      setSelectedItem({ type: 'appointment', data: row.original as AppointmentWithDetails });
    } else {
      setSelectedItem({ type: 'request', data: row.original as AppointmentRequest });
    }
  };

  // ─── Request detail: handlers ─────────────────────────────────
  const handleInspectorChange = async (newInspectorId: string) => {
    setInspectorId(newInspectorId);
    if (!newInspectorId || !selectedItem || selectedItem.type !== 'request') return;

    const req = selectedItem.data;
    const date = req.firstChoiceDate.split('T')[0];
    const isAvailable = await checkInspectorAvailability(newInspectorId, date);

    if (!isAvailable) {
      const inspector = inspectorOptions.find(o => o.value === newInspectorId);
      toast.error(`${inspector?.label || 'Inspector'} is not available at this time, please update their availability to proceed`);
    }
  };

  const handleApprove = async (choiceNum: number) => {
    if (!selectedItem || selectedItem.type !== 'request') return;
    if (!inspectorId) {
      setReviewError('Please assign an inspector before approving');
      return;
    }
    setSubmitting(true);
    setReviewError(null);
    const result = await reviewAppointmentRequest(selectedItem.data.appointmentRequestId, {
      approved: true,
      approvedDateChoice: choiceNum,
      inspectorProfileId: inspectorId,
      comments: comments.trim() || undefined,
    });
    setSubmitting(false);
    if (result.success) {
      toast.success('Appointment approved');
      resetDetail();
    } else {
      setReviewError(result.error || 'Approval failed');
    }
  };

  const handleReject = async () => {
    if (!selectedItem || selectedItem.type !== 'request') return;
    if (!rejectionReason.trim()) {
      setReviewError('Please provide a rejection reason');
      return;
    }
    setSubmitting(true);
    setReviewError(null);
    const result = await reviewAppointmentRequest(selectedItem.data.appointmentRequestId, {
      approved: false,
      rejectionReason: rejectionReason.trim(),
      comments: comments.trim() || undefined,
    });
    setSubmitting(false);
    if (result.success) {
      toast.success('Request rejected');
      resetDetail();
    } else {
      setReviewError(result.error || 'Rejection failed');
    }
  };

  const resetDetail = () => {
    setSelectedItem(null);
    setInspectorId('');
    setRejectionReason('');
    setComments('');
    setReviewError(null);
    setShowRejectSection(false);
  };

  const handleRequestRebooking = async (apt: AppointmentWithDetails) => {
    try {
      await requestRebooking(apt.appointmentId);
      toast.success('Rebooking request sent — the client will see a reminder to rebook.');
      resetDetail();
    } catch {
      toast.error('Failed to send rebooking request');
    }
  };

  // ─── Detail view: appointment ─────────────────────────────────
  const renderAppointmentDetail = (apt: AppointmentWithDetails) => {
    const sr = apt.serviceRequest;
    const status = apt.status.toLowerCase();
    const allInspectors = getInspectorNames(apt.inspector, sr.appointmentOfferSecondInspector);

    return (
      <div className="appointments-detail">
        <button className="appointments-detail__back" type="button" onClick={resetDetail}>
          &larr; Back to Appointments
        </button>

        <div className="strata-info-card">
          <div className="info-row">
            <div className="info-item">
              <span className="info-label">STRATA</span>
              <span className="info-value">{sr.strata.complexName || sr.strata.strataPlan || '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">SERVICE TYPE</span>
              <span className="info-value">{sr.service.serviceName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">STRATA PLAN</span>
              <span className="info-value">{sr.strata.strataPlan || '-'}</span>
            </div>
          </div>
          <div className="info-row">
            <div className="info-item">
              <span className="info-label">LOCATION</span>
              <span className="info-value">{(sr.strata as any).location?.locationName || sr.strata.town || '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">INSPECTOR(S)</span>
              <span className="info-value">{allInspectors}</span>
            </div>
            <div className="info-item">
              <span className="info-label">APPOINTMENT TYPE</span>
              <span className="info-value">{apt.appointmentType.typeName} ({apt.appointmentType.durationType})</span>
            </div>
          </div>
        </div>

        <div className="appointments-detail__section">
          <div className="appointments-detail__section-header">
            <h3>Scheduled Appointment</h3>
            <span className={`status-badge ${getStatusClass(apt.status)}`}>{apt.status}</span>
          </div>

          <div className="appointments-detail__kv-grid">
            <div className="appointments-detail__kv">
              <span className="appointments-detail__kv-label">Date</span>
              <span className="appointments-detail__kv-value">{formatDateShort(apt.appointmentDate)}</span>
            </div>
            <div className="appointments-detail__kv">
              <span className="appointments-detail__kv-label">Time</span>
              <span className="appointments-detail__kv-value">
                {getTimeRange(apt.timeSlot.slotTime, apt.appointmentType)}
              </span>
            </div>
          </div>
        </div>

        {(status === 'scheduled' || status === 'rescheduled') && (
          <div className="appointments-detail__actions">
            <button className="btn btn-secondary" onClick={() => setRescheduleApt(apt)}>
              Reschedule Appointment
            </button>
            <button className="btn btn-danger" onClick={() => setCancelApt(apt)}>
              Cancel Appointment
            </button>
          </div>
        )}

        {status === 'cancelled' && (
          <div className="appointments-detail__actions appointments-detail__actions--centered">
            <button className="btn btn-primary" onClick={() => handleRequestRebooking(apt)}>
              Request Rebooking
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── Detail view: request ─────────────────────────────────────
  const renderRequestDetail = (req: AppointmentRequest) => {
    const sr = req.serviceRequest;
    const allInspectors = getInspectorNames(sr?.appointmentOfferInspector, sr?.appointmentOfferSecondInspector);

    return (
      <div className="appointments-detail">
        <button className="appointments-detail__back" type="button" onClick={resetDetail}>
          &larr; Back to Appointments
        </button>

        <div className="strata-info-card">
          <div className="info-row">
            <div className="info-item">
              <span className="info-label">STRATA</span>
              <span className="info-value">{sr?.strata?.complexName || sr?.strata?.strataPlan || '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">SERVICE TYPE</span>
              <span className="info-value">{sr?.service?.serviceName || '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">REQUESTED BY</span>
              <span className="info-value">{getProfileName(sr?.requestedBy)}</span>
            </div>
          </div>
          <div className="info-row">
            <div className="info-item">
              <span className="info-label">REQUEST RECEIVED</span>
              <span className="info-value">{sr?.requestDate ? formatDateShort(sr.requestDate) : '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">STRATA PLAN</span>
              <span className="info-value">{sr?.strata?.strataPlan || '-'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">LOCATION</span>
              <span className="info-value">{(sr?.strata as any)?.location?.locationName || sr?.strata?.town || '-'}</span>
            </div>
          </div>
        </div>

        <div className="appointments-detail__section">
          <div className="appointments-detail__section-header">
            <h3>Pending Appointment Request</h3>
            <span className={`status-badge ${getStatusClass(req.status)}`}>{req.status}</span>
          </div>

          {reviewError && <div className="appointments-detail__error">{reviewError}</div>}

          <div className="appointments-detail__kv-grid">
            <div className="appointments-detail__kv">
              <span className="appointments-detail__kv-label">Inspector(s)</span>
              <span className="appointments-detail__kv-value">{allInspectors}</span>
            </div>
            <div className="appointments-detail__kv">
              <span className="appointments-detail__kv-label">Appointment Type</span>
              <span className="appointments-detail__kv-value">
                {req.appointmentType?.typeName || '-'}
                {req.appointmentType?.durationType ? ` (${req.appointmentType.durationType})` : ''}
              </span>
            </div>
            <div className="appointments-detail__kv">
              <span className="appointments-detail__kv-label">First Choice Date</span>
              <span className="appointments-detail__kv-value">{formatDateShort(req.firstChoiceDate)}</span>
            </div>
            <div className="appointments-detail__kv">
              <span className="appointments-detail__kv-label">First Choice Time</span>
              <span className="appointments-detail__kv-value">
                {req.firstChoiceTimeSlot
                  ? getTimeRange(req.firstChoiceTimeSlot.slotTime, req.appointmentType)
                  : '-'}
              </span>
            </div>
            <div className="appointments-detail__kv">
              <span className="appointments-detail__kv-label">Second Choice Date</span>
              <span className="appointments-detail__kv-value">
                {req.secondChoiceDate ? formatDateShort(req.secondChoiceDate) : '-'}
              </span>
            </div>
            <div className="appointments-detail__kv">
              <span className="appointments-detail__kv-label">Second Choice Time</span>
              <span className="appointments-detail__kv-value">
                {req.secondChoiceTimeSlot
                  ? getTimeRange(req.secondChoiceTimeSlot.slotTime, req.appointmentType)
                  : '-'}
              </span>
            </div>
          </div>

          {req.specialRequirements && (
            <div className="appointments-detail__special">
              <h4>Special Requirements</h4>
              <p>{req.specialRequirements}</p>
            </div>
          )}

          <div className="appointments-detail__inspector">
            <SingleSelectDropdown
              label="Assign Inspector"
              required
              options={inspectorOptions}
              value={inspectorId}
              onChange={handleInspectorChange}
              placeholder="Select an inspector..."
            />
          </div>

          <div className="appointments-detail__comments">
            <label htmlFor="review-comments">Comments (Optional)</label>
            <textarea
              id="review-comments"
              className="appointments-detail__textarea"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
            />
          </div>

          {req.status === 'Pending Review' && (
            <>
              <div className="appointments-detail__actions">
                <button
                  className="btn btn-primary"
                  onClick={() => handleApprove(1)}
                  disabled={submitting}
                >
                  {submitting ? 'Processing...' : 'Approve First Choice'}
                </button>
                {req.secondChoiceDate && req.secondChoiceTimeSlot && (
                  <button
                    className="btn btn-primary"
                    onClick={() => handleApprove(2)}
                    disabled={submitting}
                  >
                    {submitting ? 'Processing...' : 'Approve Second Choice'}
                  </button>
                )}
                <button
                  className="btn btn-danger"
                  onClick={() => setShowRejectSection(true)}
                  disabled={submitting || showRejectSection}
                >
                  Reject
                </button>
              </div>

              {showRejectSection && (
                <div className="appointments-detail__reject-section">
                  <label htmlFor="rejection-reason">Rejection Reason</label>
                  <textarea
                    id="rejection-reason"
                    className="appointments-detail__textarea"
                    placeholder="Please provide a reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                  />
                  <div className="appointments-detail__reject-actions">
                    <button
                      className="btn btn-danger"
                      onClick={handleReject}
                      disabled={submitting}
                    >
                      {submitting ? 'Processing...' : 'Confirm Reject'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowRejectSection(false);
                        setRejectionReason('');
                        setReviewError(null);
                      }}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // ─── Mobile card renderer ──────────────────────────────────
  const renderMobileCard = (row: UnifiedRow) => (
    <div
      key={row.id}
      className="appointments-card"
      onClick={() => handleRowClick(row)}
    >
      <div className="appointments-card__header">
        <span className="appointments-card__title">{row.strataName !== '-' ? row.strataName : row.strataPlan}</span>
        <span className={`status-badge ${getStatusClass(row.status)}`}>{row.status}</span>
      </div>
      <div className="appointments-card__body">
        <div className="appointments-card__row">
          <span className="appointments-card__label">Date</span>
          <span>{formatDateShort(row.date)}</span>
        </div>
        <div className="appointments-card__row">
          <span className="appointments-card__label">Time</span>
          <span>{row.time === 'TBC' ? <span className="status-badge status-requested">TBC</span> : row.time}</span>
        </div>
        <div className="appointments-card__row">
          <span className="appointments-card__label">Type</span>
          <span>{row.appointmentTypeName}</span>
        </div>
        <div className="appointments-card__row">
          <span className="appointments-card__label">Location</span>
          <span>{row.location}</span>
        </div>
        <div className="appointments-card__row">
          <span className="appointments-card__label">Inspector(s)</span>
          <span>{row.inspectorNames}</span>
        </div>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────
  if (selectedItem) {
    return (
      <div className="appointments-page">
        {selectedItem.type === 'appointment'
          ? renderAppointmentDetail(selectedItem.data)
          : renderRequestDetail(selectedItem.data)}

        <RescheduleAppointmentModal
          isOpen={!!rescheduleApt}
          onClose={() => setRescheduleApt(null)}
          appointment={rescheduleApt}
          timeSlots={allTimeSlots}
          inspectors={users}
          onReschedule={rescheduleAppointment}
        />

        <CancelAppointmentModal
          isOpen={!!cancelApt}
          onClose={() => setCancelApt(null)}
          appointment={cancelApt}
          onCancel={cancelAppointment}
        />
      </div>
    );
  }

  const isLoading = loading || requestsLoading || lookupsLoading || usersLoading;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="appointments-page">
      <div className="page-header">
        <h1>Appointments</h1>
        <div className="create-user-button-desktop">
          <button className="btn-primary" onClick={openCreateModal}>
            + Add New Appointment
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <Tabs
        tabs={locationTabs}
        activeTab={filterLocation}
        onChange={setFilterLocation}
        variant="pill"
      />

      <div className="filters-row appointments-filters">
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
        <SingleSelectDropdown
          label="Inspector"
          value={filterInspector}
          onChange={setFilterInspector}
          options={inspectorOptions}
          placeholder="All Inspectors"
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
        <div className="appointments-filters__toggles">
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
          <div className="form-field archived-toggle">
            <label>
              <input
                type="checkbox"
                checked={showCancelled}
                onChange={() => setShowCancelled(prev => !prev)}
              />
              Show Cancelled
            </label>
          </div>
        </div>
      </div>

      <div className="create-user-button">
        <button className="btn-primary" onClick={openCreateModal}>
          + Add New Appointment
        </button>
      </div>

      <div className="appointments-page__desktop">
        <DataTable
          columns={unifiedColumns}
          data={filteredRows}
          keyExtractor={(row) => row.id}
          loading={isLoading}
          emptyMessage="No appointments found."
          onRowClick={handleRowClick}
        />
      </div>
      <div className="appointments-page__mobile">
        {filteredRows.length === 0 ? (
          <div className="appointments-page__empty">No appointments found.</div>
        ) : (
          filteredRows.map(renderMobileCard)
        )}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setShowAvailabilityWarning(false); }}
        title="Add New Appointment"
        size="medium"
        footer={showAvailabilityWarning ? undefined : (
          <>
            <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)} disabled={createSubmitting}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreateAppointment} disabled={createSubmitting}>
              {createSubmitting ? 'Checking...' : 'Add Appointment'}
            </button>
          </>
        )}
      >
        <div className="offer-modal">
          {createError && <div className="offer-modal__error">{createError}</div>}

          {showAvailabilityWarning ? (
            <div className="offer-modal__warning">
              <p>Inspector unavailable on the selected date. Are you sure you would like to book this appointment?</p>
              <div className="offer-modal__warning-actions">
                <button className="btn btn-secondary" onClick={() => setShowAvailabilityWarning(false)} disabled={createSubmitting}>
                  Go Back
                </button>
                <button className="btn btn-primary" onClick={handleConfirmUnavailable} disabled={createSubmitting}>
                  {createSubmitting ? 'Booking...' : 'Yes, Book Anyway'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <SingleSelectDropdown
                label="Strata"
                required
                options={serviceRequests.map(sr => ({
                  value: String(sr.serviceRequestId),
                  label: `${sr.strata?.strataPlan || ''} - ${sr.strata?.complexName || 'Unknown'}`,
                }))}
                value={createForm.serviceRequestId}
                onChange={(val) => setCreateForm(prev => ({ ...prev, serviceRequestId: val }))}
                placeholder="Select a strata..."
              />

              {createForm.serviceRequestId && (() => {
                const sr = serviceRequests.find(s => String(s.serviceRequestId) === createForm.serviceRequestId);
                const loc = (sr?.strata as any)?.location?.locationName;
                return loc ? (
                  <div className="form-field">
                    <label>Location</label>
                    <input type="text" value={loc} disabled />
                  </div>
                ) : null;
              })()}

              <SingleSelectDropdown
                label="Appointment Type"
                required
                options={allAppointmentTypes.map((t: any) => ({
                  value: String(t.appointmentTypeId),
                  label: `${t.typeName} (${t.durationType})`,
                }))}
                value={createForm.appointmentTypeId}
                onChange={(val) => setCreateForm(prev => ({ ...prev, appointmentTypeId: val }))}
                placeholder="Select appointment type..."
              />

              <div className="offer-modal__field">
                <label>Date <span className="offer-modal__required">*</span></label>
                <input
                  type="date"
                  value={createForm.appointmentDate}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, appointmentDate: e.target.value }))}
                />
              </div>

              <SingleSelectDropdown
                label="Time Slot"
                required
                options={allTimeSlots.map((s: any) => ({
                  value: String(s.timeSlotId),
                  label: `${s.slotName} (${formatTime12h(s.slotTime)})`,
                }))}
                value={createForm.timeSlotId}
                onChange={(val) => setCreateForm(prev => ({ ...prev, timeSlotId: val }))}
                placeholder="Select a time slot..."
              />

              <SingleSelectDropdown
                label="Inspector"
                required
                options={inspectorOptions}
                value={createForm.inspectorProfileId}
                onChange={(val) => setCreateForm(prev => ({ ...prev, inspectorProfileId: val }))}
                placeholder="Select an inspector..."
              />
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
