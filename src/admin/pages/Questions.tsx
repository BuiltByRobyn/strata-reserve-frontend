import { useState, useMemo } from 'react';
import { useQuestions } from '../../shared/hooks/useQuestions';
import { useLookups } from '../../shared/hooks/useLookups';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Modal } from '../../shared/components/Modal';
import { InputField, TextareaField, FormRow } from '../../shared/components/FormField';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import type { AdminQuestion, CreateQuestionInput, QuestionFormData } from '../../shared/types/survey.types';

const QUESTIONS_PER_PAGE = 10;

const initialFormData: QuestionFormData = {
  questionText: '',
  questionCategory: '',
  questionTypeId: undefined,
  isRequired: false,
  informationText: '',
  serviceId: undefined,
  propertyTypeIds: [],
  multipleChoiceOptions: [],
};

const CATEGORIES = [
  'Exterior', 'Interior', 'Services', 'Clubhouse',
  'Amenity Room', 'Legal', 'Council Concerns', 'Septic Fields',
];

const FRIENDLY_TYPE_NAMES: Record<string, string> = {
  textarea: 'Long Text',
  text: 'Short Text',
  boolean: 'Yes / No',
  number: 'Number',
  checkbox: 'Checkboxes',
  multiple_choice: 'Multiple Choice',
  none_or_explain: 'N/A or Provide Details',
};

