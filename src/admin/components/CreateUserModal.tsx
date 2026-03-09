import { useState } from 'react';
import { useUsers } from '../../shared/hooks/useUsers';
import { useStrata } from '../../shared/hooks/useStrata';
import { useLookups } from '../../shared/hooks/useLookups';
import { Modal } from '../../shared/components/Modal';
import { InputField, FormRow } from '../../shared/components/FormField';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import type { CreateUserInput, UserFormData } from '../../shared/types/entities.types';

const initialFormData: UserFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  userTypeId: undefined,
  companyName: '',
  strataAssociations: [{ strataId: 0, strataPosition: '', sectionIds: [], propertyTypeIds: [] }],
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateUserModal({ isOpen, onClose }: Props) {
  const { createUser } = useUsers();
  const { stratas } = useStrata();
  const { userTypes, propertyTypes } = useLookups();

  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = <K extends keyof UserFormData>(field: K, value: UserFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateStrataAssociation = (index: number, field: 'strataId' | 'strataPosition', value: string | number) => {
    setFormData(prev => {
      const newAssociations = [...prev.strataAssociations];
      newAssociations[index] = { ...newAssociations[index], [field]: field === 'strataId' ? Number(value) : value };
      return { ...prev, strataAssociations: newAssociations };
    });
  };

  const updateStrataAssociationSections = (index: number, sectionIds: number[]) => {
    setFormData(prev => {
      const newAssociations = [...prev.strataAssociations];
      newAssociations[index] = { ...newAssociations[index], sectionIds };
      return { ...prev, strataAssociations: newAssociations };
    });
  };

  const updateStrataAssociationPropertyTypes = (index: number, propertyTypeIds: number[]) => {
    setFormData(prev => {
      const newAssociations = [...prev.strataAssociations];
      newAssociations[index] = { ...newAssociations[index], propertyTypeIds };
      return { ...prev, strataAssociations: newAssociations };
    });
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setFormError(null);
    onClose();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!formData.firstName.trim()) { setFormError('First Name is required'); return; }
    if (!formData.lastName.trim()) { setFormError('Last Name is required'); return; }
    if (!formData.email.trim()) { setFormError('Email is required'); return; }
    if (!formData.phoneNumber.trim()) { setFormError('Phone Number is required'); return; }
    if (!formData.userTypeId) { setFormError('User Type is required'); return; }
    const validAssociations = formData.strataAssociations.filter(sa => sa.strataId > 0);
    if (validAssociations.length === 0) { setFormError('At least one Strata association is required'); return; }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const input: CreateUserInput = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        userTypeId: formData.userTypeId,
        companyName: formData.companyName.trim() || undefined,
        strataAssociations: validAssociations,
      };
      await createUser(input);
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
      title="Create New User"
      size="large"
      footer={
        <>
          <button className="btn-secondary" onClick={handleClose}>Cancel</button>
          <button className="btn-primary" onClick={() => handleSubmit()} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Create User'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {formError && <div className="form-error">{formError}</div>}

        <FormRow>
          <InputField label="First Name" required value={formData.firstName} onChange={(e) => updateField('firstName', e.target.value)} placeholder="Enter first name" />
          <InputField label="Last Name" required value={formData.lastName} onChange={(e) => updateField('lastName', e.target.value)} placeholder="Enter last name" />
        </FormRow>

        <FormRow>
          <InputField label="Email" type="email" required value={formData.email} onChange={(e) => updateField('email', e.target.value)} placeholder="user@example.com" />
          <InputField label="Phone Number" type="tel" required value={formData.phoneNumber} onChange={(e) => updateField('phoneNumber', e.target.value)} placeholder="Enter phone number" />
        </FormRow>

        <FormRow>
          <SingleSelectDropdown
            label="User Type"
            required
            value={formData.userTypeId?.toString() || ''}
            onChange={(val) => updateField('userTypeId', val ? parseInt(val) : undefined)}
            options={userTypes.map(ut => ({ value: ut.userTypeId, label: ut.userTypeName }))}
            placeholder="--- Select User Type ---"
          />
          <InputField label="Associated Company" value={formData.companyName} onChange={(e) => updateField('companyName', e.target.value)} placeholder="Enter company name" />
        </FormRow>

        {formData.strataAssociations.map((association, index) => {
          const selectedStrata = stratas.find(s => s.strataId === association.strataId);
          const otherSelectedIds = formData.strataAssociations.filter((_, i) => i !== index).map(a => a.strataId).filter(id => id > 0);
          const availableStratas = stratas.filter(s => !otherSelectedIds.includes(s.strataId));
          return (
            <div key={index} className="strata-association-row">
              <FormRow>
                <SingleSelectDropdown
                  label={`Strata Plan${index === 0 ? '' : ` ${index + 1}`}`}
                  required
                  value={association.strataId?.toString() || ''}
                  onChange={(val) => { updateStrataAssociation(index, 'strataId', val); updateStrataAssociationSections(index, []); }}
                  options={availableStratas.map(s => ({ value: s.strataId, label: s.strataPlan || s.complexName || `Strata ${s.strataId}` })).sort((a, b) => a.label.localeCompare(b.label))}
                  placeholder="Select Strata Plan"
                />
                <InputField label={`Associated Strata${index === 0 ? '' : ` ${index + 1}`}`} required value={selectedStrata?.complexName || ''} disabled placeholder="Strata name" />
              </FormRow>
              <MultiSelectDropdown
                label={`Property Types${index === 0 ? '' : ` ${index + 1}`}`}
                options={
                  selectedStrata?.strataPropertyTypes?.length
                    ? selectedStrata.strataPropertyTypes.map(spt => ({ value: spt.propertyType.propertyTypeId, label: spt.propertyType.propertyTypeName })).sort((a, b) => a.label.localeCompare(b.label))
                    : propertyTypes.map(pt => ({ value: pt.propertyTypeId, label: pt.propertyTypeName })).sort((a, b) => a.label.localeCompare(b.label))
                }
                selectedValues={association.propertyTypeIds || []}
                onChange={(values) => updateStrataAssociationPropertyTypes(index, values)}
                placeholder="Select property types"
              />
            </div>
          );
        })}
      </form>
    </Modal>
  );
}
