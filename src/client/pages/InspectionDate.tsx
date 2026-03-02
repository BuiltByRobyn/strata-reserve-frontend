import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useClientServiceRequest } from '../../shared/hooks/useClientServiceRequest';
import { useClientAppointments } from '../../shared/hooks/useClientAppointments';
import { useTimelines } from '../../shared/hooks/useTimelines';
import { useLookups } from '../../shared/hooks/useLookups';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { formatDateLong, formatTime12h } from '../../shared/lib/formatters';
import BookingCalendar from '../components/BookingCalendar';
import TimeSlotPicker from '../components/TimeSlotPicker';
import BookingConfirmation from '../components/BookingConfirmation';
import type { AvailableDay, AvailableSlot, BookingChoice, ActiveAppointmentResponse, CalendarMilestone } from '../../shared/types/appointment.types';
import type { AppointmentType } from '../../shared/types/entities.types';

type BookingStep = 'first-date' | 'first-slot' | 'second-date' | 'second-slot' | 'confirm';

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
  const { activeRequest, loading: srLoading } = useClientServiceRequest();
  const {
    getAvailability,
    getActiveAppointment,
    createRequest,
    cancelRequest,
    cancelAppointment,
    checkDraftMeetingEligibility,
  } = useClientAppointments();
  const { services } = useLookups();

  const serviceRequestId = activeRequest?.serviceRequestId ?? null;
  const { timelines } = useTimelines(serviceRequestId);

  const [activeAppointment, setActiveAppointment] = useState<ActiveAppointmentResponse>(null);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [availability, setAvailability] = useState<AvailableDay[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
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

  const isOffered = !!activeRequest?.appointmentOfferedAt;

  // Ref guards to prevent duplicate effect execution
  const hasFetchedAppointment = useRef(false);
  const hasFetchedAvailability = useRef(false);

  const loadActiveAppointment = useCallback(async () => {
    const data = await getActiveAppointment();
    setActiveAppointment(data);
  }, [getActiveAppointment]);

  // Effect 1: Load active appointment (once, when service request loads)
  useEffect(() => {
    if (srLoading || !activeRequest || hasFetchedAppointment.current) return;
    hasFetchedAppointment.current = true;
    loadActiveAppointment().finally(() => setPageLoading(false));
  }, [srLoading, activeRequest, loadActiveAppointment]);

  const loadAvailability = useCallback(async (isDraft = false) => {
    if (!serviceRequestId) return;
    setCalendarLoading(true);
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 3);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    const data = await getAvailability(startStr, endStr, serviceRequestId, isDraft);
    setAvailability(data);
    setCalendarLoading(false);
  }, [serviceRequestId, getAvailability]);

  const loadAppointmentTypes = useCallback(() => {
    const svc = activeRequest?.service || services.find(s => s.serviceId === activeRequest?.serviceId);
    if (!svc) return;
    setAppointmentTypes([
      { appointmentTypeId: 1, typeName: 'Half Day Inspection', durationType: 'Half Day', isDraftMeeting: false, description: null, serviceId: svc.serviceId },
      { appointmentTypeId: 2, typeName: 'Full Day Inspection', durationType: 'Full Day', isDraftMeeting: false, description: null, serviceId: svc.serviceId },
      { appointmentTypeId: 3, typeName: 'Draft Meeting', durationType: 'Evening', isDraftMeeting: true, description: null, serviceId: svc.serviceId },
    ]);
  }, [activeRequest, services]);

  // Effect 2: Load availability + check eligibility (once, when offered and no active appointment)
  useEffect(() => {
    if (!isOffered || activeAppointment || !serviceRequestId || hasFetchedAvailability.current) return;
    hasFetchedAvailability.current = true;
    loadAvailability(bookingDraftMeeting);
    loadAppointmentTypes();
    checkDraftMeetingEligibility(serviceRequestId).then(setDraftMeetingEligible);
  }, [isOffered, activeAppointment, serviceRequestId, loadAvailability, bookingDraftMeeting, loadAppointmentTypes, checkDraftMeetingEligibility]);

  // Compute timeline milestones for the calendar
  const milestones = useMemo((): CalendarMilestone[] => {
    if (!timelines) return [];
    const result: CalendarMilestone[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (timelines.targetDate) {
      result.push({ date: timelines.targetDate, label: 'Target Date' });
    }

    // Next Projected AGM
    const lastAgmDate = timelines.lastAgmDate && !timelines.noAgmToDate
      ? new Date(timelines.lastAgmDate + 'T00:00:00')
      : null;
    const fiscalYearEnd = timelines.fiscalYearEnd
      ? new Date(timelines.fiscalYearEnd + 'T00:00:00')
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
        const autoTargetStr = formatYMD(autoTarget);
        if (!result.some(m => m.date === autoTargetStr)) {
          result.push({ date: autoTargetStr, label: 'Target Date' });
        }
      }
    }

    return result;
  }, [timelines]);

  const selectedDaySlots = useMemo(() => {
    if (!selectedDate) return [];
    const day = availability.find(d => d.date === selectedDate);
    return day?.slots ?? [];
  }, [selectedDate, availability]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setErrorMsg(null);
    if (bookingStep === 'first-date') {
      setBookingStep('first-slot');
    } else if (bookingStep === 'second-date') {
      setBookingStep('second-slot');
    }
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    const choice: BookingChoice = {
      date: selectedDate!,
      timeSlotId: slot.timeSlotId,
      slotName: slot.slotName,
      slotTime: slot.slotTime,
    };

    if (bookingStep === 'first-slot') {
      setFirstChoice(choice);
      setSelectedDate(null);
      setBookingStep('second-date');
    } else if (bookingStep === 'second-slot') {
      setSecondChoice(choice);
      setSelectedDate(null);
      setBookingStep('confirm');
    }
  };

  const handleSkipSecondChoice = () => {
    setSecondChoice(null);
    setBookingStep('confirm');
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
    if (!firstChoice || !serviceRequestId) return;

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
      serviceRequestId,
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

  if (srLoading || pageLoading) {
    return (
      <div className="page-container">
        <LoadingSpinner />
      </div>
    );
  }

  if (!activeRequest) {
    return (
      <div className="page-container">
        <h1>Inspection Date</h1>
        <div className="inspection-date__card">
          <p>No active service request found.</p>
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

  // State 4: Scheduled
  if (activeAppointment?.type === 'scheduled') {
    const apt = activeAppointment.data;
    return (
      <div className="page-container">
        <h1>Inspection Date</h1>
        {errorMsg && <div className="inspection-date__error">{errorMsg}</div>}
        {successMsg && <div className="inspection-date__success">{successMsg}</div>}
        <div className="inspection-date__card inspection-date__card--scheduled">
          <h3>Appointment Scheduled</h3>

          <div className="inspection-date__details">
            <div className="inspection-date__detail-row">
              <span className="inspection-date__detail-label">Date</span>
              <span className="inspection-date__detail-value">
                {formatDateLong(typeof apt.appointmentDate === 'string'
                  ? apt.appointmentDate.split('T')[0]
                  : new Date(apt.appointmentDate).toISOString().split('T')[0])}
              </span>
            </div>
            <div className="inspection-date__detail-row">
              <span className="inspection-date__detail-label">Time</span>
              <span className="inspection-date__detail-value">
                {apt.timeSlot.slotName} ({formatTime12h(apt.timeSlot.slotTime)})
              </span>
            </div>
            <div className="inspection-date__detail-row">
              <span className="inspection-date__detail-label">Type</span>
              <span className="inspection-date__detail-value">
                {apt.appointmentType.typeName}
              </span>
            </div>
            {apt.inspector && (
              <div className="inspection-date__detail-row">
                <span className="inspection-date__detail-label">Inspector</span>
                <span className="inspection-date__detail-value">
                  {apt.inspector.displayName || `${apt.inspector.firstName} ${apt.inspector.lastName}`}
                </span>
              </div>
            )}
            <div className="inspection-date__detail-row">
              <span className="inspection-date__detail-label">Status</span>
              <span className="inspection-date__detail-value inspection-date__status--scheduled">
                {apt.status}
              </span>
            </div>
          </div>

          <div className="inspection-date__actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => handleCancelAppointment(apt.appointmentId)}
            >
              Cancel Appointment
            </button>
          </div>

          <p className="inspection-date__notice">
            Cancellations and reschedules must be made at least 48 hours before the appointment.
            For changes within 48 hours, please call SRP at (604) 638-4960.
          </p>
        </div>
      </div>
    );
  }

  // State 2: Ready to Book
  const bookingTitle = bookingDraftMeeting ? 'Schedule Draft Meeting' : 'Inspection Date';
  const bookingSubtitle = bookingDraftMeeting
    ? 'Select your preferred draft meeting date and time (evening slots only)'
    : 'Select your preferred inspection dates and times';

  return (
    <div className="page-container">
      <h1>{bookingTitle}</h1>
      <p className="page-subtitle">{bookingSubtitle}</p>

      {draftMeetingEligible && !bookingDraftMeeting && (
        <div className="inspection-date__card inspection-date__card--info">
          <h3>Draft Meeting Available</h3>
          <p>Your inspection has been completed. You can now schedule a draft meeting.</p>
          <button type="button" className="btn btn-primary" onClick={handleStartDraftMeetingBooking}>
            Schedule Draft Meeting
          </button>
        </div>
      )}

      {errorMsg && <div className="inspection-date__error">{errorMsg}</div>}
      {successMsg && <div className="inspection-date__success">{successMsg}</div>}

      {bookingStep === 'confirm' && firstChoice ? (
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
          <div className="inspection-date__step-indicator">
            {bookingStep === 'first-date' || bookingStep === 'first-slot' ? (
              <h3>Step 1: Select your first preferred date and time</h3>
            ) : (
              <div>
                <h3>Step 2: Select a second preferred date and time (optional)</h3>
                {firstChoice && (
                  <div className="inspection-date__first-choice-summary">
                    First Choice: {formatDateLong(firstChoice.date)} - {firstChoice.slotName} ({formatTime12h(firstChoice.slotTime)})
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-link"
                  onClick={handleSkipSecondChoice}
                >
                  Skip - proceed with first choice only
                </button>
              </div>
            )}
          </div>

          <div className="inspection-date__calendar-section">
            <BookingCalendar
              availability={availability}
              selectedDate={selectedDate}
              onSelectDate={handleDateSelect}
              loading={calendarLoading}
              milestones={milestones}
            />

            {selectedDate && (bookingStep === 'first-slot' || bookingStep === 'second-slot') && (
              <TimeSlotPicker
                slots={selectedDaySlots}
                selectedSlotId={null}
                onSelectSlot={handleSlotSelect}
                label={`Available times for ${formatDateLong(selectedDate)}`}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionDate;
