export interface SurveyQuestion {
  questionId: number;
  questionText: string;
  isRequired: boolean;
  informationText: string | null;
  questionCategory: string;
  questionType: string;
  sortOrder: number;
  multipleChoiceOptions: MultipleChoiceOption[];
  questionSections?: { sectionId: number; section: { sectionName: string } }[];
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
  multipleChoiceOptionId: number | null;
  serviceRequestId: number;
  answeredByProfileId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaveResponsePayload {
  questionId: number;
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
];

export const SECTION_QUESTION_RANGES: Record<string, { start: number; end: number }> = {
  services: { start: 1, end: 10 },
  clubhouse: { start: 11, end: 15 },
  amenity: { start: 16, end: 16 },
  legal: { start: 17, end: 20 },
  council: { start: 21, end: 22 },
};

export interface AdminQuestion {
  questionId: number;
  questionText: string;
  isRequired: boolean;
  informationText: string | null;
  questionCategory: string;
  questionTypeId: number;
  questionType: { questionTypeId: number; questionTypeName: string };
  questionServices: { questionServiceId: number; serviceId: number; sortOrder: number; service: { serviceId: number; serviceName: string } }[];
  questionPropertyTypes: { questionPropertyTypeId: number; propertyTypeId: number; propertyType: { propertyTypeId: number; propertyTypeName: string } }[];
  questionLegalTypes: { questionLegalTypeId: number; legalTypeId: number; legalType: { legalTypeId: number; legalTypeName: string } }[];
  questionSections: { questionSectionId: number; sectionId: number; section: { sectionId: number; sectionName: string } }[];
  multipleChoiceOptions: { multipleChoiceOptionId: number; optionText: string; sortOrder: number }[];
  createdAt: string;
}

export interface CreateQuestionInput {
  questionText: string;
  isRequired: boolean;
  informationText?: string | null;
  questionCategory: string;
  questionTypeId: number;
  serviceIds: { serviceId: number; sortOrder: number }[];
  propertyTypeIds: number[];
  legalTypeIds: number[];
  sectionIds: number[];
  multipleChoiceOptions?: { optionText: string; sortOrder: number }[];
}

export interface UpdateQuestionInput extends Partial<CreateQuestionInput> {}

export interface QuestionFormData {
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