import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useStrata } from "../../shared/hooks/useStrata";
import { useAuthFetch } from "../../shared/hooks/useAuthFetch";
import { useServiceRequests } from "../../shared/hooks/useServiceRequests";
import { useLookups } from "../../shared/hooks/useLookups";
import { useAuth } from "../../shared/contexts/AuthContext";
import { useSurvey } from "../../shared/hooks/useSurvey";
import { useQuestions } from "../../shared/hooks/useQuestions";
import { useUsers } from "../../shared/hooks/useUsers";
import { useApiClient } from "../../shared/hooks/useApiClient";
import { MultiSelectDropdown } from "../../shared/components/MultiSelectDropdown";
import { OfferAppointmentModal } from "../components/OfferAppointmentModal";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner";
import { Modal } from "../../shared/components/Modal";
import { DocumentPreviewModal } from "../../shared/components/DocumentPreviewModal";
import { Tabs } from "../../shared/components/Tabs";
import { SurveyCategoryNav } from "../../shared/components/SurveyCategoryNav";
import { SurveyProgressBar } from "../../shared/components/SurveyProgressBar";
import {
  InputField,
  TextareaField,
  FormRow,
} from "../../shared/components/FormField";
import { SingleSelectDropdown } from "../../shared/components/SingleSelectDropdown";
import {
  SURVEY_SECTIONS,
} from "../../shared/types/survey.types";
import type { SurveyQuestion, ArchivedSurveyResponse } from "../../shared/types/survey.types";
import type {
  StrataWithDetails,
  ServiceRequest,
  CreateSRFormData,
  AppointmentType,
} from "../../shared/types/entities.types";
import type { SRDocRequirement, SRUploadedDocument } from "../../shared/types/document.types";
import { API_BASE } from "../../shared/lib/api";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../shared/lib/constants";
import { formatTypeName, formatDate, getStatusBadgeClass } from "../../shared/lib/formatters";
import { parseLocalDate, formatDateShort } from "../../shared/lib/dateUtils";
import { getFilenameFromDisposition, triggerBlobDownload } from "../../shared/utils/fileUtils";

const MAIN_TABS = [
  { key: "active", label: "Active" },
  { key: "archived", label: "Archived" },
  { key: "documents", label: "Documents" },
  { key: "notes", label: "Notes" },
];

const INITIAL_SR_FORM: CreateSRFormData = {
  serviceId: "",
};

