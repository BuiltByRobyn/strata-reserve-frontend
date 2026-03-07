import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useClientFileNumber } from '../../shared/hooks/useClientFileNumber';
import { useClientAppointments } from '../../shared/hooks/useClientAppointments';
import { useTimelines } from '../../shared/hooks/useTimelines';
import { useLookups } from '../../shared/hooks/useLookups';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Modal } from '../../shared/components/Modal';
import { formatDateLong, formatTime12h, getUserDisplayName } from '../../shared/lib/formatters';
import BookingCalendar from '../../shared/components/BookingCalendar';
import AvailableMeetingDates from '../components/AvailableMeetingDates';
import BookingConfirmation from '../components/BookingConfirmation';
import type { AvailableDay, AvailableSlot, BookingChoice, BookingStep, ActiveAppointmentResponse, CalendarMilestone } from '../../shared/types/appointment.types';
import type { AppointmentType } from '../../shared/types/entities.types';

/** Next anniversary of baseDate strictly after referenceDate */
function getNextAnniversary(baseDate: Date, referenceDate: Date): Date {
  const month = baseDate.getMonth();
  const day = baseDate.getDate();
  let year = referenceDate.getFullYear();

  for (let i = 0; i < 10; i++) {
    const candidate = new Date(year, month, day);
    if (candidate.getMonth() !== month) {
      // Clamp (e.g. Feb 29 in non-leap year)
      const clamped = new Date(year, month + 1, 0);
      if (clamped > referenceDate) return clamped;
    } else if (candidate > referenceDate) {
      return candidate;
    }
    year++;
  }
  return new Date(referenceDate.getFullYear() + 1, month, day);
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const InspectionDate = () => {
  const { activeRequest, loading: srLoading } = useClientFileNumber();
  const {
    getAvailability,
    getActiveAppointment,
    createRequest,
    cancelRequest,
    cancelAppointment,
    checkDraftMeetingEligibility,
  } = useClientAppointments();
  const { services } = useLookups();

  const fileNumberId = activeRequest?.fileNumberId ?? null;
  const { timelines } = useTimelines(fileNumberId);

  const [activeAppointment, setActiveAppointment] = useState<ActiveAppointmentResponse>(null);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [availability, setAvailability] = useState<AvailableDay[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);

  const [bookingStep, setBookingStep] = useState<BookingStep>('first-date');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [firstChoice, setFirstChoice] = useState<BookingChoice | null>(null);
  const [secondChoice, setSecondChoice] = useState<BookingChoice | null>(null);
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cancellingRequest, setCancellingRequest] = useState(false);
  const [draftMeetingEligible, setDraftMeetingEligible] = useState(false);
  const [bookingDraftMeeting, setBookingDraftMeeting] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const isOffered = !!activeRequest?.appointmentOfferedAt;

  // Ref guards to prevent duplicate effect execution
  const hasFetchedAppointment = useRef(false);
  const hasFetchedAvailability = useRef(false);
  const meetingDatesRef = useRef<HTMLDivElement>(null);

  // Welcome modal: show once per file number (persists across sessions)
  useEffect(() => {
    if (!fileNumberId || !isOffered) return;
    const key = `welcome-modal-shown-${fileNumberId}`;
    if (!localStorage.getItem(key)) {
      setShowWelcomeModal(true);
      localStorage.setItem(key, '1');
    }
  }, [fileNumberId, isOffered]);

  const loadActiveAppointment = useCallback(async () => {
    const data = await getActiveAppointment();
    setActiveAppointment(data);
  }, [getActiveAppointment]);

  // Effect 1: Load active appointment (once, when file number loads)
  useEffect(() => {
    if (srLoading) return;
    if (!activeRequest) {
      setPageLoading(false);
      setCalendarLoading(false);
      return;
    }
    if (hasFetchedAppointment.current) return;
    hasFetchedAppointment.current = true;
    loadActiveAppointment().then(() => {
      if (!activeRequest.appointmentOfferedAt) {
        setCalendarLoading(false);
      }
    }).finally(() => setPageLoading(false));
  }, [srLoading, activeRequest, loadActiveAppointment]);

  const loadAvailability = useCallback(async (isDraft = false) => {
    if (!fileNumberId) return;
    setCalendarLoading(true);
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 3);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const data = await getAvailability(startStr, endStr, fileNumberId, isDraft);
    setAvailability(data);
    setCalendarLoading(false);
  }, [fileNumberId, getAvailability]);

  const loadAppointmentTypes = useCallback(() => {
    const svc = activeRequest?.service || services.find(s => s.serviceId === activeRequest?.serviceId);
    if (!svc) return;
    setAppointmentTypes([
      { appointmentTypeId: 1, typeName: 'Half Day Inspection', durationType: 'Half Day', isDraftMeeting: false, description: null, serviceId: svc.serviceId },
      { appointmentTypeId: 2, typeName: 'Full Day Inspection', durationType: 'Full Day', isDraftMeeting: false, description: null, serviceId: svc.serviceId },
      { appointmentTypeId: 3, typeName: 'Draft Meeting', durationType: 'Evening', isDraftMeeting: true, description: null, serviceId: svc.serviceId },
    ]);
  }, [activeRequest, services]);

  // Effect 2: Load availability + check eligibility (once, when offered)
  useEffect(() => {
    if (!isOffered || !fileNumberId || hasFetchedAvailability.current) return;
    // Skip if there's a pending request (no calendar shown)
    if (activeAppointment?.type === 'pending_request') {
      setCalendarLoading(false);
      return;
    }
    hasFetchedAvailability.current = true;
    loadAvailability(bookingDraftMeeting);
    loadAppointmentTypes();
    checkDraftMeetingEligibility(fileNumberId).then(setDraftMeetingEligible);
  }, [isOffered, activeAppointment, fileNumberId, loadAvailability, bookingDraftMeeting, loadAppointmentTypes, checkDraftMeetingEligibility]);

  // Re-fetch availability when user returns to the tab (handles inspector changes by admin)
  useEffect(() => {
    const handleFocus = () => {
      if (isOffered && fileNumberId && activeAppointment?.type !== 'pending_request') {
        loadAvailability(bookingDraftMeeting);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isOffered, activeAppointment, fileNumberId, loadAvailability, bookingDraftMeeting]);

  // Compute timeline milestones for the calendar
  const milestones = useMemo((): CalendarMilestone[] => {
    if (!timelines && !activeRequest?.appointmentOfferedAt) return [];
    const result: CalendarMilestone[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // "Approved" milestone on the date the appointment was offered
    if (activeRequest?.appointmentOfferedAt) {
      const offeredDate = formatYMD(new Date(activeRequest.appointmentOfferedAt));
      result.push({ date: offeredDate, label: 'Approved' });
    }

    if (!timelines) return result;

    // Determine the effective target date
    let effectiveTargetDate: Date | null = null;

    if (timelines.targetDate) {
      const targetDateStr = timelines.targetDate.split('T')[0];
      effectiveTargetDate = new Date(targetDateStr + 'T00:00:00');
      result.push({ date: targetDateStr, label: 'Target Date' });
    }

    // Next Projected AGM
    const lastAgmDate = timelines.lastAgmDate && !timelines.noAgmToDate
      ? new Date(timelines.lastAgmDate.split('T')[0] + 'T00:00:00')
      : null;
    const fiscalYearEnd = timelines.fiscalYearEnd
      ? new Date(timelines.fiscalYearEnd.split('T')[0] + 'T00:00:00')
      : null;
    const agmBase = lastAgmDate ?? (timelines.noAgmToDate ? fiscalYearEnd : null);
    if (agmBase) {
      const nextAgm = getNextAnniversary(agmBase, today);
      const nextAgmStr = formatYMD(nextAgm);
      if (!result.some(m => m.date === nextAgmStr)) {
        result.push({ date: nextAgmStr, label: 'Projected AGM' });
      }
    }

    // Auto target date (45 days before projected AGM) if no manual target date
    if (!timelines.targetDate && agmBase) {
      const nextAgm = getNextAnniversary(agmBase, today);
      const autoTarget = addDays(nextAgm, -45);
      if (autoTarget >= today) {
        effectiveTargetDate = autoTarget;
        const autoTargetStr = formatYMD(autoTarget);
        if (!result.some(m => m.date === autoTargetStr)) {
          result.push({ date: autoTargetStr, label: 'Target Date' });
        }
      }
    }

    // 7 Days and 14 Days warning milestones before the effective target date
    if (effectiveTargetDate) {
      const sevenDaysBefore = addDays(effectiveTargetDate, -7);
      const fourteenDaysBefore = addDays(effectiveTargetDate, -14);

      if (sevenDaysBefore >= today) {
        const sevenStr = formatYMD(sevenDaysBefore);
        if (!result.some(m => m.date === sevenStr)) {
          result.push({ date: sevenStr, label: '7 Days' });
        }
      }

      if (fourteenDaysBefore >= today) {
        const fourteenStr = formatYMD(fourteenDaysBefore);
        if (!result.some(m => m.date === fourteenStr)) {
          result.push({ date: fourteenStr, label: '14 Days' });
        }
      }
    }

    return result;
  }, [timelines, activeRequest?.appointmentOfferedAt]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setErrorMsg(null);
    setTimeout(() => {
      meetingDatesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  // One-click slot selection from AvailableMeetingDates cards
  const handleCardSlotSelect = (date: string, slot: AvailableSlot) => {
    const choice: BookingChoice = {
      date,
      timeSlotId: slot.timeSlotId,
      slotName: slot.slotName,
      slotTime: slot.slotTime,
    };

    if (bookingStep === 'first-date' || bookingStep === 'first-slot') {
      setFirstChoice(choice);
      setSelectedDate(null);
      setBookingStep('second-date');
    } else if (bookingStep === 'second-date' || bookingStep === 'second-slot') {
      setSecondChoice(choice);
      setSelectedDate(null);
      setBookingStep('confirm');
    }
  };

  const handleBackFromConfirm = () => {
    setBookingStep('second-date');
    setSelectedDate(null);
  };

  const handleStartDraftMeetingBooking = () => {
    setBookingDraftMeeting(true);
    hasFetchedAvailability.current = false;
    resetBooking();
    setSuccessMsg(null);
  };

  const handleSubmit = async () => {
    if (!firstChoice || !fileNumberId) return;

    if (!secondChoice) {
      setErrorMsg('Please select a second choice date and time slot');
      return;
    }

    const selectedType = bookingDraftMeeting
      ? appointmentTypes.find(t => t.isDraftMeeting) || appointmentTypes[0]
      : appointmentTypes[0];
    if (!selectedType) {
      setErrorMsg('No appointment type available');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const result = await createRequest({
      fileNumberId,
      appointmentTypeId: selectedType.appointmentTypeId,
      firstChoiceDate: firstChoice.date,
      firstChoiceTimeSlotId: firstChoice.timeSlotId,
      secondChoiceDate: secondChoice?.date,
      secondChoiceTimeSlotId: secondChoice?.timeSlotId,
      specialRequirements: specialRequirements.trim() || undefined,
    });

    setSubmitting(false);

    if (result.success) {
      setSuccessMsg('Your appointment request has been submitted successfully!');
      resetBooking();
      await loadActiveAppointment();
    } else {
      setErrorMsg(result.error || 'Failed to submit request');
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    setCancellingRequest(true);
    setErrorMsg(null);
    const result = await cancelRequest(requestId);
    setCancellingRequest(false);

    if (result.success) {
      setSuccessMsg('Your appointment request has been cancelled.');
      await loadActiveAppointment();
      hasFetchedAvailability.current = false;
      loadAvailability();
    } else {
      setErrorMsg(result.error || 'Failed to cancel request');
    }
  };

  const handleCancelAppointment = async (appointmentId: number) => {
    setErrorMsg(null);
    const result = await cancelAppointment(appointmentId);
    if (result.success) {
      setSuccessMsg('Your appointment has been cancelled.');
      await loadActiveAppointment();
    } else {
      setErrorMsg(result.error || 'Failed to cancel appointment');
    }
  };

  const resetBooking = () => {
    setBookingStep('first-date');
    setSelectedDate(null);
    setFirstChoice(null);
    setSecondChoice(null);
    setSpecialRequirements('');
  };

  if (srLoading || pageLoading || calendarLoading) {
    return <LoadingSpinner />;
  }

  if (!activeRequest) {
    return (
      <div className="page-container">
        <h1>Inspection Date</h1>
        <div className="inspection-date__card">
          <p>No active file number found.</p>
        </div>
      </div>
    );
  }

  // Redirect to dashboard if appointment not yet offered
  if (!isOffered) {
    return <Navigate to="/client/dashboard" replace />;
  }

  // State 3: Pending Review
  if (activeAppointment?.type === 'pending_request') {
    const req = activeAppointment.data;
    return (
      <div className="page-container">
        <h1>Inspection Date</h1>
        {errorMsg && <div className="inspection-date__error">{errorMsg}</div>}
        {successMsg && <div className="inspection-date__success">{successMsg}</div>}
        <div className="inspection-date__card inspection-date__card--pending">
          <h3>Appointment Request Pending Review</h3>
          <p>Your appointment request is currently being reviewed by our team.</p>

          <div className="inspection-date__details">
            <div className="inspection-date__detail-row">
              <span className="inspection-date__detail-label">Type</span>
              <span className="inspection-date__detail-value">
                {req.appointmentType?.typeName || 'Inspection'}
              </span>
            </div>
            <div className="inspection-date__detail-row">
              <span className="inspection-date__detail-label">First Choice</span>
              <span className="inspection-date__detail-value">
                {formatDateLong(req.firstChoiceDate)} - {req.firstChoiceTimeSlot?.slotName || ''} ({formatTime12h(req.firstChoiceTimeSlot?.slotTime || '')})
              </span>
            </div>
            {req.secondChoiceDate && req.secondChoiceTimeSlot && (
              <div className="inspection-date__detail-row">
                <span className="inspection-date__detail-label">Second Choice</span>
                <span className="inspection-date__detail-value">
                  {formatDateLong(req.secondChoiceDate)} - {req.secondChoiceTimeSlot.slotName} ({formatTime12h(req.secondChoiceTimeSlot.slotTime)})
                </span>
              </div>
            )}
            {req.specialRequirements && (
              <div className="inspection-date__detail-row">
                <span className="inspection-date__detail-label">Special Requirements</span>
                <span className="inspection-date__detail-value">{req.specialRequirements}</span>
              </div>
            )}
            <div className="inspection-date__detail-row">
              <span className="inspection-date__detail-label">Status</span>
              <span className="inspection-date__detail-value inspection-date__status--pending">
                Pending Review
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleCancelRequest(req.appointmentRequestId)}
            disabled={cancellingRequest}
          >
            {cancellingRequest ? 'Cancelling...' : 'Cancel Request'}
          </button>
        </div>
      </div>
    );
  }

  const hasScheduledAppointment = activeAppointment?.type === 'scheduled';
  const scheduledApt = hasScheduledAppointment ? activeAppointment.data : null;

  // State 2: Ready to Book
  const bookingTitle = hasScheduledAppointment
    ? 'Inspection Date'
    : bookingDraftMeeting ? 'Schedule Draft Meeting' : 'Pick a date for your inspection';
  const bookingSubtitle = hasScheduledAppointment
    ? null
    : bookingDraftMeeting
      ? 'Select your preferred draft meeting date and time'
      : 'Select a date and time that works for you';

  return (
    <div className="page-container inspection-date-page">
      <h1>{bookingTitle}</h1>
      {bookingSubtitle && <p className="page-subtitle">{bookingSubtitle}</p>}

      {scheduledApt && (
        <div className="inspection-date__card inspection-date__card--scheduled">
          <h3>Appointment Scheduled</h3>

          <div className="inspection-date__details">
            <div className="inspection-date__detail-row">
              <span className="inspection-date__detail-label">Date</span>
              <span className="inspection-date__detail-value">
                {formatDateLong(typeof scheduledApt.appointmentDate === 'string'
                  ? scheduledApt.appointmentDate.split('T')[0]
                  : new Date(scheduledApt.appointmentDate).toISOString().split('T')[0])}
              </span>
            </div>
            <div className="inspection-date__detail-row">
              <span className="inspection-date__detail-label">Time</span>
              <span className="inspection-date__detail-value">
                {scheduledApt.timeSlot.slotName} ({formatTime12h(scheduledApt.timeSlot.slotTime)})
              </span>
            </div>
            <div className="inspection-date__detail-row">
              <span className="inspection-date__detail-label">Type</span>
              <span className="inspection-date__detail-value">
                {scheduledApt.appointmentType.typeName}
              </span>
            </div>
            {scheduledApt.inspector && (
              <div className="inspection-date__detail-row">
                <span className="inspection-date__detail-label">Inspector</span>
                <span className="inspection-date__detail-value">
                  {getUserDisplayName(scheduledApt.inspector)}
                </span>
              </div>
            )}
            <div className="inspection-date__detail-row">
              <span className="inspection-date__detail-label">Status</span>
              <span className="inspection-date__detail-value inspection-date__status--scheduled">
                {scheduledApt.status}
              </span>
            </div>
          </div>

          <div className="inspection-date__actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleCancelAppointment(scheduledApt.appointmentId)}
            >
              Cancel Appointment
            </button>
          </div>

          <p className="inspection-date__notice">
            Cancellations and reschedules must be made at least 48 hours before the appointment.
            For changes within 48 hours, please call SRP at (604) 638-4960.
          </p>
        </div>
      )}

      {draftMeetingEligible && !bookingDraftMeeting && !hasScheduledAppointment && (
        <div className="inspection-date__card inspection-date__card--info">
          <h3>Draft Meeting Available</h3>
          <p>Your inspection has been completed. You can now schedule a draft meeting.</p>
          <button type="button" className="btn btn-primary" onClick={handleStartDraftMeetingBooking}>
            Schedule Draft Meeting
          </button>
        </div>
      )}

      {activeRequest?.rebookingRequestedAt && (
        <div className="inspection-date__card inspection-date__card--info" style={{ marginBottom: '1rem' }}>
          <p>Your previous appointment was cancelled. Please select a new inspection date below.</p>
        </div>
      )}

      {errorMsg && <div className="inspection-date__error">{errorMsg}</div>}
      {successMsg && <div className="inspection-date__success">{successMsg}</div>}

      {!hasScheduledAppointment && bookingStep === 'confirm' && firstChoice ? (
        <BookingConfirmation
          firstChoice={firstChoice}
          secondChoice={secondChoice}
          specialRequirements={specialRequirements}
          onSpecialRequirementsChange={setSpecialRequirements}
          onConfirm={handleSubmit}
          onBack={handleBackFromConfirm}
          submitting={submitting}
        />
      ) : (
        <div className="inspection-date__booking">
          {!hasScheduledAppointment && bookingStep !== 'first-date' && bookingStep !== 'first-slot' && firstChoice && (
            <div className="inspection-date__first-choice-summary">
              First Choice: {formatDateLong(firstChoice.date)} - {firstChoice.slotName} ({formatTime12h(firstChoice.slotTime)})
            </div>
          )}

          <div className="inspection-date__calendar-section">
            <BookingCalendar
              availability={hasScheduledAppointment ? [] : availability}
              selectedDate={selectedDate}
              onSelectDate={hasScheduledAppointment ? () => {} : handleDateSelect}
              loading={calendarLoading}
              milestones={milestones}
              bookedDate={scheduledApt ? (typeof scheduledApt.appointmentDate === 'string' ? scheduledApt.appointmentDate.split('T')[0] : formatYMD(new Date(scheduledApt.appointmentDate))) : null}
            />
          </div>

          {!hasScheduledAppointment && (
            <AvailableMeetingDates
              ref={meetingDatesRef}
              availability={availability}
              onSelectSlot={handleCardSlotSelect}
              firstChoice={firstChoice}
              secondChoice={secondChoice}
              bookingStep={bookingStep}
            />
          )}
        </div>
      )}

      <Modal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        title="Please book an inspection date"
        size="medium"
        footer={
          <button className="btn btn-primary" onClick={() => setShowWelcomeModal(false)}>
            Close
          </button>
        }
      >
        <p>
          Your submission has been approved and you can now book an inspection date.
          Please select your preferred dates and times from the available slots below.
        </p>
        <p>
          If you have any questions, please contact us at{' '}
          <a href="mailto:clientcare@stratareserveplanning.com">
            clientcare@stratareserveplanning.com
          </a>
        </p>
      </Modal>
    </div>
  );
};

export default InspectionDate;
