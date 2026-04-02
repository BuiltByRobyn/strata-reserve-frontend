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
    questionCategory: { key: string; label: string };
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
  { key: 'structural-architectural', label: 'Structural & Architectural', description: 'Information relating to the structural and architectural elements of your property' },
  { key: 'roofing', label: 'Roofing', description: 'Information relating to the roofing systems of your property' },
  { key: 'interiors', label: 'Interiors', description: 'Information relating to the private areas of your property' },
  { key: 'conveyance-system', label: 'Conveyance System', description: 'Information relating to the conveyance systems within your property' },
  { key: 'electrical-systems', label: 'Electrical Systems', description: 'Information relating to the electrical systems within your property' },
  { key: 'mechanical-systems', label: 'Mechanical Systems', description: 'Information relating to the mechanical systems within your property' },
  { key: 'amenities', label: 'Amenities', description: 'Information relating to additional amenities within your property' },
  { key: 'site-improvements', label: 'Site Improvements', description: 'Information relating to the site of your property' },
  { key: 'one-time-expenses', label: 'One Time Expenses / Financials', description: 'Information relating to one-time expenses and financials for your property' },
  { key: 'consultant-reports', label: 'Consultant Reports', description: 'Information relating to consultant reports for your property' },
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
  questionCategoryId: number;
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
  questionCategoryId: number;
  questionTypeId: number;
  serviceIds: { serviceId: number; sortOrder: number }[];
  propertyTypeIds: number[];
  multipleChoiceOptions?: { optionText: string; sortOrder: number }[];
}

export interface UpdateQuestionInput extends Partial<CreateQuestionInput> {}

export interface QuestionFormData {
  questionText: string;
  questionCategoryId: number | undefined;
  questionTypeId: number | undefined;
  isRequired: boolean;
  allowNa: boolean;
  allowUnavailable: boolean;
  informationText: string;
  serviceId: number | undefined;
  propertyTypeIds: number[];
  multipleChoiceOptions: { optionText: string; sortOrder: number }[];
}