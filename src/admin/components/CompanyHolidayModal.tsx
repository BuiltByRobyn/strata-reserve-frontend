import { useState, useEffect } from 'react';
import { Modal } from '../../shared/components/Modal';
import { InputField } from '../../shared/components/FormField';
import type { CompanyHolidayModalProps } from '../../shared/types/component.types';

export const CompanyHolidayModal = ({
  isOpen,
  onClose,
  initialData,
  onSubmitCreate,
  onSubmitUpdate,
  onDeleteClick
}: CompanyHolidayModalProps) => {
  const [formData, setFormData] = useState({
    holidayName: '',
    holidayDate: '',
    isRecurringAnnually: false
  });

  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData && isOpen) {
      setFormData({
        holidayName: initialData.holidayName,
        holidayDate: initialData.holidayDate.split('T')[0],
        isRecurringAnnually: initialData.isRecurringAnnually ?? false
      });
    } else if (isOpen) {
      setFormData({
        holidayName: '',
        holidayDate: '',
        isRecurringAnnually: false
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleSubmit = async () => {
    try {
      if (!formData.holidayName.trim() || !formData.holidayDate) {
        throw new Error('Please fill in Holiday Name and Holiday Date.');
      }

      setSaving(true);
      setError(null);

      if (initialData) {
        await onSubmitUpdate(initialData.companyHolidayId, {
          holidayName: formData.holidayName.trim(),
          holidayDate: formData.holidayDate,
          isRecurringAnnually: formData.isRecurringAnnually
        });
      } else {
        await onSubmitCreate({
          holidayName: formData.holidayName.trim(),
          holidayDate: formData.holidayDate,
          isRecurringAnnually: formData.isRecurringAnnually
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <>
      <button className="btn-secondary" onClick={onClose} disabled={saving}>
        Cancel
      </button>
      {initialData && onDeleteClick && (
        <button className="btn-delete" onClick={onDeleteClick} disabled={saving}>
          Remove Holiday
        </button>
      )}
      <button className="btn-primary" onClick={handleSubmit} disabled={saving}>
        {saving ? 'Saving...' : initialData ? 'Update Holiday' : 'Add Holiday'}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Holiday' : 'Add Holiday'}
      size="medium"
      footer={footer}
    >
      <div className="company-holiday-modal">
        {error && <div className="modal-error">{error}</div>}

        <div className="modal-form">
          {initialData ? (
            <>
              <div className="form-row-two-cols">
                <InputField
                  label="Existing Holiday Name"
                  type="text"
                  id="existing-holiday-name"
                  value={initialData.holidayName}
                  readOnly
                />
                <InputField
                  label="Existing Holiday Date"
                  type="date"
                  id="existing-holiday-date"
                  value={initialData.holidayDate.split('T')[0]}
                  readOnly
                />
              </div>
              <div className="form-row-two-cols">
                <InputField
                  label="New Holiday Name"
                  required
                  type="text"
                  id="new-holiday-name"
                  value={formData.holidayName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({ ...prev, holidayName: e.target.value }))
                  }
                />
                <InputField
                  label="New Holiday Date"
                  required
                  type="date"
                  id="new-holiday-date"
                  value={formData.holidayDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev) => ({ ...prev, holidayDate: e.target.value }))
                  }
                />
              </div>
            </>
          ) : (
            <div className="form-row-two-cols">
              <InputField
                label="Holiday Name"
                required
                type="text"
                id="holiday-name"
                value={formData.holidayName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, holidayName: e.target.value }))
                }
              />
              <InputField
                label="Holiday Date"
                required
                type="date"
                id="holiday-date"
                value={formData.holidayDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, holidayDate: e.target.value }))
                }
              />
            </div>
          )}

          <div className="form-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isRecurringAnnually}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev) => ({ ...prev, isRecurringAnnually: e.target.checked }))
                }
              />
              <span>Recurring Annually</span>
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
};
