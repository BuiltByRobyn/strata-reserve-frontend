import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Modal } from '../../shared/components/Modal';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { NoFileNumberState } from '../../shared/components/NoFileNumberState';
import { useAuth } from '../../shared/contexts/AuthContext';
import { useActivationRequest } from '../../shared/hooks/useActivationRequest';
import { useClientAppointments } from '../../shared/hooks/useClientAppointments';
import { useClientDocuments } from '../../shared/hooks/useClientDocuments';
import { useClientFileNumber } from '../../shared/hooks/useClientFileNumber';
import { usePropertyTypeRequest } from '../../shared/hooks/usePropertyTypeRequest';
import { useSurvey } from '../../shared/hooks/useSurvey';
import { useTimelines } from '../../shared/hooks/useTimelines';
import { parseLocalDate, parseTimestamp } from '../../shared/utils/dateUtils';
import { formatTime12h } from '../../shared/utils/formatters';
import type { ActiveAppointmentResponse, AppointmentNotification } from '../../shared/types/appointment.types';
import { SURVEY_SECTIONS } from '../../shared/types/survey.types';

const formatShortDate = (value: string | null | undefined) => {
  const date = parseLocalDate(value) || parseTimestamp(value);
  if (!date) return 'TBD';
  return date.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeRequest, fileId, loading: requestLoading } = useClientFileNumber();
  const { request: sectionChangeRequest, loading: propertyTypeLoading } = usePropertyTypeRequest();
  const { timelines, loading: timelinesLoading } = useTimelines(fileId);
  const { questions, responses, loading: surveyLoading, fetchQuestions, fetchResponses } = useSurvey();
  const {
    requiredDocuments,
    loading: documentsLoading,
    fetchRequiredDocuments,
  } = useClientDocuments();
  const { getActiveAppointment, getNotifications, checkDraftMeetingEligibility } = useClientAppointments();

  const location = useLocation();
  const { request: activationRequest } = useActivationRequest();
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [showSectionChangeModal, setShowSectionChangeModal] = useState(false);
  const [showDraftAvailableModal, setShowDraftAvailableModal] = useState(false);
  const [showDocReviewModal, setShowDocReviewModal] = useState(false);
  const [activeAppointment, setActiveAppointment] = useState<ActiveAppointmentResponse>(null);
  const [appointmentLoading, setAppointmentLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppointmentNotification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [draftMeetingEligible, setDraftMeetingEligible] = useState(false);

  useEffect(() => {
    if (!fileId) {
      setAppointmentLoading(false);
      setActiveAppointment(null);
      return;
    }

    let ignore = false;
    setAppointmentLoading(true);

    Promise.all([
      getActiveAppointment(),
      getNotifications(),
      checkDraftMeetingEligibility(fileId),
    ]).then(([appointment, notifs, draftResult]) => {
      if (ignore) return;
      setActiveAppointment(appointment);
      setNotifications(notifs);
      setDraftMeetingEligible(draftResult.eligible);
    }).finally(() => {
      if (!ignore) setAppointmentLoading(false);
    });

    return () => { ignore = true; };
  }, [fileId, getActiveAppointment, getNotifications]);

  useEffect(() => {
    if (!fileId) return;
    fetchQuestions(fileId);
    fetchResponses(fileId);
    fetchRequiredDocuments(fileId);
  }, [fetchQuestions, fetchRequiredDocuments, fetchResponses, fileId]);

  useEffect(() => {
    if (location.state?.justFinalizedDocs) {
      setShowDocsModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, []);

  useEffect(() => {
    if (
      activationRequest?.status === 'Approved' &&
      !localStorage.getItem(`activation_approval_seen_${activationRequest.activationRequestId}`)
    ) {
      setShowActivationModal(true);
    }
  }, [activationRequest?.activationRequestId, activationRequest?.status]);

  useEffect(() => {
    if (draftMeetingEligible && fileId && !localStorage.getItem(`draft_meeting_available_seen_${fileId}`)) {
      setShowDraftAvailableModal(true);
    }
  }, [draftMeetingEligible, fileId]);

  const handleDismissDraftAvailable = () => {
    if (fileId) localStorage.setItem(`draft_meeting_available_seen_${fileId}`, '1');
    setShowDraftAvailableModal(false);
  };

  const handleDismissActivation = () => {
    if (activationRequest) {
      localStorage.setItem(`activation_approval_seen_${activationRequest.activationRequestId}`, '1');
    }
    setShowActivationModal(false);
  };

  useEffect(() => {
    const id = sectionChangeRequest?.propertyTypeRequestId;
    const status = sectionChangeRequest?.status;
    if (
      id &&
      (status === 'Approved' || status === 'Rejected') &&
      !localStorage.getItem(`section_change_seen_${id}`)
    ) {
      setShowSectionChangeModal(true);
    }
  }, [sectionChangeRequest?.propertyTypeRequestId, sectionChangeRequest?.status]);

  const handleDismissSectionChange = () => {
    if (sectionChangeRequest) {
      localStorage.setItem(`section_change_seen_${sectionChangeRequest.propertyTypeRequestId}`, '1');
    }
    setShowSectionChangeModal(false);
  };

  const docsFinalized = fileId ? !!localStorage.getItem(`docs_finalized_${fileId}`) : false;

  const deniedDocuments = useMemo(
    () => requiredDocuments.filter(d => {
      const s = d.reviewStatus?.statusName?.toLowerCase() ?? '';
      return s.includes('deny') || s.includes('reject');
    }),
    [requiredDocuments]
  );
  const latestReviewId = requiredDocuments[0]?.reviewId ?? null;

  useEffect(() => {
    if (!fileId || !latestReviewId || deniedDocuments.length === 0) return;
    const key = `doc_review_denied_seen_${fileId}_${latestReviewId}`;
    if (!localStorage.getItem(key)) {
      setShowDocReviewModal(true);
    }
  }, [fileId, latestReviewId, deniedDocuments.length]);

  const handleDismissDocReview = () => {
    if (fileId && latestReviewId) {
      localStorage.setItem(`doc_review_denied_seen_${fileId}_${latestReviewId}`, '1');
    }
    setShowDocReviewModal(false);
  };

  const welcomeName = user?.role === 'client' ? user.firstName || 'there' : 'there';
  const dashboardTitle = activeRequest?.strata?.complexName || activeRequest?.strata?.strataPlan || 'Your Strata Reserve Planning - Data Collection Portal';

  const clientPropertyTypeIds = useMemo(
    () => activeRequest?.clientPropertyTypes?.map((pt) => pt.propertyTypeId) || [],
    [activeRequest],
  );

  const filteredRequiredDocuments = useMemo(() => {
    if (clientPropertyTypeIds.length === 0) {
      return requiredDocuments.filter((doc) => !doc.propertyType);
    }
    return requiredDocuments.filter((doc) =>
      !doc.propertyType || clientPropertyTypeIds.includes(doc.propertyType.propertyTypeId),
    );
  }, [clientPropertyTypeIds, requiredDocuments]);

  const requiredDocumentCount = filteredRequiredDocuments.length;

  const uploadedRequiredDocumentCount = useMemo(
    () => filteredRequiredDocuments.filter((doc) => doc.uploadedDocument).length,
    [filteredRequiredDocuments],
  );

  const acknowledgedDocumentCount = useMemo(
    () => filteredRequiredDocuments.filter((doc) => doc.uploadedDocument || doc.naStatus).length,
    [filteredRequiredDocuments],
  );

  const missingRequiredDocumentCount = Math.max(requiredDocumentCount - uploadedRequiredDocumentCount, 0);

  const filteredDeniedDocuments = useMemo(
    () => filteredRequiredDocuments.filter(d => {
      const s = d.reviewStatus?.statusName?.toLowerCase() ?? '';
      if (!s.includes('deny') && !s.includes('reject')) return false;
      if (!d.uploadedDocument || !d.reviewedAt) return true;
      return new Date(d.uploadedDocument.uploadedAt) <= new Date(d.reviewedAt);
    }),
    [filteredRequiredDocuments]
  );

  const sectionProgress = useMemo(() => {
    const answeredQuestionIds = new Set(responses.map((r) => r.questionId));
    return SURVEY_SECTIONS
      .map((section) => {
        const parentQuestions = questions.filter(
          (q) => q.questionCategory === section.label && q.parentQuestionId == null,
        );
        const answeredCount = parentQuestions.filter((q) => answeredQuestionIds.has(q.questionId)).length;
        return {
          ...section,
          total: parentQuestions.length,
          answered: answeredCount,
          complete: parentQuestions.length > 0 && answeredCount >= parentQuestions.length,
        };
      })
      .filter((s) => s.total > 0);
  }, [questions, responses]);

  const totalSurveyQuestions = sectionProgress.reduce((acc, s) => acc + s.total, 0);
  const answeredSurveyQuestions = sectionProgress.reduce((acc, s) => acc + s.answered, 0);
  const timelineTargetDate = timelines?.targetDate || activeRequest?.targetDate || null;

  const TIMELINE_FIELD_COUNT = 4;

  const completedTimelines = useMemo(() => {
    if (!timelines) return 0;
    let count = 0;
    if (timelines.fiscalYearEnd) count++;
    if (timelines.lastAgmDate || timelines.noAgmToDate) count++;
    if (timelines.lastDepreciationReportDate || timelines.noReportToDate) count++;
    if (timelines.targetDate) count++;
    return count;
  }, [timelines]);

  const overallPct = useMemo(() => {
    const total = totalSurveyQuestions + requiredDocumentCount + TIMELINE_FIELD_COUNT;
    if (total === 0) return 0;
    return Math.round(((answeredSurveyQuestions + acknowledgedDocumentCount + completedTimelines) / total) * 100);
  }, [answeredSurveyQuestions, totalSurveyQuestions, acknowledgedDocumentCount, requiredDocumentCount, completedTimelines]);

  const surveyCompleted = !!activeRequest?.submittedForReviewDate;
  const documentsCompleted = requiredDocumentCount > 0 && missingRequiredDocumentCount === 0;

  const bookingActionNeeded = !!(
    activeAppointment?.type !== 'completed_draft' &&
    (activeRequest?.rebookingRequestedAt || (activeRequest?.appointmentOfferedAt && !activeAppointment))
  );

  const tasks = useMemo(() => {
    const incompleteSectionKey = sectionProgress.find((s) => !s.complete)?.key;
    const surveyPath = incompleteSectionKey ? `/client/survey/${incompleteSectionKey}` : '/client/survey';

    const surveyTask = {
      id: 'survey',
      title: surveyCompleted ? 'Your Completed Survey' : 'Complete Your Survey',
      description: surveyCompleted ? 'All answers have been saved' : 'Continue where you left off',
      buttonLabel: surveyCompleted ? 'Review Survey' : 'Open Survey',
      path: surveyPath,
      navState: undefined as Record<string, unknown> | undefined,
      completed: surveyCompleted,
      finalized: surveyCompleted,
    };

    const hasPendingDenials = filteredDeniedDocuments.length > 0;
    const documentsTask = {
      id: 'documents',
      title: 'Upload Documents',
      description: hasPendingDenials
        ? `${filteredDeniedDocuments.length} document${filteredDeniedDocuments.length === 1 ? '' : 's'} denied — re-upload required`
        : docsFinalized
          ? 'View submitted documents'
          : missingRequiredDocumentCount > 0
            ? `${missingRequiredDocumentCount} required document${missingRequiredDocumentCount === 1 ? '' : 's'} still to upload`
            : 'Submit requested documents',
      buttonLabel: hasPendingDenials || missingRequiredDocumentCount > 0 ? 'Upload Documents' : 'View Documents',
      path: '/client/documents',
      navState: undefined as Record<string, unknown> | undefined,
      completed: !hasPendingDenials && documentsCompleted,
      finalized: !hasPendingDenials && docsFinalized,
      denied: hasPendingDenials,
    };

    if (bookingActionNeeded) {
      const isDraft = draftMeetingEligible && !activeRequest?.rebookingRequestedAt;
      const inspectionTitle = activeRequest?.rebookingRequestedAt ? 'Rebook Your Inspection' : isDraft ? 'Book Your Draft Meeting' : 'Book Your Inspection';
      const inspectionDesc = activeRequest?.rebookingRequestedAt
        ? 'Your previous appointment was cancelled. Please choose new preferred dates.'
        : isDraft ? 'Your inspection is complete. Select your preferred dates for the draft meeting.'
        : 'Appointment booking is open. Select your preferred dates to continue.';
      const inspectionLabel = activeRequest?.rebookingRequestedAt ? 'Book Inspection Date' : 'Select Dates';

      return [
        surveyTask,
        documentsTask,
        { id: 'inspection', title: inspectionTitle, description: inspectionDesc, buttonLabel: inspectionLabel, path: '/client/inspection-date', navState: undefined as Record<string, unknown> | undefined, completed: false },
      ];
    }

    return [
      surveyTask,
      documentsTask,
      {
        id: 'timelines',
        title: 'Deadlines',
        description: timelineTargetDate
          ? `Target: ${formatShortDate(timelineTargetDate)}`
          : 'View cut off dates and updates on your report',
        buttonLabel: 'View Timeline',
        path: '/client/timelines',
        navState: { scrollToDeadlines: true } as Record<string, unknown> | undefined,
        completed: timelineTargetDate != null,
        finalized: timelineTargetDate != null,
      },
    ];
  }, [activeAppointment, activeRequest, bookingActionNeeded, draftMeetingEligible, documentsCompleted, docsFinalized, filteredDeniedDocuments, missingRequiredDocumentCount, sectionProgress, surveyCompleted, timelineTargetDate]);

  const dashboardLoading = requestLoading || propertyTypeLoading || surveyLoading || documentsLoading || timelinesLoading || appointmentLoading;

  if (dashboardLoading) return <LoadingSpinner />;

  if (!activeRequest) {
    return (
      <div className="client-dashboard">
        <div className="dashboard-welcome">
          <h1>Welcome, {welcomeName}</h1>
          <p className="dashboard-subtitle">Dashboard</p>
        </div>
        <NoFileNumberState />
      </div>
    );
  }

  return (
    <div className="client-dashboard">
      <div className="dashboard-welcome">
        <h1>Welcome, {welcomeName}</h1>
        <p className="dashboard-subtitle">{dashboardTitle}</p>
      </div>

      <div className="client-progress-card">
        <div className="client-progress-card__top">
          <div className="client-progress-card__title-wrap">
            <span className="client-progress-card__title">Your Progress</span>
            <span className="client-progress-card__subtitle">
              {overallPct === 100 ? 'All steps complete!' : "You're making great progress!"}
            </span>
          </div>
          <div className="client-progress-card__pct-wrap">
            <span className="client-progress-card__pct">{overallPct}%</span>
            <span className="client-progress-card__pct-label">Complete</span>
          </div>
        </div>
        <div className="client-progress-bar-track">
          <div className="client-progress-bar-fill" style={{ width: `${overallPct}%` }} />
        </div>
        <div className="client-progress-card__stats">
          {totalSurveyQuestions > 0 && (
            <span>Questions: {answeredSurveyQuestions}/{totalSurveyQuestions} completed</span>
          )}
          <span>Documents: {acknowledgedDocumentCount}/{requiredDocumentCount} submitted</span>
          <span>Timelines: {completedTimelines}/{TIMELINE_FIELD_COUNT} completed</span>
        </div>
      </div>

      <h2 className="client-tasks-heading">Priority Tasks</h2>
      <div className="priority-tasks-grid">
        {tasks.map((task) => {
          if (task.id === 'timelines' && activeAppointment?.type === 'pending_request') {
            const pendingTypeName = activeAppointment.data.appointmentType?.typeName ?? '';
            const pendingLabel = pendingTypeName.toLowerCase().includes('draft') ? 'Draft Meeting' : 'Inspection';
            return (
              <div key="pending" className="appointment-status-card appointment-status-card--pending">
                <p className="appointment-status-card__label">{pendingLabel} Pending</p>
                <p className="appointment-status-card__text">Your {pendingLabel.toLowerCase()} request is awaiting confirmation from our team.</p>
                <button className="btn-action btn-action--warning" onClick={() => navigate('/client/inspection-date')}>View Request</button>
              </div>
            );
          }
          if (task.id === 'timelines' && activeAppointment?.type === 'scheduled') {
            const aptId = activeAppointment.data.appointmentId;
            const aptDate = typeof activeAppointment.data.appointmentDate === 'string'
              ? activeAppointment.data.appointmentDate.split('T')[0]
              : new Date(activeAppointment.data.appointmentDate).toISOString().split('T')[0];
            const ackKey = `rescheduled_acknowledged_${aptId}_${aptDate}`;
            const acknowledged = !!localStorage.getItem(ackKey);
            const isRescheduled = activeAppointment.data.status === 'Rescheduled' && !acknowledged;
            const rescheduledNotif = isRescheduled
              ? notifications.find(n => n.type === 'appointment_rescheduled')
              : undefined;
            const rescheduleText = isRescheduled
              ? rescheduledNotif?.previousDate && rescheduledNotif?.previousSlotTime
                ? `Your appointment has been rescheduled from ${formatShortDate(rescheduledNotif.previousDate)} at ${formatTime12h(rescheduledNotif.previousSlotTime)} to ${formatShortDate(activeAppointment.data.appointmentDate)} at ${formatTime12h(activeAppointment.data.timeSlot.slotTime)}.`
                : `Your appointment has been rescheduled to ${formatShortDate(activeAppointment.data.appointmentDate)} at ${formatTime12h(activeAppointment.data.timeSlot.slotTime)}.`
              : `Your ${activeAppointment.data.appointmentType.typeName} on ${formatShortDate(activeAppointment.data.appointmentDate)} at ${formatTime12h(activeAppointment.data.timeSlot.slotTime)} has been confirmed.`;
            return (
              <div key="scheduled" className={`appointment-status-card appointment-status-card--${isRescheduled ? 'rescheduled' : 'scheduled'}`}>
                <p className="appointment-status-card__label">{isRescheduled ? 'Appointment Rescheduled' : 'Appointment Confirmed'}</p>
                <p className="appointment-status-card__text">{rescheduleText}</p>
                {isRescheduled ? (
                  <button className="btn-action btn-action--warning" onClick={() => {
                    localStorage.setItem(ackKey, '1');
                    setActiveAppointment({ ...activeAppointment });
                  }}>Acknowledge</button>
                ) : (
                  <button className="btn-action btn-action--primary" onClick={() => navigate('/client/inspection-date')}>View Appointment</button>
                )}
              </div>
            );
          }
          const rejectionNotification = (task.id === 'timelines' || task.id === 'inspection')
            ? notifications.find(n => n.type === 'request_rejected' && !dismissed.has(`${n.type}__${n.date}`))
            : undefined;
          if (rejectionNotification) {
            const rejTypeLabel = draftMeetingEligible ? 'draft meeting' : 'inspection';
            const rejCardLabel = draftMeetingEligible ? 'Draft Meeting Not Accepted' : 'Inspection Not Accepted';
            const rejText = rejectionNotification.message
              .replace('appointment request', `${rejTypeLabel} request`)
              .replace('was rejected', 'was not accepted');
            return (
              <div key="rejected" className="appointment-status-card appointment-status-card--rejected">
                <p className="appointment-status-card__label">{rejCardLabel}</p>
                <p className="appointment-status-card__text">{rejectionNotification.reason || rejText}</p>
                <button className="btn-action btn-action--danger" onClick={() => navigate('/client/inspection-date')}>View Details</button>
              </div>
            );
          }
          return (
            <div
              key={task.id}
              className={`priority-task-card${task.completed ? ' priority-task-card--active' : ''}${'finalized' in task && task.finalized ? ' priority-task-card--finalized' : ''}${'denied' in task && task.denied ? ' priority-task-card--denied' : ''}`}
            >
              <h3 className="priority-task-card__title">{task.title}</h3>
              <p className="priority-task-card__desc">{task.description}</p>
              <button
                className={'finalized' in task && task.finalized ? 'btn-primary' : 'denied' in task && task.denied ? 'btn-action btn-action--danger' : 'btn-action btn-action--secondary'}
                onClick={() => navigate(task.path, { state: task.navState })}
              >
                {task.buttonLabel}
              </button>
            </div>
          );
        })}
      </div>

      {notifications.some((n) => !dismissed.has(`${n.type}__${n.date}`) && !(n.type === 'request_rejected') && !(n.type === 'request_approved' && (activeAppointment !== null || bookingActionNeeded)) && !(n.type === 'appointment_rescheduled' && activeAppointment?.type === 'scheduled' && activeAppointment.data.status === 'Rescheduled')) && (
        <div className="client-notifications">
          {notifications
            .filter((n) => !dismissed.has(`${n.type}__${n.date}`) && !(n.type === 'request_rejected') && !(n.type === 'request_approved' && (activeAppointment !== null || bookingActionNeeded)) && !(n.type === 'appointment_rescheduled' && activeAppointment?.type === 'scheduled' && activeAppointment.data.status === 'Rescheduled'))
            .map((n) => {
              const key = `${n.type}__${n.date}`;
              const toneMap = {
                request_approved: 'upcoming',
                request_rejected: 'overdue',
                appointment_cancelled: 'overdue',
                appointment_rescheduled: 'due-today',
              } as const;
              const badgeMap = {
                request_approved: 'APPROVED',
                request_rejected: 'REJECTED',
                appointment_cancelled: 'CANCELLED',
                appointment_rescheduled: 'RESCHEDULED',
              } as const;
              const tone = toneMap[n.type];
              return (
                <div key={key} className={`action-card action-card--${tone}`} onClick={() => navigate('/client/inspection-date')}>
                  <div className="action-card-header">
                    <span className={`urgency-badge urgency-badge--${tone}`}>{badgeMap[n.type]}</span>
                    <button
                      className="client-notification-dismiss"
                      onClick={(e) => { e.stopPropagation(); setDismissed((prev) => new Set(prev).add(key)); }}
                      aria-label="Dismiss"
                    >
                      ×
                    </button>
                  </div>
                  <p className="action-card-title">{n.message}</p>
                  {n.reason && <p className="action-card-desc">{n.reason}</p>}
                </div>
              );
            })}
        </div>
      )}
      <Modal
        isOpen={showDocsModal}
        onClose={() => setShowDocsModal(false)}
        title="Documents Submitted"
        size="medium"
        footer={
          <button className="btn-primary" onClick={() => setShowDocsModal(false)}>
            Got it
          </button>
        }
      >
        <p>
          {clientPropertyTypeIds.length < (activeRequest?.strata?.strataPropertyTypes?.length ?? 0)
            ? 'Thank you for finalizing your document submission. Your portion has been submitted and a strata reserve planning team member will review your accessible sections.'
            : 'Thank you for finalizing your document submission. Once your survey answers are also finalized, a strata reserve planning team member will review your submissions within 3–5 business days.'}
        </p>
      </Modal>

      <Modal
        isOpen={showDraftAvailableModal}
        onClose={handleDismissDraftAvailable}
        title="Draft Meeting Available"
        size="medium"
        footer={
          <button className="btn-primary" onClick={() => { handleDismissDraftAvailable(); navigate('/client/inspection-date'); }}>
            Book Now
          </button>
        }
      >
        <div className="thank-you-content">
          <p>Your inspection is complete. You can now book your draft meeting — select your preferred dates to get started.</p>
        </div>
      </Modal>

      <Modal
        isOpen={showActivationModal}
        onClose={handleDismissActivation}
        title="Account Activated"
        size="medium"
        footer={
          <button className="btn-primary" onClick={handleDismissActivation}>
            Close
          </button>
        }
      >
        <div className="thank-you-content">
          <p>
            Your activation request has been approved. Your account is now active and your file number has been assigned.
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={showSectionChangeModal}
        onClose={handleDismissSectionChange}
        title={sectionChangeRequest?.status === 'Approved' ? 'Section Change Approved' : 'Section Change Rejected'}
        size="medium"
        footer={
          <button className="btn-primary" onClick={handleDismissSectionChange}>
            Close
          </button>
        }
      >
        <div className="thank-you-content">
          {sectionChangeRequest?.status === 'Approved' ? (
            <p>Your section change request has been approved.</p>
          ) : (
            <>
              <p>Your section change request has been rejected.</p>
              {sectionChangeRequest?.rejectionReason && (
                <p>{sectionChangeRequest.rejectionReason}</p>
              )}
            </>
          )}
        </div>
      </Modal>
      <Modal
        isOpen={showDocReviewModal}
        onClose={handleDismissDocReview}
        title="Documents Require Attention"
        size="medium"
        footer={
          <button className="btn-primary" onClick={handleDismissDocReview}>
            Got it
          </button>
        }
      >
        <div className="doc-review-notification">
          <p className="doc-review-notification__intro">
            One or more of your submitted documents could not be accepted. Please re-upload the documents listed below.
          </p>
          <ul className="doc-review-notification__list">
            {deniedDocuments.map(d => (
              <li key={d.fnDocRequirementId} className="doc-review-notification__item">
                <span className="doc-review-notification__doc-name">
                  {d.documentType.typeName}{d.versionLabel && d.versionLabel !== 'Default' ? ` — ${d.versionLabel}` : ''}
                </span>
                {d.denialNote && (
                  <span className="doc-review-notification__note">{d.denialNote}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    </div>
  );
};
