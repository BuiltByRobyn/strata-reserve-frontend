import { useState } from 'react';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { usePropertyTypeRequest } from '../../shared/hooks/usePropertyTypeRequest';
import type { PropertyTypeSelectorProps } from '../../shared/types/component.types';

export function PropertyTypeSelector({ availablePropertyTypes, onRequestSubmitted }: PropertyTypeSelectorProps) {
  const { request, loading, submitting, submitRequest } = usePropertyTypeRequest();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <LoadingSpinner />;

  if (request?.status === 'Pending') {
    return (
      <div className="property-type-pending">
        <h3>Request Submitted</h3>
        <p>Thank you! Your selection has been submitted and is awaiting approval. Once approved, you will be able to upload your strata's supporting documents here.</p>
      </div>
    );
  }

  const options = availablePropertyTypes
    .map(spt => ({ value: spt.propertyType.propertyTypeId, label: spt.propertyType.propertyTypeName }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const handleSubmit = async () => {
    setError(null);
    const result = await submitRequest(selectedIds);
    if (result.success) {
      onRequestSubmitted();
    } else {
      setError(result.error || 'Failed to submit');
    }
  };

  return (
    <div className="property-type-selector">
      <h3>Help Us Set Up Your Documents</h3>
      <p>Before we can show your documents, we need to know which parts of the strata you're involved with. Select all that apply.</p>

      {request?.status === 'Rejected' && (
        <div className="rejection-notice">
          <p><strong>Your previous request was not approved.</strong></p>
          {request.rejectionReason && <p>Reason: {request.rejectionReason}</p>}
          <p>Please make a new selection below.</p>
        </div>
      )}

      <MultiSelectDropdown
        label="Areas"
        options={options}
        selectedValues={selectedIds}
        onChange={setSelectedIds}
        placeholder="Select areas..."
      />

      {error && <div className="error-banner">{error}</div>}

      <button
        className="btn-primary mt-md"
        disabled={selectedIds.length === 0 || submitting}
        onClick={handleSubmit}
      >
        {submitting ? 'Submitting...' : 'Submit for Approval'}
      </button>
    </div>
  );
}
