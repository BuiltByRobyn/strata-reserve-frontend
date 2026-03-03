import { useState, useMemo } from 'react';
import type { BookingCalendarProps } from '../../shared/types/appointment.types';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getMonthData = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
};

const formatYMD = (year: number, month: number, day: number) => {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const BookingCalendar = ({ availability, selectedDate, onSelectDate, loading, milestones, bookedDate }: BookingCalendarProps) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const availableDatesSet = useMemo(() => {
    const set = new Set<string>();
    availability.forEach(day => set.add(day.date));
    return set;
  }, [availability]);

  const milestonesMap = useMemo(() => {
    const map = new Map<string, string>();
    milestones?.forEach(m => map.set(m.date, m.label));
    return map;
  }, [milestones]);

  const { firstDay, daysInMonth } = getMonthData(viewYear, viewMonth);

  const todayStr = formatYMD(today.getFullYear(), today.getMonth(), today.getDate());

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const isPastMonth = viewYear < today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth <= today.getMonth());

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="booking-calendar__cell booking-calendar__cell--empty" />);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatYMD(viewYear, viewMonth, day);
    const isPast = dateStr <= todayStr;
    const isAvailable = availableDatesSet.has(dateStr);
    const isSelected = dateStr === selectedDate;
    const dayOfWeek = new Date(viewYear, viewMonth, day).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const milestoneLabel = milestonesMap.get(dateStr);

    let cellClass = 'booking-calendar__cell';
    if (isPast || isWeekend) {
      cellClass += ' booking-calendar__cell--disabled';
    } else if (isAvailable) {
      cellClass += ' booking-calendar__cell--available';
    } else {
      cellClass += ' booking-calendar__cell--unavailable';
    }
    if (isSelected) {
      cellClass += ' booking-calendar__cell--selected';
    }
    if (milestoneLabel) {
      cellClass += ' booking-calendar__cell--milestone';
    }
    if (bookedDate && dateStr === bookedDate) {
      cellClass += ' booking-calendar__cell--booked';
    }

    cells.push(
      <div
        key={day}
        className={cellClass}
        onClick={() => {
          if (!isPast && !isWeekend && isAvailable) onSelectDate(dateStr);
        }}
      >
        <span className="booking-calendar__cell-day">{day}</span>
        {bookedDate && dateStr === bookedDate && (
          <span className="booking-calendar__cell-label">Appointment Booked</span>
        )}
        {milestoneLabel && (
          <span className="booking-calendar__cell-label">{milestoneLabel}</span>
        )}
      </div>
    );
  }

  return (
    <div className="booking-calendar">
      <div className="booking-calendar__header">
        <button
          type="button"
          className="booking-calendar__nav-btn"
          onClick={handlePrevMonth}
          disabled={isPastMonth}
        >
          &lsaquo;
        </button>
        <span className="booking-calendar__title">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          className="booking-calendar__nav-btn"
          onClick={handleNextMonth}
        >
          &rsaquo;
        </button>
      </div>

      {loading ? (
        <div className="booking-calendar__loading">Loading availability...</div>
      ) : (
        <div className="booking-calendar__grid">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className="booking-calendar__day-header">{d}</div>
          ))}
          {cells}
        </div>
      )}

      <div className="booking-calendar__legend">
        <span className="booking-calendar__legend-item">
          <span className="booking-calendar__legend-dot booking-calendar__legend-dot--available" />
          Available
        </span>
        <span className="booking-calendar__legend-item">
          <span className="booking-calendar__legend-dot booking-calendar__legend-dot--unavailable" />
          Unavailable
        </span>
        <span className="booking-calendar__legend-item">
          <span className="booking-calendar__legend-dot booking-calendar__legend-dot--selected" />
          Selected
        </span>
        {bookedDate && (
          <span className="booking-calendar__legend-item">
            <span className="booking-calendar__legend-dot booking-calendar__legend-dot--booked" />
            Appointment Booked
          </span>
        )}
        {milestonesMap.size > 0 && (
          <span className="booking-calendar__legend-item">
            <span className="booking-calendar__legend-dot booking-calendar__legend-dot--milestone" />
            Milestone
          </span>
        )}
      </div>
    </div>
  );
};

export default BookingCalendar;
