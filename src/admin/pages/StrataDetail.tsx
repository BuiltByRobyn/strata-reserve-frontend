import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DragEndEvent } from '@dnd-kit/core';
import { useParams, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useStrata } from "../../shared/hooks/useStrata";
import { useAuthFetch } from "../../shared/hooks/useAuthFetch";
import { useFileNumbers } from "../../shared/hooks/useFileNumbers";
import { useLookups } from "../../shared/hooks/useLookups";
import { useAuth } from "../../shared/contexts/AuthContext";
import { useSurvey } from "../../shared/hooks/useSurvey";
import { useQuestions } from "../../shared/hooks/useQuestions";
import { useUsers } from "../../shared/hooks/useUsers";
import { useApiClient } from "../../shared/hooks/useApiClient";
import { useActivationRequests } from "../../shared/hooks/useActivationRequests";
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
  FormRow,
  TextareaField,
} from "../../shared/components/FormField";
import { SingleSelectDropdown } from "../../shared/components/SingleSelectDropdown";
import {
  SURVEY_SECTIONS,
} from "../../shared/types/survey.types";
import type { SurveyQuestion, ArchivedSurveyResponse } from "../../shared/types/survey.types";
import type {
  StrataWithDetails,
  FileNumber,
  CreateSRFormData,
  AppointmentType,
} from "../../shared/types/entities.types";
import { DocumentReviewModal } from "../components/DocumentReviewModal";
import { useDocumentReview } from "../hooks/useDocumentReview";
import type { SRDocRequirement } from "../../shared/types/document.types";
import { API_BASE } from "../../shared/lib/api";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../shared/utils/constants";
import { formatTypeName, formatNaStatus, getUserDisplayName } from "../../shared/utils/formatters";
import { groupByDocumentType } from "../../shared/utils/documentUtils";
import { parseLocalDate, formatDateShort } from "../../shared/utils/dateUtils";
import { getFilenameFromDisposition, triggerBlobDownload } from "../../shared/utils/fileUtils";
import { formatFileNumberInput, validateFileNumber } from "../../shared/utils/fileNumberUtils";

const MAIN_TABS = [
  { key: "active", label: "Active" },
  { key: "archived", label: "Archived" },
  { key: "documents", label: "Documents" },
  { key: "notes", label: "Notes" },
];

const INITIAL_SR_FORM: CreateSRFormData = {
  fileNumber: "",
  serviceId: "",
};

function SortableSurveyQuestionItem({ id, text }: { id: number; text: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, cursor: 'grab' }}
      className="sortable-survey-question-item"
      {...attributes}
      {...listeners}
    >
      <span className="drag-handle">⠿</span>
      <span>{text}</span>
    </div>
  );
}

