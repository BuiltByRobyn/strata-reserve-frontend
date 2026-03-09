import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useAppointments } from '../../shared/hooks/useAppointments';
import { useDocuments } from '../../shared/hooks/useDocuments';
import { useFileNumbers } from '../../shared/hooks/useFileNumbers';
import { useLookups } from '../../shared/hooks/useLookups';
import { usePropertyTypeRequests } from '../../shared/hooks/usePropertyTypeRequests';
import { useStrata } from '../../shared/hooks/useStrata';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Modal } from '../../shared/components/Modal';
import { formatTime12h, getUserDisplayName, formatRelativeTime } from '../../shared/lib/formatters';
import { parseLocalDate, parseTimestamp } from '../../shared/lib/dateUtils';
import type { PropertyTypeRequest } from '../../shared/types/entities.types';
import type { DocumentWithDetails } from '../../shared/types/document.types';
import type { UrgentCard, ActivityCard } from '../../shared/types/dashboard.types';

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const parseCalendarDate = (value: string | null | undefined) => parseLocalDate(value) || parseTimestamp(value);

const formatShortDate = (value: string | null | undefined) => {
  const date = parseCalendarDate(value);
  if (!date) return 'TBD';
  return date.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
};

const getStrataLabel = (strata?: { complexName?: string | null; strataPlan?: string | null } | null) => {
  if (!strata) return 'Unknown strata';
  return strata.complexName || strata.strataPlan || 'Unknown strata';
};

