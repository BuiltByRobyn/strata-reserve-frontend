import { useState, useMemo, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { CreateQuestionModal } from '../components/CreateQuestionModal';
import { useLocation } from 'react-router-dom';
import { useQuestions } from '../../shared/hooks/useQuestions';
import { useApiClient } from '../../shared/hooks/useApiClient';
import { useLookups } from '../../shared/hooks/useLookups';
import { useMediaQuery } from '../../shared/hooks/useMediaQuery';
import { DataTable, type Column } from '../../shared/components/DataTable';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';
import { Modal } from '../../shared/components/Modal';
import { InputField, TextareaField } from '../../shared/components/FormField';
import { MultiSelectDropdown } from '../../shared/components/MultiSelectDropdown';
import { SingleSelectDropdown } from '../../shared/components/SingleSelectDropdown';
import type { AdminQuestion, CreateQuestionInput, QuestionFormData } from '../../shared/types/survey.types';

const QUESTIONS_PER_PAGE = 10;

const initialFormData: QuestionFormData = {
  questionText: '',
  questionCategoryId: undefined,
  questionTypeId: undefined,
  isRequired: false,
  allowNa: false,
  allowUnavailable: false,
  informationText: '',
  serviceId: undefined,
  propertyTypeIds: [],
  multipleChoiceOptions: [],
};


const FRIENDLY_TYPE_NAMES: Record<string, string> = {
  textarea: 'Long Text',
  text: 'Short Text',
  boolean: 'Yes / No',
  number: 'Number',
  checkbox: 'Checkboxes',
  multiple_choice: 'Multiple Choice',
};

const formatTypeName = (name: string) =>
  FRIENDLY_TYPE_NAMES[name.toLowerCase()] || name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function QuestionsPage() {
  const { questions, loading, error, deleteQuestion, refetch } = useQuestions();
  const api = useApiClient();
  const { questionTypes, services, propertyTypes, questionCategories } = useLookups();
  const isDesktop = useMediaQuery('(min-width: 1000px)');
  const location = useLocation();
  const autoOpenedRef = useRef(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>(initialFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [pendingSubQuestionIds, setPendingSubQuestionIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPropertyType, setFilterPropertyType] = useState<number | ''>('');
  const [viewingQuestion, setViewingQuestion] = useState<AdminQuestion | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [createSubQuestionParentId, setCreateSubQuestionParentId] = useState<number | null>(null);
  const [showSubQuestions, setShowSubQuestions] = useState(false);
  const [localSubIds, setLocalSubIds] = useState<number[]>([]);
  const [subQuestionReturnParentId, setSubQuestionReturnParentId] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<AdminQuestion | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isEditingSubQuestion = !!editingQuestion?.isSubQuestion;

  useEffect(() => {
    if (editingQuestion && questions.length > 0) {
      const updated = questions.find(q => q.questionId === editingQuestion.questionId);
      if (updated) setEditingQuestion(updated);
    }
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (showSubQuestions ? !q.isSubQuestion : q.isSubQuestion) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!q.questionText.toLowerCase().includes(search)) return false;
      }
      if (filterCategory && q.questionCategory !== filterCategory) return false;
      if (filterPropertyType && !q.questionPropertyTypes.some(qpt => qpt.propertyTypeId === filterPropertyType)) return false;
      return true;
    });
  }, [questions, searchTerm, filterCategory, filterPropertyType, showSubQuestions]);

  const totalPages = Math.ceil(filteredQuestions.length / QUESTIONS_PER_PAGE);
  const pageQuestions = filteredQuestions.slice(page * QUESTIONS_PER_PAGE, (page + 1) * QUESTIONS_PER_PAGE);

  const columns: Column<AdminQuestion>[] = showSubQuestions
    ? [
        {
          key: 'questionText', header: 'Question',
          render: (q) => q.questionText.length > 120 ? q.questionText.slice(0, 120) + '...' : q.questionText,
        },
      ]
    : [
        {
          key: 'questionText', header: 'Question', width: '33.33%',
          render: (q) => q.questionText.length > 80 ? q.questionText.slice(0, 80) + '...' : q.questionText,
        },
        {
          key: 'questionPropertyTypes', header: 'Property Type', width: '33.33%',
          render: (q) => q.questionPropertyTypes.length === 0
            ? 'All'
            : q.questionPropertyTypes.map(qpt => qpt.propertyType.propertyTypeName).join(', '),
        },
        { key: 'questionCategory', header: 'Category', render: (q) => q.questionCategory },
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
    const propertyTypeNames = q.questionPropertyTypes?.length
      ? q.questionPropertyTypes.map(qpt => qpt.propertyType?.propertyTypeName).filter(Boolean).join(', ') || '—'
      : '—';
    const mcOptions = q.multipleChoiceOptions?.length
      ? q.multipleChoiceOptions
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(o => o.optionText)
          .join(', ') || '—'
      : '—';
    const subQuestionsList = q.subQuestions?.length
      ? q.subQuestions.map(sq => sq.questionText).join(', ')
      : '—';

    return [
      { label: 'Question Text', value: q.questionText },
      { label: 'Category', value: q.questionCategory },
      { label: 'Question Type', value: q.questionType?.questionTypeName ? formatTypeName(q.questionType.questionTypeName) : '—' },
      { label: 'Multiple Choice Options', value: mcOptions },
      { label: 'Sub-questions', value: subQuestionsList },
      { label: 'Allow N/A', value: q.allowNa ? 'Yes' : 'No' },
      { label: 'Allow Unavailable', value: q.allowUnavailable ? 'Yes' : 'No' },
      { label: 'Information Text', value: q.informationText ?? '—' },
      { label: 'Property Types', value: propertyTypeNames },
      { label: 'Services', value: services },
    ];
  };

  const openCreateModal = () => {
    setEditingQuestion(null);
    setFormData(initialFormData);
    setFormError(null);
    setStep(1);
    setPendingSubQuestionIds([]);
    setIsModalOpen(true);
  };

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!formData.questionText.trim()) { setFormError('Question text is required'); return false; }
      if (!formData.questionTypeId) { setFormError('Question type is required'); return false; }
    }
    if (currentStep === 2 && !editingQuestion?.isSubQuestion) {
      if (!formData.questionCategoryId) { setFormError('Category is required'); return false; }
      if (!formData.serviceId) { setFormError('Service is required'); return false; }
    }
    setFormError(null);
    return true;
  };

  const handleNext = () => { if (validateStep(step)) setStep(s => s + 1); };
  const handleBack = () => { setFormError(null); setStep(s => s - 1); };

  useEffect(() => {
    if (!location.state?.openCreate || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    openCreateModal();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (!editingQuestion) return;
    const updated = questions.find(q => q.questionId === editingQuestion.questionId);
    if (updated) setEditingQuestion(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions]);

  const openEditModal = (q: AdminQuestion) => {
    setEditingQuestion(q);
    setStep(1);
    setPendingSubQuestionIds([]);
    setLocalSubIds((q.subQuestions ?? []).map(sq => sq.questionId));
    setFormData({
      questionText: q.questionText,
      questionCategoryId: q.questionCategoryId,
      questionTypeId: q.questionTypeId,
      isRequired: q.isRequired,
      allowNa: q.allowNa ?? false,
      allowUnavailable: q.allowUnavailable ?? false,
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

  const handleAddSubQuestionOnCreate = async () => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const input: CreateQuestionInput = {
        questionText: formData.questionText.trim(),
        questionCategoryId: formData.questionCategoryId!,
        questionTypeId: formData.questionTypeId!,
        isRequired: false,
        allowNa: formData.allowNa,
        allowUnavailable: formData.allowUnavailable,
        informationText: formData.informationText.trim() || null,
        serviceIds: formData.serviceId ? [{ serviceId: formData.serviceId, sortOrder: 1 }] : [],
        propertyTypeIds: formData.propertyTypeIds,
        multipleChoiceOptions: showMcOptions()
          ? formData.multipleChoiceOptions.filter(o => o.optionText.trim()).map((o, i) => ({ optionText: o.optionText, sortOrder: i + 1 }))
          : [],
      };
      const created = await api.post<AdminQuestion>('/admin/questions', input);
      if (created) {
        await refetch();
        setLocalSubIds(pendingSubQuestionIds);
        setPendingSubQuestionIds([]);
        setEditingQuestion(created);
        setCreateSubQuestionParentId(created.questionId);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const input: CreateQuestionInput = {
        questionText: formData.questionText.trim(),
        questionCategoryId: formData.questionCategoryId!,
        questionTypeId: formData.questionTypeId!,
        isRequired: false,
        allowNa: formData.allowNa,
        allowUnavailable: formData.allowUnavailable,
        informationText: formData.informationText.trim() || null,
        serviceIds: formData.serviceId ? [{ serviceId: formData.serviceId, sortOrder: 1 }] : [],
        propertyTypeIds: formData.propertyTypeIds,
        multipleChoiceOptions: showMcOptions()
          ? formData.multipleChoiceOptions.filter(o => o.optionText.trim()).map((o, i) => ({ optionText: o.optionText, sortOrder: i + 1 }))
          : [],
      };

      if (editingQuestion) {
        await api.put(`/admin/questions/${editingQuestion.questionId}`, input);
        if (!isEditingSubQuestion) {
          await api.put(`/admin/questions/${editingQuestion.questionId}/sub-questions`, { subQuestionIds: localSubIds });
        }
      } else {
        const created = await api.post<AdminQuestion>('/admin/questions', input);
        if (created && pendingSubQuestionIds.length > 0) {
          await api.put(`/admin/questions/${created.questionId}/sub-questions`, { subQuestionIds: pendingSubQuestionIds });
        }
      }
      await refetch();
      setIsModalOpen(false);
      setSubQuestionReturnParentId(null);
      toast.success(editingQuestion ? 'Question saved' : 'Question created');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirm = (q: AdminQuestion) => {
    setQuestionToDelete(q);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!questionToDelete) return;
    setIsDeleting(true);
    try {
      await deleteQuestion(questionToDelete.questionId);
      setDeleteConfirmOpen(false);
      setQuestionToDelete(null);
      toast.success('Question deleted');
      if (subQuestionReturnParentId) {
        const parent = questions.find(q => q.questionId === subQuestionReturnParentId);
        setSubQuestionReturnParentId(null);
        if (parent) { openEditModal(parent); setStep(3); } else setIsModalOpen(false);
      } else {
        setIsModalOpen(false);
        setIsViewModalOpen(false);
        setViewingQuestion(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete question');
    } finally {
      setIsDeleting(false);
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
            options={questionCategories.map(c => ({ value: c.label, label: c.label }))}
            placeholder="All Categories"
          />
          <SingleSelectDropdown
            label="Property Type"
            value={filterPropertyType?.toString() || ''}
            onChange={(val) => { setFilterPropertyType(val ? parseInt(val) : ''); setPage(0); }}
            options={propertyTypes.map(pt => ({ value: pt.propertyTypeId, label: pt.propertyTypeName })).sort((a, b) => a.label.localeCompare(b.label))}
            placeholder="All Property Types"
          />
          <div className="form-field archived-toggle">
            <label>
              <input
                type="checkbox"
                checked={showSubQuestions}
                onChange={() => { setShowSubQuestions(prev => !prev); setPage(0); }}
              />
              Show Sub-questions
            </label>
          </div>
        </div>
      </div>

      <div className="create-question-button">
        <button className="btn-primary" onClick={openCreateModal}>+ Create New Question</button>
      </div>

      {isDesktop ? (
        <DataTable
          key={searchTerm + '|' + filterCategory + '|' + filterPropertyType}
          columns={columns}
          data={pageQuestions}
          keyExtractor={(q) => q.questionId}
          loading={loading}
          emptyMessage="No questions found."
          onRowClick={(q) => { setViewingQuestion(q); setIsViewModalOpen(true); }}
          actions={(q) => (
            <button className="btn-edit" onClick={(e) => { e.stopPropagation(); openEditModal(q); }}>Edit</button>
          )}
        />
      ) : (
        <>
          {loading && <LoadingSpinner />}
          {!loading && pageQuestions.length === 0 && (
            <div className="data-table-empty"><p>No questions found.</p></div>
          )}
          {!loading && pageQuestions.length > 0 && (
            <div className="questions-mobile-list">
              {pageQuestions.map((q) => (
                <div
                  key={q.questionId}
                  className="questions-mobile-table-wrap clickable"
                  onClick={() => { setViewingQuestion(q); setIsViewModalOpen(true); }}
                >
                  <table className="data-table questions-table-mobile">
                    <tbody>
                      <tr>
                        <td className="mobile-label-col">Question</td>
                        <td className="mobile-value-col">
                          {q.questionText.length > 80 ? q.questionText.slice(0, 80) + '...' : q.questionText}
                        </td>
                      </tr>
                      <tr>
                        <td className="mobile-label-col">Property Type</td>
                        <td className="mobile-value-col">
                          {q.questionPropertyTypes.length === 0
                            ? 'All'
                            : q.questionPropertyTypes.map(qpt => qpt.propertyType.propertyTypeName).join(', ')}
                        </td>
                      </tr>
                      <tr>
                        <td className="mobile-label-col">Category</td>
                        <td className="mobile-value-col">{q.questionCategory}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      )}

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
        onClose={() => { setIsModalOpen(false); setStep(1); setSubQuestionReturnParentId(null); }}
        title={isEditingSubQuestion ? 'Edit Sub-question' : `${editingQuestion ? 'Edit' : 'Create'} Question — Step ${step} of 3`}
        size="large"
        footer={
          isEditingSubQuestion ? (
            <>
              {subQuestionReturnParentId ? (
                <button className="btn-secondary" onClick={() => {
                  const parent = questions.find(q => q.questionId === subQuestionReturnParentId);
                  setSubQuestionReturnParentId(null);
                  if (parent) { openEditModal(parent); setStep(3); } else setIsModalOpen(false);
                }}>Back</button>
              ) : (
                <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
              )}
              <button className="btn-delete" onClick={() => openDeleteConfirm(editingQuestion!)} disabled={isSubmitting}>Delete</button>
              <button className="btn-primary" onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>
            </>
          ) : (
            <>
              {step === 1
                ? <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                : <button className="btn-secondary" onClick={handleBack}>Back</button>
              }
              {editingQuestion && (
                <button className="btn-delete" onClick={() => openDeleteConfirm(editingQuestion)} disabled={isSubmitting}>Delete</button>
              )}
              {step < 3
                ? <button className="btn-primary" onClick={handleNext}>Next</button>
                : <button className="btn-primary" onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>
              }
            </>
          )
        }
      >
        <form onSubmit={handleSubmit}>
          {formError && <div className="form-error">{formError}</div>}

          {step === 1 && (
            <>
              <TextareaField
                label="Question Text"
                required
                value={formData.questionText}
                onChange={(e) => setFormData(prev => ({ ...prev, questionText: e.target.value }))}
                placeholder="Enter the question text"
                rows={3}
              />
              <SingleSelectDropdown
                label="Question Type"
                required
                value={formData.questionTypeId?.toString() || ''}
                onChange={(val) => setFormData(prev => ({ ...prev, questionTypeId: val ? parseInt(val) : undefined }))}
                options={questionTypes.filter(qt => qt.questionTypeName.toLowerCase() !== 'none_or_explain').map(qt => ({ value: qt.questionTypeId, label: formatTypeName(qt.questionTypeName) }))}
                placeholder="Select type"
              />
              {!isEditingSubQuestion && (
                <div className="checkbox-row">
                  <div className="checkbox-field">
                    <input type="checkbox" id="allowNa" checked={formData.allowNa} onChange={(e) => setFormData(prev => ({ ...prev, allowNa: e.target.checked }))} />
                    <label htmlFor="allowNa">Allow N/A</label>
                  </div>
                  <div className="checkbox-field">
                    <input type="checkbox" id="allowUnavailable" checked={formData.allowUnavailable} onChange={(e) => setFormData(prev => ({ ...prev, allowUnavailable: e.target.checked }))} />
                    <label htmlFor="allowUnavailable">Allow Unavailable</label>
                  </div>
                </div>
              )}
              <TextareaField
                label="Information Text (if applicable)"
                value={formData.informationText}
                onChange={(e) => setFormData(prev => ({ ...prev, informationText: e.target.value }))}
                placeholder="Optional help text for this question"
                rows={2}
              />
              {showMcOptions() && (
                <div className="form-field">
                  <label>Multiple Choice Options</label>
                  <div className="mc-options-list">
                    {formData.multipleChoiceOptions.map((opt, index) => (
                      <div key={index} className="mc-option-row">
                        <input type="text" value={opt.optionText} onChange={(e) => updateMcOption(index, 'optionText', e.target.value)} placeholder="Option text" />
                        <button type="button" className="btn-remove-option" onClick={() => removeMcOption(index)}>Remove</button>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="btn-add-option" onClick={addMcOption}>+ Add Option</button>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            editingQuestion?.isSubQuestion ? (
              <p className="question-info">Category, property type, and service are inherited from the parent question.</p>
            ) : (
              <>
                <SingleSelectDropdown
                  label="Category"
                  required
                  value={formData.questionCategoryId?.toString() || ''}
                  onChange={(val) => setFormData(prev => ({ ...prev, questionCategoryId: val ? Number(val) : undefined }))}
                  options={questionCategories.map(c => ({ value: c.questionCategoryId, label: c.label }))}
                  placeholder="Select category"
                />
                <div className="property-types-section">
                  <div className="property-types-header">
                    <span className="property-types-label">Property Types</span>
                    <div className="property-types-actions">
                      <button type="button" className="btn-text-primary" onClick={() => setFormData(prev => ({ ...prev, propertyTypeIds: propertyTypes.map(pt => pt.propertyTypeId) }))}>Select All</button>
                      <button type="button" className="btn-text-primary" onClick={() => setFormData(prev => ({ ...prev, propertyTypeIds: [] }))}>Deselect All</button>
                    </div>
                  </div>
                  <MultiSelectDropdown
                    label=""
                    options={propertyTypes.map(pt => ({ value: pt.propertyTypeId, label: pt.propertyTypeName })).sort((a, b) => a.label.localeCompare(b.label))}
                    selectedValues={formData.propertyTypeIds}
                    onChange={(values) => setFormData(prev => ({ ...prev, propertyTypeIds: values }))}
                    placeholder="All property types"
                  />
                </div>
                <SingleSelectDropdown
                  label="Service"
                  required
                  value={formData.serviceId?.toString() || ''}
                  onChange={(val) => setFormData(prev => ({ ...prev, serviceId: val ? parseInt(val) : undefined }))}
                  options={services.map(s => ({ value: s.serviceId, label: s.serviceName })).sort((a, b) => a.label.localeCompare(b.label))}
                  placeholder="Select service"
                />
              </>
            )
          )}

          {step === 3 && (
            <div className="form-field sub-questions-section">
              {editingQuestion ? (
                <>
                  <div className="sub-questions-header">
                    <label>Sub-questions</label>
                    <button type="button" className="btn-text-primary" onClick={() => setCreateSubQuestionParentId(editingQuestion.questionId)}>+ Add new sub-question</button>
                  </div>
                  <MultiSelectDropdown
                    label=""
                    options={questions
                      .filter(q => q.questionId !== editingQuestion.questionId && (!q.isSubQuestion || localSubIds.includes(q.questionId)))
                      .map(q => ({ value: q.questionId, label: q.questionText }))
                      .sort((a, b) => {
                        const aIdx = localSubIds.indexOf(a.value);
                        const bIdx = localSubIds.indexOf(b.value);
                        const aSelected = aIdx !== -1;
                        const bSelected = bIdx !== -1;
                        if (aSelected && !bSelected) return -1;
                        if (!aSelected && bSelected) return 1;
                        if (aSelected && bSelected) return aIdx - bIdx;
                        return 0;
                      })}
                    selectedValues={localSubIds}
                    onChange={setLocalSubIds}
                    placeholder="Select sub-questions..."
                    searchable
                  />
                  {localSubIds.length > 0 && (
                    <div className="sub-questions-list">
                      {localSubIds.map(id => {
                        const fullSq = questions.find(q => q.questionId === id);
                        return fullSq ? (
                          <div key={id} className="sub-question-row">
                            <span className="sub-question-text">{fullSq.questionText.length > 80 ? fullSq.questionText.slice(0, 80) + '...' : fullSq.questionText}</span>
                            <button type="button" className="btn-edit" onClick={() => { setSubQuestionReturnParentId(editingQuestion!.questionId); setIsModalOpen(false); openEditModal(fullSq); }}>Edit</button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="sub-questions-header">
                    <label>Sub-questions</label>
                    <button type="button" className="btn-text-primary" onClick={handleAddSubQuestionOnCreate} disabled={isSubmitting}>+ Add sub-question</button>
                  </div>
                  <MultiSelectDropdown
                    label=""
                    options={questions.filter(q => !q.isSubQuestion).map(q => ({ value: q.questionId, label: q.questionText }))}
                    selectedValues={pendingSubQuestionIds}
                    onChange={setPendingSubQuestionIds}
                    placeholder="Select sub-questions..."
                    searchable
                  />
                </>
              )}
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
                  onClick={() => openDeleteConfirm(viewingQuestion)}
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

      <CreateQuestionModal
        isOpen={createSubQuestionParentId !== null}
        onClose={() => setCreateSubQuestionParentId(null)}
        onCreated={(newId) => { setLocalSubIds(prev => [...prev, newId]); refetch(); }}
        parentQuestionId={createSubQuestionParentId}
        parentQuestion={questions.find(q => q.questionId === createSubQuestionParentId) ?? null}
      />

      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setQuestionToDelete(null); }}
        title="Delete Question"
        size="small"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setDeleteConfirmOpen(false); setQuestionToDelete(null); }}>Cancel</button>
            <button className="btn-delete" onClick={confirmDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete Question'}</button>
          </>
        }
      >
        <div className="delete-confirmation">
          <p>Are you sure you want to delete "{questionToDelete?.questionText}"?</p>
          <p className="delete-warning">This cannot be undone.</p>
        </div>
      </Modal>
    </div>
  );
}