export default function StrataDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getStrataById, updateStrata, addNote, deleteNote } = useStrata();
  const {
    getActiveByStrata,
    createServiceRequest,
    deleteServiceRequest,
    offerAppointment,
  } = useServiceRequests();
  const { user, session } = useAuth();
  const authFetch = useAuthFetch();

  const activeSurvey = useSurvey("admin");
  const { questions: allQuestions } = useQuestions();
  const { services, documentTypes, reviewStatuses, locations } = useLookups();
  const { users: allUsers } = useUsers();
  const api = useApiClient();

  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [filterPropertyTypeIds, setFilterPropertyTypeIds] = useState<number[]>([]);

  const [strata, setStrata] = useState<StrataWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(null);
  const [activeTab, setActiveTab] = useState("active");

  const [activeSurveySection, setActiveSurveySection] = useState("exterior");
  const [archivedSurveySection, setArchivedSurveySection] = useState("exterior");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [srFormData, setSrFormData] = useState<CreateSRFormData>(INITIAL_SR_FORM);
  const [srFormError, setSrFormError] = useState<string | null>(null);
  const [srSubmitting, setSrSubmitting] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [noteInput, setNoteInput] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [deleteNoteModal, setDeleteNoteModal] = useState<{ type: 'strata' | 'doc'; id: number; message: string } | null>(null);
  const [deleteNoteSubmitting, setDeleteNoteSubmitting] = useState(false);
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false);
  const [viewNoteModal, setViewNoteModal] = useState<{ date: Date; userName: string; source: string; message: string; deleteType: 'strata' | 'doc'; deleteId: number } | null>(null);

  const [docRequirements, setDocRequirements] = useState<SRDocRequirement[]>([]);
  const [docReqModalOpen, setDocReqModalOpen] = useState(false);
  const [docReqSaving, setDocReqSaving] = useState(false);
  const [docReqFormData, setDocReqFormData] = useState<Record<number, number[]>>({});

  const [surveyRequirements, setSurveyRequirements] = useState<{ propertyTypeId: number }[]>([]);
  const [surveyReqModalOpen, setSurveyReqModalOpen] = useState(false);
  const [surveyReqSaving, setSurveyReqSaving] = useState(false);
  const [surveyReqFormData, setSurveyReqFormData] = useState<Record<number, number[]>>({});

  const [downloadingDocs, setDownloadingDocs] = useState(false);
  const [downloadingSurveyPdf, setDownloadingSurveyPdf] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<SRUploadedDocument[]>([]);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<number | null>(null);
  const [previewDocName, setPreviewDocName] = useState('');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusDoc, setStatusDoc] = useState<SRUploadedDocument | null>(null);
  const [statusForm, setStatusForm] = useState({ reviewStatusId: '', notes: '' });
  const [offerModalOpen, setOfferModalOpen] = useState(false);

  const strataId = id ? parseInt(id) : null;

  const loadData = useCallback(async () => {
    if (!strataId) return;
    setLoading(true);
    try {
      const [strataData, activeReq] = await Promise.all([
        getStrataById(strataId),
        getActiveByStrata(strataId),
      ]);
      setStrata(strataData);
      setActiveRequest(activeReq);
    } catch {
      setStrata(null);
    } finally {
      setLoading(false);
    }
  }, [strataId, getStrataById, getActiveByStrata]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    api.get<AppointmentType[]>('/admin/appointments/types')
      .then(data => setAppointmentTypes(data || []))
      .catch(() => {});
  }, [api]);

  const fetchDocRequirements = useCallback(async (serviceRequestId: number) => {
    try {
      const res = await authFetch(`${API_BASE}/admin/service-requests/${serviceRequestId}/document-requirements`);
      const data = await res.json();
      if (data.success && data.data) {
        setDocRequirements(data.data);
      }
    } catch {
      // silently fail
    }
  }, [authFetch]);

  const fetchSurveyRequirements = useCallback(async (serviceRequestId: number) => {
    try {
      const res = await authFetch(`${API_BASE}/admin/service-requests/${serviceRequestId}/survey-requirements`);
      const data = await res.json();
      if (data.success && data.data) {
        setSurveyRequirements(data.data);
      }
    } catch {
      // silently fail
    }
  }, [authFetch]);

  const fetchUploadedDocs = useCallback(async (serviceRequestId: number) => {
    try {
      const res = await authFetch(`${API_BASE}/admin/service-requests/${serviceRequestId}/documents`);
      const data = await res.json();
      if (data.success && data.data) {
        setUploadedDocs(data.data);
      }
    } catch {
      // silently fail
    }
  }, [authFetch]);

  useEffect(() => {
    if (activeRequest) {
      setDataReady(false);
      Promise.all([
        activeSurvey.fetchQuestions(activeRequest.serviceRequestId),
        activeSurvey.fetchResponses(activeRequest.serviceRequestId),
        activeSurvey.fetchArchivedResponses(activeRequest.serviceRequestId),
        fetchDocRequirements(activeRequest.serviceRequestId),
        fetchSurveyRequirements(activeRequest.serviceRequestId),
        fetchUploadedDocs(activeRequest.serviceRequestId),
      ]).finally(() => setDataReady(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRequest?.serviceRequestId]);

  // Re-fetch documents data when switching to Documents tab (picks up uploads from Documents page)
  useEffect(() => {
    if (activeTab === 'documents' && activeRequest) {
      fetchDocRequirements(activeRequest.serviceRequestId);
      fetchUploadedDocs(activeRequest.serviceRequestId);
    }
  }, [activeTab, activeRequest?.serviceRequestId, fetchDocRequirements, fetchUploadedDocs]);

  const handleOpenCreateModal = () => {
    setSrFormData({ ...INITIAL_SR_FORM });
    setSrFormError(null);
    setCreateModalOpen(true);
  };

  const handleCreateServiceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strata || !srFormData.serviceId || !user) return;

    setSrSubmitting(true);
    setSrFormError(null);

    try {
      const result = await createServiceRequest({
        serviceId: parseInt(srFormData.serviceId),
        strataId: strata.strataId,
        requestedByProfileId: user.id,
        notes: `Requested by: ${user && 'fullName' in user ? user.fullName : 'Unknown'}`,
      });
      setActiveRequest(result);
      setCreateModalOpen(false);
    } catch (err) {
      setSrFormError(err instanceof Error ? err.message : "Failed to create service request");
    } finally {
      setSrSubmitting(false);
    }
  };

  const handleDeleteServiceRequest = async () => {
    if (!activeRequest) return;

    setDeleteSubmitting(true);
    try {
      await deleteServiceRequest(activeRequest.serviceRequestId);
      activeSurvey.clearState();
      setActiveRequest(null);
      setDeleteModalOpen(false);
    } catch {
      // Error is handled by the hook
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleAddNote = async () => {
    if (!strataId || !noteInput.trim()) return;
    setNoteSubmitting(true);
    setNoteError(null);
    try {
      await addNote(strataId, {
        noteMessage: noteInput.trim(),
        createdByProfileId: user?.id,
      });
      setNoteInput('');
      setAddNoteModalOpen(false);
      const updated = await getStrataById(strataId);
      if (updated) setStrata(updated);
    } catch {
      setNoteError('Failed to add note');
    } finally {
      setNoteSubmitting(false);
    }
  };

  const handleConfirmDeleteNote = async () => {
    if (!strataId || !deleteNoteModal) return;
    setDeleteNoteSubmitting(true);
    try {
      if (deleteNoteModal.type === 'strata') {
        await deleteNote(strataId, deleteNoteModal.id);
      } else {
        await authFetch(`${API_BASE}/admin/documents/${deleteNoteModal.id}/notes`, { method: 'DELETE' });
      }
      const updated = await getStrataById(strataId);
      if (updated) setStrata(updated);
      setDeleteNoteModal(null);
    } catch {
      // silently fail
    } finally {
      setDeleteNoteSubmitting(false);
    }
  };

  const openDocReqModal = () => {
    const formData: Record<number, number[]> = {};
    for (const spt of strata?.strataPropertyTypes ?? []) {
      const ptId = spt.propertyType.propertyTypeId;
      const existing = docRequirements
        .filter(r => r.propertyTypeId === ptId)
        .map(r => r.documentTypeId);
      formData[ptId] = existing;
    }
    setDocReqFormData(formData);
    setDocReqModalOpen(true);
  };

  const openSurveyReqModal = () => {
    const formData: Record<number, number[]> = {};
    const existingQuestions = activeSurvey.questions;

    for (const spt of strata?.strataPropertyTypes ?? []) {
      const ptId = spt.propertyType.propertyTypeId;
      if (existingQuestions.length > 0) {
        const ptQuestionIds = existingQuestions
          .filter(q => q.propertyTypeId === ptId && q.parentQuestionId == null)
          .map(q => q.questionId);
        formData[ptId] = [...new Set(ptQuestionIds)];
      } else {
        formData[ptId] = allQuestions
          .filter(q => q.parentQuestionId == null && q.questionPropertyTypes.some(qpt => qpt.propertyTypeId === ptId))
          .map(q => q.questionId);
      }
    }

    setSurveyReqFormData(formData);
    setSurveyReqModalOpen(true);
  };

  const handleDocPreview = (doc: SRUploadedDocument) => {
    setPreviewDocId(doc.serviceRequestDocumentId);
    setPreviewDocName(doc.fileName);
    setPreviewModalOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewModalOpen(false);
    setPreviewDocId(null);
    setPreviewDocName('');
  };

  const openStatusModal = (doc: SRUploadedDocument) => {
    setStatusDoc(doc);
    setStatusForm({
      reviewStatusId: doc.reviewStatus?.reviewStatusId?.toString() || '',
      notes: doc.notes || '',
    });
    setStatusModalOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!statusDoc || !statusForm.reviewStatusId) return;
    try {
      await authFetch(`${API_BASE}/admin/documents/${statusDoc.serviceRequestDocumentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewStatusId: parseInt(statusForm.reviewStatusId), notes: statusForm.notes || undefined }),
      });
      setStatusModalOpen(false);
      setStatusDoc(null);
      if (activeRequest) fetchUploadedDocs(activeRequest.serviceRequestId);
    } catch {
      // silently fail
    }
  };

  const handleDeleteDoc = async (docId: number) => {
    try {
      await authFetch(`${API_BASE}/admin/documents/${docId}`, { method: 'DELETE' });
      if (activeRequest) fetchUploadedDocs(activeRequest.serviceRequestId);
    } catch {
      // silently fail
    }
  };

  const handleDownloadDocuments = async () => {
    if (!activeRequest || !session?.access_token) return;
    setDownloadingDocs(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/download-sr-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ serviceRequestId: activeRequest.serviceRequestId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const message = err?.error || 'Download failed';
        alert(message);
        return;
      }
      const blob = await res.blob();
      triggerBlobDownload(blob, `Documents - ${strata?.strataPlan || 'SR'}.zip`);
    } catch (err) {
      alert('Download failed. Please try again.');
    } finally {
      setDownloadingDocs(false);
    }
  };

  const handleDownloadSurveyPdf = async () => {
    if (!activeRequest) return;
    setDownloadingSurveyPdf(true);
    try {
      const res = await api.rawFetch(`/admin/service-requests/${activeRequest.serviceRequestId}/survey/pdf`);
      if (!res.ok) {
        let message = `Download failed (${res.status})`;
        try {
          const data = await res.json();
          if (data?.error) message = data.error;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const blob = await res.blob();
      const filename =
        getFilenameFromDisposition(res.headers.get('Content-Disposition')) ||
        `Survey-Answers-${strata?.strataPlan || 'Survey'}.pdf`;
      triggerBlobDownload(blob, filename);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloadingSurveyPdf(false);
    }
  };

  const handleSaveDocRequirements = async () => {
    if (!activeRequest) return;
    setDocReqSaving(true);
    try {
      const requirements: Array<{ documentTypeId: number; propertyTypeId: number }> = [];
      for (const [propertyTypeId, docTypeIds] of Object.entries(docReqFormData)) {
        for (const documentTypeId of docTypeIds) {
          requirements.push({ documentTypeId, propertyTypeId: parseInt(propertyTypeId) });
        }
      }
      const res = await authFetch(
        `${API_BASE}/admin/service-requests/${activeRequest.serviceRequestId}/document-requirements`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requirements }),
        }
      );
      const data = await res.json();
      if (data.success && data.data) {
        setDocRequirements(data.data);
      }
      setDocReqModalOpen(false);
    } catch {
      // silently fail
    } finally {
      setDocReqSaving(false);
    }
  };

  const handleSaveSurveyRequirements = async () => {
    if (!activeRequest) return;
    setSurveyReqSaving(true);
    try {
      const selections = Object.entries(surveyReqFormData)
        .filter(([, questionIds]) => questionIds.length > 0)
        .map(([propertyTypeId, questionIds]) => ({
          propertyTypeId: parseInt(propertyTypeId),
          questionIds,
        }));

      const res = await authFetch(
        `${API_BASE}/admin/service-requests/${activeRequest.serviceRequestId}/survey-requirements`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selections }),
        }
      );
      const data = await res.json();
      if (data.success) {
        fetchSurveyRequirements(activeRequest.serviceRequestId);
        activeSurvey.fetchQuestions(activeRequest.serviceRequestId);
      }
      setSurveyReqModalOpen(false);
    } catch {
      // silently fail
    } finally {
      setSurveyReqSaving(false);
    }
  };

  const updateSrField = <K extends keyof CreateSRFormData>(
    field: K,
    value: CreateSRFormData[K],
  ) => {
    setSrFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatAddress = () => {
    if (!strata) return "N/A";
    const parts = [strata.unitNumber, strata.streetName, strata.town, strata.province, strata.postalCode].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "N/A";
  };

  const getFilteredQuestions = (questions: SurveyQuestion[], sectionKey: string) => {
    const sectionConfig = SURVEY_SECTIONS.find(s => s.key === sectionKey);
    if (!sectionConfig) return [];

    // Only parent questions at the top level
    let filtered = questions.filter(
      q => q.questionCategory === sectionConfig.label && q.parentQuestionId == null
    );

    if (filterPropertyTypeIds.length > 0) {
      filtered = filtered.filter(q => filterPropertyTypeIds.includes(q.propertyTypeId));
    }

    return filtered;
  };

  const getSubQuestionsMap = (questions: SurveyQuestion[], sectionKey: string): Map<string, SurveyQuestion[]> => {
    const sectionConfig = SURVEY_SECTIONS.find(s => s.key === sectionKey);
    const map = new Map<string, SurveyQuestion[]>();
    if (!sectionConfig) return map;
    for (const q of questions) {
      if (q.questionCategory === sectionConfig.label && q.parentQuestionId != null) {
        const key = `${q.parentQuestionId}-${q.propertyTypeId}`;
        const list = map.get(key) ?? [];
        list.push(q);
        map.set(key, list);
      }
    }
    return map;
  };

  const buildCompletionMap = (questions: SurveyQuestion[], responseIds: Set<number>) => {
    const map: Record<string, boolean> = {};
    for (const s of SURVEY_SECTIONS) {
      // Only count parent questions for completion
      const sq = questions.filter(q => q.questionCategory === s.label && q.parentQuestionId == null);
      map[s.key] = sq.length > 0 && sq.every(q => responseIds.has(q.questionId));
    }
    return map;
  };


  const renderArchivedValue = (resp: ArchivedSurveyResponse) => {
    const q = resp.question;
    const typeName = q.questionType.questionTypeName;

    if (typeName === "boolean") {
      if (resp.responseBoolean === true) return "Yes";
      if (resp.responseBoolean === false) return "No";
      return "No answer";
    }
    if (typeName === "multiple_choice") {
      return resp.multipleChoiceOption?.optionText || "No answer";
    }
    if (typeName === "checkbox" && resp.responseText) {
      const ids = resp.responseText.split(",").filter(Boolean);
      return ids.map(id => {
        const opt = q.multipleChoiceOptions.find(o => o.multipleChoiceOptionId === parseInt(id));
        return opt?.optionText || id;
      }).join(", ");
    }
    if (typeName === "number") {
      return resp.responseNumber !== null ? String(resp.responseNumber) : "No answer";
    }
    if (typeName === "date") {
      return resp.responseDate ? (parseLocalDate(resp.responseDate)?.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) ?? "No answer") : "No answer";
    }
    return resp.responseText || "No answer";
  };

  const formatArchivedDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) +
      " at " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const renderAnswerValue = (
    q: SurveyQuestion,
    getResponse: (questionId: number, propertyTypeId: number) => { responseText?: string | null; responseBoolean?: boolean | null; responseNumber?: number | null; responseDate?: string | null; multipleChoiceOptionId?: number | null } | undefined,
  ) => {
    const resp = getResponse(q.questionId, q.propertyTypeId);
    if (!resp) return <span className="answer-empty">No answer</span>;

    if (q.questionType === "boolean") {
      if (resp.responseBoolean === true) return <span className="answer-value">Yes</span>;
      if (resp.responseBoolean === false) return <span className="answer-value">No</span>;
      return <span className="answer-empty">No answer</span>;
    }

    if (q.questionType === "multiple_choice") {
      if (resp.multipleChoiceOptionId) {
        const opt = q.multipleChoiceOptions.find(o => o.optionId === resp.multipleChoiceOptionId);
        return <span className="answer-value">{opt?.optionText || `Option ${resp.multipleChoiceOptionId}`}</span>;
      }
      return <span className="answer-empty">No answer</span>;
    }

    if (q.questionType === "checkbox") {
      if (resp.responseText) {
        const ids = resp.responseText.split(",").filter(Boolean);
        const labels = ids.map(id => {
          const opt = q.multipleChoiceOptions.find(o => o.optionId === parseInt(id));
          return opt?.optionText || id;
        });
        return <span className="answer-value">{labels.join(", ")}</span>;
      }
      return <span className="answer-empty">No answer</span>;
    }

    if (q.questionType === "number") {
      return resp.responseNumber !== null && resp.responseNumber !== undefined
        ? <span className="answer-value">{resp.responseNumber}</span>
        : <span className="answer-empty">No answer</span>;
    }

    if (q.questionType === "date") {
      return resp.responseDate
        ? <span className="answer-value">{parseLocalDate(resp.responseDate)?.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</span>
        : <span className="answer-empty">No answer</span>;
    }

    if (resp.responseText) {
      return <span className="answer-value">{resp.responseText}</span>;
    }

    return <span className="answer-empty">No answer</span>;
  };

  const renderSurveyAnswers = (
    questions: SurveyQuestion[],
    responses: { questionId: number }[],
    sectionKey: string,
    getResponse: (questionId: number, propertyTypeId: number) => ReturnType<typeof activeSurvey.getResponseForQuestion>,
    surveyLoading: boolean,
  ) => {
    const sectionQuestions = getFilteredQuestions(questions, sectionKey);
    const subQuestionsMap = getSubQuestionsMap(questions, sectionKey);

    const validPropertyTypes = (strata?.strataPropertyTypes ?? []).filter(spt => {
      const ptId = spt.propertyType.propertyTypeId;
      if (!surveyRequirements.some(req => req.propertyTypeId === ptId)) return false;
      if (filterPropertyTypeIds.length > 0 && !filterPropertyTypeIds.includes(ptId)) return false;
      return true;
    });

    return (
      <>
        <SurveyProgressBar answered={responses.length} total={questions.filter(q => q.parentQuestionId == null).length} />

        {surveyLoading ? (
          <LoadingSpinner />
        ) : validPropertyTypes.length === 0 ? (
          <div className="survey-coming-soon">
            <p>No property types configured for this survey. Configure required surveys first.</p>
          </div>
        ) : (
          <div className="admin-survey-answers">
            {validPropertyTypes.map(spt => {
              const ptId = spt.propertyType.propertyTypeId;
              const ptQuestions = sectionQuestions.filter(q => q.propertyTypeId === ptId && q.parentQuestionId == null);
              
              return (
                <div key={ptId} className="doc-req-group" style={{ marginTop: '2rem' }}>
                  <h3 className="doc-req-group-title">{spt.propertyType.propertyTypeName}</h3>
                  {ptQuestions.length === 0 ? (
                    <p style={{ margin: '1rem 0' }}>No questions for this property type in this section.</p>
                  ) : (
                    ptQuestions.map((q) => {
                      const subQuestions = subQuestionsMap.get(`${q.questionId}-${ptId}`) ?? [];
                      return (
                        <div key={q.srSurveyQuestionId} className="admin-answer-item">
                          <div className="answer-question">{q.questionText}</div>
                          <div className="answer-response">{renderAnswerValue(q, getResponse)}</div>
                          {subQuestions.length > 0 && (
                            <div className="admin-sub-answers">
                              {subQuestions.map((sq, i) => (
                                <div key={sq.srSurveyQuestionId} className="admin-sub-answer-item">
                                  <div className="answer-question">
                                    <span className="admin-sub-label">{String.fromCharCode(97 + i)}.</span>
                                    {sq.questionText}
                                  </div>
                                  <div className="answer-response">{renderAnswerValue(sq, getResponse)}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  };

  const getCurrentSurveySection = () => {
    if (activeTab === "active") return activeSurveySection;
    if (activeTab === "archived") return archivedSurveySection;
    return null;
  };

  const getCurrentSurveyOnSectionChange = () => {
    if (activeTab === "active") return setActiveSurveySection;
    if (activeTab === "archived") return setArchivedSurveySection;
    return null;
  };

  const getCurrentCompletionMap = () => {
    if (activeTab === "active" && activeRequest) {
      const responseIds = new Set(activeSurvey.responses.map(r => r.questionId));
      return buildCompletionMap(activeSurvey.questions, responseIds);
    }
    if (activeTab === "archived") {
      const map: Record<string, boolean> = {};
      for (const s of SURVEY_SECTIONS) {
        const hasResponses = activeSurvey.archivedResponses.some(r => r.question?.questionCategory === s.label);
        map[s.key] = hasResponses;
      }
      return map;
    }
    return undefined;
  };

  const dynamicSections = useMemo(() => {
    if (!strata) return [];
    
    // Valid property types to consider
    const validPropertyTypes = (strata.strataPropertyTypes ?? [])
      .map(spt => spt.propertyType.propertyTypeId)
      .filter(ptId => {
        if (!surveyRequirements.some(req => req.propertyTypeId === ptId)) return false;
        if (filterPropertyTypeIds.length > 0 && !filterPropertyTypeIds.includes(ptId)) return false;
        return true;
      });

    if (validPropertyTypes.length === 0) return [];

    let availableSectionLabels = new Set<string>();

    if (activeTab === "active" && activeRequest) {
      // Find all top-level questions configured for this survey across the matched property types
      for (const q of activeSurvey.questions) {
        if (q.parentQuestionId == null && validPropertyTypes.includes(q.propertyTypeId)) {
          availableSectionLabels.add(q.questionCategory);
        }
      }
    } else if (activeTab === "archived") {
      for (const r of activeSurvey.archivedResponses) {
        if (r.question && validPropertyTypes.includes(r.propertyTypeId)) {
          availableSectionLabels.add(r.question.questionCategory);
        }
      }
    }

    return SURVEY_SECTIONS.filter(s => availableSectionLabels.has(s.label));
  }, [
    activeTab, 
    activeRequest, 
    strata, 
    surveyRequirements, 
    filterPropertyTypeIds, 
    activeSurvey.questions, 
    activeSurvey.archivedResponses
  ]);

  useEffect(() => {
    if (dynamicSections.length > 0) {
      if (activeTab === 'active' && !dynamicSections.some(s => s.key === activeSurveySection)) {
        setActiveSurveySection(dynamicSections[0].key);
      } else if (activeTab === 'archived' && !dynamicSections.some(s => s.key === archivedSurveySection)) {
        setArchivedSurveySection(dynamicSections[0].key);
      }
    }
  }, [dynamicSections, activeTab, activeSurveySection, archivedSurveySection]);

  const showSurveyNav = dynamicSections.length > 0;

  if (loading || (activeRequest && !dataReady)) return <LoadingSpinner />;

  if (!strata) {
    return (
      <div className="strata-detail-page">
        <button className="back-link" onClick={() => navigate("/admin/strata")}>
          &larr; Back to Stratas
        </button>
        <p>Strata not found.</p>
      </div>
    );
  }

  const nextRequestId = `SR ${1000 + strata.strataId}`;

  return (
    <div className="strata-detail-page">
      <button className="back-link" onClick={() => navigate("/admin/strata")}>
        &larr; Back to Stratas
      </button>

      <div className="detail-header">
        <h1>{strata.complexName || strata.strataPlan || "Strata Detail"}</h1>
        {activeRequest && (
          <div className="action-buttons-desktop">
            <button className="btn-primary" onClick={handleDownloadDocuments} disabled={downloadingDocs}>
              {downloadingDocs ? "Downloading..." : "Download Documents"}
            </button>
            <button className="btn-primary" style={{ minWidth: '220px' }} onClick={handleDownloadSurveyPdf} disabled={downloadingSurveyPdf}>{downloadingSurveyPdf ? "Downloading..." : "Download Survey Answers"}</button>
            <button className="btn-primary" onClick={() => setOfferModalOpen(true)}>Offer Appointment</button>
          </div>
        )}
      </div>

      <div className="strata-info-card">
        <div className="info-row">
          <div className="info-item">
            <span className="info-label">STRATA PLAN</span>
            <span className="info-value">{strata.strataPlan || "N/A"}</span>
          </div>
          <div className="info-item">
            <span className="info-label">COMPLEX NAME</span>
            <span className="info-value">{strata.complexName || "N/A"}</span>
          </div>
          <div className="info-item">
            <span className="info-label">PROPERTY TYPES</span>
            <span className="info-value">
              {strata.strataPropertyTypes && strata.strataPropertyTypes.length > 0
                ? strata.strataPropertyTypes.map(spt => spt.propertyType.propertyTypeName).join(', ')
                : "N/A"}
            </span>
          </div>
        </div>
        <div className="info-row">
          <div className="info-item">
            <span className="info-label">ADDRESS</span>
            <span className="info-value">{formatAddress()}</span>
          </div>
          <div className="info-item">
            <span className="info-label">MANAGEMENT COMPANY</span>
            <span className="info-value">{strata.company?.companyName || "N/A"}</span>
          </div>
          <div className="info-item">
            <span className="info-label">FISCAL YEAR START</span>
            <span className="info-value">{strata.fiscalYearEnd ? formatDateShort(strata.fiscalYearEnd) : "N/A"}</span>
          </div>
        </div>
      </div>

      {activeRequest && (
        <div className="strata-action-buttons">
          <button className="btn-primary" onClick={handleDownloadDocuments} disabled={downloadingDocs}>
            {downloadingDocs ? "Downloading..." : "Download Documents"}
          </button>
          <button className="btn-primary" style={{ minWidth: '220px' }} onClick={handleDownloadSurveyPdf} disabled={downloadingSurveyPdf}>{downloadingSurveyPdf ? "Downloading..." : "Download Survey Answers"}</button>
          <button className="btn-primary" onClick={() => setOfferModalOpen(true)}>Offer Appointment</button>
        </div>
      )}

      <div className="tabs-row">
        <Tabs tabs={MAIN_TABS} activeTab={activeTab} onChange={setActiveTab} />
        {(activeTab === "active" || activeTab === "archived") && (
          <div className="filters-row">
            <MultiSelectDropdown
              label="Property Types"
              options={(strata?.strataPropertyTypes ?? [])
                .filter(spt => surveyRequirements.some(req => req.propertyTypeId === spt.propertyType.propertyTypeId))
                .map(spt => ({ value: spt.propertyType.propertyTypeId, label: spt.propertyType.propertyTypeName }))
                .sort((a, b) => a.label.localeCompare(b.label))}
              selectedValues={filterPropertyTypeIds}
              onChange={setFilterPropertyTypeIds}
              placeholder="All Types"
            />
          </div>
        )}
      </div>

      {showSurveyNav && (
        <SurveyCategoryNav
          sections={dynamicSections}
          activeSection={getCurrentSurveySection()!}
          onSelect={getCurrentSurveyOnSectionChange()!}
          completionMap={getCurrentCompletionMap()}
        />
      )}

      <div className="tab-content">
        {activeTab === "active" && (
          <div className="tab-panel">
            {!activeRequest ? (
              <div className="empty-state">
                <h2>No Active Reports Found</h2>
                <button className="btn-primary btn-create-sr" onClick={handleOpenCreateModal}>
                  Create New Survey Request
                </button>
              </div>
            ) : (
                <div className="active-survey">
                  <div className="survey-header">
                    <div className="survey-header-left">
                      <h2>Active Survey Answers</h2>
                    <div className="survey-meta">
                      <span>
                        <strong>Status:</strong> {activeRequest.status}
                      </span>
                      <span>
                        <strong>Service:</strong> {activeRequest.service?.serviceName || "-"}
                      </span>
                      <span>
                        <strong>Requested:</strong>{" "}
                        {new Date(activeRequest.requestDate).toLocaleDateString()}
                      </span>
                      <span>
                        <strong>Answered:</strong>{" "}
                        {activeSurvey.responses.length}/{activeSurvey.questions.length}
                      </span>
                    </div>
                  </div>
                  <div className="survey-header-actions">
                    <button type="button" className="btn-primary" onClick={openSurveyReqModal}>
                      Configure Required Surveys
                    </button>
                  </div>
                </div>

                {renderSurveyAnswers(
                  activeSurvey.questions,
                  activeSurvey.responses,
                  activeSurveySection,
                  activeSurvey.getResponseForQuestion,
                  activeSurvey.loading,
                )}

              </div>
            )}
          </div>
        )}

        {activeTab === "archived" && (() => {
          const sectionConfig = SURVEY_SECTIONS.find(s => s.key === archivedSurveySection);
          const validPropertyTypes = (strata?.strataPropertyTypes ?? []).filter(spt => {
            const ptId = spt.propertyType.propertyTypeId;
            if (!surveyRequirements.some(req => req.propertyTypeId === ptId)) return false;
            if (filterPropertyTypeIds.length > 0 && !filterPropertyTypeIds.includes(ptId)) return false;
            return true;
          });

          return (
            <div className="tab-panel">
              {activeSurvey.archivedResponses.length === 0 ? (
                <div className="empty-state">
                  <h2>No Archived Answers</h2>
                  {!activeRequest && (
                    <button className="btn-primary btn-create-sr" onClick={handleOpenCreateModal}>
                      Create New Survey Request
                    </button>
                  )}
                </div>
              ) : (
                <div className="archived-survey-detail">
                  <h2>Archived Survey Answers</h2>

                  {activeSurvey.loading ? (
                    <LoadingSpinner />
                  ) : (
                    <div className="admin-survey-answers">
                      {validPropertyTypes.map(spt => {
                        const ptId = spt.propertyType.propertyTypeId;
                        // Filter responses to this section and property type
                        const ptResponses = activeSurvey.archivedResponses.filter(r => 
                          r.propertyTypeId === ptId && 
                          r.question?.questionCategory === sectionConfig?.label
                        );

                        if (ptResponses.length === 0) return null;

                        // Group by questionId
                        const grouped = new Map<number, ArchivedSurveyResponse[]>();
                        for (const r of ptResponses) {
                          const list = grouped.get(r.questionId) || [];
                          list.push(r);
                          grouped.set(r.questionId, list);
                        }

                        return (
                          <div key={ptId} className="doc-req-group" style={{ marginTop: '2rem' }}>
                            <h3 className="doc-req-group-title">{spt.propertyType.propertyTypeName}</h3>
                            {Array.from(grouped.entries()).map(([questionId, responses]) => {
                              const q = responses[0].question;
                              const sorted = [...responses].sort((a, b) =>
                                new Date(b.archivedAt!).getTime() - new Date(a.archivedAt!).getTime()
                              );
                              return (
                                <div key={questionId} className="admin-answer-item archived-answer-group">
                                  <div className="answer-question">{q.questionText}</div>
                                  {sorted.map(resp => (
                                    <div key={resp.responseId} className="archived-response-entry">
                                      <div className="archived-response-header">
                                        <span className="status-badge replaced">Replaced</span>
                                      </div>
                                      <div className="answer-response">
                                        Answer: <span className="answer-value">{renderArchivedValue(resp)}</span>
                                      </div>
                                      <div className="archived-meta">
                                        Answered by {resp.answeredBy?.firstName || ""} {resp.answeredBy?.lastName || ""} on {formatArchivedDate(resp.createdAt)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {activeTab === "documents" && (
          <div className="tab-panel">
            {!activeRequest ? (
              <div className="empty-state">
                <h2>No Active Reports Found</h2>
                <button className="btn-primary btn-create-sr" onClick={handleOpenCreateModal}>
                  Create New Survey Request
                </button>
              </div>
            ) : (
              <>
                <div className="documents-header">
                  <h2>Required Documents</h2>
                  <button className="btn-primary" onClick={openDocReqModal}>
                    Configure Required Documents
                  </button>
                </div>

                {docRequirements.length === 0 ? (
                  <div className="notes-empty">No document requirements configured yet.</div>
                ) : (
                  <div className="doc-requirements-summary">
                    {(strata?.strataPropertyTypes ?? []).map(spt => {
                      const ptId = spt.propertyType.propertyTypeId;
                      const reqs = docRequirements.filter(r => r.propertyTypeId === ptId);
                      if (reqs.length === 0) return null;
                      return (
                        <div key={ptId} className="doc-req-group">
                          <h3 className="doc-req-group-title">{spt.propertyType.propertyTypeName}</h3>
                          <div className="doc-req-items">
                            {reqs.map(r => {
                              const matchedDocs = uploadedDocs.filter(
                                d => d.documentType.documentTypeId === r.documentTypeId
                                  && d.propertyType?.propertyTypeId === ptId
                                  && !d.fileName.includes('- Archived')
                              );
                              const hasUpload = matchedDocs.length > 0;
                              return (
                                <div key={r.srDocRequirementId} className="doc-req-item">
                                  {hasUpload ? (
                                    <div className="doc-req-item-header">
                                      <button
                                        className="btn-link doc-file-link"
                                        onClick={() => handleDocPreview(matchedDocs[0])}
                                        title="Preview document"
                                      >
                                        {matchedDocs[0].fileName}
                                      </button>
                                      <span className={getStatusBadgeClass(matchedDocs[0].reviewStatus?.statusName)}>
                                        {matchedDocs[0].reviewStatus?.statusName || 'Pending'}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="doc-req-item-header">
                                      <span className="doc-req-item-name">{formatTypeName(r.documentType.typeName)}</span>
                                      <span className="status-badge not-received">Not Received</span>
                                    </div>
                                  )}
                                  {hasUpload && (
                                    <div className="doc-req-item-details">
                                      <span className="doc-upload-date">
                                        Uploaded {formatDate(matchedDocs[0].uploadedAt)}
                                        {matchedDocs[0].uploadedBy && ` by ${matchedDocs[0].uploadedBy.firstName || ''} ${matchedDocs[0].uploadedBy.lastName || ''}`.trimEnd()}
                                      </span>
                                      <button
                                        className="btn-edit btn-review-doc"
                                        onClick={(e) => { e.stopPropagation(); openStatusModal(matchedDocs[0]); }}
                                      >
                                        Review
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "notes" && (() => {
          const strataNoteRows = strata.strataNotes.map((note) => ({
            key: `strata-${note.noteId}`,
            date: new Date(note.createdAt),
            userName: note.createdBy
              ? `${note.createdBy.firstName || ""} ${note.createdBy.lastName || ""}`.trim()
              : note.createdByUser || "Unknown",
            source: "Strata",
            message: note.noteMessage,
            deleteType: "strata" as const,
            deleteId: note.noteId,
          }));

          const docNoteRows = (strata.serviceRequests ?? []).flatMap(sr =>
            sr.serviceRequestDocuments
              .filter(doc => doc.notes)
              .map(doc => ({
                key: `doc-${doc.serviceRequestDocumentId}`,
                date: new Date(doc.uploadedAt),
                userName: doc.uploadedBy
                  ? `${doc.uploadedBy.firstName || ""} ${doc.uploadedBy.lastName || ""}`.trim()
                  : "Unknown",
                source: `Document: ${doc.fileName}`,
                message: doc.notes!,
                deleteType: "doc" as const,
                deleteId: doc.serviceRequestDocumentId,
              }))
          );

          const allNotes = [...strataNoteRows, ...docNoteRows].sort(
            (a, b) => b.date.getTime() - a.date.getTime()
          );

          return (
            <div className="tab-panel">
              {allNotes.length === 0 ? (
                <div className="empty-state">
                  <h2>No Notes Found</h2>
                  <button className="btn-primary btn-create-sr" onClick={() => { setNoteInput(''); setNoteError(null); setAddNoteModalOpen(true); }}>
                    Add Note
                  </button>
                </div>
              ) : (
                <>
                <div className="notes-header">
                  <h2>Notes For {strata.complexName || strata.strataPlan || "Strata"}</h2>
                  <button
                    className="btn-primary"
                    onClick={() => { setNoteInput(''); setNoteError(null); setAddNoteModalOpen(true); }}
                  >
                    Add Note
                  </button>
                </div>
                  <div className="notes-table-wrapper">
                    <table className="notes-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Time</th>
                          <th>User</th>
                          <th>Source</th>
                          <th>Message</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allNotes.map((row) => {
                          const dateStr = row.date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
                          const timeStr = row.date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                          return (
                            <tr key={row.key}>
                              <td>{dateStr}</td>
                              <td>{timeStr}</td>
                              <td>{row.userName}</td>
                              <td>{row.source}</td>
                              <td className="note-message-cell">{row.message}</td>
                              <td className="note-actions-cell">
                                <button
                                  className="btn-delete-link"
                                  onClick={() => setDeleteNoteModal({ type: row.deleteType, id: row.deleteId, message: row.message })}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="notes-cards">
                    {allNotes.map((row) => {
                      const dateStr = row.date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
                      const timeStr = row.date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                      return (
                        <div
                          key={row.key}
                          className="note-card"
                          onClick={() => setViewNoteModal({
                            date: row.date,
                            userName: row.userName,
                            source: row.source,
                            message: row.message,
                            deleteType: row.deleteType,
                            deleteId: row.deleteId,
                          })}
                        >
                          <div className="note-card-date">{dateStr}</div>
                          <div className="note-card-row">
                            <span className="note-card-label">Time:</span>
                            <span>{timeStr}</span>
                          </div>
                          <div className="note-card-row">
                            <span className="note-card-label">User:</span>
                            <span>{row.userName}</span>
                          </div>
                          <div className="note-card-row">
                            <span className="note-card-label">Source:</span>
                            <span>{row.source}</span>
                          </div>
                          <div className="note-card-row">
                            <span className="note-card-label">Message:</span>
                            <span>{row.message}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </div>

      {activeRequest && activeTab !== "notes" && (
        <div className="survey-actions-bottom" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn-delete btn-delete-survey"
            onClick={() => setDeleteModalOpen(true)}
          >
            Delete Survey
          </button>
        </div>
      )}

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Survey Request"
        size="large"
        className="modal-create-sr"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleCreateServiceRequest}
              disabled={srSubmitting || !srFormData.serviceId}
            >
              {srSubmitting ? "Creating..." : "Create Request"}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateServiceRequest}>
          {srFormError && <div className="form-error">{srFormError}</div>}

          <FormRow>
            <InputField
              label="Request ID"
              value={nextRequestId}
              onChange={() => {}}
              disabled
            />
            <InputField
              label="Strata ID"
              value={strata.strataPlan || `#${strata.strataId}`}
              onChange={() => {}}
              disabled
            />
          </FormRow>

          <FormRow>
            <InputField
              label="Requested By"
              value={user && 'fullName' in user ? user.fullName : ''}
              onChange={() => {}}
              disabled
            />
            <SingleSelectDropdown
              label="Request Type"
              value={srFormData.serviceId}
              onChange={(val) => updateSrField("serviceId", val)}
              options={services.map((s) => ({
                value: s.serviceId,
                label: s.serviceName,
              }))}
              placeholder="-- Select Request Type --"
              required
            />
          </FormRow>

        </form>
      </Modal>

      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={`Delete Survey: ${strata.complexName || strata.strataPlan || ""}`}
        size="small"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </button>
            <button
              className="btn-delete"
              onClick={handleDeleteServiceRequest}
              disabled={deleteSubmitting}
            >
              {deleteSubmitting ? "Deleting..." : "Delete Responses"}
            </button>
          </>
        }
      >
        <div className="delete-confirmation">
          <p>Are you sure that you would like to delete these survey responses?</p>
          <p className="delete-warning">This action cannot be undone.</p>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteNoteModal}
        onClose={() => setDeleteNoteModal(null)}
        title={`Delete Note: ${strata.complexName || strata.strataPlan || ""}`}
        size="medium"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteNoteModal(null)}>
              Cancel
            </button>
            <button
              className="btn-delete"
              onClick={handleConfirmDeleteNote}
              disabled={deleteNoteSubmitting}
            >
              {deleteNoteSubmitting ? "Deleting..." : "Delete Note"}
            </button>
          </>
        }
      >
        <div className="delete-confirmation">
          <p className="delete-note-label">Message:</p>
          <p className="delete-note-message">{deleteNoteModal?.message}</p>
          <p>Are you sure that you would like to delete this note?</p>
          <p className="delete-warning">This action cannot be undone.</p>
        </div>
      </Modal>

      <Modal
        isOpen={addNoteModalOpen}
        onClose={() => setAddNoteModalOpen(false)}
        title={`Add Note: ${strata.complexName || strata.strataPlan || ""}`}
        size="medium"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setAddNoteModalOpen(false)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleAddNote}
              disabled={noteSubmitting || !noteInput.trim()}
            >
              {noteSubmitting ? "Saving..." : "Save Note"}
            </button>
          </>
        }
      >
        <div className="add-note-form">
          <label className="add-note-label">Message:</label>
          {noteError && <div className="form-error">{noteError}</div>}
          <textarea
            className="note-input"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Add notes about this strata..."
            rows={5}
          />
        </div>
      </Modal>

      <Modal
        isOpen={!!viewNoteModal}
        onClose={() => setViewNoteModal(null)}
        title={`View Note: ${strata.complexName || strata.strataPlan || ""}`}
        size="medium"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setViewNoteModal(null)}>
              Cancel
            </button>
            <button
              className="btn-delete"
              onClick={() => {
                if (viewNoteModal) {
                  setDeleteNoteModal({ type: viewNoteModal.deleteType, id: viewNoteModal.deleteId, message: viewNoteModal.message });
                  setViewNoteModal(null);
                }
              }}
            >
              Delete Note
            </button>
          </>
        }
      >
        {viewNoteModal && (
          <div className="view-note-details">
            <div className="view-note-row">
              <span className="view-note-label">Date:</span>
              <span>{viewNoteModal.date.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</span>
            </div>
            <div className="view-note-row">
              <span className="view-note-label">Time:</span>
              <span>{viewNoteModal.date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="view-note-row">
              <span className="view-note-label">User:</span>
              <span>{viewNoteModal.userName}</span>
            </div>
            <div className="view-note-row">
              <span className="view-note-label">Source:</span>
              <span>{viewNoteModal.source}</span>
            </div>
            <div className="view-note-row">
              <span className="view-note-label">Message:</span>
              <span>{viewNoteModal.message}</span>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={docReqModalOpen}
        onClose={() => setDocReqModalOpen(false)}
        title="Configure Required Documents"
        size="large"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDocReqModalOpen(false)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSaveDocRequirements}
              disabled={docReqSaving}
            >
              {docReqSaving ? "Saving..." : "Save Requirements"}
            </button>
          </>
        }
      >
        <div className="doc-req-modal-body">
          {(strata?.strataPropertyTypes ?? []).length === 0 ? (
            <p className="notes-empty">No property types assigned to this strata. Assign property types first.</p>
          ) : (
            (strata?.strataPropertyTypes ?? []).map(spt => {
              const ptId = spt.propertyType.propertyTypeId;
              return (
                <div key={ptId} className="doc-req-section">
                  <h3 className="doc-req-section-title">{spt.propertyType.propertyTypeName}</h3>
                  <MultiSelectDropdown
                    label="Required Documents"
                    options={documentTypes.map(dt => ({ value: dt.documentTypeId, label: dt.typeName })).sort((a, b) => a.label.localeCompare(b.label))}
                    selectedValues={docReqFormData[ptId] ?? []}
                    onChange={(values) => setDocReqFormData(prev => ({ ...prev, [ptId]: values }))}
                    placeholder="Select document types"
                  />
                </div>
              );
            })
          )}
        </div>
      </Modal>

      <Modal
        isOpen={surveyReqModalOpen}
        onClose={() => setSurveyReqModalOpen(false)}
        title="Configure Required Surveys"
        size="large"
        className="modal-configure-surveys"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setSurveyReqModalOpen(false)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSaveSurveyRequirements}
              disabled={surveyReqSaving}
            >
              {surveyReqSaving ? "Saving..." : "Save Configuration"}
            </button>
          </>
        }
      >
        <div className="doc-req-modal-body">
          {(strata?.strataPropertyTypes ?? []).length === 0 ? (
            <p className="notes-empty">No property types assigned to this strata. Assign property types first.</p>
          ) : (
            (strata?.strataPropertyTypes ?? []).map(spt => {
              const ptId = spt.propertyType.propertyTypeId;
              const availableQuestions = allQuestions.filter(q =>
                q.parentQuestionId == null
              );

              const handleSelectAll = () => {
                setSurveyReqFormData(prev => ({
                  ...prev,
                  [ptId]: availableQuestions.map(q => q.questionId)
                }));
              };

              const handleDeselectAll = () => {
                setSurveyReqFormData(prev => ({
                  ...prev,
                  [ptId]: []
                }));
              };

              return (
                <div key={ptId} className="doc-req-section">
                  <div className="doc-req-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h3 className="doc-req-section-title" style={{ margin: 0 }}>{spt.propertyType.propertyTypeName}</h3>
                    <div className="doc-req-section-actions">
                      <button className="btn-text-primary" style={{ marginRight: '0.5rem' }} onClick={handleSelectAll}>Select All</button>
                      <button className="btn-text-primary" onClick={handleDeselectAll}>Deselect All</button>
                    </div>
                  </div>
                  <MultiSelectDropdown
                    label="Required Questions"
                    searchable
                    options={availableQuestions.map(q => ({
                      value: q.questionId,
                      label: `[${q.questionCategory}] ${q.questionText}`,
                      isTemplate: q.questionPropertyTypes.some(qpt => qpt.propertyTypeId === ptId)
                    })).sort((a, b) => {
                      if (a.isTemplate !== b.isTemplate) return a.isTemplate ? -1 : 1;
                      return a.label.localeCompare(b.label);
                    }).map(({ value, label }) => ({ value, label }))}
                    selectedValues={surveyReqFormData[ptId] ?? []}
                    onChange={(values) => setSurveyReqFormData(prev => ({ ...prev, [ptId]: values }))}
                    placeholder="Select questions for this property type"
                  />
                </div>
              );
            })
          )}
        </div>
      </Modal>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModalOpen}
        onClose={handleClosePreview}
        documentId={previewDocId}
        documentName={previewDocName}
        token={session?.access_token || ''}
        onDelete={previewDocId ? () => { handleDeleteDoc(previewDocId); handleClosePreview(); } : undefined}
      />

      {/* Document Status Review Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Review Document"
        size="medium"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setStatusModalOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleStatusUpdate} disabled={!statusForm.reviewStatusId}>
              Update Status
            </button>
          </>
        }
      >
        {statusDoc && (
          <div className="review-form">
            <p><strong>File:</strong> {statusDoc.fileName}</p>
            <p><strong>Type:</strong> {formatTypeName(statusDoc.documentType.typeName)}</p>

            <SingleSelectDropdown
              label="Status"
              required
              value={statusForm.reviewStatusId}
              onChange={(val) => setStatusForm(prev => ({ ...prev, reviewStatusId: val }))}
              options={reviewStatuses.map(rs => ({ value: rs.reviewStatusId, label: rs.statusName }))}
              placeholder="Select status"
            />
            <TextareaField
              label="Notes"
              value={statusForm.notes}
              onChange={(e) => setStatusForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add review notes..."
              rows={3}
            />
          </div>
        )}
      </Modal>

      {activeRequest && (
        <OfferAppointmentModal
          isOpen={offerModalOpen}
          onClose={() => setOfferModalOpen(false)}
          serviceRequestId={activeRequest.serviceRequestId}
          strataPlan={strata?.strataPlan || 'N/A'}
          targetDate={activeRequest.targetDate ?? null}
          appointmentTypes={appointmentTypes}
          inspectors={allUsers}
          initialTypeId={activeRequest.appointmentOfferTypeId ?? null}
          initialInspectorId={activeRequest.appointmentOfferInspectorId ?? null}
          initialSecondInspectorId={activeRequest.appointmentOfferSecondInspectorId ?? null}
          locations={locations}
          initialLocationId={strata?.locationId ?? null}
          strataId={strata?.strataId ?? 0}
          onSubmit={async (srId, data) => {
            await offerAppointment(srId, data);
            await loadData();
          }}
          onAddNote={async (message: string) => {
            if (!strataId) return;
            await addNote(strataId, {
              noteMessage: message,
              createdByProfileId: user?.id,
            });
            const updated = await getStrataById(strataId);
            if (updated) setStrata(updated);
          }}
          onUpdateLocation={async (sId, locId) => {
            await updateStrata(sId, { locationId: locId });
            const updated = await getStrataById(sId);
            if (updated) setStrata(updated);
          }}
        />
      )}
    </div>
  );
}
