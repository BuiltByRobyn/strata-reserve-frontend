import { useState } from 'react';
import { useCompanyHolidays } from '../../shared/hooks/useCompanyHolidays';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { Modal } from '../../shared/components/Modal';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { formatDateShort } from '../../shared/lib/formatters';
import type { CompanyHoliday } from '../../shared/types/entities.types';
import { CompanyHolidayModal } from './CompanyHolidayModal';

// TODO: Add Holiday start time, end time in database and UI
export const CompanyHolidaysManager = () => {
  const { holidays, loading, error, createHoliday, updateHoliday, deleteHoliday } = useCompanyHolidays();
  const isDesktop = useMediaQuery('(min-width: 750px)');

  const adjustDateForRecurring = (holiday: CompanyHoliday): string => {
    if (!holiday.isRecurringAnnually) return holiday.holidayDate;
    const date = new Date(holiday.holidayDate);
    const currentYear = new Date().getFullYear();
    const adjusted = new Date(currentYear, date.getMonth(), date.getDate());
    return adjusted.toISOString();
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<CompanyHoliday | null>(null);
  const [viewingHoliday, setViewingHoliday] = useState<CompanyHoliday | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

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

  const columns: Column<CompanyHoliday>[] = [
    {
      key: 'holidayName',
      header: 'HOLIDAY NAME',
      render: (item) => item.holidayName
    },
    {
      key: 'holidayDate',
      header: 'DATE',
      render: (item) => formatDateShort(adjustDateForRecurring(item))
    },
    {
      key: 'isRecurringAnnually',
      header: 'RECURRING ANNUALLY',
      render: (item) => (item.isRecurringAnnually ? 'Yes' : 'No')
    }
  ];

  const renderActions = (item: CompanyHoliday) => (
    <button className="btn-link" onClick={() => handleEdit(item)}>
      <u>Edit</u>
    </button>
  );

  const getMobileCardRows = (item: CompanyHoliday) => [
    { label: 'Holiday Name', value: item.holidayName },
    { label: 'Date', value: formatDateShort(adjustDateForRecurring(item)) },
    { label: 'Recurring Annually', value: item.isRecurringAnnually ? 'Yes' : 'No' }
  ];

  const getViewHolidayRows = (item: CompanyHoliday) => [
    { label: 'Holiday Name', value: item.holidayName },
    { label: 'Date', value: formatDateShort(adjustDateForRecurring(item)) },
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

      {error && <div className="alert alert-error">{error}</div>}

      {isDesktop ? (
        <DataTable
          columns={columns}
          data={holidays}
          keyExtractor={(item) => item.companyHolidayId}
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
          {!loading && holidays.length === 0 && (
            <div className="data-table-empty">
              <p>No holidays added yet.</p>
            </div>
          )}
          {!loading && holidays.length > 0 && (
            <div className="availability-mobile-list">
              {holidays.map((item) => (
                <div
                  key={item.companyHolidayId}
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
