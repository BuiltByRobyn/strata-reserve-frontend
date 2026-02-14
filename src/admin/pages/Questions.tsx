import { useState, useMemo } from 'react';
import { useQuestions } from '../../shared/hooks/useQuestions';
import { useLookups } from '../../shared/hooks/useLookups';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { Modal } from '../../shared/components/Modal';
import { InputField, SelectField, TextareaField, FormRow } from '../../shared/components/FormField';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import type { AdminQuestion, CreateQuestionInput } from '../../shared/types/survey.types';

interface QuestionFormData {
  questionText: string;
  questionCategory: string;
  questionTypeId: number | undefined;
  isRequired: boolean;
  informationText: string;
  serviceIds: { serviceId: number; sortOrder: number }[];
  propertyTypeIds: number[];
  legalTypeIds: number[];
  sectionIds: number[];
  multipleChoiceOptions: { optionText: string; sortOrder: number }[];
}

const initialFormData: QuestionFormData = {
  questionText: '',
  questionCategory: '',
  questionTypeId: undefined,
  isRequired: false,
  informationText: '',
  serviceIds: [{ serviceId: 0, sortOrder: 1 }],
  propertyTypeIds: [],
  legalTypeIds: [],
  sectionIds: [],
  multipleChoiceOptions: [],
};

const CATEGORIES = [
  'Exterior', 'Interior', 'Services', 'Clubhouse',
  'Amenity Room', 'Legal', 'Council Concerns',
];

