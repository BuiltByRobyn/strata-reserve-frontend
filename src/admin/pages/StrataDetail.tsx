import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useStrata } from "../../shared/hooks/useStrata";
import { useServiceRequests } from "../../shared/hooks/useServiceRequests";
import { useLookups } from "../../shared/hooks/useLookups";
import { useAuth } from "../../shared/contexts/AuthContext";
import { useSurvey } from "../../shared/hooks/useSurvey";
import { LoadingSpinner } from "../../shared/components/LoadingSpinner/LoadingSpinner";
import { Modal } from "../../shared/components/Modal/Modal";
import { Tabs } from "../../shared/components/Tabs/Tabs";
import { SurveyCategoryNav } from "../../shared/components/SurveyCategoryNav/SurveyCategoryNav";
import { SurveyProgressBar } from "../../shared/components/SurveyProgressBar/SurveyProgressBar";
import {
  InputField,
  SelectField,
  FormRow,
} from "../../shared/components/FormField/FormField";
import {
  SURVEY_SECTIONS,
  SECTION_QUESTION_RANGES,
} from "../../shared/types/survey.types";
import type { SurveyQuestion } from "../../shared/types/survey.types";
import type {
  StrataWithDetails,
  ServiceRequest,
  CreateSRFormData,
} from "../../shared/types/entities.types";

const MAIN_TABS = [
  { key: "active", label: "Active" },
  { key: "archived", label: "Archived" },
  { key: "documents", label: "Documents" },
  { key: "notes", label: "Notes" },
];

const INITIAL_SR_FORM: CreateSRFormData = {
  serviceId: "",
  requestedByFirstName: "",
  requestedByLastName: "",
  associatedCompany: "",
  contactEmail: "",
  contactPhone: "",
};

