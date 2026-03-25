import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useAppointments } from '../../shared/hooks/useAppointments';
import { useFileNumbers } from '../../shared/hooks/useFileNumbers';
import { useLookups } from '../../shared/hooks/useLookups';
import { usePropertyTypeRequests } from '../../shared/hooks/usePropertyTypeRequests';
import { useActivationRequests } from '../../shared/hooks/useActivationRequests';
import { useStrata } from '../../shared/hooks/useStrata';
import { useInspectorAvailability } from '../../shared/hooks/useInspectorAvailability';
import { useNotifications } from '../../shared/hooks/useNotifications';
import { useProfileActivities } from '../../shared/hooks/useProfileActivities';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Modal } from '../../shared/components/Modal';
import { Tabs } from '../../shared/components/Tabs';
import { InspectorAvailabilityModal } from '../components/InspectorAvailabilityModal';
import { CreateStrataModal } from '../components/CreateStrataModal';
import { CreateUserModal } from '../components/CreateUserModal';
import { CreateAppointmentModal } from '../components/CreateAppointmentModal';
import { UploadDocumentModal } from '../components/UploadDocumentModal';
import { CreateQuestionModal } from '../components/CreateQuestionModal';
import { formatTime12h, getUserDisplayName, formatRelativeTime } from '../../shared/utils/formatters';
import { parseLocalDate, parseTimestamp } from '../../shared/utils/dateUtils';
import type { PropertyTypeRequest } from '../../shared/types/entities.types';
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

const FIELD_LABELS: Record<string, string> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  phoneNumber: 'Phone Number',
  companyName: 'Company Name',
  strataPosition: 'Strata Position',
};

const TIME_WINDOWS = [
  { id: '24',  label: '24 Hours', hours: 24  },
  { id: '72',  label: '72 Hours', hours: 72  },
  { id: '168', label: '7 Days',   hours: 168 },
  { id: '336', label: '14 Days',  hours: 336 },
] as const;

const windowHours = (id: string) => TIME_WINDOWS.find((w) => w.id === id)!.hours;
const windowLabel = (id: string) => TIME_WINDOWS.find((w) => w.id === id)!.label.toLowerCase();

const isWithinPastHours = (value: string | null | undefined, hours: number) => {
  const date = parseTimestamp(value);
  return !!date && Date.now() - date.getTime() <= hours * 3_600_000;
};

const isUpcomingWithinHours = (value: string | null | undefined, hours: number) => {
  const date = parseCalendarDate(value);
  if (!date) return false;
  const diff = date.getTime() - Date.now();
  return diff >= 0 && diff <= hours * 3_600_000;
};

