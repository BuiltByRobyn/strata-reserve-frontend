import { useState } from 'react';
import { useStrata } from '../../shared/hooks/useStrata';
import { useLookups } from '../../shared/hooks/useLookups';
import { Modal } from '../../shared/components/Modal';
import { InputField, FormRow } from '../../shared/components/FormField';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import type { CreateStrataInput } from '../../shared/types/entities.types';
import type { BaseModalProps } from '../../shared/types/component.types';
import { formatStrataId, formatPostalCode, validateStrataId, validatePostalCodeFormat } from '../../shared/utils/strataUtils';
import { LOCATION_DISPLAY_ORDER } from '../../shared/utils/constants';

export function CreateStrataModal({ isOpen, onClose }: BaseModalProps) {
  const { stratas, createStrata } = useStrata();
  const { legalTypes, propertyTypes, locations } = useLookups();

  const [formData, setFormData] = useState<CreateStrataInput>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [strataPlanError, setStrataPlanError] = useState<string | null>(null);
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof CreateStrataInput, value: string | number | null | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    setFormData({});
    setFormError(null);
    setStrataPlanError(null);
    setPostalCodeError(null);
    onClose();
  };

  const isDuplicate = validateStrataId(formData.strataPlan || '') &&
    stratas.some(s => s.strataPlan?.toUpperCase() === (formData.strataPlan || '').toUpperCase());

  const isFormValid =
    validateStrataId(formData.strataPlan || '') &&
    !strataPlanError &&
    !isDuplicate &&
    !!formData.complexName?.trim() &&
    !!formData.streetName?.trim() &&
    !!formData.town?.trim() &&
    !!formData.province &&
    !!formData.postalCode?.trim() &&
    !postalCodeError &&
    !!formData.legalTypeId &&
    (formData.propertyTypeIds?.length ?? 0) > 0 &&
    !!formData.locationId;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      await createStrata(formData);
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Strata"
      size="large"
      footer={
        <>
          <button className="btn-secondary" onClick={handleClose}>Cancel</button>
          <button className="btn-primary" onClick={() => handleSubmit()} disabled={!isFormValid || isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Create Strata'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {formError && <div className="form-error">{formError}</div>}

        <FormRow>
          <InputField
            label="Strata Plan"
            value={formData.strataPlan || ''}
            onChange={(e) => {
              const formatted = formatStrataId(e.target.value);
              if (/\d/.test(formatted) && !validateStrataId(formatted)) {
                setStrataPlanError('Format: ABC 12345 (3 letters, space, 1–5 digits)');
              } else if (validateStrataId(formatted) && stratas.some(s => s.strataPlan?.toUpperCase() === formatted.toUpperCase())) {
                setStrataPlanError('A strata with this plan number already exists');
              } else {
                setStrataPlanError(null);
              }
              updateField('strataPlan', formatted);
            }}
            placeholder="e.g., VIS 23456"
            maxLength={9}
            error={strataPlanError || undefined}
            required
          />
          <InputField label="Complex Name" value={formData.complexName || ''} onChange={(e) => updateField('complexName', e.target.value)} placeholder="e.g., Maple Gardens" required />
        </FormRow>

        <FormRow>
          <InputField label="Unit Number (if applicable)" value={formData.unitNumber || ''} onChange={(e) => updateField('unitNumber', e.target.value)} placeholder="e.g., 101" />
          <InputField label="Street Name" value={formData.streetName || ''} onChange={(e) => updateField('streetName', e.target.value)} placeholder="e.g., 123 Main St" required />
        </FormRow>

        <FormRow>
          <InputField label="Town/City" value={formData.town || ''} onChange={(e) => updateField('town', e.target.value)} placeholder="e.g., Vancouver" required />
          <SingleSelectDropdown
            label="Province"
            value={formData.province || ''}
            onChange={(val) => updateField('province', val)}
            options={[
              { value: 'AB', label: 'Alberta' }, { value: 'BC', label: 'British Columbia' },
              { value: 'MB', label: 'Manitoba' }, { value: 'NB', label: 'New Brunswick' },
              { value: 'NL', label: 'Newfoundland and Labrador' }, { value: 'NS', label: 'Nova Scotia' },
              { value: 'NT', label: 'Northwest Territories' }, { value: 'NU', label: 'Nunavut' },
              { value: 'ON', label: 'Ontario' }, { value: 'PE', label: 'Prince Edward Island' },
              { value: 'QC', label: 'Quebec' }, { value: 'SK', label: 'Saskatchewan' },
              { value: 'YT', label: 'Yukon' },
            ]}
            placeholder="Select province"
            required
          />
        </FormRow>

        <FormRow>
          <InputField
            label="Postal Code"
            value={formData.postalCode || ''}
            onChange={(e) => {
              const formatted = formatPostalCode(e.target.value, formData.country || 'Canada');
              setPostalCodeError(validatePostalCodeFormat(formatted, formData.country || 'Canada'));
              updateField('postalCode', formatted);
            }}
            placeholder="e.g., V6B 1A1"
            error={postalCodeError || undefined}
            required
          />
          <InputField label="Country" value={formData.country || 'Canada'} onChange={(e) => updateField('country', e.target.value)} />
        </FormRow>

        <FormRow>
          <InputField label="Strata Management Company (if applicable)" value={formData.companyName || ''} onChange={(e) => updateField('companyName', e.target.value)} placeholder="Enter strata management company name" />
          <SingleSelectDropdown
            label="Legal Type"
            value={formData.legalTypeId?.toString() || ''}
            onChange={(val) => updateField('legalTypeId', val ? parseInt(val) : undefined)}
            options={legalTypes.map(lt => ({ value: lt.legalTypeId, label: lt.legalTypeName }))}
            placeholder="Select legal type"
            required
          />
        </FormRow>

        <FormRow>
          <MultiSelectDropdown
            label="Property Types"
            options={propertyTypes.map(pt => ({ value: pt.propertyTypeId, label: pt.propertyTypeName })).sort((a, b) => a.label.localeCompare(b.label))}
            selectedValues={formData.propertyTypeIds || []}
            onChange={(values) => setFormData(prev => ({ ...prev, propertyTypeIds: values }))}
            placeholder="Select property types"
            required
          />
          <SingleSelectDropdown
            label="Location"
            value={formData.locationId?.toString() || ''}
            onChange={(val) => updateField('locationId', val ? parseInt(val) : null)}
            options={[...locations]
              .filter(loc => loc.locationCode !== 'Virtual')
              .sort((a, b) => {
                const ai = LOCATION_DISPLAY_ORDER.indexOf(a.locationCode);
                const bi = LOCATION_DISPLAY_ORDER.indexOf(b.locationCode);
                return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
              })
              .map(loc => ({ value: loc.locationId, label: loc.locationName }))}
            placeholder="Select location"
            required
          />
        </FormRow>

        <FormRow>
          <InputField label="Website (if applicable)" type="url" value={formData.website || ''} onChange={(e) => updateField('website', e.target.value)} placeholder="https://example.com" />
          <InputField
            label="Current Fiscal Year Start Date"
            type="date"
            value={formData.fiscalYearEnd || ''}
            onChange={(e) => updateField('fiscalYearEnd', e.target.value || undefined)}
            min={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0]; })()}
            max={new Date().toISOString().split('T')[0]}
          />
        </FormRow>
      </form>
    </Modal>
  );
}