export default function StrataDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { getStrataById, updateStrata, addNote, deleteNote } = useStrata();
  const {
    getActiveByStrata,
    createFileNumber,
    updateFileNumber,
    deleteFileNumber,
    offerAppointment,
  } = useFileNumbers();
  const { user, session } = useAuth();
  const authFetch = useAuthFetch();

  const activeSurvey = useSurvey("admin");
  const { questions: allQuestions } = useQuestions();
  const { services, documentTypes, reviewStatuses, locations } = useLookups();
  const { users: allUsers } = useUsers();
  const api = useApiClient();
  const { requests: activationRequests, rejectRequest: rejectActivationRequest } = useActivationRequests();

  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [filterPropertyTypeIds, setFilterPropertyTypeIds] = useState<number[]>([]);

  const [strata, setStrata] = useState<StrataWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [activeRequest, setActiveRequest] = useState<FileNumber | null>(null);
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem(`strata-detail-tab-${id}`) || 'active';
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    sessionStorage.setItem(`strata-detail-tab-${id}`, tab);
  };

  const [activeSurveySection, setActiveSurveySection] = useState("exterior");
  const [archivedSurveySection, setArchivedSurveySection] = useState("exterior");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const autoOpenedCreateRef = useRef(false);

  const resetCreateModal = () => {
    setSrFormData(INITIAL_SR_FORM);
    setCreateFileNumberValue('');
    setSrFormError(null);
    setCreateFileNumberError(null);
    setRejectMode(false);
    setRejectionReason('');
  };

  useEffect(() => {
    if (location.state?.openCreateSR && !autoOpenedCreateRef.current) {
      autoOpenedCreateRef.current = true;
      resetCreateModal();
      setCreateModalOpen(true);
    }
  }, [location.state?.openCreateSR]);
  const [srFormData, setSrFormData] = useState<CreateSRFormData>(INITIAL_SR_FORM);
  const [srFormError, setSrFormError] = useState<string | null>(null);
  const [srSubmitting, setSrSubmitting] = useState(false);

  const [createFileNumberValue, setCreateFileNumberValue] = useState('');
  const [createFileNumberError, setCreateFileNumberError] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [editingFileNumber, setEditingFileNumber] = useState(false);
  const [editFileNumberValue, setEditFileNumberValue] = useState('');
  const [editFileNumberError, setEditFileNumberError] = useState<string | null>(null);
  const [savingFileNumber, setSavingFileNumber] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [deleteNoteModal, setDeleteNoteModal] = useState<{ type: 'strata' | 'doc'; id: number; message: string } | null>(null);
  const [deleteNoteSubmitting, setDeleteNoteSubmitting] = useState(false);
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false);
  const [viewNoteModal, setViewNoteModal] = useState<{ date: Date; userName: string; source: string; message: string; deleteType: 'strata' | 'doc'; deleteId: number } | null>(null);

  const [docRequirements, setDocRequirements] = useState<SRDocRequirement[]>([]);
  const [docReqModalOpen, setDocReqModalOpen] = useState(false);
  const [savingDocConfig, setSavingDocConfig] = useState(false);
  const [docReviewModalOpen, setDocReviewModalOpen] = useState(false);
  const [configStep, setConfigStep] = useState<'select' | number>('select');
  const [wizardSelectedDocTypes, setWizardSelectedDocTypes] = useState<Record<number, number[]>>({});
  const [wizardVersionConfig, setWizardVersionConfig] = useState<Record<number, Record<number, string[]>>>({});
  const [wizardStepError, setWizardStepError] = useState<string | null>(null);
  const [docFilterPropertyTypeIds, setDocFilterPropertyTypeIds] = useState<number[]>([]);
  const { fetchReview, submitReview, review: docReview, requirements: reviewRequirements, loading: reviewLoading } = useDocumentReview();

  const [surveyRequirements, setSurveyRequirements] = useState<{ propertyTypeId: number }[]>([]);
  const [surveyReqModalOpen, setSurveyReqModalOpen] = useState(false);
  const [surveyReqSaving, setSurveyReqSaving] = useState(false);
  const [surveyReqFormData, setSurveyReqFormData] = useState<Record<number, number[]>>({});
  const [_surveyReqInitialData, setSurveyReqInitialData] = useState<Record<number, number[]>>({});
  const [surveyReqSortOrders, setSurveyReqSortOrders] = useState<Record<string, number[]>>({});
  const [surveyConfigStep, setSurveyConfigStep] = useState<'select' | number>('select');
  const [surveyReorderOpen, setSurveyReorderOpen] = useState<Record<string, boolean>>({});

  const [downloadingDocs, setDownloadingDocs] = useState(false);
  const [downloadingSurveyPdf, setDownloadingSurveyPdf] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<number | null>(null);
  const [previewDocName, setPreviewDocName] = useState('');
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const strataId = id ? parseInt(id) : null;

  const pendingActivationRequest = useMemo(() =>
    activationRequests.find(
      (r) => r.status === 'Pending' && r.strataProfile?.strata.strataId === strataId
    ) ?? null,
    [activationRequests, strataId]
  );

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

  const fetchDocRequirements = useCallback(async (fileId: number) => {
    try {
      const res = await authFetch(`${API_BASE}/admin/file-numbers/${fileId}/document-requirements`);
      const data = await res.json();
      if (data.success && data.data) {
        setDocRequirements(data.data);
      }
    } catch {
      // silently fail
    }
  }, [authFetch]);

  const fetchSurveyRequirements = useCallback(async (fileId: number) => {
    try {
      const res = await authFetch(`${API_BASE}/admin/file-numbers/${fileId}/survey-requirements`);
      const data = await res.json();
      if (data.success && data.data) {
        setSurveyRequirements(data.data);
      }
    } catch {
      // silently fail
    }
  }, [authFetch]);

  useEffect(() => {
    if (activeRequest) {
      setDataReady(false);
      Promise.all([
        activeSurvey.fetchQuestions(activeRequest.fileId),
        activeSurvey.fetchResponses(activeRequest.fileId),
        activeSurvey.fetchArchivedResponses(activeRequest.fileId),
        fetchDocRequirements(activeRequest.fileId),
        fetchSurveyRequirements(activeRequest.fileId),
        fetchReview(activeRequest.fileId),
      ]).finally(() => setDataReady(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRequest?.fileId]);

  // Re-fetch documents data when switching to Documents tab (picks up uploads from Documents page)
  useEffect(() => {
    if (activeTab === 'documents' && activeRequest) {
      fetchDocRequirements(activeRequest.fileId);
    }
  }, [activeTab, activeRequest?.fileId, fetchDocRequirements]);

  const handleOpenCreateModal = () => {
    resetCreateModal();
    setCreateModalOpen(true);
  };

  const handleCreateFileNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strata || !srFormData.serviceId || !user) return;

    const fileNumberErr = validateFileNumber(createFileNumberValue);
    if (fileNumberErr) {
      setCreateFileNumberError(fileNumberErr);
      return;
    }

    setSrSubmitting(true);
    setSrFormError(null);

    const requestedByProfileId = pendingActivationRequest?.strataProfile?.profile.id ?? user.id;

    try {
      const result = await createFileNumber({
        serviceId: parseInt(srFormData.serviceId),
        strataId: strata.strataId,
        requestedByProfileId,
        fileNumber: createFileNumberValue,
      });
      setActiveRequest(result);
      resetCreateModal();
      setCreateModalOpen(false);
    } catch (err) {
      setSrFormError(err instanceof Error ? err.message : "Failed to create file number");
    } finally {
      setSrSubmitting(false);
    }
  };

  const handleRejectActivationRequest = async () => {
    if (!pendingActivationRequest) return;
    setRejecting(true);
    try {
      const ok = await rejectActivationRequest(pendingActivationRequest.activationRequestId, rejectionReason.trim());
      if (ok) {
        resetCreateModal();
        setCreateModalOpen(false);
      } else {
        setSrFormError('Failed to reject the request. Please try again.');
      }
    } finally {
      setRejecting(false);
    }
  };

  const handleDeleteFileNumber = async () => {
    if (!activeRequest) return;

    setDeleteSubmitting(true);
    try {
      await deleteFileNumber(activeRequest.fileId);
      activeSurvey.clearState();
      setActiveRequest(null);
      setDeleteModalOpen(false);
    } catch {
      // Error is handled by the hook
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSaveFileNumber = async () => {
    if (!activeRequest || !strata) return;
    const err = validateFileNumber(editFileNumberValue);
    if (err) { setEditFileNumberError(err); return; }
    setSavingFileNumber(true);
    try {
      await updateFileNumber(activeRequest.fileId, editFileNumberValue.trim());
      const updated = await getActiveByStrata(strata.strataId);
      if (updated) setActiveRequest(updated);
      setEditingFileNumber(false);
    } catch {
      setEditFileNumberError('Failed to save. Please try again.');
    } finally {
      setSavingFileNumber(false);
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
    const selected: Record<number, number[]> = {};
    const config: Record<number, Record<number, string[]>> = {};
    for (const req of docRequirements) {
      const ptId = req.propertyTypeId ?? 0;
      if (!selected[ptId]) selected[ptId] = [];
      if (!selected[ptId].includes(req.documentTypeId)) selected[ptId].push(req.documentTypeId);
      if (!config[ptId]) config[ptId] = {};
      if (!config[ptId][req.documentTypeId]) config[ptId][req.documentTypeId] = [];
      config[ptId][req.documentTypeId].push(req.versionLabel);
    }
    setWizardSelectedDocTypes(selected);
    setWizardVersionConfig(config);
    setConfigStep('select');
    setDocReqModalOpen(true);
  };

  const handleWizardNext = () => {
    // Validate that no doc type with uploads is being deselected
    for (const spt of strata?.strataPropertyTypes ?? []) {
      const ptId = spt.propertyType.propertyTypeId;
      const newSelected = wizardSelectedDocTypes[ptId] ?? [];
      const prevDtIds = [...new Set(docRequirements.filter(r => r.propertyTypeId === ptId).map(r => r.documentTypeId))];
      for (const dtId of prevDtIds) {
        if (!newSelected.includes(dtId)) {
          const uploadedCount = docRequirements.filter(
            r => r.propertyTypeId === ptId && r.documentTypeId === dtId && r.fileNumberDocuments.length > 0
          ).length;
          if (uploadedCount > 0) {
            const dt = documentTypes.find(d => d.documentTypeId === dtId);
            setWizardStepError(`Cannot remove "${dt?.typeName || 'this document'}" — ${uploadedCount} version${uploadedCount !== 1 ? 's' : ''} already uploaded.`);
            return;
          }
        }
      }
    }
    setWizardStepError(null);
    const updated: Record<number, Record<number, string[]>> = { ...wizardVersionConfig };
    for (const [ptIdStr, dtIds] of Object.entries(wizardSelectedDocTypes)) {
      const ptId = Number(ptIdStr);
      if (!updated[ptId]) updated[ptId] = {};
      for (const dtId of Object.keys(updated[ptId]).map(Number)) {
        if (!dtIds.includes(dtId)) delete updated[ptId][dtId];
      }
      for (const dtId of dtIds) {
        if (!updated[ptId][dtId] || updated[ptId][dtId].length === 0) {
          updated[ptId][dtId] = [''];
        }
      }
    }
    setWizardVersionConfig(updated);
    setConfigStep(0);
  };

  const handleVersionCountChange = (ptId: number, dtId: number, count: number) => {
    const uploadedCount = docRequirements.filter(
      r => r.propertyTypeId === ptId && r.documentTypeId === dtId && r.fileNumberDocuments.length > 0
    ).length;
    if (count < Math.max(1, uploadedCount) && uploadedCount > 0) {
      const dt = documentTypes.find(d => d.documentTypeId === dtId);
      setWizardStepError(
        `${uploadedCount} version${uploadedCount !== 1 ? 's' : ''} of "${dt?.typeName || 'this document'}" have already been uploaded for this file number. Cannot decrease the required quantity below ${uploadedCount}.`
      );
      return;
    }
    setWizardStepError(null);
    setWizardVersionConfig(prev => {
      const current = prev[ptId]?.[dtId] ?? [''];
      const adjusted = count <= 1
        ? ['']
        : Array.from({ length: count }, (_, i) => current[i] ?? '');
      return { ...prev, [ptId]: { ...prev[ptId], [dtId]: adjusted } };
    });
  };

  const handleVersionLabelChange = (ptId: number, dtId: number, idx: number, label: string) => {
    setWizardStepError(null);
    setWizardVersionConfig(prev => {
      const current = [...(prev[ptId]?.[dtId] ?? [])];
      current[idx] = label;
      return { ...prev, [ptId]: { ...prev[ptId], [dtId]: current } };
    });
  };

  const validateConfigStep = (ptId: number): boolean => {
    const selectedDtIds = wizardSelectedDocTypes[ptId] ?? [];
    for (const dtId of selectedDtIds) {
      const labels = wizardVersionConfig[ptId]?.[dtId] ?? [''];
      if (labels.length > 1 && labels.some(l => !l.trim())) return false;
      const trimmed = labels.map(l => l.trim()).filter(l => l !== '');
      if (new Set(trimmed).size !== trimmed.length) return false;
    }
    return true;
  };

  const handleWizardSave = async () => {
    if (!activeRequest) return;
    const requirements: Array<{ documentTypeId: number; propertyTypeId: number | null; versionLabel: string }> = [];
    for (const [ptIdStr, docTypes] of Object.entries(wizardVersionConfig)) {
      const ptId = Number(ptIdStr) || null;
      for (const [dtIdStr, labels] of Object.entries(docTypes)) {
        for (const label of labels) {
          requirements.push({ documentTypeId: Number(dtIdStr), propertyTypeId: ptId, versionLabel: label });
        }
      }
    }
    setSavingDocConfig(true);
    await authFetch(`${API_BASE}/admin/file-numbers/${activeRequest.fileId}/document-requirements`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirements }),
    });
    await fetchDocRequirements(activeRequest.fileId);
    setSavingDocConfig(false);
    setDocReqModalOpen(false);
  };

  const openDocReviewModal = () => {
    if (activeRequest) {
      fetchReview(activeRequest.fileId);
      setDocReviewModalOpen(true);
    }
  };

  const openSurveyReqModal = () => {
    const formData: Record<number, number[]> = {};
    const initialSortOrders: Record<string, number[]> = {};
    const existingQuestions = activeSurvey.questions;

    for (const spt of strata?.strataPropertyTypes ?? []) {
      const ptId = spt.propertyType.propertyTypeId;
      if (existingQuestions.length > 0) {
        const ptQuestions = existingQuestions.filter(q => q.propertyTypeId === ptId && q.parentQuestionId == null);
        formData[ptId] = [...new Set(ptQuestions.map(q => q.questionId))];
        const categories = [...new Set(ptQuestions.map(q => q.questionCategory))];
        for (const cat of categories) {
          initialSortOrders[`${ptId}:${cat}`] = ptQuestions
            .filter(q => q.questionCategory === cat)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(q => q.questionId);
        }
      } else {
        const defaultQs = allQuestions.filter(q => !q.isSubQuestion && (q.questionPropertyTypes.length === 0 || q.questionPropertyTypes.some(qpt => qpt.propertyTypeId === ptId)));
        formData[ptId] = defaultQs.map(q => q.questionId);
        const categories = [...new Set(defaultQs.map(q => q.questionCategory))];
        for (const cat of categories) {
          initialSortOrders[`${ptId}:${cat}`] = defaultQs.filter(q => q.questionCategory === cat).map(q => q.questionId);
        }
      }
    }

    setSurveyReqFormData(formData);
    setSurveyReqInitialData(formData);
    setSurveyReqSortOrders(initialSortOrders);
    setSurveyConfigStep('select');
    setSurveyReorderOpen({});
    setSurveyReqModalOpen(true);
  };

  const handleDocPreview = (doc: { fileNumberDocumentId: number; fileName: string }) => {
    setPreviewDocId(doc.fileNumberDocumentId);
    setPreviewDocName(doc.fileName);
    setPreviewModalOpen(true);
  };

  const handleClosePreview = () => {
    setPreviewModalOpen(false);
    setPreviewDocId(null);
    setPreviewDocName('');
  };

  const handleDeleteDoc = async (docId: number) => {
    try {
      await authFetch(`${API_BASE}/admin/documents/${docId}`, { method: 'DELETE' });
      await loadData();
    } catch (err) {
      console.error('Failed to delete document', err);
    }
  };

  const handleDownloadDocuments = async () => {
    if (!activeRequest || !session?.access_token) return;
    setDownloadingDocs(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/download-fn-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ fileId: activeRequest.fileId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const message = err?.error || 'Download failed';
        toast.error(message);
        return;
      }
      const blob = await res.blob();
      triggerBlobDownload(blob, `Documents - ${strata?.strataPlan || 'SR'}.zip`);
    } catch (err) {
      toast.error('Download failed. Please try again.');
    } finally {
      setDownloadingDocs(false);
    }
  };

  const handleDownloadSurveyPdf = async () => {
    if (!activeRequest) return;
    setDownloadingSurveyPdf(true);
    try {
      const res = await api.rawFetch(`/admin/file-numbers/${activeRequest.fileId}/survey/pdf`);
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


  const handleSaveSurveyRequirements = async () => {
    if (!activeRequest) return;
    setSurveyReqSaving(true);
    const availableQuestions = allQuestions.filter(q => !q.isSubQuestion);
    const sectionOrder = SURVEY_SECTIONS.map(s => s.label);
    const allCategories = [...new Set(availableQuestions.map(q => q.questionCategory))]
      .sort((a, b) => {
        const ai = sectionOrder.indexOf(a);
        const bi = sectionOrder.indexOf(b);
        return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
      });
    try {
      const selections = Object.entries(surveyReqFormData)
        .filter(([, questionIds]) => questionIds.length > 0)
        .map(([propertyTypeId, questionIds]) => {
          const ptId = parseInt(propertyTypeId);
          const finalOrder: number[] = [];
          for (const cat of allCategories) {
            const key = `${ptId}:${cat}`;
            const catOrdered = (surveyReqSortOrders[key] ?? []).filter(id => questionIds.includes(id));
            const catUnordered = questionIds.filter(id =>
              !catOrdered.includes(id) &&
              availableQuestions.find(q => q.questionId === id && q.questionCategory === cat)
            );
            finalOrder.push(...catOrdered, ...catUnordered);
          }
          const uncategorized = questionIds.filter(id => !finalOrder.includes(id));
          return {
            propertyTypeId: ptId,
            questions: [...finalOrder, ...uncategorized].map((id, idx) => ({ id, sortOrder: idx + 1 })),
          };
        });

      const res = await authFetch(
        `${API_BASE}/admin/file-numbers/${activeRequest.fileId}/survey-requirements`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selections }),
        }
      );
      const data = await res.json();
      if (data.success) {
        await Promise.all([
          fetchSurveyRequirements(activeRequest.fileId),
          activeSurvey.fetchQuestions(activeRequest.fileId),
        ]);
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
    if (resp.responseText === 'NOT_APPLICABLE') return 'Not Applicable';
    if (resp.responseText === 'UNKNOWN') return 'Unknown';
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

    if (resp.responseText === 'NOT_APPLICABLE') return <span className="answer-value">Not Applicable</span>;
    if (resp.responseText === 'UNKNOWN') return <span className="answer-value">Unknown</span>;

    if (resp.responseText) {
      return <span className="answer-value">{resp.responseText}</span>;
    }

    return <span className="answer-empty">No answer</span>;
  };

  const renderSurveyAnswers = (
    questions: SurveyQuestion[],
    responses: { questionId: number; propertyTypeId: number }[],
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
        <SurveyProgressBar
          answered={filterPropertyTypeIds.length > 0
            ? responses.filter(r => filterPropertyTypeIds.includes(r.propertyTypeId)).length
            : responses.length}
          total={filterPropertyTypeIds.length > 0
            ? questions.filter(q => filterPropertyTypeIds.includes(q.propertyTypeId) && q.parentQuestionId == null).length
            : questions.filter(q => q.parentQuestionId == null).length}
        />

        {surveyLoading ? (
          <LoadingSpinner />
        ) : validPropertyTypes.length === 0 ? (
          <div className="survey-coming-soon">
            <p>No property types configured for this survey. Configure requested surveys first.</p>
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
                        <div key={q.fnSurveyQuestionId} className="admin-answer-item">
                          <div className="answer-question">
                            {q.questionText}
                            {q.isRequired && <span className="required-mark">*</span>}
                          </div>
                          <div className="answer-response">{renderAnswerValue(q, getResponse)}</div>
                          {subQuestions.length > 0 && (
                            <div className="admin-sub-answers">
                              {subQuestions.map((sq, i) => (
                                <div key={sq.fnSurveyQuestionId} className="admin-sub-answer-item">
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
            <span className="info-label">FILE NUMBER</span>
            {editingFileNumber ? (
              <div className="fn-edit-inline">
                <input
                  className="fn-edit-input"
                  value={editFileNumberValue}
                  onChange={(e) => { setEditFileNumberValue(formatFileNumberInput(e.target.value)); setEditFileNumberError(null); }}
                  placeholder="12345-01"
                  autoFocus
                />
                {editFileNumberError && <span className="fn-edit-error">{editFileNumberError}</span>}
                <div className="fn-edit-actions">
                  <button className="btn-sm btn-primary" onClick={handleSaveFileNumber} disabled={savingFileNumber}>{savingFileNumber ? '…' : 'Save'}</button>
                  <button className="btn-sm btn-secondary" onClick={() => { setEditingFileNumber(false); setEditFileNumberError(null); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <span className="info-value fn-value-wrap">
                {activeRequest ? (activeRequest.fileNumber ?? '—') : 'N/A'}
                {activeRequest && (
                  <button className="fn-edit-btn" onClick={() => { setEditFileNumberValue(activeRequest.fileNumber ?? ''); setEditingFileNumber(true); }} title="Edit file number">✎</button>
                )}
              </span>
            )}
          </div>
        </div>
        <div className="info-row">
          <div className="info-item">
            <span className="info-label">ADDRESS</span>
            <span className="info-value">{formatAddress()}</span>
          </div>
          <div className="info-item">
            <span className="info-label">PROPERTY TYPES</span>
            <span className="info-value">
              {strata.strataPropertyTypes && strata.strataPropertyTypes.length > 0
                ? strata.strataPropertyTypes.map(spt => spt.propertyType.propertyTypeName).join(', ')
                : "N/A"}
            </span>
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
        <Tabs tabs={MAIN_TABS} activeTab={activeTab} onChange={handleTabChange} />
        {(activeTab === "active" || activeTab === "archived" || activeTab === "documents") && activeRequest && (
          <div className="filters-row">
            {activeTab === "documents" ? (
              <MultiSelectDropdown
                label="Property Types"
                options={(strata?.strataPropertyTypes ?? [])
                  .map(spt => ({ value: spt.propertyType.propertyTypeId, label: spt.propertyType.propertyTypeName }))
                  .sort((a, b) => a.label.localeCompare(b.label))}
                selectedValues={docFilterPropertyTypeIds}
                onChange={setDocFilterPropertyTypeIds}
                placeholder="All Types"
              />
            ) : (
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
            )}
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
                <h2>No Active File Number Found</h2>
                <button className="btn-primary btn-create-sr" onClick={handleOpenCreateModal}>
                  Create a New File
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
                        {filterPropertyTypeIds.length > 0
                          ? activeSurvey.responses.filter(r =>
                              filterPropertyTypeIds.includes(r.propertyTypeId) &&
                              activeSurvey.questions.some(q => q.questionId === r.questionId && q.parentQuestionId == null)
                            ).length
                          : activeSurvey.responses.filter(r =>
                              activeSurvey.questions.some(q => q.questionId === r.questionId && q.parentQuestionId == null)
                            ).length}
                        /
                        {filterPropertyTypeIds.length > 0
                          ? activeSurvey.questions.filter(q => filterPropertyTypeIds.includes(q.propertyTypeId) && q.parentQuestionId == null).length
                          : activeSurvey.questions.filter(q => q.parentQuestionId == null).length}
                      </span>
                    </div>
                  </div>
                  <div className="survey-header-actions">
                    <button type="button" className="btn-primary" onClick={openSurveyReqModal}>
                      Configure Requested Surveys
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
                  <h2>No Archived Answers Found</h2>
                  {!activeRequest && (
                    <button className="btn-primary btn-create-sr" onClick={handleOpenCreateModal}>
                      Create a New File
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
                                  <div className="answer-question">
                                    {q.questionText}
                                    {q.isRequired && <span className="required-mark">*</span>}
                                  </div>
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
                <h2>No Active File Number</h2>
                <button className="btn-primary btn-create-sr" onClick={handleOpenCreateModal}>
                  Create a New File
                </button>
              </div>
            ) : (
              <>
                <div className="documents-header">
                  <h2>Requested Documents</h2>
                  <div className="documents-header-actions">
                    <button className="btn-secondary" onClick={openDocReqModal}>
                      Configure Documents
                    </button>
                    {docRequirements.length > 0 && (
                      <button className="btn-primary" onClick={openDocReviewModal}>
                        Review All Documents
                      </button>
                    )}
                  </div>
                </div>

                {docRequirements.length === 0 ? (
                  <div className="notes-empty">No document requirements configured yet.</div>
                ) : (
                  <div className="doc-requirements-summary">
                    {(strata?.strataPropertyTypes ?? []).map(spt => {
                      const ptId = spt.propertyType.propertyTypeId;
                      if (docFilterPropertyTypeIds.length > 0 && !docFilterPropertyTypeIds.includes(ptId)) return null;
                      const reqs = docRequirements.filter(r => r.propertyTypeId === ptId);
                      if (reqs.length === 0) return null;

                      const docTypeGroups = groupByDocumentType(reqs);

                      return (
                        <div key={ptId} className="doc-req-group">
                          <h3 className="doc-req-group-title">{spt.propertyType.propertyTypeName}</h3>
                          <div className="doc-req-items">
                            {Array.from(docTypeGroups.entries()).map(([typeName, versions]) => (
                              <div key={typeName} className="doc-req-type-group">
                                <span className="doc-req-type-name">{formatTypeName(typeName)}</span>
                                <div className="doc-req-versions">
                                  {versions.map(r => {
                                    const latestDoc = r.fileNumberDocuments[0];
                                    const naStatus = r.naStatus?.status;
                                    return (
                                      <div key={r.fnDocRequirementId} className="doc-req-item">
                                        <span className="doc-req-version-label">{r.versionLabel || 'Default'}</span>
                                        {latestDoc ? (
                                          <div className="doc-req-item-header">
                                            <button
                                              className="btn-link doc-file-link"
                                              onClick={() => handleDocPreview(latestDoc)}
                                              title="Preview document"
                                            >
                                              {latestDoc.fileName}
                                            </button>
                                            {(() => {
                                              const reviewItem = docReview?.items?.find(i => i.fnDocRequirementId === r.fnDocRequirementId);
                                              return reviewItem ? (
                                                <span className={`status-badge ${reviewItem.reviewStatus.statusName.toLowerCase().replace(/\s+/g, '-')}`}>
                                                  {reviewItem.reviewStatus.statusName}
                                                </span>
                                              ) : (
                                                <span className="status-badge pending">Pending Review</span>
                                              );
                                            })()}
                                          </div>
                                        ) : naStatus ? (
                                          <span className="status-badge na-status">
                                            {formatNaStatus(naStatus)}
                                          </span>
                                        ) : (
                                          <span className="status-badge not-received">Not Received</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
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

          const docNoteRows = (strata.fileNumbers ?? []).flatMap(sr =>
            sr.fileNumberDocuments
              .filter(doc => doc.notes)
              .map(doc => ({
                key: `doc-${doc.fileNumberDocumentId}`,
                date: new Date(doc.uploadedAt),
                userName: doc.uploadedBy
                  ? `${doc.uploadedBy.firstName || ""} ${doc.uploadedBy.lastName || ""}`.trim()
                  : "Unknown",
                source: `Document: ${doc.fileName}`,
                message: doc.notes!,
                deleteType: "doc" as const,
                deleteId: doc.fileNumberDocumentId,
              }))
          );

          const allNotes = [...strataNoteRows, ...docNoteRows].sort(
            (a, b) => b.date.getTime() - a.date.getTime()
          );

          return (
            <div className="tab-panel">
              {allNotes.length === 0 ? (
                <div className="empty-state">
                  <h2>No Admin Notes Found</h2>
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
        onClose={() => { resetCreateModal(); setCreateModalOpen(false); }}
        title={pendingActivationRequest ? "Activation Request" : "Create a New File"}
        size="large"
        className="modal-create-sr"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { resetCreateModal(); setCreateModalOpen(false); }}>
              Cancel
            </button>
            {pendingActivationRequest ? (
              rejectMode ? (
                <>
                  <button
                    className="btn-secondary"
                    onClick={() => { setRejectMode(false); setRejectionReason(''); setSrFormError(null); }}
                  >
                    Back
                  </button>
                  <button
                    className="btn-delete"
                    onClick={handleRejectActivationRequest}
                    disabled={rejecting}
                  >
                    {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn-delete"
                    onClick={() => setRejectMode(true)}
                    disabled={srSubmitting}
                  >
                    Reject Request
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleCreateFileNumber}
                    disabled={srSubmitting || !srFormData.serviceId}
                  >
                    {srSubmitting ? 'Creating...' : 'Approve Request'}
                  </button>
                </>
              )
            ) : (
              <button
                className="btn-primary"
                onClick={handleCreateFileNumber}
                disabled={srSubmitting || !srFormData.serviceId}
              >
                {srSubmitting ? "Creating..." : "Create Request"}
              </button>
            )}
          </>
        }
      >
        <form onSubmit={handleCreateFileNumber}>
          {srFormError && <div className="form-error">{srFormError}</div>}

          <FormRow>
            <InputField
              label="File Number (e.g. 12345-01)"
              value={createFileNumberValue}
              onChange={(e) => {
                const raw = e.target.value;
                if (/[^\d\-]/.test(raw)) {
                  setCreateFileNumberError('Only digits are allowed.');
                } else {
                  setCreateFileNumberError(null);
                }
                setCreateFileNumberValue(formatFileNumberInput(raw));
              }}
              onBlur={() => setCreateFileNumberError(validateFileNumber(createFileNumberValue))}
              error={createFileNumberError || undefined}
              required
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
              value={
                pendingActivationRequest?.strataProfile?.profile
                  ? getUserDisplayName(pendingActivationRequest.strataProfile.profile, 'Unknown client')
                  : (user && 'fullName' in user ? user.fullName : '')
              }
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
              placeholder="Select Request Type"
              required
            />
          </FormRow>

          {rejectMode && (
            <div className="rejection-reason-section">
              <TextareaField
                label="Rejection Reason (optional)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

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
              onClick={handleDeleteFileNumber}
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
        title="Configure Requested Documents"
        size="large"
        className="modal-configure-documents"
        footer={
          configStep === 'select' ? (
            <>
              <button className="btn-secondary" onClick={() => setDocReqModalOpen(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={handleWizardNext}
                disabled={Object.values(wizardSelectedDocTypes).every(v => v.length === 0)}
              >
                Next
              </button>
            </>
          ) : (() => {
            const activePropertyTypes = (strata?.strataPropertyTypes ?? []).filter(
              spt => (wizardSelectedDocTypes[spt.propertyType.propertyTypeId] ?? []).length > 0
            );
            const currentPtId = activePropertyTypes[configStep as number]?.propertyType.propertyTypeId;
            const isLast = (configStep as number) === activePropertyTypes.length - 1;
            const handleNext = () => {
              if (!currentPtId || !validateConfigStep(currentPtId)) {
                setWizardStepError('Please enter a label for each version before continuing.');
                return;
              }
              setWizardStepError(null);
              setConfigStep((configStep as number) + 1);
            };
            const handleSave = () => {
              if (!currentPtId || !validateConfigStep(currentPtId)) {
                setWizardStepError('Please enter a label for each version before saving.');
                return;
              }
              setWizardStepError(null);
              handleWizardSave();
            };
            return (
              <>
                <button className="btn-secondary" onClick={() => setDocReqModalOpen(false)}>Cancel</button>
                <button className="btn-secondary" onClick={() => { setWizardStepError(null); setConfigStep((configStep as number) === 0 ? 'select' : (configStep as number) - 1); }}>Back</button>
                {isLast ? (
                  <button className="btn-primary" onClick={handleSave} disabled={savingDocConfig}>{savingDocConfig ? 'Saving...' : 'Save'}</button>
                ) : (
                  <button className="btn-primary" onClick={handleNext}>Next</button>
                )}
              </>
            );
          })()
        }
      >
        <div className="doc-req-modal-body">
          {(strata?.strataPropertyTypes ?? []).length === 0 ? (
            <p className="notes-empty">No property types assigned to this strata. Assign property types first.</p>
          ) : configStep === 'select' ? (
            <div className="doc-req-wizard">
              <p className="doc-req-wizard__subtitle">Select which document types are required for each property type.</p>
              {wizardStepError && <p className="form-error">{wizardStepError}</p>}
              {(strata?.strataPropertyTypes ?? []).map(spt => {
                const ptId = spt.propertyType.propertyTypeId;
                return (
                  <div key={ptId} className="doc-req-wizard__select-row">
                    <label className="doc-req-wizard__pt-label">{spt.propertyType.propertyTypeName}</label>
                    <MultiSelectDropdown
                      label=""
                      options={documentTypes.slice().sort((a, b) => a.typeName.localeCompare(b.typeName)).map(dt => ({ value: dt.documentTypeId, label: dt.typeName }))}
                      selectedValues={wizardSelectedDocTypes[ptId] ?? []}
                      onChange={vals => setWizardSelectedDocTypes(prev => ({ ...prev, [ptId]: vals }))}
                      placeholder="Select document types..."
                    />
                  </div>
                );
              })}
            </div>
          ) : (() => {
            const activePropertyTypes = (strata?.strataPropertyTypes ?? []).filter(
              spt => (wizardSelectedDocTypes[spt.propertyType.propertyTypeId] ?? []).length > 0
            );
            const spt = activePropertyTypes[configStep as number];
            if (!spt) return null;
            const ptId = spt.propertyType.propertyTypeId;
            const selectedDtIds = wizardSelectedDocTypes[ptId] ?? [];
            return (
              <div className="doc-req-wizard">
                <h4 className="doc-req-wizard__pt-heading">{spt.propertyType.propertyTypeName}</h4>
                {wizardStepError && <p className="form-error">{wizardStepError}</p>}
                <table className="doc-req-version-table">
                  <thead>
                    <tr>
                      <th>Document Type</th>
                      <th>Versions Required</th>
                      <th>Version Labels</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDtIds.map(dtId => {
                      const dt = documentTypes.find(d => d.documentTypeId === dtId);
                      const labels = wizardVersionConfig[ptId]?.[dtId] ?? [''];
                      const count = labels.length;
                      return (
                        <tr key={dtId}>
                          <td>{dt?.typeName}</td>
                          <td>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={count}
                              onChange={e => handleVersionCountChange(ptId, dtId, Math.max(1, parseInt(e.target.value) || 1))}
                            />
                          </td>
                          <td>
                            {count > 1 && labels.map((label, i) => {
                              const isDuplicate = label.trim() !== '' && labels.some((l, j) => j !== i && l.trim() === label.trim());
                              return (
                                <div key={i} className="version-label-field">
                                  <input
                                    type="text"
                                    placeholder={`Version ${i + 1} label`}
                                    value={label}
                                    className={isDuplicate ? 'input--error' : ''}
                                    onChange={e => handleVersionLabelChange(ptId, dtId, i, e.target.value)}
                                  />
                                  {isDuplicate && <span className="version-label-error">Duplicate label</span>}
                                </div>
                              );
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      </Modal>

      <DocumentReviewModal
        isOpen={docReviewModalOpen}
        onClose={() => setDocReviewModalOpen(false)}
        fileId={activeRequest?.fileId ?? null}
        docRequirements={reviewRequirements}
        reviewStatuses={reviewStatuses}
        review={docReview}
        loading={reviewLoading}
        token={session?.access_token || ''}
        onSubmit={async (fileId, input) => {
          const ok = await submitReview(fileId, input);
          if (ok) {
            setDocReviewModalOpen(false);
            if (activeRequest) {
              fetchDocRequirements(activeRequest.fileId);
              fetchReview(activeRequest.fileId);
            }
            setOfferModalOpen(true);
          }
        }}
      />

      <Modal
        isOpen={surveyReqModalOpen}
        onClose={() => setSurveyReqModalOpen(false)}
        title="Configure Requested Surveys"
        size="large"
        className="modal-configure-surveys"
        footer={
          surveyConfigStep === 'select' ? (
            <>
              <button className="btn-secondary" onClick={() => setSurveyReqModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => setSurveyConfigStep(0)}>Next</button>
            </>
          ) : (
            <>
              <button className="btn-secondary" onClick={() => setSurveyConfigStep((surveyConfigStep as number) === 0 ? 'select' : (surveyConfigStep as number) - 1)}>Back</button>
              {(surveyConfigStep as number) < (strata?.strataPropertyTypes ?? []).length - 1 ? (
                <button className="btn-primary" onClick={() => setSurveyConfigStep((surveyConfigStep as number) + 1)}>Next</button>
              ) : (
                <button className="btn-primary" onClick={handleSaveSurveyRequirements} disabled={surveyReqSaving}>
                  {surveyReqSaving ? 'Saving...' : 'Save Configuration'}
                </button>
              )}
            </>
          )
        }
      >
        <div className="doc-req-modal-body">
          {(strata?.strataPropertyTypes ?? []).length === 0 ? (
            <p className="notes-empty">No property types assigned to this strata. Assign property types first.</p>
          ) : surveyConfigStep === 'select' ? (
            <div className="doc-req-wizard">
              <p className="doc-req-wizard__subtitle">Select which questions to include for each property type.</p>
              {(strata?.strataPropertyTypes ?? []).map(spt => {
                const ptId = spt.propertyType.propertyTypeId;
                const availableQuestions = allQuestions.filter(q => !q.isSubQuestion);
                const allCategories = [...new Set(availableQuestions.map(q => q.questionCategory))];
                const selectedIds = surveyReqFormData[ptId] ?? [];

                const handleChange = (values: number[]) => {
                  setSurveyReqFormData(prev => ({ ...prev, [ptId]: values }));
                  setSurveyReqSortOrders(prev => {
                    const updated = { ...prev };
                    for (const cat of allCategories) {
                      const key = `${ptId}:${cat}`;
                      const catQIds = availableQuestions.filter(q => q.questionCategory === cat).map(q => q.questionId);
                      const kept = (prev[key] ?? []).filter(id => values.includes(id) && catQIds.includes(id));
                      const added = values.filter(id => catQIds.includes(id) && !kept.includes(id));
                      updated[key] = [...kept, ...added];
                    }
                    return updated;
                  });
                };

                return (
                  <div key={ptId} className="doc-req-section">
                    <div className="doc-req-section-header">
                      <h3 className="doc-req-section-title">{spt.propertyType.propertyTypeName}</h3>
                      <div className="doc-req-section-actions">
                        <button className="btn-text-primary" onClick={() => handleChange(availableQuestions.map(q => q.questionId))}>Select All</button>
                        <button className="btn-text-primary" onClick={() => handleChange([])}>Deselect All</button>
                        <button className="btn-text-primary" onClick={() => handleChange(
                          allQuestions
                            .filter(q => !q.isSubQuestion && (q.questionPropertyTypes.length === 0 || q.questionPropertyTypes.some(qpt => qpt.propertyTypeId === ptId)))
                            .map(q => q.questionId)
                        )}>Revert to Initial</button>
                      </div>
                    </div>
                    <MultiSelectDropdown
                      label=""
                      searchable
                      options={(() => {
                        const sectionOrder = SURVEY_SECTIONS.map(s => s.label);
                        return availableQuestions
                          .map(q => ({ value: q.questionId, label: `[${q.questionCategory}] ${q.questionText}`, category: q.questionCategory }))
                          .sort((a, b) => {
                            const aSelected = selectedIds.includes(a.value) ? 0 : 1;
                            const bSelected = selectedIds.includes(b.value) ? 0 : 1;
                            if (aSelected !== bSelected) return aSelected - bSelected;
                            const ai = sectionOrder.indexOf(a.category);
                            const bi = sectionOrder.indexOf(b.category);
                            return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
                          })
                          .map(({ value, label }) => ({ value, label }));
                      })()}
                      selectedValues={selectedIds}
                      onChange={handleChange}
                      placeholder="Select questions for this property type"
                    />
                  </div>
                );
              })}
            </div>
          ) : (() => {
            const spt = (strata?.strataPropertyTypes ?? [])[surveyConfigStep as number];
            if (!spt) return null;
            const ptId = spt.propertyType.propertyTypeId;
            const availableQuestions = allQuestions.filter(q => !q.isSubQuestion);
            const selectedIds = surveyReqFormData[ptId] ?? [];
            const selectedQuestions = availableQuestions.filter(q => selectedIds.includes(q.questionId));
            const sectionOrder = SURVEY_SECTIONS.map(s => s.label);
            const categories = [...new Set(selectedQuestions.map(q => q.questionCategory))]
              .sort((a, b) => {
                const ai = sectionOrder.indexOf(a);
                const bi = sectionOrder.indexOf(b);
                return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
              });

            return (
              <div>
                <h3 className="doc-req-wizard__pt-heading">{spt.propertyType.propertyTypeName}</h3>
                {selectedIds.length === 0 ? (
                  <p className="notes-empty">No questions selected for this property type. Go back to add questions.</p>
                ) : (
                  categories.map(category => {
                    const catQuestions = availableQuestions.filter(q => q.questionCategory === category);
                    const catSelectedIds = selectedIds.filter(id => catQuestions.some(q => q.questionId === id));
                    const key = `${ptId}:${category}`;
                    const isOpen = surveyReorderOpen[key] ?? false;
                    const orderedIds = (surveyReqSortOrders[key] ?? [])
                      .filter(id => catSelectedIds.includes(id))
                      .concat(catSelectedIds.filter(id => !(surveyReqSortOrders[key] ?? []).includes(id)));

                    const handleDragEnd = (event: DragEndEvent) => {
                      const { active, over } = event;
                      if (!over || active.id === over.id) return;
                      setSurveyReqSortOrders(prev => {
                        const items = [...orderedIds];
                        const oldIdx = items.indexOf(Number(active.id));
                        const newIdx = items.indexOf(Number(over.id));
                        return { ...prev, [key]: arrayMove(items, oldIdx, newIdx) };
                      });
                    };

                    return (
                      <div key={category} className="survey-category-section">
                        <div className="survey-category-header">
                          <span className="survey-category-label">{category} ({catSelectedIds.length})</span>
                          <button
                            className="btn-text-primary"
                            onClick={() => setSurveyReorderOpen(prev => ({ ...prev, [key]: !prev[key] }))}
                          >
                            {isOpen ? '▲ Close order' : '▼ Set order'}
                          </button>
                        </div>
                        {isOpen && (
                          <div className="survey-sort-order">
                            <p className="survey-sort-order-label">Drag to set display order:</p>
                            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                              <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                                {orderedIds.map(id => {
                                  const q = catQuestions.find(q => q.questionId === id);
                                  return q ? (
                                    <SortableSurveyQuestionItem key={id} id={id} text={q.questionText} />
                                  ) : null;
                                })}
                              </SortableContext>
                            </DndContext>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })()}
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


      {activeRequest && (
        <OfferAppointmentModal
          isOpen={offerModalOpen}
          onClose={() => setOfferModalOpen(false)}
          fileId={activeRequest.fileId}
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