export default function StrataDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getStrataById } = useStrata();
  const {
    getActiveByStrata,
    createServiceRequest,
    deleteServiceRequest,
    serviceRequests: archivedRequests,
    refetch: fetchServiceRequests,
  } = useServiceRequests();
  const { user } = useAuth();
  const { services } = useLookups();

  const activeSurvey = useSurvey("admin");
  const archivedSurvey = useSurvey("admin");

  const [strata, setStrata] = useState<StrataWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(null);
  const [activeTab, setActiveTab] = useState("active");

  const [activeSurveySection, setActiveSurveySection] = useState("exterior");
  const [archivedSurveySection, setArchivedSurveySection] = useState("exterior");
  const [selectedArchivedId, setSelectedArchivedId] = useState<number | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [srFormData, setSrFormData] = useState<CreateSRFormData>(INITIAL_SR_FORM);
  const [srFormError, setSrFormError] = useState<string | null>(null);
  const [srSubmitting, setSrSubmitting] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

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
      fetchServiceRequests({ strataId, archived: true });
    } catch {
      setStrata(null);
    } finally {
      setLoading(false);
    }
  }, [strataId, getStrataById, getActiveByStrata, fetchServiceRequests]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeRequest) {
      activeSurvey.fetchQuestions(activeRequest.serviceRequestId);
      activeSurvey.fetchResponses(activeRequest.serviceRequestId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRequest?.serviceRequestId]);

  useEffect(() => {
    if (selectedArchivedId) {
      archivedSurvey.fetchQuestions(selectedArchivedId);
      archivedSurvey.fetchResponses(selectedArchivedId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArchivedId]);

  const handleOpenCreateModal = () => {
    setSrFormData({
      ...INITIAL_SR_FORM,
      associatedCompany: strata?.company?.companyName || "",
    });
    setSrFormError(null);
    setCreateModalOpen(true);
  };

  const handleCreateServiceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strata || !srFormData.serviceId || !user) return;

    if (!srFormData.requestedByFirstName.trim() || !srFormData.requestedByLastName.trim()) {
      setSrFormError("First name and last name are required");
      return;
    }
    if (!srFormData.contactEmail.trim()) {
      setSrFormError("Contact email is required");
      return;
    }

    setSrSubmitting(true);
    setSrFormError(null);

    try {
      const result = await createServiceRequest({
        serviceId: parseInt(srFormData.serviceId),
        strataId: strata.strataId,
        requestedByProfileId: user.id,
        notes: `Requested by: ${srFormData.requestedByFirstName} ${srFormData.requestedByLastName} | Company: ${srFormData.associatedCompany} | Email: ${srFormData.contactEmail} | Phone: ${srFormData.contactPhone}`,
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
      setActiveRequest(null);
      setDeleteModalOpen(false);
    } catch {
      // Error is handled by the hook
    } finally {
      setDeleteSubmitting(false);
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
    const range = SECTION_QUESTION_RANGES[sectionKey];
    if (!range) return [];
    return questions.filter(q => q.sortOrder >= range.start && q.sortOrder <= range.end);
  };

  const buildCompletionMap = (questions: SurveyQuestion[], responseIds: Set<number>) => {
    const map: Record<string, boolean> = {};
    for (const s of SURVEY_SECTIONS) {
      const range = SECTION_QUESTION_RANGES[s.key];
      if (!range) continue;
      const sq = questions.filter(q => q.sortOrder >= range.start && q.sortOrder <= range.end);
      map[s.key] = sq.length > 0 && sq.every(q => responseIds.has(q.questionId));
    }
    return map;
  };

  const renderAnswerValue = (
    q: SurveyQuestion,
    getResponse: (id: number) => { responseText?: string | null; responseBoolean?: boolean | null; responseNumber?: number | null; responseDate?: string | null; multipleChoiceOptionId?: number | null } | undefined,
  ) => {
    const resp = getResponse(q.questionId);
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
        ? <span className="answer-value">{new Date(resp.responseDate).toLocaleDateString()}</span>
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
    onSectionChange: (key: string) => void,
    getResponse: (id: number) => ReturnType<typeof activeSurvey.getResponseForQuestion>,
    surveyLoading: boolean,
  ) => {
    const responseIds = new Set(responses.map(r => r.questionId));
    const completionMap = buildCompletionMap(questions, responseIds);
    const sectionQuestions = getFilteredQuestions(questions, sectionKey);

    return (
      <>
        <SurveyCategoryNav
          sections={SURVEY_SECTIONS}
          activeSection={sectionKey}
          onSelect={onSectionChange}
          completionMap={completionMap}
        />

        <SurveyProgressBar answered={responses.length} total={questions.length} />

        {surveyLoading ? (
          <LoadingSpinner />
        ) : sectionQuestions.length === 0 ? (
          <div className="survey-coming-soon">
            <p>{SURVEY_SECTIONS.find(s => s.key === sectionKey)?.label} survey — no questions available.</p>
          </div>
        ) : (
          <div className="admin-survey-answers">
            {sectionQuestions.map((q) => (
              <div key={q.questionId} className="admin-answer-item">
                <div className="answer-question">{q.questionText}</div>
                <div className="answer-response">{renderAnswerValue(q, getResponse)}</div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  if (loading) return <LoadingSpinner />;

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
          <div className="action-buttons">
            <button className="btn-primary">Download Documents</button>
            <button className="btn-primary">Download Survey Answers</button>
            <button className="btn-primary">Offer Appointment</button>
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
            <span className="info-label">PROPERTY TYPE</span>
            <span className="info-value">{strata.propertyType?.propertyTypeName || "N/A"}</span>
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
            <span className="info-label">TOTAL UNITS</span>
            <span className="info-value">N/A</span>
          </div>
        </div>
      </div>

      <Tabs tabs={MAIN_TABS} activeTab={activeTab} onChange={setActiveTab} />

      <div className="tab-content">
        {activeTab === "active" && (
          <div className="tab-panel">
            {!activeRequest ? (
              <div className="empty-state">
                <h2>No Active Surveys Found</h2>
                <button className="btn-primary btn-create-sr" onClick={handleOpenCreateModal}>
                  Create New Survey Request
                </button>
              </div>
            ) : (
              <div className="active-survey">
                <div className="survey-header">
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

                {renderSurveyAnswers(
                  activeSurvey.questions,
                  activeSurvey.responses,
                  activeSurveySection,
                  setActiveSurveySection,
                  activeSurvey.getResponseForQuestion,
                  activeSurvey.loading,
                )}

                <div className="survey-actions-bottom">
                  <button
                    className="btn-delete btn-delete-survey"
                    onClick={() => setDeleteModalOpen(true)}
                  >
                    Delete Survey
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "archived" && (
          <div className="tab-panel">
            {archivedRequests.length === 0 ? (
              <div className="empty-state">
                <h2>No Archived Surveys</h2>
              </div>
            ) : selectedArchivedId ? (
              <div className="archived-survey-detail">
                <button
                  className="back-link"
                  onClick={() => setSelectedArchivedId(null)}
                >
                  &larr; Back to Archived List
                </button>
                <h2>
                  Archived Survey Answers —{" "}
                  {archivedRequests.find(r => r.serviceRequestId === selectedArchivedId)?.service?.serviceName || "Survey"}
                </h2>

                {renderSurveyAnswers(
                  archivedSurvey.questions,
                  archivedSurvey.responses,
                  archivedSurveySection,
                  setArchivedSurveySection,
                  archivedSurvey.getResponseForQuestion,
                  archivedSurvey.loading,
                )}
              </div>
            ) : (
              <div className="archived-list">
                {archivedRequests.map((sr) => (
                  <div
                    key={sr.serviceRequestId}
                    className="archived-item"
                    onClick={() => setSelectedArchivedId(sr.serviceRequestId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedArchivedId(sr.serviceRequestId)}
                  >
                    <span className="archived-service">
                      {sr.service?.serviceName || "Service Request"}
                    </span>
                    <span className="archived-date">
                      {new Date(sr.requestDate).toLocaleDateString()}
                    </span>
                    <span className={`status-badge ${sr.status.toLowerCase().replace(/\s+/g, "-")}`}>
                      {sr.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "documents" && (
          <div className="tab-panel">
            <div className="empty-state">
              <h2>Documents</h2>
              <p>Document management for this strata.</p>
            </div>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="tab-panel">
            {strata.strataNotes.length === 0 ? (
              <div className="empty-state">
                <h2>No Notes</h2>
              </div>
            ) : (
              <div className="notes-list">
                {strata.strataNotes.map((note) => (
                  <div key={note.noteId} className="note-item">
                    <p className="note-message">{note.noteMessage}</p>
                    <div className="note-meta">
                      <span>
                        {note.createdBy
                          ? `${note.createdBy.firstName || ""} ${note.createdBy.lastName || ""}`.trim()
                          : note.createdByUser || "Unknown"}
                      </span>
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Survey Request"
        size="large"
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
              label="Requested By (First Name)"
              value={srFormData.requestedByFirstName}
              onChange={(e) => updateSrField("requestedByFirstName", e.target.value)}
              placeholder="First name"
              required
            />
            <InputField
              label="Requested By (Last Name)"
              value={srFormData.requestedByLastName}
              onChange={(e) => updateSrField("requestedByLastName", e.target.value)}
              placeholder="Last name"
              required
            />
          </FormRow>

          <FormRow>
            <SelectField
              label="Request Type"
              value={srFormData.serviceId}
              onChange={(e) => updateSrField("serviceId", e.target.value)}
              options={services.map((s) => ({
                value: s.serviceId,
                label: s.serviceName,
              }))}
              placeholder="-- Select Request Type --"
              required
            />
            <InputField
              label="Associated Company"
              value={srFormData.associatedCompany}
              onChange={(e) => updateSrField("associatedCompany", e.target.value)}
              placeholder="Enter company name"
            />
          </FormRow>

          <FormRow>
            <InputField
              label="Contact Email"
              type="email"
              value={srFormData.contactEmail}
              onChange={(e) => updateSrField("contactEmail", e.target.value)}
              placeholder="Enter email address"
              required
            />
            <InputField
              label="Contact Phone Number"
              type="tel"
              value={srFormData.contactPhone}
              onChange={(e) => updateSrField("contactPhone", e.target.value)}
              placeholder="Enter phone number"
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
    </div>
  );
}
