import { formatDateLong, formatTime12h } from '../../shared/lib/formatters';
import type { BookingConfirmationProps } from '../../shared/types/appointment.types';

const BookingConfirmation = ({
  firstChoice,
  secondChoice,
  specialRequirements,
  onSpecialRequirementsChange,
  onConfirm,
  onBack,
  submitting,
}: BookingConfirmationProps) => {
  return (
    <div className="booking-confirmation">
      <h3 className="booking-confirmation__title">Confirm Your Selection</h3>

      <div className="booking-confirmation__choices">
        <div className="booking-confirmation__choice">
          <h4>First Choice</h4>
          <p className="booking-confirmation__date">{formatDateLong(firstChoice.date)}</p>
          <p className="booking-confirmation__time">
            {firstChoice.slotName} ({formatTime12h(firstChoice.slotTime)})
          </p>
        </div>

        {secondChoice && (
          <div className="booking-confirmation__choice">
            <h4>Second Choice (Optional)</h4>
            <p className="booking-confirmation__date">{formatDateLong(secondChoice.date)}</p>
            <p className="booking-confirmation__time">
              {secondChoice.slotName} ({formatTime12h(secondChoice.slotTime)})
            </p>
          </div>
        )}
      </div>

      <div className="booking-confirmation__requirements">
        <label htmlFor="special-requirements">Special Requirements (Optional)</label>
        <textarea
          id="special-requirements"
          className="booking-confirmation__textarea"
          value={specialRequirements}
          onChange={(e) => onSpecialRequirementsChange(e.target.value)}
          rows={3}
          placeholder="Any special requirements or notes for the inspector..."
        />
      </div>

      <div className="booking-confirmation__actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onBack}
          disabled={submitting}
        >
          Go Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onConfirm}
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </div>
    </div>
  );
};

export default BookingConfirmation;
