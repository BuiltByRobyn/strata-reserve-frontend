import { formatTime12h } from '../../shared/lib/formatters';
import type { TimeSlotPickerProps } from '../../shared/types/appointment.types';

const SLOT_END_TIMES: Record<string, string> = {
  '10:00': '14:00',
  '14:00': '18:00',
  '18:00': '19:00',
};

const TimeSlotPicker = ({ slots, selectedSlotId, onSelectSlot, label }: TimeSlotPickerProps) => {
  if (slots.length === 0) {
    return (
      <div className="time-slot-picker">
        <h4 className="time-slot-picker__label">{label}</h4>
        <p className="time-slot-picker__empty">No time slots available for this date.</p>
      </div>
    );
  }

  return (
    <div className="time-slot-picker">
      <h4 className="time-slot-picker__label">{label}</h4>
      <div className="time-slot-picker__slots">
        {slots.map(slot => {
          const isSelected = slot.timeSlotId === selectedSlotId;
          const endTime = SLOT_END_TIMES[slot.slotTime] || '';

          return (
            <button
              key={slot.timeSlotId}
              type="button"
              className={`time-slot-picker__slot${isSelected ? ' time-slot-picker__slot--selected' : ''}`}
              onClick={() => onSelectSlot(slot)}
            >
              <span className="time-slot-picker__slot-name">{slot.slotName}</span>
              <span className="time-slot-picker__slot-time">
                {formatTime12h(slot.slotTime)} - {formatTime12h(endTime)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TimeSlotPicker;
