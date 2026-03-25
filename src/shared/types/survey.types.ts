export interface SurveyQuestion {
  fnSurveyQuestionId: number;
  propertyTypeId: number;
  propertyTypeName: string;
  questionId: number;
  parentQuestionId: number | null;
  subLabel: string | null;
  questionText: string;
  isRequired: boolean;
  allowNa: boolean;
  allowUnavailable: boolean;
  informationText: string | null;
  questionCategory: string;
  questionType: string;
  sortOrder: number;
  multipleChoiceOptions: MultipleChoiceOption[];
}

export interface MultipleChoiceOption {
  optionId: number;
  optionText: string;
  sortOrder: number;
}

export interface SurveyResponse {
  responseId: number;
  responseText: string | null;
  responseDate: string | null;
  responseNumber: number | null;
  responseBoolean: boolean | null;
  questionId: number;
  propertyTypeId: number;
  parentQuestionId: number | null;
  multipleChoiceOptionId: number | null;
  fileId: number;
  answeredByProfileId: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface ArchivedSurveyResponse extends SurveyResponse {
  answeredBy: { id: string; firstName: string | null; lastName: string | null; displayName: string | null } | null;
  multipleChoiceOption: { multipleChoiceOptionId: number; optionText: string } | null;
  question: {
    questionId: number;
    questionText: string;
    isRequired: boolean;
    informationText: string | null;
    questionCategory: string;
    questionType: { questionTypeName: string };
    multipleChoiceOptions: { multipleChoiceOptionId: number; optionText: string; sortOrder: number }[];
  };
}

export interface SaveResponsePayload {
  questionId: number;
  propertyTypeId: number;
  parentQuestionId?: number | null;
  responseText?: string | null;
  responseDate?: string | null;
  responseNumber?: number | null;
  responseBoolean?: boolean | null;
  multipleChoiceOptionId?: number | null;
}

export interface SurveySection {
  key: string;
  label: string;
  description: string;
}

export const SURVEY_SECTIONS: SurveySection[] = [
  { key: 'exterior', label: 'Exterior', description: 'Information relating to the public facing areas of your property' },
  { key: 'interior', label: 'Interior', description: 'Information relating to the private areas of your property' },
  { key: 'services', label: 'Services', description: 'Information relating to the services available within your property' },
  { key: 'clubhouse', label: 'Clubhouse', description: 'Information relating to the public facing areas of your property' },
  { key: 'amenity', label: 'Amenity Room', description: 'Information relating to additional amenities within your property' },
  { key: 'legal', label: 'Legal', description: 'Information relating to the legal standing of your property' },
  { key: 'council', label: 'Council Concerns', description: 'Information relating to specific concerns regarding your property' },
  { key: 'septic-fields', label: 'Septic Fields', description: 'Information relating to the septic field and wastewater systems within your property' },
];


export interface AdminQuestion {
  questionId: number;
  isSubQuestion: boolean;
  subLabel: string | null;
  questionText: string;
  isRequired: boolean;
  allowNa: boolean;
  allowUnavailable: boolean;
  informationText: string | null;
  questionCategory: string;
  questionTypeId: number;
  questionType: { questionTypeId: number; questionTypeName: string };
  questionServices: { questionServiceId: number; serviceId: number; sortOrder: number; service: { serviceId: number; serviceName: string } }[];
  questionPropertyTypes: { questionPropertyTypeId: number; propertyTypeId: number; propertyType: { propertyTypeId: number; propertyTypeName: string } }[];
  multipleChoiceOptions: { multipleChoiceOptionId: number; optionText: string; sortOrder: number }[];
  subQuestions?: { questionId: number; subLabel: string | null; questionText: string; isRequired: boolean; questionTypeId: number; questionCategory: string; informationText: string | null }[];
  createdAt: string;
}

export interface CreateQuestionInput {
  questionText: string;
  isRequired: boolean;
  allowNa?: boolean;
  allowUnavailable?: boolean;
  informationText?: string | null;
  questionCategory: string;
  questionTypeId: number;
  serviceIds: { serviceId: number; sortOrder: number }[];
  propertyTypeIds: number[];
  multipleChoiceOptions?: { optionText: string; sortOrder: number }[];
}

export interface UpdateQuestionInput extends Partial<CreateQuestionInput> {}

export interface QuestionFormData {
  questionText: string;
  questionCategory: string;
  questionTypeId: number | undefined;
  isRequired: boolean;
  allowNa: boolean;
  allowUnavailable: boolean;
  informationText: string;
  serviceId: number | undefined;
  propertyTypeIds: number[];
  multipleChoiceOptions: { optionText: string; sortOrder: number }[];
}