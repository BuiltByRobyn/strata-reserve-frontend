import { formatTime12h } from '../../shared/lib/formatters';
import type { AvailableMeetingDatesProps } from '../../shared/types/appointment.types';

function formatDayHeading(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-AU', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function AvailableMeetingDates({
  availability,
  onSelectSlot,
  firstChoice,
  secondChoice,
  bookingStep,
}: AvailableMeetingDatesProps) {
  if (availability.length === 0) return null;

  const isFirstStep = bookingStep === 'first-date' || bookingStep === 'first-slot';

  return (

    <div className="available-meeting-dates">
      <div className="available-meeting-dates__grid">
        {availability.map((day) => (
          <div key={day.date} className="available-meeting-dates__card">
            <div className="available-meeting-dates__card-header">
              {formatDayHeading(day.date)}
            </div>
            <div className="available-meeting-dates__slots">
              {day.slots.map((slot) => {
                const isFirstSelected =
                  firstChoice?.date === day.date && firstChoice?.timeSlotId === slot.timeSlotId;
                const isSecondSelected =
                  secondChoice?.date === day.date && secondChoice?.timeSlotId === slot.timeSlotId;
                const isDisabled = isFirstSelected && !isFirstStep;

                return (
                  <button
                    key={slot.timeSlotId}
                    type="button"
                    className={`available-meeting-dates__slot-btn${
                      isFirstSelected ? ' available-meeting-dates__slot-btn--first' : ''
                    }${isSecondSelected ? ' available-meeting-dates__slot-btn--second' : ''}`}
                    onClick={() => !isDisabled && onSelectSlot(day.date, slot)}
                    disabled={isDisabled}
                  >
                    <span className="available-meeting-dates__slot-name">{slot.slotName}</span>
                    <span className="available-meeting-dates__slot-time">{formatTime12h(slot.slotTime)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
