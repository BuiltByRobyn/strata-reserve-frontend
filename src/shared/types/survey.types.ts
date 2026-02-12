export interface SurveyQuestion {
  questionId: number;
  questionText: string;
  isRequired: boolean;
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
