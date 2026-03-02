import { useState, useMemo } from 'react';
import { useCompanyHolidays } from '../../shared/hooks/useCompanyHolidays';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { Modal } from '../../shared/components/Modal';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { InputField } from '../../shared/components/FormField';
import { formatDateShort } from '../../shared/lib/formatters';
import { parseLocalDate } from '../../shared/lib/dateUtils';
import type { CompanyHoliday } from '../../shared/types/entities.types';
import { CompanyHolidayModal } from './CompanyHolidayModal';

type DisplayHoliday = CompanyHoliday & { displayYear: number; displayDate: string };

// TODO: Add Holiday start time, end time in database and UI
export const CompanyHolidaysManager = () => {
  const { holidays, loading, error, createHoliday, updateHoliday, deleteHoliday } = useCompanyHolidays();
  const isDesktop = useMediaQuery('(min-width: 750px)');

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<CompanyHoliday | null>(null);
  const [viewingHoliday, setViewingHoliday] = useState<DisplayHoliday | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [maxYear, setMaxYear] = useState(() => new Date().getFullYear());

  const filteredHolidays = useMemo(() => {
    const expanded: DisplayHoliday[] = [];

    const toYMD = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    for (const holiday of holidays) {
      const date = parseLocalDate(holiday.holidayDate);
      if (!date) continue;
      if (holiday.isRecurringAnnually) {
        for (let year = currentYear; year <= maxYear; year++) {
          const adjusted = new Date(year, date.getMonth(), date.getDate());
          expanded.push({ ...holiday, displayYear: year, displayDate: toYMD(adjusted) });
        }
      } else {
        const year = date.getFullYear();
        if (year >= currentYear && year <= maxYear) {
          expanded.push({ ...holiday, displayYear: year, displayDate: toYMD(date) });
        }
      }
    }

    expanded.sort((a, b) => a.displayDate.localeCompare(b.displayDate));

    let result = expanded;
    if (dateFrom) {
      result = result.filter(h => h.displayDate >= dateFrom);
    }
    if (dateTo) {
      result = result.filter(h => h.displayDate <= dateTo);
    }
    return result;
  }, [holidays, dateFrom, dateTo, maxYear, currentYear]);

  const handleEdit = (holiday: CompanyHoliday) => {
    setSelectedHoliday(holiday);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setSelectedHoliday(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedHoliday(null);
  };

  const handleDeleteClick = () => {
    if (!selectedHoliday) return;
    if (window.confirm(`Remove holiday "${selectedHoliday.holidayName}"?`)) {
      deleteHoliday(selectedHoliday.companyHolidayId).then(() => handleCloseModal()).catch(() => {});
    }
  };

  const columns: Column<DisplayHoliday>[] = [
    {
      key: 'holidayName',
      header: 'HOLIDAY NAME',
      render: (item) => item.holidayName
    },
    {
      key: 'holidayDate',
      header: 'DATE',
      render: (item) => formatDateShort(item.displayDate)
    },
    {
      key: 'isRecurringAnnually',
      header: 'RECURRING ANNUALLY',
      render: (item) => (item.isRecurringAnnually ? 'Yes' : 'No')
    }
  ];

  const renderActions = (item: DisplayHoliday) => (
    <button className="btn-link" onClick={() => handleEdit(item)}>
      <u>Edit</u>
    </button>
  );

  const getMobileCardRows = (item: DisplayHoliday) => [
    { label: 'Holiday Name', value: item.holidayName },
    { label: 'Date', value: formatDateShort(item.displayDate) },
    { label: 'Recurring Annually', value: item.isRecurringAnnually ? 'Yes' : 'No' }
  ];

  const getViewHolidayRows = (item: DisplayHoliday) => [
    { label: 'Holiday Name', value: item.holidayName },
    { label: 'Date', value: formatDateShort(item.displayDate) },
    { label: 'Recurring Annually', value: item.isRecurringAnnually ? 'Yes' : 'No' }
  ];

  return (
    <div className="company-holidays-manager">
      <div className="manager-header company-holidays-header">
        <h3>Company Holidays</h3>
        {isDesktop && (
          <button className="btn-confirm company-holidays-add-btn" onClick={handleAddNew}>
            + Add Holiday
          </button>
        )}
      </div>

      <div className="filters-row">
        <div className="date-range-filter">
          <InputField
            label="From"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <InputField
            label="To"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {isDesktop ? (
        <DataTable
          columns={columns}
          data={filteredHolidays}
          keyExtractor={(item) => `${item.companyHolidayId}-${item.displayYear}`}
          loading={loading}
          onRowClick={(item) => {
            setViewingHoliday(item);
            setIsViewModalOpen(true);
          }}
          actions={renderActions}
          actionsColumnHeader="ACTIONS"
          emptyMessage="No holidays added yet."
        />
      ) : (
        <>
          {loading && <LoadingSpinner />}
          {!loading && filteredHolidays.length === 0 && (
            <div className="data-table-empty">
              <p>No holidays found.</p>
            </div>
          )}
          {!loading && filteredHolidays.length > 0 && (
            <div className="availability-mobile-list">
              {filteredHolidays.map((item) => (
                <div
                  key={`${item.companyHolidayId}-${item.displayYear}`}
                  className="availability-mobile-card clickable"
                  onClick={() => {
                    setViewingHoliday(item);
                    setIsViewModalOpen(true);
                  }}
                >
                  <table className="data-table availability-table-mobile">
                    <tbody>
                      {getMobileCardRows(item).map((row) => (
                        <tr key={row.label}>
                          <td className="mobile-label-col">{row.label}</td>
                          <td className="mobile-value-col">{row.value}</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="mobile-label-col">Actions</td>
                        <td className="mobile-value-col" onClick={(e) => e.stopPropagation()}>
                          <button className="btn-link" onClick={() => handleEdit(item)}>
                            <u>Edit</u>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="load-more-container">
        <button className="btn-link" onClick={() => setMaxYear(prev => prev + 1)}>
          Load More ({maxYear + 1})
        </button>
      </div>

      {!isDesktop && (
        <button className="btn-confirm availability-add-button" onClick={handleAddNew}>
          + Add Holiday
        </button>
      )}

      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingHoliday(null);
        }}
        title="View Holiday"
        size="medium"
        footer={
          <>
            <button
              className={isDesktop ? 'btn-primary' : 'btn-secondary'}
              onClick={() => {
                setIsViewModalOpen(false);
                setViewingHoliday(null);
              }}
            >
              Close
            </button>
            {!isDesktop && viewingHoliday && (
              <button
                className="btn-primary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleEdit(viewingHoliday);
                  setViewingHoliday(null);
                }}
              >
                Edit
              </button>
            )}
          </>
        }
      >
        {viewingHoliday && (
          <table className="view-detail-table">
            <tbody>
              {getViewHolidayRows(viewingHoliday).map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>

      {isModalOpen && (
        <CompanyHolidayModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          initialData={selectedHoliday}
          onSubmitCreate={createHoliday}
          onSubmitUpdate={updateHoliday}
          onDeleteClick={selectedHoliday ? handleDeleteClick : undefined}
        />
      )}
    </div>
  );
};
