import { useState, useMemo } from 'react';
import type { BookingCalendarProps } from '../types/appointment.types';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_LABELS = 3;

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

const BookingCalendar = ({
  availability,
  selectedDate,
  onSelectDate,
  loading,
  milestones,
  bookedDate,
  variant = 'booking',
  onMilestoneCellClick,
  hideLabels = false,
}: BookingCalendarProps) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const availableDatesSet = useMemo(() => {
    const set = new Set<string>();
    availability.forEach(day => set.add(day.date));
    return set;
  }, [availability]);

  const milestonesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    milestones?.forEach(m => {
      const existing = map.get(m.date) ?? [];
      existing.push(m.label);
      map.set(m.date, existing);
    });
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

  const isTimelinesVariant = variant === 'timelines';

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
    const milestoneLabels = milestonesMap.get(dateStr);

    let cellClass = 'booking-calendar__cell';
    if (isTimelinesVariant) {
      cellClass += ' booking-calendar__cell--neutral';
      if (milestoneLabels && milestoneLabels.length > 0) {
        cellClass += ' booking-calendar__cell--milestone';
      }
    } else {
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
      if (milestoneLabels && milestoneLabels.length > 0) {
        cellClass += ' booking-calendar__cell--milestone';
      }
      if (bookedDate && dateStr === bookedDate) {
        cellClass += ' booking-calendar__cell--booked';
      }
    }

    const handleCellClick = () => {
      if (isTimelinesVariant && milestoneLabels && milestoneLabels.length > 0 && onMilestoneCellClick) {
        onMilestoneCellClick(dateStr);
      } else if (!isTimelinesVariant && !isPast && !isWeekend && isAvailable) {
        onSelectDate(dateStr);
      }
    };

    cells.push(
      <div
        key={day}
        className={cellClass}
        onClick={handleCellClick}
        role={isTimelinesVariant && milestoneLabels?.length ? 'button' : undefined}
      >
        <span className="booking-calendar__cell-day">{day}</span>
        {!isTimelinesVariant && bookedDate && dateStr === bookedDate && (
          <span className="booking-calendar__cell-label">Appointment Booked</span>
        )}
        {milestoneLabels && milestoneLabels.length > 0 && !hideLabels && (
          <>
            <span className="booking-calendar__cell-count">{milestoneLabels.length}</span>
            <span className="booking-calendar__cell-label-wrap">
              {milestoneLabels.slice(0, MAX_LABELS).map((label, idx) => (
                <span key={`${dateStr}-${idx}`} className="booking-calendar__cell-label">{label}</span>
              ))}
              {milestoneLabels.length > MAX_LABELS && (
                <span className="booking-calendar__cell-overflow">+{milestoneLabels.length - MAX_LABELS} more</span>
              )}
            </span>
          </>
        )}
      </div>
    );
  }

  const rootClass = isTimelinesVariant ? 'booking-calendar booking-calendar--timelines' : 'booking-calendar';

  return (
    <div className={rootClass}>
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

      {loading && !isTimelinesVariant ? (
        <div className="booking-calendar__loading">Loading availability...</div>
      ) : (
        <div className="booking-calendar__grid">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className="booking-calendar__day-header">{d}</div>
          ))}
          {cells}
        </div>
      )}

      {!isTimelinesVariant && (
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
      )}
    </div>
  );
};

export default BookingCalendar;