const formatTypeName = (name: string) =>
  FRIENDLY_TYPE_NAMES[name.toLowerCase()] || name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function QuestionsPage() {
  const { questions, loading, error, createQuestion, updateQuestion, deleteQuestion } = useQuestions();
  const { questionTypes, services, propertyTypes } = useLookups();
  const isDesktop = useMediaQuery('(min-width: 750px)');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [viewingQuestion, setViewingQuestion] = useState<AdminQuestion | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [page, setPage] = useState(0);

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

  const totalPages = Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE);
  const pageQuestions = filteredQuestions.slice(page * QUESTIONS_PER_PAGE, (page + 1) * QUESTIONS_PER_PAGE);

  const columns: Column<AdminQuestion>[] = [
    { key: 'questionId', header: '#', width: '25px', render: (_q, index) => page * QUESTIONS_PER_PAGE + index + 1 },
    {
      key: 'questionText', header: 'Question',
      render: (q) => q.questionText.length > 60 ? q.questionText.slice(0, 60) + '...' : q.questionText,
    },
  ];

  const showMcOptions = () => {
    if (!formData.questionTypeId) return false;
    const typeName = questionTypes.find(qt => qt.questionTypeId === formData.questionTypeId)?.questionTypeName?.toLowerCase() || '';
    return typeName.includes('multiple') || typeName.includes('checkbox');
  };

  const getViewQuestionRows = (q: AdminQuestion): { label: string; value: string }[] => {
    const services = q.questionServices?.length
      ? q.questionServices
          .map(qs => qs.service?.serviceName)
          .filter(Boolean)
          .join(', ') || '—'
      : '—';
    const propertyTypes = q.questionPropertyTypes?.length
      ? q.questionPropertyTypes.map(qpt => qpt.propertyType?.propertyTypeName).filter(Boolean).join(', ') || '—'
      : '—';
    const mcOptions = q.multipleChoiceOptions?.length
      ? q.multipleChoiceOptions
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(o => o.optionText)
          .join(', ') || '—'
      : '—';

    return [
      { label: 'Question Text', value: q.questionText },
      { label: 'Category', value: q.questionCategory },
      { label: 'Question Type', value: q.questionType?.questionTypeName ? formatTypeName(q.questionType.questionTypeName) : '—' },
      { label: 'Required', value: q.isRequired ? 'Yes' : 'No' },
      { label: 'Information Text', value: q.informationText ?? '—' },
      { label: 'Property Types', value: propertyTypes },
      { label: 'Services', value: services },
      { label: 'Multiple Choice Options', value: mcOptions },
    ];
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
      serviceId: q.questionServices.length ? q.questionServices[0].serviceId : undefined,
      propertyTypeIds: q.questionPropertyTypes.map(qpt => qpt.propertyTypeId),
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

    if (!formData.serviceId) { setFormError('Service is required'); return; }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const input: CreateQuestionInput = {
        questionText: formData.questionText.trim(),
        questionCategory: formData.questionCategory,
        questionTypeId: formData.questionTypeId,
        isRequired: formData.isRequired,
        informationText: formData.informationText.trim() || null,
        serviceIds: [{ serviceId: formData.serviceId, sortOrder: 1 }],
        propertyTypeIds: formData.propertyTypeIds,
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

  const handleDelete = async (q: AdminQuestion): Promise<boolean> => {
    if (!window.confirm('Are you sure you want to delete this question? This cannot be undone.')) return false;
    try {
      await deleteQuestion(q.questionId);
      return true;
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete question');
      return false;
    }
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="questions-page">
      <div className="page-header">
        <h1>Questions</h1>
        <div className="create-question-button-desktop">
          <button className="btn-primary" onClick={openCreateModal}>+ Create New Question</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="page-content">
        <div className="filters-row">
          <div className="search-field">
            <InputField
              label="Search"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              placeholder="Search questions..."
            />
          </div>
          <SingleSelectDropdown
            label="Category"
            value={filterCategory}
            onChange={(val) => { setFilterCategory(val); setPage(0); }}
            options={CATEGORIES.map(c => ({ value: c, label: c }))}
            placeholder="All Categories"
          />
        </div>
      </div>

      <div className="create-question-button">
        <button className="btn-primary" onClick={openCreateModal}>+ Create New Question</button>
      </div>

      <DataTable
        columns={columns}
        data={pageQuestions}
        keyExtractor={(q) => q.questionId}
        loading={loading}
        emptyMessage="No questions found."
        onRowClick={(q) => {
          setViewingQuestion(q);
          setIsViewModalOpen(true);
        }}
        actions={isDesktop ? (q) => (
          <button className="btn-edit" onClick={(e) => { e.stopPropagation(); openEditModal(q); }}>Edit</button>
        ) : undefined}
      />

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            className="btn-secondary"
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {page + 1} of {totalPages}
          </span>
          <button
            className="btn-secondary"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages - 1}
          >
            Next
          </button>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingQuestion ? 'Edit Question' : 'Create New Question'}
        size="large"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
            {editingQuestion && (
              <button className="btn-delete" onClick={async () => { const deleted = await handleDelete(editingQuestion!); if (deleted) setIsModalOpen(false); }} disabled={isSubmitting}>Delete</button>
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
            <SingleSelectDropdown
              label="Category"
              required
              value={formData.questionCategory}
              onChange={(val) => setFormData(prev => ({ ...prev, questionCategory: val }))}
              options={CATEGORIES.map(c => ({ value: c, label: c }))}
              placeholder="Select category"
            />
            <SingleSelectDropdown
              label="Question Type"
              required
              value={formData.questionTypeId?.toString() || ''}
              onChange={(val) => setFormData(prev => ({ ...prev, questionTypeId: val ? parseInt(val) : undefined }))}
              options={questionTypes.map(qt => ({ value: qt.questionTypeId, label: formatTypeName(qt.questionTypeName) }))}
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
            label="Property Types"
            options={propertyTypes.map(pt => ({ value: pt.propertyTypeId, label: pt.propertyTypeName })).sort((a, b) => a.label.localeCompare(b.label))}
            selectedValues={formData.propertyTypeIds}
            onChange={(values) => setFormData(prev => ({ ...prev, propertyTypeIds: values }))}
            placeholder="All property types"
            helpText="Which property types should this question be shown to? Leave empty to show to all."
          />

          <SingleSelectDropdown
            label="Service"
            required
            value={formData.serviceId?.toString() || ''}
            onChange={(val) => setFormData(prev => ({ ...prev, serviceId: val ? parseInt(val) : undefined }))}
            options={services.map(s => ({ value: s.serviceId, label: s.serviceName })).sort((a, b) => a.label.localeCompare(b.label))}
            placeholder="Select service"
          />

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

      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setViewingQuestion(null);
        }}
        title="View Question"
        size="medium"
        footer={
          <>
            <button
              className={isDesktop ? "btn-primary" : "btn-secondary"}
              onClick={() => {
                setIsViewModalOpen(false);
                setViewingQuestion(null);
              }}
            >
              Close
            </button>
            {!isDesktop && viewingQuestion && (
              <>
                <button
                  className="btn-delete"
                  onClick={async () => {
                    const deleted = await handleDelete(viewingQuestion);
                    if (deleted) {
                      setIsViewModalOpen(false);
                      setViewingQuestion(null);
                    }
                  }}
                >
                  Delete
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    openEditModal(viewingQuestion);
                    setViewingQuestion(null);
                  }}
                >
                  Edit
                </button>
              </>
            )}
          </>
        }
      >
        {viewingQuestion && (
          <table className="view-question-table">
            <tbody>
              {getViewQuestionRows(viewingQuestion).map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  );
}