const getUrgencyMeta = (value: string | null | undefined) => {
  const createdAt = parseTimestamp(value) || startOfDay(new Date());
  const ageDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  if (ageDays >= 5) {
    return { tone: 'overdue' as const, badge: 'OVERDUE', priority: 300 + ageDays };
  }
  if (ageDays >= 2) {
    return { tone: 'due-today' as const, badge: 'DUE TODAY', priority: 200 + ageDays };
  }
  return { tone: 'upcoming' as const, badge: 'NEW', priority: 100 + ageDays };
};

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    requests: propertyRequests,
    loading: requestsLoading,
    approveRequest,
    rejectRequest,
  } = usePropertyTypeRequests();
  const { stratas, loading: stratasLoading } = useStrata();
  const { propertyTypes } = useLookups();
  const {
    appointments,
    loading: appointmentsLoading,
    requests: appointmentRequests,
    requestsLoading: appointmentRequestsLoading,
    fetchAppointmentRequests,
  } = useAppointments();
  const { documents, loading: documentsLoading } = useDocuments();
  const { fileNumbers, loading: fileNumbersLoading, refetch: fetchFileNumbers } = useFileNumbers();

  const [reviewingRequest, setReviewingRequest] = useState<PropertyTypeRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAppointmentRequests('Pending Review');
  }, [fetchAppointmentRequests]);

  useEffect(() => {
    fetchFileNumbers({ archived: false });
  }, [fetchFileNumbers]);

  const adminName = user?.role === 'admin' ? user.fullName : 'Admin';

  const getPropertyTypeNames = (ids: number[]) => ids
    .map((id) => propertyTypes.find((propertyType) => propertyType.propertyTypeId === id)?.propertyTypeName || `Type ${id}`)
    .join(', ');

  const activeRequests = useMemo(
    () => fileNumbers.filter((fileNumber) => !fileNumber.archived),
    [fileNumbers],
  );

  const activeStrataCount = useMemo(
    () => stratas.filter((strata) => (strata._count?.fileNumbers ?? 0) > 0).length,
    [stratas],
  );

  const appointmentsThisWeek = useMemo(() => {
    const today = startOfDay(new Date());
    const start = new Date(today);
    const dayOfWeek = start.getDay();
    start.setDate(start.getDate() - dayOfWeek);

    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return appointments.filter((appointment) => {
      if (appointment.status === 'Cancelled') return false;
      const appointmentDate = parseCalendarDate(appointment.appointmentDate);
      return !!appointmentDate && appointmentDate >= start && appointmentDate < end;
    });
  }, [appointments]);

  const todaysAppointments = useMemo(() => {
    const today = startOfDay(new Date());

    return appointments
      .filter((appointment) => {
        if (appointment.status === 'Cancelled') return false;
        const appointmentDate = parseCalendarDate(appointment.appointmentDate);
        return !!appointmentDate && startOfDay(appointmentDate).getTime() === today.getTime();
      })
      .sort((left, right) => left.timeSlot.slotTime.localeCompare(right.timeSlot.slotTime))
      .slice(0, 4);
  }, [appointments]);

  const urgentCards: UrgentCard[] = useMemo(() => {
    const propertyTypeCards: UrgentCard[] = propertyRequests.map((request) => {
      const urgency = getUrgencyMeta(request.createdAt);
      const clientName = getUserDisplayName(request.strataProfile?.profile, 'Unknown client');

      return {
        id: `property-request-${request.propertyTypeRequestId}`,
        kind: 'property-request',
        tone: urgency.tone,
        badge: urgency.badge,
        priority: urgency.priority,
        createdAt: request.createdAt,
        title: getStrataLabel(request.strataProfile?.strata),
        description: `${clientName} requested access to ${getPropertyTypeNames(request.requestedPropertyTypeIds)}. Submitted ${formatRelativeTime(request.createdAt)}.`,
        request,
      };
    });

    const appointmentCards: UrgentCard[] = appointmentRequests.map((request) => {
      const urgency = getUrgencyMeta(request.requestDate);
      const requesterName = getUserDisplayName(request.requestedBy, 'Unknown client');
      const timeLabel = request.firstChoiceTimeSlot?.slotName || 'TBD';

      return {
        id: `appointment-request-${request.appointmentRequestId}`,
        kind: 'appointment-request',
        tone: urgency.tone,
        badge: urgency.badge,
        priority: urgency.priority + 10,
        createdAt: request.requestDate,
        title: getStrataLabel(request.fileNumber?.strata),
        description: `${requesterName} requested ${request.appointmentType?.typeName || 'an appointment'} for ${formatShortDate(request.firstChoiceDate)} at ${timeLabel}.`,
        request,
      };
    });

    const rebookingCards: UrgentCard[] = activeRequests
      .filter((request) => !!request.rebookingRequestedAt)
      .map((request) => {
        const urgency = getUrgencyMeta(request.rebookingRequestedAt);

        return {
          id: `rebooking-${request.fileNumberId}`,
          kind: 'rebooking',
          tone: urgency.tone,
          badge: 'REBOOK',
          priority: urgency.priority + 20,
          createdAt: request.rebookingRequestedAt || request.requestDate,
          title: getStrataLabel(request.strata),
          description: `The client needs a new inspection date after a cancelled appointment. Requested ${formatRelativeTime(request.rebookingRequestedAt)}.`,
          request,
        };
      });

    return [...propertyTypeCards, ...appointmentCards, ...rebookingCards]
      .sort((left, right) => {
        if (right.priority !== left.priority) return right.priority - left.priority;
        const leftTime = parseTimestamp(left.createdAt)?.getTime() || 0;
        const rightTime = parseTimestamp(right.createdAt)?.getTime() || 0;
        return rightTime - leftTime;
      })
      .slice(0, 3);
  }, [activeRequests, appointmentRequests, propertyRequests, propertyTypes]);

  const activityCards: ActivityCard[] = useMemo(() => {
    const cards: ActivityCard[] = [];

    documents.forEach((document: DocumentWithDetails) => {
      cards.push({
        id: `document-${document.fileNumberDocumentId}`,
        kind: 'document',
        title: `${getUserDisplayName(document.uploadedBy, 'A user')} uploaded ${document.documentType.typeName}`,
        description: `${getStrataLabel(document.fileNumber.strata)} · ${document.fileName}`,
        timestamp: document.uploadedAt,
        actionLabel: 'View Documents',
        actionPath: '/admin/documents',
      });
    });

    activeRequests.forEach((request) => {
      const strataLabel = getStrataLabel(request.strata);

      cards.push({
        id: `request-opened-${request.fileNumberId}`,
        kind: 'request',
        title: `${strataLabel} request opened`,
        description: `${request.service?.serviceName || 'Service request'} is active and in ${request.status}.`,
        timestamp: request.requestDate,
        actionLabel: 'Open Strata',
        actionPath: request.strataId ? `/admin/strata/${request.strataId}` : '/admin/strata',
      });

      if (request.submittedForReviewDate) {
        cards.push({
          id: `survey-submitted-${request.fileNumberId}`,
          kind: 'survey',
          title: `${strataLabel} survey submitted`,
          description: 'The latest survey package is ready for review.',
          timestamp: request.submittedForReviewDate,
          actionLabel: 'View Timelines',
          actionPath: '/admin/timelines',
        });
      }

      if (request.appointmentOfferedAt) {
        cards.push({
          id: `appointment-offered-${request.fileNumberId}`,
          kind: 'appointment',
          title: `Appointment window shared with ${strataLabel}`,
          description: 'Scheduling is now open for the client team.',
          timestamp: request.appointmentOfferedAt,
          actionLabel: 'View Appointments',
          actionPath: '/admin/appointments',
        });
      }
    });

    appointmentRequests.forEach((request) => {
      cards.push({
        id: `appointment-activity-${request.appointmentRequestId}`,
        kind: 'appointment',
        title: `${getStrataLabel(request.fileNumber?.strata)} appointment request received`,
        description: `${request.appointmentType?.typeName || 'Appointment'} requested for ${formatShortDate(request.firstChoiceDate)}.`,
        timestamp: request.requestDate,
        actionLabel: 'Review Request',
        actionPath: '/admin/appointments',
      });
    });

    propertyRequests.forEach((request) => {
      cards.push({
        id: `property-activity-${request.propertyTypeRequestId}`,
        kind: 'request',
        title: `${getStrataLabel(request.strataProfile?.strata)} property access requested`,
        description: `${getUserDisplayName(request.strataProfile?.profile, 'A client')} requested ${getPropertyTypeNames(request.requestedPropertyTypeIds)}.`,
        timestamp: request.createdAt,
        actionLabel: 'Manage Users',
        actionPath: '/admin/users',
      });
    });

    return cards
      .sort((left, right) => {
        const leftTime = parseTimestamp(left.timestamp)?.getTime() || 0;
        const rightTime = parseTimestamp(right.timestamp)?.getTime() || 0;
        return rightTime - leftTime;
      })
      .slice(0, 3);
  }, [activeRequests, appointmentRequests, documents, propertyRequests, propertyTypes]);

  const statsLoading = requestsLoading
    || stratasLoading
    || appointmentsLoading
    || appointmentRequestsLoading
    || documentsLoading
    || fileNumbersLoading;

  const handleApprove = async (request: PropertyTypeRequest) => {
    setIsSubmitting(true);
    await approveRequest(request.propertyTypeRequestId);
    setIsSubmitting(false);
  };

  const handleReject = async () => {
    if (!reviewingRequest || !rejectionReason.trim()) return;

    setIsSubmitting(true);
    await rejectRequest(reviewingRequest.propertyTypeRequestId, rejectionReason.trim());
    setIsSubmitting(false);
    setReviewingRequest(null);
    setRejectionReason('');
  };

  if (statsLoading) return <LoadingSpinner />;

  return (
    <div className="admin-dashboard">
      <div className="dashboard-welcome">
        <h1>Welcome, {adminName}</h1>
        <p className="dashboard-subtitle">Dashboard</p>
      </div>

      <div className="dashboard-overview">
        <div className="stats-row">
          <div className="stat-card stat-card--info">
            <span className="stat-number">{activeRequests.length}</span>
            <span className="stat-label">Active Requests</span>
          </div>

          <div className="stat-card stat-card--warning">
            <span className="stat-number">{propertyRequests.length}</span>
            <span className="stat-label">Pending Approvals</span>
          </div>

          <div className="stat-card stat-card--accent">
            <span className="stat-number">{appointmentsThisWeek.length}</span>
            <span className="stat-label">Appointments This Week</span>
          </div>

          <div className="stat-card stat-card--success">
            <span className="stat-number">{activeStrataCount}</span>
            <span className="stat-label">Total Active Strata</span>
          </div>

          <div className="quick-actions-card">
            <h3>Quick Actions</h3>
            <button className="quick-action-link" onClick={() => navigate('/admin/strata')}>
              + Create New Strata
            </button>
            <button className="quick-action-link" onClick={() => navigate('/admin/users')}>
              + Create New User
            </button>
            <button className="quick-action-link" onClick={() => navigate('/admin/appointments')}>
              + Review Appointments
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-surface">
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <h2>Urgent Actions</h2>
            <button className="dashboard-section__link" onClick={() => navigate('/admin/appointments')}>
              View queue
            </button>
          </div>

          {urgentCards.length === 0 ? (
            <div className="empty-actions">
              <p>No pending actions at this time.</p>
            </div>
          ) : (
            <div className="action-cards">
              {urgentCards.map((card) => (
                <div key={card.id} className={`action-card action-card--${card.tone}`}>
                  <div className="action-card-header">
                    <span className={`urgency-badge urgency-badge--${card.tone}`}>{card.badge}</span>
                    <span className="action-card-meta">{formatRelativeTime(card.createdAt)}</span>
                  </div>

                  <h3 className="action-card-title">{card.title}</h3>
                  <p className="action-card-desc">{card.description}</p>

                  <div className="action-card-actions">
                    {card.kind === 'property-request' ? (
                      <>
                        <button
                          className="btn-action btn-action--primary"
                          onClick={() => handleApprove(card.request)}
                          disabled={isSubmitting}
                        >
                          Approve
                        </button>
                        <button
                          className="btn-action btn-action--secondary"
                          onClick={() => {
                            setReviewingRequest(card.request);
                            setRejectionReason('');
                          }}
                        >
                          Reject
                        </button>
                      </>
                    ) : card.kind === 'appointment-request' ? (
                      <>
                        <button
                          className="btn-action btn-action--primary"
                          onClick={() => navigate('/admin/appointments')}
                        >
                          Review Request
                        </button>
                        <button
                          className="btn-action btn-action--secondary"
                          onClick={() => navigate('/admin/timelines')}
                        >
                          View Timelines
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn-action btn-action--primary"
                          onClick={() => navigate('/admin/appointments')}
                        >
                          Review Booking
                        </button>
                        <button
                          className="btn-action btn-action--secondary"
                          onClick={() => navigate('/admin/timelines')}
                        >
                          View Timelines
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <h2>Today&apos;s Appointments</h2>
            <button className="dashboard-section__link" onClick={() => navigate('/admin/appointments')}>
              View all
            </button>
          </div>

          {todaysAppointments.length === 0 ? (
            <div className="empty-actions">
              <p>No appointments scheduled for today.</p>
            </div>
          ) : (
            <div className="dashboard-appointments-grid">
              {todaysAppointments.map((appointment) => (
                <div key={appointment.appointmentId} className="appointment-card">
                  <span className="appointment-card__time">{formatTime12h(appointment.timeSlot.slotTime)}</span>
                  <h3 className="appointment-card__title">{getStrataLabel(appointment.fileNumber?.strata)}</h3>
                  <p className="appointment-card__detail">
                    {appointment.fileNumber?.strata.location?.locationName || appointment.fileNumber?.strata.town || 'Location to confirm'}
                  </p>
                  <p className="appointment-card__detail">
                    {appointment.appointmentType.typeName} · Inspector: {getUserDisplayName(appointment.inspector, 'Unassigned')}
                  </p>
                  <button
                    className="btn-action btn-action--secondary"
                    onClick={() => navigate('/admin/appointments')}
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <h2>Recent Activity</h2>
            <button className="dashboard-section__link" onClick={() => navigate('/admin/strata')}>
              Open workspace
            </button>
          </div>

          {activityCards.length === 0 ? (
            <div className="empty-actions">
              <p>No recent activity is available yet.</p>
            </div>
          ) : (
            <div className="dashboard-activity-grid">
              {activityCards.map((activity) => (
                <div key={activity.id} className={`activity-card activity-card--${activity.kind}`}>
                  <span className="activity-card__meta">{formatRelativeTime(activity.timestamp)}</span>
                  <h3 className="activity-card__title">{activity.title}</h3>
                  <p className="activity-card__detail">{activity.description}</p>
                  <button
                    className="btn-action btn-action--ghost"
                    onClick={() => navigate(activity.actionPath)}
                  >
                    {activity.actionLabel}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal
        isOpen={!!reviewingRequest}
        onClose={() => setReviewingRequest(null)}
        title="Reject Property Type Request"
        size="medium"
        footer={(
          <>
            <button className="btn-secondary" onClick={() => setReviewingRequest(null)}>Cancel</button>
            <button className="btn-delete" onClick={handleReject} disabled={!rejectionReason.trim() || isSubmitting}>
              {isSubmitting ? 'Rejecting...' : 'Reject Request'}
            </button>
          </>
        )}
      >
        <div className="rejection-form">
          <p>Please provide a reason for rejecting this request:</p>
          <textarea
            className="form-textarea"
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Enter rejection reason..."
            rows={3}
          />
        </div>
      </Modal>
    </div>
  );
};
