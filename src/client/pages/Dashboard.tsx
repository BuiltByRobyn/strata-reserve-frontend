import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useClientAppointments } from '../../shared/hooks/useClientAppointments';
import { useClientDocuments } from '../../shared/hooks/useClientDocuments';
import { useClientFileNumber } from '../../shared/hooks/useClientFileNumber';
import { usePropertyTypeRequest } from '../../shared/hooks/usePropertyTypeRequest';
import { useSurvey } from '../../shared/hooks/useSurvey';
import { useTimelines } from '../../shared/hooks/useTimelines';
import { formatDateLong, formatTime12h, getUserDisplayName, formatRelativeTime } from '../../shared/lib/formatters';
import { parseLocalDate, parseTimestamp } from '../../shared/lib/dateUtils';
import type { ActiveAppointmentResponse } from '../../shared/types/appointment.types';
import { SURVEY_SECTIONS } from '../../shared/types/survey.types';
import type { ClientActionCard, ClientActivityCard } from '../../shared/types/dashboard.types';

const formatShortDate = (value: string | null | undefined) => {
  const date = parseLocalDate(value) || parseTimestamp(value);
  if (!date) return 'TBD';
  return date.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
};

const getDashboardTone = (missingCount: number, totalCount: number) => {
  if (totalCount > 0 && missingCount === 0) return 'success';
  if (missingCount > 0) return 'warning';
  return 'accent';
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeRequest, fileNumberId, loading: requestLoading } = useClientFileNumber();
  const { request: propertyTypeRequest, loading: propertyTypeLoading } = usePropertyTypeRequest();
  const { timelines, loading: timelinesLoading } = useTimelines(fileNumberId);
  const { questions, responses, loading: surveyLoading, fetchQuestions, fetchResponses } = useSurvey();
  const {
    documents,
    requiredDocuments,
    loading: documentsLoading,
    fetchRequiredDocuments,
  } = useClientDocuments();
  const { getActiveAppointment, checkDraftMeetingEligibility } = useClientAppointments();

  const [activeAppointment, setActiveAppointment] = useState<ActiveAppointmentResponse>(null);
  const [appointmentLoading, setAppointmentLoading] = useState(true);
  const [draftMeetingEligible, setDraftMeetingEligible] = useState(false);

  useEffect(() => {
    if (!fileNumberId) {
      setAppointmentLoading(false);
      setActiveAppointment(null);
      setDraftMeetingEligible(false);
      return;
    }

    let ignore = false;
    setAppointmentLoading(true);

    Promise.all([
      getActiveAppointment(),
      checkDraftMeetingEligibility(fileNumberId),
    ]).then(([appointment, eligible]) => {
      if (ignore) return;
      setActiveAppointment(appointment);
      setDraftMeetingEligible(eligible);
    }).finally(() => {
      if (!ignore) {
        setAppointmentLoading(false);
      }
    });

    return () => {
      ignore = true;
    };
  }, [checkDraftMeetingEligibility, fileNumberId, getActiveAppointment]);

  useEffect(() => {
    if (!fileNumberId) return;
    fetchQuestions(fileNumberId);
    fetchResponses(fileNumberId);
    fetchRequiredDocuments(fileNumberId);
  }, [fetchQuestions, fetchRequiredDocuments, fetchResponses, fileNumberId]);

  const welcomeName = user?.role === 'client' ? user.firstName || 'there' : 'there';
  const dashboardTitle = activeRequest?.strata?.complexName || activeRequest?.strata?.strataPlan || 'Your Strata Reserve project';
  const clientPropertyTypeIds = useMemo(
    () => activeRequest?.clientPropertyTypes?.map((propertyType) => propertyType.propertyTypeId) || [],
    [activeRequest],
  );

  const filteredRequiredDocuments = useMemo(() => {
    if (clientPropertyTypeIds.length === 0) {
      return requiredDocuments.filter((document) => !document.propertyType);
    }

    return requiredDocuments.filter((document) => (
      !document.propertyType || clientPropertyTypeIds.includes(document.propertyType.propertyTypeId)
    ));
  }, [clientPropertyTypeIds, requiredDocuments]);

  const requiredDocumentCount = useMemo(
    () => filteredRequiredDocuments.filter((document) => document.isRequired).length,
    [filteredRequiredDocuments],
  );

  const uploadedRequiredDocumentCount = useMemo(
    () => filteredRequiredDocuments.filter((document) => document.isRequired && document.uploadedDocument).length,
    [filteredRequiredDocuments],
  );

  const missingRequiredDocumentCount = Math.max(requiredDocumentCount - uploadedRequiredDocumentCount, 0);
  const hasPropertyTypeSetupPending = clientPropertyTypeIds.length === 0 && !!activeRequest?.strata?.strataPropertyTypes?.length;

  const sectionProgress = useMemo(() => {
    const answeredQuestionIds = new Set(responses.map((response) => response.questionId));

    return SURVEY_SECTIONS
      .map((section) => {
        const parentQuestions = questions.filter(
          (question) => question.questionCategory === section.label && question.parentQuestionId == null,
        );

        const answeredCount = parentQuestions.filter((question) => answeredQuestionIds.has(question.questionId)).length;

        return {
          ...section,
          total: parentQuestions.length,
          answered: answeredCount,
          complete: parentQuestions.length > 0 && answeredCount >= parentQuestions.length,
        };
      })
      .filter((section) => section.total > 0);
  }, [questions, responses]);

  const completedSectionsCount = sectionProgress.filter((section) => section.complete).length;
  const surveyCompletionLabel = sectionProgress.length > 0
    ? `${completedSectionsCount}/${sectionProgress.length}`
    : activeRequest?.submittedForReviewDate ? 'Done' : '0/0';

  const appointmentStatus = useMemo(() => {
    if (activeRequest?.rebookingRequestedAt) {
      return { label: 'Rebook Now', tone: 'warning' };
    }
    if (activeAppointment?.type === 'scheduled') {
      return { label: 'Scheduled', tone: 'success' };
    }
    if (activeAppointment?.type === 'pending_request') {
      return { label: 'Pending', tone: 'accent' };
    }
    if (activeRequest?.appointmentOfferedAt) {
      return { label: 'Book Now', tone: 'warning' };
    }
    return { label: 'Waiting', tone: 'info' };
  }, [activeAppointment, activeRequest]);

  const timelineTargetDate = timelines?.targetDate || activeRequest?.targetDate || null;
  const quickActions = useMemo(() => {
    const actions = [
      {
        label: activeRequest?.submittedForReviewDate ? 'Review Survey' : 'Continue Survey',
        path: '/client/survey',
      },
      {
        label: missingRequiredDocumentCount > 0 ? 'Upload Documents' : 'View Documents',
        path: '/client/documents',
      },
      {
        label: timelineTargetDate ? 'Review Timelines' : 'Add Timelines',
        path: '/client/timelines',
      },
    ];

    if (activeRequest?.appointmentOfferedAt || activeRequest?.rebookingRequestedAt) {
      actions.push({ label: 'Book Inspection Date', path: '/client/inspection-date' });
    }

    return actions.slice(0, 4);
  }, [activeRequest, missingRequiredDocumentCount, timelineTargetDate]);

  const priorityActions: ClientActionCard[] = useMemo(() => {
    const items: Array<ClientActionCard & { priority: number }> = [];

    if (activeRequest?.rebookingRequestedAt) {
      items.push({
        id: 'rebook-appointment',
        tone: 'overdue',
        badge: 'ACTION REQUIRED',
        title: 'Rebook your inspection',
        description: 'Your previous appointment was cancelled. Please choose new preferred dates so the team can continue scheduling.',
        ctaLabel: 'Book Inspection Date',
        ctaPath: '/client/inspection-date',
        priority: 100,
      });
    } else if (activeRequest?.appointmentOfferedAt && !activeAppointment) {
      items.push({
        id: 'book-appointment',
        tone: 'due-today',
        badge: 'NEXT STEP',
        title: 'Choose your inspection dates',
        description: 'SRP has opened appointment booking for your file. Share your preferred dates to keep the project moving.',
        ctaLabel: 'Select Dates',
        ctaPath: '/client/inspection-date',
        priority: 95,
      });
    }

    if (hasPropertyTypeSetupPending) {
      items.push({
        id: 'property-types',
        tone: propertyTypeRequest?.status === 'Rejected' ? 'overdue' : 'upcoming',
        badge: propertyTypeRequest?.status === 'Rejected' ? 'UPDATE NEEDED' : 'SETUP',
        title: propertyTypeRequest?.status === 'Pending' ? 'Property type request is pending approval' : 'Select your property types',
        description: propertyTypeRequest?.status === 'Pending'
          ? 'Your document checklist will unlock once the admin team approves your property type access.'
          : 'Choose the property types that apply to your strata so the right document checklist can be prepared.',
        ctaLabel: 'Open Documents',
        ctaPath: '/client/documents',
        priority: propertyTypeRequest?.status === 'Rejected' ? 90 : 80,
      });
    }

    if (!timelineTargetDate) {
      items.push({
        id: 'timelines',
        tone: 'due-today',
        badge: 'IMPORTANT',
        title: 'Confirm your project timelines',
        description: 'Add your key fiscal and planning dates so the project schedule can be aligned to your target delivery window.',
        ctaLabel: 'Update Timelines',
        ctaPath: '/client/timelines',
        priority: 70,
      });
    }

    if (sectionProgress.length > 0 && completedSectionsCount < sectionProgress.length) {
      items.push({
        id: 'survey-progress',
        tone: 'upcoming',
        badge: 'IN PROGRESS',
        title: 'Continue your survey',
        description: `You have completed ${completedSectionsCount} of ${sectionProgress.length} survey sections so far.`,
        ctaLabel: 'Open Survey',
        ctaPath: '/client/survey',
        priority: 60,
      });
    }

    if (!hasPropertyTypeSetupPending && missingRequiredDocumentCount > 0) {
      items.push({
        id: 'documents-progress',
        tone: 'upcoming',
        badge: 'DOCUMENTS',
        title: 'Upload your remaining required documents',
        description: `${missingRequiredDocumentCount} required document${missingRequiredDocumentCount === 1 ? '' : 's'} still need to be uploaded before your package is complete.`,
        ctaLabel: 'Manage Documents',
        ctaPath: '/client/documents',
        priority: 55,
      });
    }

    if (activeAppointment?.type === 'pending_request') {
      items.push({
        id: 'appointment-review',
        tone: 'upcoming',
        badge: 'UNDER REVIEW',
        title: 'Appointment request submitted',
        description: 'Your preferred dates have been shared with SRP. We will follow up once the request is reviewed.',
        ctaLabel: 'View Appointment Status',
        ctaPath: '/client/inspection-date',
        priority: 40,
      });
    }

    return items
      .sort((left, right) => right.priority - left.priority)
      .slice(0, 3)
      .map(({ priority, ...card }) => card);
  }, [
    activeAppointment,
    activeRequest,
    completedSectionsCount,
    hasPropertyTypeSetupPending,
    missingRequiredDocumentCount,
    propertyTypeRequest?.status,
    sectionProgress.length,
    timelineTargetDate,
  ]);

  const appointmentDetails = useMemo(() => {
    if (!activeAppointment) return null;

    if (activeAppointment.type === 'pending_request') {
      return {
        badge: 'Pending Review',
        title: activeAppointment.data.appointmentType?.typeName || 'Appointment Request',
        lines: [
          `First choice: ${formatShortDate(activeAppointment.data.firstChoiceDate)} at ${activeAppointment.data.firstChoiceTimeSlot?.slotName || 'TBD'}`,
          activeAppointment.data.secondChoiceDate
            ? `Second choice: ${formatShortDate(activeAppointment.data.secondChoiceDate)} at ${activeAppointment.data.secondChoiceTimeSlot?.slotName || 'TBD'}`
            : 'No second-choice time submitted.',
        ],
        ctaLabel: 'Review Booking',
        ctaPath: '/client/inspection-date',
      };
    }

    return {
      badge: activeAppointment.data.status,
      title: activeAppointment.data.appointmentType.typeName,
      lines: [
        `${formatDateLong(activeAppointment.data.appointmentDate)} at ${formatTime12h(activeAppointment.data.timeSlot.slotTime)}`,
        `Inspector: ${getUserDisplayName(activeAppointment.data.inspector, 'To be assigned')}`,
      ],
      ctaLabel: 'View Appointment',
      ctaPath: '/client/inspection-date',
    };
  }, [activeAppointment]);

  const currentRequestDocuments = useMemo(
    () => documents.filter((document) => document.fileNumber.fileNumberId === fileNumberId),
    [documents, fileNumberId],
  );

  const recentActivity: ClientActivityCard[] = useMemo(() => {
    const items: ClientActivityCard[] = [];

    if (activeRequest) {
      items.push({
        id: 'request-opened',
        kind: 'request',
        title: 'Service request opened',
        description: `${activeRequest.service?.serviceName || 'Strata Reserve project'} is active for ${dashboardTitle}.`,
        timestamp: activeRequest.requestDate,
        actionLabel: 'View Timelines',
        actionPath: '/client/timelines',
      });

      if (activeRequest.submittedForReviewDate) {
        items.push({
          id: 'survey-submitted',
          kind: 'survey',
          title: 'Survey package submitted',
          description: 'Your survey responses have been submitted for the admin team to review.',
          timestamp: activeRequest.submittedForReviewDate,
          actionLabel: 'Review Survey',
          actionPath: '/client/survey',
        });
      }

      if (activeRequest.appointmentOfferedAt) {
        items.push({
          id: 'appointment-offered',
          kind: 'appointment',
          title: 'Appointment booking opened',
          description: 'SRP has invited your team to share preferred inspection dates.',
          timestamp: activeRequest.appointmentOfferedAt,
          actionLabel: 'Open Booking',
          actionPath: '/client/inspection-date',
        });
      }

      if (activeRequest.rebookingRequestedAt) {
        items.push({
          id: 'rebooking-requested',
          kind: 'appointment',
          title: 'Inspection needs to be rebooked',
          description: 'The previous appointment was cancelled and new dates are needed.',
          timestamp: activeRequest.rebookingRequestedAt,
          actionLabel: 'Rebook Inspection',
          actionPath: '/client/inspection-date',
        });
      }
    }

    if (activeAppointment?.type === 'pending_request') {
      items.push({
        id: 'appointment-pending',
        kind: 'appointment',
        title: 'Appointment request sent',
        description: `${formatShortDate(activeAppointment.data.firstChoiceDate)} was shared as your first choice.`,
        timestamp: activeAppointment.data.requestDate,
        actionLabel: 'View Request',
        actionPath: '/client/inspection-date',
      });
    }

    currentRequestDocuments.forEach((document) => {
      items.push({
        id: `document-${document.fileNumberDocumentId}`,
        kind: 'document',
        title: `${document.documentType.typeName} uploaded`,
        description: `${document.fileName}${document.reviewStatus?.statusName ? ` · ${document.reviewStatus.statusName}` : ''}`,
        timestamp: document.uploadedAt,
        actionLabel: 'Open Documents',
        actionPath: '/client/documents',
      });
    });

    if (propertyTypeRequest) {
      items.push({
        id: `property-type-request-${propertyTypeRequest.propertyTypeRequestId}`,
        kind: 'request',
        title: 'Property type access updated',
        description: `Current status: ${propertyTypeRequest.status}.`,
        timestamp: propertyTypeRequest.reviewedAt || propertyTypeRequest.createdAt,
        actionLabel: 'Open Documents',
        actionPath: '/client/documents',
      });
    }

    return items
      .sort((left, right) => {
        const leftTime = parseTimestamp(left.timestamp)?.getTime() || 0;
        const rightTime = parseTimestamp(right.timestamp)?.getTime() || 0;
        return rightTime - leftTime;
      })
      .slice(0, 3);
  }, [activeAppointment, activeRequest, currentRequestDocuments, dashboardTitle, propertyTypeRequest]);

  const dashboardLoading = requestLoading || propertyTypeLoading || surveyLoading || documentsLoading || timelinesLoading || appointmentLoading;

  if (dashboardLoading) return <LoadingSpinner />;

  if (!activeRequest) {
    return (
      <div className="client-dashboard">
        <div className="dashboard-welcome">
          <h1>Welcome, {welcomeName}</h1>
          <p className="dashboard-subtitle">Dashboard</p>
        </div>

        <div className="dashboard-surface">
          <section className="dashboard-section">
            <div className="empty-actions empty-actions--spacious">
              <p>No active service request was found for your account. Please contact the SRP team for help.</p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="client-dashboard">
      <div className="dashboard-welcome">
        <h1>Welcome, {welcomeName}</h1>
        <p className="dashboard-subtitle">{dashboardTitle}</p>
      </div>

      <div className="dashboard-overview">
        <div className="stats-row">
          <div className="stat-card stat-card--info">
            <span className="stat-number stat-number--compact">{activeRequest.status}</span>
            <span className="stat-label">Request Status</span>
          </div>

          <div className="stat-card stat-card--accent">
            <span className="stat-number">{surveyCompletionLabel}</span>
            <span className="stat-label">Survey Sections Complete</span>
          </div>

          <div className={`stat-card stat-card--${getDashboardTone(missingRequiredDocumentCount, requiredDocumentCount)}`}>
            <span className="stat-number">{requiredDocumentCount > 0 ? `${uploadedRequiredDocumentCount}/${requiredDocumentCount}` : '0/0'}</span>
            <span className="stat-label">Required Documents Uploaded</span>
          </div>

          <div className={`stat-card stat-card--${appointmentStatus.tone}`}>
            <span className="stat-number stat-number--compact">{appointmentStatus.label}</span>
            <span className="stat-label">Appointment Status</span>
          </div>

          <div className="quick-actions-card quick-actions-card--client">
            <h3>Quick Actions</h3>
            {quickActions.map((action) => (
              <button key={action.path} className="quick-action-link" onClick={() => navigate(action.path)}>
                + {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-surface">
        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <h2>Priority Actions</h2>
            <button className="dashboard-section__link" onClick={() => navigate('/client/dashboard')}>
              Stay on track
            </button>
          </div>

          {priorityActions.length === 0 ? (
            <div className="empty-actions">
              <p>Your project is on track right now. Check back here for any next steps from SRP.</p>
            </div>
          ) : (
            <div className="action-cards">
              {priorityActions.map((action) => (
                <div key={action.id} className={`action-card action-card--${action.tone}`}>
                  <div className="action-card-header">
                    <span className={`urgency-badge urgency-badge--${action.tone}`}>{action.badge}</span>
                  </div>
                  <h3 className="action-card-title">{action.title}</h3>
                  <p className="action-card-desc">{action.description}</p>
                  <div className="action-card-actions">
                    <button
                      className="btn-action btn-action--primary"
                      onClick={() => navigate(action.ctaPath)}
                    >
                      {action.ctaLabel}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <h2>Appointment Status</h2>
            <button className="dashboard-section__link" onClick={() => navigate('/client/inspection-date')}>
              Manage booking
            </button>
          </div>

          {appointmentDetails ? (
            <div className="appointment-status-panel">
              <div className="appointment-status-panel__summary">
                <span className="appointment-status-panel__badge">{appointmentDetails.badge}</span>
                <h3>{appointmentDetails.title}</h3>
                {appointmentDetails.lines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>

              <div className="appointment-status-panel__actions">
                <button
                  className="btn-action btn-action--primary"
                  onClick={() => navigate(appointmentDetails.ctaPath)}
                >
                  {appointmentDetails.ctaLabel}
                </button>

                {draftMeetingEligible && (
                  <div className="appointment-status-panel__note">
                    Draft meeting booking is also available for this file if needed.
                  </div>
                )}
              </div>
            </div>
          ) : activeRequest.appointmentOfferedAt ? (
            <div className="empty-actions">
              <p>Appointment booking is open. Select your preferred dates to request an inspection slot.</p>
            </div>
          ) : (
            <div className="empty-actions">
              <p>SRP has not opened appointment scheduling for this file yet.</p>
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section__header">
            <h2>Recent Activity</h2>
            <button className="dashboard-section__link" onClick={() => navigate('/client/documents')}>
              Open portal
            </button>
          </div>

          {recentActivity.length === 0 ? (
            <div className="empty-actions">
              <p>No recent updates are available yet.</p>
            </div>
          ) : (
            <div className="dashboard-activity-grid">
              {recentActivity.map((activity) => (
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
    </div>
  );
};