const TIME_WINDOW_TABS = TIME_WINDOWS.map((w) => ({ key: w.id, label: w.label }));

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
  const {
    requests: activationRequests,
    loading: activationRequestsLoading,
  } = useActivationRequests();
  const { stratas, loading: stratasLoading, refetch: fetchStratas } = useStrata();
  const { propertyTypes } = useLookups();
  const {
    appointments,
    loading: appointmentsLoading,
    requests: appointmentRequests,
    requestsLoading: appointmentRequestsLoading,
    fetchAppointmentRequests,
    refetch: fetchAppointments,
  } = useAppointments();
  const { fileNumbers, loading: fileNumbersLoading, refetch: fetchFileNumbers } = useFileNumbers();
  const { createAvailableDate } = useInspectorAvailability();
  const { notifications, loading: notificationsLoading, markRead } = useNotifications();

  const [activityWindow, setActivityWindow] = useState('24');
  const { activities: profileActivities, loading: profileActivitiesLoading } = useProfileActivities(windowHours(activityWindow));
  const [appointmentsWindow, setAppointmentsWindow] = useState('24');
  const [targetDatesWindow, setTargetDatesWindow] = useState('24');

  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [strataModalOpen, setStrataModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [uploadDocumentModalOpen, setUploadDocumentModalOpen] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [reviewingRequest, setReviewingRequest] = useState<PropertyTypeRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAppointmentRequests('Pending Review');
  }, [fetchAppointmentRequests]);

  useEffect(() => {
    fetchFileNumbers({ archived: false });
  }, [fetchFileNumbers]);

  const adminName = user && user.role !== 'client' ? user.fullName : 'Admin';

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

  const upcomingAppointments = useMemo(() => {
    const hours = windowHours(appointmentsWindow);
    return appointments
      .filter((a) => a.status !== 'Cancelled' && isUpcomingWithinHours(a.appointmentDate, hours))
      .sort((a, b) => {
        const diff = a.appointmentDate.localeCompare(b.appointmentDate);
        return diff !== 0 ? diff : a.timeSlot.slotTime.localeCompare(b.timeSlot.slotTime);
      });
  }, [appointments, appointmentsWindow]);

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

    const activationCards: UrgentCard[] = activationRequests.map((request) => {
      const urgency = getUrgencyMeta(request.createdAt);
      const clientName = getUserDisplayName(request.strataProfile?.profile, 'Unknown client');

      return {
        id: `activation-request-${request.activationRequestId}`,
        kind: 'activation-request',
        tone: urgency.tone,
        badge: 'ACTIVATE',
        priority: urgency.priority + 15,
        createdAt: request.createdAt,
        title: getStrataLabel(request.strataProfile?.strata),
        description: `${clientName} requested account activation. Submitted ${formatRelativeTime(request.createdAt)}.`,
        request,
      };
    });

    const appointmentCards: UrgentCard[] = appointmentRequests.map((request) => {
      const urgency = getUrgencyMeta(request.requestDate);
      const requesterName = getUserDisplayName(request.requestedBy, 'Unknown client');
      const timeLabel = request.firstChoiceTimeSlot ? formatTime12h(request.firstChoiceTimeSlot.slotTime) : 'TBD';

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
          id: `rebooking-${request.fileId}`,
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

    const finalizedCards: UrgentCard[] = activeRequests
      .filter((request) =>
        !!request.submittedForReviewDate &&
        !request.appointmentOfferedAt &&
        (
          (!request.latestDocumentReviewDate && !!request.docsReadyForReview) ||
          (!!request.latestDocumentFinalizedDate &&
            request.latestDocumentFinalizedDate >= (request.latestDocumentReviewDate ?? ''))
        )
      )
      .map((request) => {
        const urgency = getUrgencyMeta(request.submittedForReviewDate);
        return {
          id: `finalized-${request.fileId}`,
          kind: 'finalized' as const,
          tone: urgency.tone,
          badge: 'REVIEW',
          priority: urgency.priority + 5,
          createdAt: request.submittedForReviewDate!,
          title: getStrataLabel(request.strata),
          description: `Application finalized. Submitted ${formatRelativeTime(request.submittedForReviewDate)}. Offer an inspection appointment.`,
          strataId: request.strata?.strataId ?? request.strataId,
        };
      });

    const docResubmitCards: UrgentCard[] = notifications
      .filter((n) => n.type === 'doc_resubmitted_after_rejection' && !n.isRead && n.referenceId != null)
      .map((n) => {
        const urgency = getUrgencyMeta(n.createdAt);
        return {
          id: `doc-resubmit-${n.notificationId}`,
          kind: 'doc-resubmit' as const,
          tone: urgency.tone,
          badge: 'REVIEW DOCS',
          priority: urgency.priority + 25,
          createdAt: n.createdAt,
          title: 'Document Re-submission',
          description: n.message,
          notificationId: n.notificationId,
          strataId: n.referenceId!,
        };
      });

    return [...propertyTypeCards, ...activationCards, ...appointmentCards, ...rebookingCards, ...finalizedCards, ...docResubmitCards]
      .sort((left, right) => {
        if (right.priority !== left.priority) return right.priority - left.priority;
        const leftTime = parseTimestamp(left.createdAt)?.getTime() || 0;
        const rightTime = parseTimestamp(right.createdAt)?.getTime() || 0;
        return rightTime - leftTime;
      });
  }, [activeRequests, activationRequests, appointmentRequests, propertyRequests, propertyTypes, notifications]);

  const activityCards: ActivityCard[] = useMemo(() => {
    const hours = windowHours(activityWindow);
    const surveyCards: ActivityCard[] = activeRequests
      .filter((r) => isWithinPastHours(r.submittedForReviewDate, hours))
      .map((r) => ({
        id: `finalized-${r.fileId}`,
        kind: 'survey' as const,
        title: `${getStrataLabel(r.strata)} application finalized`,
        description: 'All survey answers and required documents have been submitted.',
        timestamp: r.submittedForReviewDate!,
        actionLabel: 'Open Strata',
        actionPath: r.strataId ? `/admin/strata/${r.strataId}` : '/admin/strata',
      }));

    const profileCards: ActivityCard[] = profileActivities.map((a) => {
      const clientName = getUserDisplayName(a.strataProfile?.profile, 'Unknown client');
      const strataId = a.strataProfile?.strata?.strataId;
      const changeDescriptions = Object.entries(a.changedFields).map(([field, value]) => {
        const label = FIELD_LABELS[field] ?? field;
        const change = value as { from: unknown; to: unknown };
        if (change && typeof change === 'object' && 'from' in change && 'to' in change) {
          return `${label} from ${change.from ?? 'none'} to ${change.to ?? 'none'}`;
        }
        return label;
      });
      return {
        id: `profile-activity-${a.activityLogId}`,
        kind: 'profile' as const,
        title: `${getStrataLabel(a.strataProfile?.strata)} — client profile updated`,
        description: `${clientName} changed ${changeDescriptions.join(', ')}.`,
        timestamp: a.changedAt,
        actionLabel: 'Open Strata',
        actionPath: strataId ? `/admin/strata/${strataId}` : '/admin/strata',
      };
    });

    return [...surveyCards, ...profileCards]
      .sort((a, b) => (parseTimestamp(b.timestamp)?.getTime() ?? 0) - (parseTimestamp(a.timestamp)?.getTime() ?? 0));
  }, [activeRequests, activityWindow, profileActivities]);

  const upcomingTargetDates = useMemo(() => {
    const hours = windowHours(targetDatesWindow);
    return fileNumbers
      .filter((fn) => !fn.archived && isUpcomingWithinHours(fn.targetDate, hours))
      .map((fn) => ({ fn, date: parseLocalDate(fn.targetDate) }))
      .sort((a, b) => a.date!.getTime() - b.date!.getTime());
  }, [fileNumbers, targetDatesWindow]);

  const statsLoading = requestsLoading
    || stratasLoading
    || appointmentsLoading
    || appointmentRequestsLoading
    || fileNumbersLoading
    || activationRequestsLoading
    || profileActivitiesLoading
    || notificationsLoading;

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
            <h3>Shortcuts</h3>
            <div className="quick-action-links">
              <button className="btn-action btn-action--primary" onClick={() => setStrataModalOpen(true)}>
                Create New Strata
              </button>
              <button className="btn-action btn-action--primary" onClick={() => setUserModalOpen(true)}>
                Create New User
              </button>
              <button className="btn-action btn-action--primary" onClick={() => setAppointmentModalOpen(true)}>
                New Appointment
              </button>
              <button className="btn-action btn-action--primary shortcuts-desktop-only" onClick={() => setUploadDocumentModalOpen(true)}>
                Upload Document
              </button>
              <button className="btn-action btn-action--primary shortcuts-desktop-only" onClick={() => setQuestionModalOpen(true)}>
                Add Question
              </button>
              <button className="btn-action btn-action--primary shortcuts-desktop-only" onClick={() => setAvailabilityModalOpen(true)}>
                Add Inspector Availability
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-surface">
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <h2>Urgent Actions</h2>
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
                    ) : card.kind === 'activation-request' ? (
                      <button
                        className="btn-action btn-action--primary"
                        onClick={() => navigate(`/admin/strata/${card.request.strataProfile?.strata.strataId}`, { state: { openCreateSR: true } })}
                      >
                        Review
                      </button>
                    ) : card.kind === 'appointment-request' ? (
                      <>
                        <button
                          className="btn-action btn-action--primary"
                          onClick={() => navigate('/admin/appointments', { state: { openRequestId: card.request.appointmentRequestId } })}
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
                    ) : card.kind === 'finalized' ? (
                      <button
                        className="btn-action btn-action--primary"
                        onClick={() => navigate(`/admin/strata/${card.strataId}`, { state: { promptOfferAppointment: true } })}
                      >
                        Review
                      </button>
                    ) : card.kind === 'doc-resubmit' ? (
                      <button
                        className="btn-action btn-action--primary"
                        onClick={() => {
                          markRead(card.notificationId);
                          navigate(`/admin/strata/${card.strataId}`);
                        }}
                      >
                        Review Documents
                      </button>
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
            <h2>Upcoming Appointments</h2>
            <Tabs tabs={TIME_WINDOW_TABS} activeTab={appointmentsWindow} onChange={setAppointmentsWindow} variant="pill" />
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="empty-actions">
              <p>No upcoming appointments within the next {windowLabel(appointmentsWindow)}.</p>
            </div>
          ) : (
            <div className="dashboard-appointments-grid">
              {upcomingAppointments.map((appointment) => {
                const appointmentDay = startOfDay(parseCalendarDate(appointment.appointmentDate)!).getTime();
                const todayMs = startOfDay(new Date()).getTime();
                const isUrgent = appointmentDay === todayMs || appointmentDay === todayMs + 86400000;
                return (
                  <div key={appointment.appointmentId} className="appointment-card">
                    <span className="appointment-card__time">{formatShortDate(appointment.appointmentDate)} · {formatTime12h(appointment.timeSlot.slotTime)}</span>
                    <h3 className="appointment-card__title">{getStrataLabel(appointment.fileNumber?.strata)}</h3>
                    <p className="appointment-card__detail">
                      {appointment.fileNumber?.strata.location?.locationName || appointment.fileNumber?.strata.town || 'Location to confirm'}
                    </p>
                    <p className="appointment-card__detail">
                      {appointment.appointmentType.typeName} · Inspector: {getUserDisplayName(appointment.inspector, 'Unassigned')}
                    </p>
                    <button
                      className={`btn-action ${isUrgent ? 'btn-action--primary' : 'btn-action--secondary'}`}
                      onClick={() => navigate('/admin/appointments')}
                    >
                      View Details
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <h2>Upcoming Target Dates</h2>
            <Tabs tabs={TIME_WINDOW_TABS} activeTab={targetDatesWindow} onChange={setTargetDatesWindow} variant="pill" />
          </div>
          {upcomingTargetDates.length === 0 ? (
            <div className="empty-actions">
              <p>No upcoming target dates within the next {windowLabel(targetDatesWindow)}.</p>
            </div>
          ) : (
            <div className="dashboard-appointments-grid">
              {upcomingTargetDates.map(({ fn }) => (
                <div key={fn.fileId} className="appointment-card">
                  <span className="appointment-card__time">{formatShortDate(fn.targetDate)}</span>
                  <h3 className="appointment-card__title">{fn.strata?.complexName || fn.strata?.strataPlan || 'Unknown'}</h3>
                  <button
                    className="btn-action btn-action--secondary"
                    onClick={() => navigate('/admin/timelines')}
                  >
                    View Timelines
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <h2>Recent Activity</h2>
            <Tabs tabs={TIME_WINDOW_TABS} activeTab={activityWindow} onChange={setActivityWindow} variant="pill" />
          </div>

          {activityCards.length === 0 ? (
            <div className="empty-actions">
              <p>No recent activity within the last {windowLabel(activityWindow)}.</p>
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
                    onClick={() => { navigate(activity.actionPath); window.scrollTo(0, 0); }}
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


      <InspectorAvailabilityModal
        isOpen={availabilityModalOpen}
        onClose={() => setAvailabilityModalOpen(false)}
        initialData={null}
        onSubmitBulkCreate={async (inputs) => { for (const input of inputs) { await createAvailableDate(input); } }}
        onSubmitUpdate={() => Promise.resolve()}
        onDeleteClick={() => {}}
      />
      <CreateStrataModal isOpen={strataModalOpen} onClose={() => { setStrataModalOpen(false); fetchStratas(); }} />
      <CreateUserModal isOpen={userModalOpen} onClose={() => setUserModalOpen(false)} />
      <CreateAppointmentModal isOpen={appointmentModalOpen} onClose={() => { setAppointmentModalOpen(false); fetchAppointments(); }} />
      <UploadDocumentModal isOpen={uploadDocumentModalOpen} onClose={() => setUploadDocumentModalOpen(false)} />
      <CreateQuestionModal isOpen={questionModalOpen} onClose={() => setQuestionModalOpen(false)} />
    </div>
  );
};