export default function QuestionsPage() {
  const { questions, loading, error, createQuestion, updateQuestion, deleteQuestion } = useQuestions();
  const { questionTypes, services, propertyTypes, legalTypes, sections } = useLookups();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!q.questionText.toLowerCase().includes(search)) return false;
      }
      if (filterCategory && q.questionCategory !== filterCategory) return false;
      return true;
    });
  }, [questions, searchTerm, filterCategory]);

  const columns: Column<AdminQuestion>[] = [
    { key: 'questionId', header: 'ID', render: (q) => q.questionId },
    {
      key: 'questionText', header: 'Question',
      render: (q) => q.questionText.length > 60 ? q.questionText.slice(0, 60) + '...' : q.questionText,
    },
    { key: 'questionCategory', header: 'Category' },
    { key: 'questionType', header: 'Type', render: (q) => q.questionType.questionTypeName },
    { key: 'isRequired', header: 'Required', render: (q) => q.isRequired ? 'Yes' : 'No' },
  ];

  const showMcOptions = () => {
    if (!formData.questionTypeId) return false;
    const typeName = questionTypes.find(qt => qt.questionTypeId === formData.questionTypeId)?.questionTypeName?.toLowerCase() || '';
    return typeName.includes('multiple') || typeName.includes('checkbox');
  };

  const openCreateModal = () => {
    setEditingQuestion(null);
    setFormData(initialFormData);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (q: AdminQuestion) => {
    setEditingQuestion(q);
    setFormData({
      questionText: q.questionText,
      questionCategory: q.questionCategory,
      questionTypeId: q.questionTypeId,
      isRequired: q.isRequired,
      informationText: q.informationText || '',
      serviceIds: q.questionServices.length
        ? q.questionServices.map(qs => ({ serviceId: qs.serviceId, sortOrder: qs.sortOrder }))
        : [{ serviceId: 0, sortOrder: 1 }],
      propertyTypeIds: q.questionPropertyTypes.map(qpt => qpt.propertyTypeId),
      legalTypeIds: q.questionLegalTypes.map(qlt => qlt.legalTypeId),
      sectionIds: q.questionSections.map(qs => qs.sectionId),
      multipleChoiceOptions: q.multipleChoiceOptions.map(o => ({
        optionText: o.optionText,
        sortOrder: o.sortOrder,
      })),
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.questionText.trim()) { setFormError('Question text is required'); return; }
    if (!formData.questionCategory) { setFormError('Category is required'); return; }
    if (!formData.questionTypeId) { setFormError('Question type is required'); return; }

    const validServices = formData.serviceIds.filter(s => s.serviceId > 0);
    if (validServices.length === 0) { setFormError('At least one service is required'); return; }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const input: CreateQuestionInput = {
        questionText: formData.questionText.trim(),
        questionCategory: formData.questionCategory,
        questionTypeId: formData.questionTypeId,
        isRequired: formData.isRequired,
        informationText: formData.informationText.trim() || null,
        serviceIds: validServices,
        propertyTypeIds: formData.propertyTypeIds,
        legalTypeIds: formData.legalTypeIds,
        sectionIds: formData.sectionIds,
        multipleChoiceOptions: showMcOptions() ? formData.multipleChoiceOptions.filter(o => o.optionText.trim()) : [],
      };

      if (editingQuestion) {
        await updateQuestion(editingQuestion.questionId, input);
      } else {
        await createQuestion(input);
      }
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (q: AdminQuestion) => {
    if (!window.confirm(`Delete question #${q.questionId}? This cannot be undone.`)) return;
    try {
      await deleteQuestion(q.questionId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete question');
    }
  };

  const addServiceEntry = () => {
    setFormData(prev => ({
      ...prev,
      serviceIds: [...prev.serviceIds, { serviceId: 0, sortOrder: prev.serviceIds.length + 1 }],
    }));
  };

  const removeServiceEntry = (index: number) => {
    if (formData.serviceIds.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.filter((_, i) => i !== index),
    }));
  };

  const updateServiceEntry = (index: number, field: 'serviceId' | 'sortOrder', value: number) => {
    setFormData(prev => {
      const updated = [...prev.serviceIds];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, serviceIds: updated };
    });
  };

  const addMcOption = () => {
    setFormData(prev => ({
      ...prev,
      multipleChoiceOptions: [...prev.multipleChoiceOptions, { optionText: '', sortOrder: prev.multipleChoiceOptions.length + 1 }],
    }));
  };

  const removeMcOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      multipleChoiceOptions: prev.multipleChoiceOptions.filter((_, i) => i !== index),
    }));
  };

  const updateMcOption = (index: number, field: 'optionText' | 'sortOrder', value: string | number) => {
    setFormData(prev => {
      const updated = [...prev.multipleChoiceOptions];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, multipleChoiceOptions: updated };
    });
  };

  return (
    <div className="questions-page">
      <div className="page-header">
        <h1>Questions</h1>
        <div className="create-question-button-desktop">
          <button className="btn-primary" onClick={openCreateModal}>+ Create New Question</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="filters-row">
        <div className="search-field">
          <InputField
            label="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search questions..."
          />
        </div>
        <SelectField
          label="Category"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          options={CATEGORIES.map(c => ({ value: c, label: c }))}
          placeholder="All Categories"
        />
      </div>

      <div className="create-question-button">
        <button className="btn-primary" onClick={openCreateModal}>+ Create New Question</button>
      </div>

      <DataTable
        columns={columns}
        data={filteredQuestions}
        keyExtractor={(q) => q.questionId}
        loading={loading}
        emptyMessage="No questions found."
        onRowClick={openEditModal}
        actions={(q) => (
          <>
            <button className="btn-edit" onClick={(e) => { e.stopPropagation(); openEditModal(q); }}>Edit</button>
            <button className="btn-delete" onClick={(e) => { e.stopPropagation(); handleDelete(q); }}>Delete</button>
          </>
        )}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingQuestion ? 'Edit Question' : 'Create New Question'}
        size="large"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            {editingQuestion && (
              <button className="btn-delete" onClick={() => { handleDelete(editingQuestion); setIsModalOpen(false); }} disabled={isSubmitting}>Delete</button>
            )}
            <button className="btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          {formError && <div className="form-error">{formError}</div>}

          <TextareaField
            label="Question Text"
            required
            value={formData.questionText}
            onChange={(e) => setFormData(prev => ({ ...prev, questionText: e.target.value }))}
            placeholder="Enter the question text"
            rows={3}
          />

          <FormRow>
            <SelectField
              label="Category"
              required
              value={formData.questionCategory}
              onChange={(e) => setFormData(prev => ({ ...prev, questionCategory: e.target.value }))}
              options={CATEGORIES.map(c => ({ value: c, label: c }))}
              placeholder="Select category"
            />
            <SelectField
              label="Question Type"
              required
              value={formData.questionTypeId?.toString() || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, questionTypeId: e.target.value ? parseInt(e.target.value) : undefined }))}
              options={questionTypes.map(qt => ({ value: qt.questionTypeId, label: qt.questionTypeName }))}
              placeholder="Select type"
            />
          </FormRow>

          <div className="checkbox-field">
            <input
              type="checkbox"
              id="isRequired"
              checked={formData.isRequired}
              onChange={(e) => setFormData(prev => ({ ...prev, isRequired: e.target.checked }))}
            />
            <label htmlFor="isRequired">Required</label>
          </div>

          <TextareaField
            label="Information Text"
            value={formData.informationText}
            onChange={(e) => setFormData(prev => ({ ...prev, informationText: e.target.value }))}
            placeholder="Optional help text for this question"
            rows={2}
          />

          <MultiSelectDropdown
            label="Legal Types"
            required
            options={legalTypes.map(lt => ({ value: lt.legalTypeId, label: lt.legalTypeName }))}
            selectedValues={formData.legalTypeIds}
            onChange={(values) => setFormData(prev => ({ ...prev, legalTypeIds: values }))}
            placeholder="Select legal types"
          />

          <MultiSelectDropdown
            label="Property Types"
            required
            options={propertyTypes.map(pt => ({ value: pt.propertyTypeId, label: pt.propertyTypeName }))}
            selectedValues={formData.propertyTypeIds}
            onChange={(values) => setFormData(prev => ({ ...prev, propertyTypeIds: values }))}
            placeholder="Select property types"
          />

          <MultiSelectDropdown
            label="Sections"
            required
            options={sections.map(s => ({ value: s.sectionId, label: s.sectionName }))}
            selectedValues={formData.sectionIds}
            onChange={(values) => setFormData(prev => ({ ...prev, sectionIds: values }))}
            placeholder="Select sections"
          />

          <div className="form-field">
            <label>Services <span className="required">*</span></label>
            {formData.serviceIds.map((entry, index) => (
              <div key={index} className="service-entry-row">
                <SelectField
                  label=""
                  value={entry.serviceId?.toString() || ''}
                  onChange={(e) => updateServiceEntry(index, 'serviceId', parseInt(e.target.value) || 0)}
                  options={services.map(s => ({ value: s.serviceId, label: s.serviceName }))}
                  placeholder="Select service"
                />
                <div className="sort-field">
                  <InputField
                    label=""
                    type="number"
                    value={entry.sortOrder.toString()}
                    onChange={(e) => updateServiceEntry(index, 'sortOrder', parseInt(e.target.value) || 0)}
                    placeholder="#"
                  />
                </div>
                {formData.serviceIds.length > 1 && (
                  <button type="button" className="btn-remove-service" onClick={() => removeServiceEntry(index)}>Remove</button>
                )}
              </div>
            ))}
            <button type="button" className="btn-add-service" onClick={addServiceEntry}>+ Add Service</button>
          </div>

          {showMcOptions() && (
            <div className="form-field">
              <label>Multiple Choice Options</label>
              <div className="mc-options-list">
                {formData.multipleChoiceOptions.map((opt, index) => (
                  <div key={index} className="mc-option-row">
                    <input
                      type="text"
                      value={opt.optionText}
                      onChange={(e) => updateMcOption(index, 'optionText', e.target.value)}
                      placeholder="Option text"
                    />
                    <input
                      type="number"
                      className="mc-sort-input"
                      value={opt.sortOrder}
                      onChange={(e) => updateMcOption(index, 'sortOrder', parseInt(e.target.value) || 0)}
                      placeholder="#"
                    />
                    <button type="button" className="btn-remove-option" onClick={() => removeMcOption(index)}>Remove</button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn-add-option" onClick={addMcOption}>+ Add Option</button>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
