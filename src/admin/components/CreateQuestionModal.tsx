import { useState } from 'react';
import { useQuestions } from '../../shared/hooks/useQuestions';
import { useLookups } from '../../shared/hooks/useLookups';
import { Modal } from '../../shared/components/Modal';
import { TextareaField, FormRow } from '../../shared/components/FormField';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import type { CreateQuestionInput, QuestionFormData } from '../../shared/types/survey.types';
import type { CreateQuestionModalProps } from '../../shared/types/component.types';

const CATEGORIES = ['Exterior', 'Interior', 'Services', 'Clubhouse', 'Amenity Room', 'Legal', 'Council Concerns', 'Septic Fields'];

const FRIENDLY_TYPE_NAMES: Record<string, string> = {
  text: 'Text', number: 'Number', date: 'Date', boolean: 'Yes/No',
  multiple_choice: 'Multiple Choice', checkbox: 'Checkbox', file: 'File Upload',
};

const formatTypeName = (name: string) =>
  FRIENDLY_TYPE_NAMES[name.toLowerCase()] || name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const initialFormData: QuestionFormData = {
  questionText: '', questionCategory: '', questionTypeId: undefined, isRequired: false,
  allowNa: false, allowUnavailable: false,
  informationText: '', serviceId: undefined, propertyTypeIds: [], multipleChoiceOptions: [],
};

export function CreateQuestionModal({ isOpen, onClose, parentQuestionId }: CreateQuestionModalProps) {
  const { createQuestion } = useQuestions();
  const { questionTypes, services, propertyTypes } = useLookups();

  const [formData, setFormData] = useState<QuestionFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showMcOptions = () => {
    if (!formData.questionTypeId) return false;
    const typeName = questionTypes.find(qt => qt.questionTypeId === formData.questionTypeId)?.questionTypeName?.toLowerCase() || '';
    return typeName.includes('multiple') || typeName.includes('checkbox');
  };

  const addMcOption = () => {
    setFormData(prev => ({ ...prev, multipleChoiceOptions: [...prev.multipleChoiceOptions, { optionText: '', sortOrder: prev.multipleChoiceOptions.length + 1 }] }));
  };

  const removeMcOption = (index: number) => {
    setFormData(prev => ({ ...prev, multipleChoiceOptions: prev.multipleChoiceOptions.filter((_, i) => i !== index) }));
  };

  const updateMcOption = (index: number, field: 'optionText' | 'sortOrder', value: string | number) => {
    setFormData(prev => {
      const updated = [...prev.multipleChoiceOptions];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, multipleChoiceOptions: updated };
    });
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setFormError(null);
    onClose();
  };

  const isFormValid =
    !!formData.questionText.trim() &&
    !!formData.questionCategory &&
    !!formData.questionTypeId &&
    !!formData.serviceId;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      const input: CreateQuestionInput = {
        questionText: formData.questionText.trim(),
        questionCategory: formData.questionCategory,
        questionTypeId: formData.questionTypeId!,
        isRequired: formData.isRequired,
        informationText: formData.informationText.trim() || null,
        serviceIds: [{ serviceId: formData.serviceId!, sortOrder: 1 }],
        propertyTypeIds: formData.propertyTypeIds,
        multipleChoiceOptions: showMcOptions() ? formData.multipleChoiceOptions.filter(o => o.optionText.trim()) : [],
        parentQuestionId: parentQuestionId ?? null,
      };
      await createQuestion(input);
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
      title={parentQuestionId ? 'Create Sub-question' : 'Create New Question'}
      size="large"
      footer={
        <>
          <button className="btn-secondary" onClick={handleClose}>Cancel</button>
          <button className="btn-primary" onClick={() => handleSubmit()} disabled={!isFormValid || isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {formError && <div className="form-error">{formError}</div>}

        <TextareaField label="Question Text" required value={formData.questionText} onChange={(e) => setFormData(prev => ({ ...prev, questionText: e.target.value }))} placeholder="Enter the question text" rows={3} />

        <FormRow>
          <SingleSelectDropdown label="Category" required value={formData.questionCategory} onChange={(val) => setFormData(prev => ({ ...prev, questionCategory: val }))} options={CATEGORIES.map(c => ({ value: c, label: c }))} placeholder="Select category" />
          <SingleSelectDropdown label="Question Type" required value={formData.questionTypeId?.toString() || ''} onChange={(val) => setFormData(prev => ({ ...prev, questionTypeId: val ? parseInt(val) : undefined }))} options={questionTypes.map(qt => ({ value: qt.questionTypeId, label: formatTypeName(qt.questionTypeName) }))} placeholder="Select type" />
        </FormRow>

        <div className="checkbox-field">
          <input type="checkbox" id="isRequired" checked={formData.isRequired} onChange={(e) => setFormData(prev => ({ ...prev, isRequired: e.target.checked }))} />
          <label htmlFor="isRequired">Required</label>
        </div>

        <TextareaField label="Information Text" value={formData.informationText} onChange={(e) => setFormData(prev => ({ ...prev, informationText: e.target.value }))} placeholder="Optional help text for this question" rows={2} />

        <MultiSelectDropdown label="Property Types" options={propertyTypes.map(pt => ({ value: pt.propertyTypeId, label: pt.propertyTypeName })).sort((a, b) => a.label.localeCompare(b.label))} selectedValues={formData.propertyTypeIds} onChange={(values) => setFormData(prev => ({ ...prev, propertyTypeIds: values }))} placeholder="All property types" helpText="Which property types should this question be shown to? Leave empty to show to all." />

        <SingleSelectDropdown label="Service" required value={formData.serviceId?.toString() || ''} onChange={(val) => setFormData(prev => ({ ...prev, serviceId: val ? parseInt(val) : undefined }))} options={services.map(s => ({ value: s.serviceId, label: s.serviceName })).sort((a, b) => a.label.localeCompare(b.label))} placeholder="Select service" />

        {showMcOptions() && (
          <div className="form-field">
            <label>Multiple Choice Options</label>
            <div className="mc-options-list">
              {formData.multipleChoiceOptions.map((opt, index) => (
                <div key={index} className="mc-option-row">
                  <input type="text" value={opt.optionText} onChange={(e) => updateMcOption(index, 'optionText', e.target.value)} placeholder="Option text" />
                  <input type="number" className="mc-sort-input" value={opt.sortOrder} onChange={(e) => updateMcOption(index, 'sortOrder', parseInt(e.target.value) || 0)} placeholder="#" />
                  <button type="button" className="btn-remove-option" onClick={() => removeMcOption(index)}>Remove</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-add-option" onClick={addMcOption}>+ Add Option</button>
          </div>
        )}
      </form>
    </Modal>
  );
}
