import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAppointments } from '../../shared/hooks/useAppointments';
import { useUsers } from '../../shared/hooks/useUsers';
import { Tabs } from '../../shared/components/Tabs';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import RescheduleAppointmentModal from '../components/RescheduleAppointmentModal';
import CancelAppointmentModal from '../components/CancelAppointmentModal';
import type { AppointmentWithDetails, AppointmentRequest, AppointmentTimeSlot, ProfileBasic } from '../../shared/types/entities.types';
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

const getServiceId = (srId: number): string => {
  return `#SR-${srId.toString().padStart(4, '0')}`;
};

const TABS = [
  { key: 'scheduled', label: 'Scheduled Appointments' },
  { key: 'requests', label: 'Pending Requests' },
];

type SelectedItem =
  | { type: 'appointment'; data: AppointmentWithDetails }
  | { type: 'request'; data: AppointmentRequest };

export default function AppointmentsPage() {
  const {
    appointments, loading, error,
    requests, requestsLoading,
    cancelAppointment, rescheduleAppointment,
    fetchAppointmentRequests, reviewAppointmentRequest,
    checkInspectorAvailability,
  } = useAppointments();
  const { users } = useUsers();

  const [activeTab, setActiveTab] = useState('scheduled');
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const [rescheduleApt, setRescheduleApt] = useState<AppointmentWithDetails | null>(null);
  const [cancelApt, setCancelApt] = useState<AppointmentWithDetails | null>(null);
  const [timeSlots, setTimeSlots] = useState<AppointmentTimeSlot[]>([]);

  // Review state for request detail view
  const [inspectorId, setInspectorId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchAppointmentRequests('Pending Review');
    }
  }, [activeTab, fetchAppointmentRequests]);

  useEffect(() => {
    const slotsFromAppointments = appointments.reduce<AppointmentTimeSlot[]>((acc, apt) => {
      if (!acc.find(s => s.timeSlotId === apt.timeSlot.timeSlotId)) {
        acc.push(apt.timeSlot);
      }
      return acc;
    }, []);
    if (slotsFromAppointments.length > 0) {
      setTimeSlots(slotsFromAppointments);
    }
  }, [appointments]);

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

  // ─── Appointment columns ──────────────────────────────────────
  const appointmentColumns: Column<AppointmentWithDetails>[] = [
    { key: 'date', header: 'Date', render: (apt) => formatDateShort(apt.appointmentDate) },
    {
      key: 'time', header: 'Time',
      render: (apt) => <strong>{getTimeRange(apt.timeSlot.slotTime, apt.appointmentType)}</strong>
    },
    { key: 'appointmentType', header: 'Type', render: (apt) => apt.appointmentType.typeName },
    { key: 'strata', header: 'Strata Plan', render: (apt) => apt.serviceRequest.strata.strataPlan || '-' },
    { key: 'serviceId', header: 'Service ID', render: (apt) => getServiceId(apt.serviceRequest.serviceRequestId) },
    { key: 'inspector', header: 'Inspector', render: (apt) => getProfileName(apt.inspector) },
    {
      key: 'status', header: 'Status',
      render: (apt) => <span className={`status-badge ${getStatusClass(apt.status)}`}>{apt.status}</span>
    },
  ];

  // ─── Request columns ──────────────────────────────────────────
  const requestColumns: Column<AppointmentRequest>[] = [
    {
      key: 'firstDate', header: 'First Choice',
      render: (req) => formatDateShort(req.firstChoiceDate),
    },
    {
      key: 'firstTime', header: 'First Time',
      render: (req) => req.firstChoiceTimeSlot
        ? getTimeRange(req.firstChoiceTimeSlot.slotTime, req.appointmentType)
        : '-',
    },
    {
      key: 'secondDate', header: 'Second Choice',
      render: (req) => req.secondChoiceDate ? formatDateShort(req.secondChoiceDate) : '-',
    },
    {
      key: 'secondTime', header: 'Second Time',
      render: (req) => req.secondChoiceTimeSlot
        ? getTimeRange(req.secondChoiceTimeSlot.slotTime, req.appointmentType)
        : '-',
    },
    {
      key: 'type', header: 'Type',
      render: (req) => req.appointmentType?.typeName || '-',
    },
    {
      key: 'strata', header: 'Strata Plan',
      render: (req) => req.serviceRequest?.strata?.strataPlan || '-',
    },
    {
      key: 'inspector', header: 'Inspector',
      render: (req) => getProfileName(req.serviceRequest?.appointmentOfferInspector),
    },
    {
      key: 'status', header: 'Status',
      render: (req) => <span className={`status-badge ${getStatusClass(req.status)}`}>{req.status}</span>,
    },
  ];

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
  };

  // ─── Detail view: appointment ─────────────────────────────────
  const renderAppointmentDetail = (apt: AppointmentWithDetails) => {
    const sr = apt.serviceRequest;
    const status = apt.status.toLowerCase();

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
              <span className="info-label">SERVICE ID</span>
              <span className="info-value">{getServiceId(sr.serviceRequestId)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">INSPECTOR</span>
              <span className="info-value">{getProfileName(apt.inspector)}</span>
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
      </div>
    );
  };

  // ─── Detail view: request ─────────────────────────────────────
  const renderRequestDetail = (req: AppointmentRequest) => {
    const sr = req.serviceRequest;

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
              <span className="info-label">SERVICE ID</span>
              <span className="info-value">{sr ? getServiceId(sr.serviceRequestId) : '-'}</span>
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
              <span className="appointments-detail__kv-label">Service ID</span>
              <span className="appointments-detail__kv-value">{sr ? getServiceId(sr.serviceRequestId) : '-'}</span>
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
                  onClick={handleReject}
                  disabled={submitting}
                >
                  {submitting ? 'Processing...' : 'Reject'}
                </button>
              </div>

              <div className="appointments-detail__reject-section">
                <label htmlFor="rejection-reason">Rejection Reason</label>
                <textarea
                  id="rejection-reason"
                  className="appointments-detail__textarea"
                  placeholder="Required if rejecting..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // ─── Mobile card renderers ────────────────────────────────────
  const renderAppointmentCard = (apt: AppointmentWithDetails) => (
    <div
      key={apt.appointmentId}
      className="appointments-card"
      onClick={() => setSelectedItem({ type: 'appointment', data: apt })}
    >
      <div className="appointments-card__header">
        <span className="appointments-card__title">{apt.serviceRequest.strata.complexName || apt.serviceRequest.strata.strataPlan}</span>
        <span className={`status-badge ${getStatusClass(apt.status)}`}>{apt.status}</span>
      </div>
      <div className="appointments-card__body">
        <div className="appointments-card__row">
          <span className="appointments-card__label">Date</span>
          <span>{formatDateShort(apt.appointmentDate)}</span>
        </div>
        <div className="appointments-card__row">
          <span className="appointments-card__label">Time</span>
          <span>{getTimeRange(apt.timeSlot.slotTime, apt.appointmentType)}</span>
        </div>
        <div className="appointments-card__row">
          <span className="appointments-card__label">Type</span>
          <span>{apt.appointmentType.typeName}</span>
        </div>
        <div className="appointments-card__row">
          <span className="appointments-card__label">Service ID</span>
          <span>{getServiceId(apt.serviceRequest.serviceRequestId)}</span>
        </div>
        <div className="appointments-card__row">
          <span className="appointments-card__label">Inspector</span>
          <span>{getProfileName(apt.inspector)}</span>
        </div>
      </div>
    </div>
  );

  const renderRequestCard = (req: AppointmentRequest) => (
    <div
      key={req.appointmentRequestId}
      className="appointments-card"
      onClick={() => setSelectedItem({ type: 'request', data: req })}
    >
      <div className="appointments-card__header">
        <span className="appointments-card__title">{req.serviceRequest?.strata?.complexName || req.serviceRequest?.strata?.strataPlan || '-'}</span>
        <span className={`status-badge ${getStatusClass(req.status)}`}>{req.status}</span>
      </div>
      <div className="appointments-card__body">
        <div className="appointments-card__row">
          <span className="appointments-card__label">First Choice</span>
          <span>{formatDateShort(req.firstChoiceDate)}</span>
        </div>
        <div className="appointments-card__row">
          <span className="appointments-card__label">Time</span>
          <span>{req.firstChoiceTimeSlot ? getTimeRange(req.firstChoiceTimeSlot.slotTime, req.appointmentType) : '-'}</span>
        </div>
        <div className="appointments-card__row">
          <span className="appointments-card__label">Type</span>
          <span>{req.appointmentType?.typeName || '-'}</span>
        </div>
        <div className="appointments-card__row">
          <span className="appointments-card__label">Strata Plan</span>
          <span>{req.serviceRequest?.strata?.strataPlan || '-'}</span>
        </div>
        <div className="appointments-card__row">
          <span className="appointments-card__label">Inspector</span>
          <span>{getProfileName(req.serviceRequest?.appointmentOfferInspector)}</span>
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
          timeSlots={timeSlots}
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

  return (
    <div className="appointments-page">
      <div className="page-header">
        <h1>Appointments</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'scheduled' && (
        <>
          <div className="appointments-page__desktop">
            <DataTable
              columns={appointmentColumns}
              data={appointments}
              keyExtractor={(apt) => apt.appointmentId}
              loading={loading}
              emptyMessage="No appointments found."
              onRowClick={(apt) => setSelectedItem({ type: 'appointment', data: apt })}
            />
          </div>
          <div className="appointments-page__mobile">
            {loading ? (
              <div className="appointments-page__loading">Loading...</div>
            ) : appointments.length === 0 ? (
              <div className="appointments-page__empty">No appointments found.</div>
            ) : (
              appointments.map(renderAppointmentCard)
            )}
          </div>
        </>
      )}

      {activeTab === 'requests' && (
        <>
          <div className="appointments-page__desktop">
            <DataTable
              columns={requestColumns}
              data={requests}
              keyExtractor={(req) => req.appointmentRequestId}
              loading={requestsLoading}
              emptyMessage="No pending requests."
              onRowClick={(req) => setSelectedItem({ type: 'request', data: req })}
            />
          </div>
          <div className="appointments-page__mobile">
            {requestsLoading ? (
              <div className="appointments-page__loading">Loading...</div>
            ) : requests.length === 0 ? (
              <div className="appointments-page__empty">No pending requests.</div>
            ) : (
              requests.map(renderRequestCard)
            )}
          </div>
        </>
      )}
    </div>
  );
}
