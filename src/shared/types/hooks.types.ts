import type {
  AppointmentWithDetails,
  Company,
  CompanyHoliday,
  InspectorAvailableDate,
  ServiceRequest,
  Strata,
  UserWithStratas,
  UserType,
  LegalType,
  PropertyType,
  Service,
  Section,
  QuestionType
} from './entities.types';
import type { DocumentWithDetails, DocumentType, ReviewStatus } from './document.types';
import type { AdminQuestion } from './survey.types';

export interface AppointmentsState {
  appointments: AppointmentWithDetails[];
  loading: boolean;
  error: string | null;
}

export interface CompaniesState {
  companies: Company[];
  loading: boolean;
  error: string | null;
}

export interface CompanyHolidaysState {
  holidays: CompanyHoliday[];
  loading: boolean;
  error: string | null;
}

export interface DocumentsState {
  documents: DocumentWithDetails[];
  loading: boolean;
  error: string | null;
}

export interface InspectorAvailabilityState {
  availableDates: InspectorAvailableDate[];
  loading: boolean;
  error: string | null;
}

export interface LookupState {
  userTypes: UserType[];
  legalTypes: LegalType[];
  propertyTypes: PropertyType[];
  services: Service[];
  documentTypes: DocumentType[];
  reviewStatuses: ReviewStatus[];
  sections: Section[];
  questionTypes: QuestionType[];
  loading: boolean;
  error: string | null;
}

export interface StrataState {
  stratas: Strata[];
  loading: boolean;
  error: string | null;
}

export interface UsersState {
  users: UserWithStratas[];
  loading: boolean;
  error: string | null;
}

export interface ServiceRequestsState {
  serviceRequests: ServiceRequest[];
  loading: boolean;
  error: string | null;
}

export interface QuestionsState {
  questions: AdminQuestion[];
  loading: boolean;
  error: string | null;
}

export interface FetchUsersParams {
  search?: string;
  strataId?: number;
  userTypeId?: number;
}

export interface PropertyTypeContextType {
  propertyTypes: PropertyType[];
  loading: boolean;
  refetch: () => Promise<void>;
}