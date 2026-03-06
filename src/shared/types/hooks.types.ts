import type {
  AppointmentWithDetails,
  Company,
  CompanyHoliday,
  InspectorAvailableDate,
  Location,
  FileNumber,
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
  locations: Location[];
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

export interface FileNumbersState {
  fileNumbers: FileNumber[];
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

export interface UseCrudModalOptions<TItem, TFormData> {
  initialFormData: TFormData;
  itemToFormData: (item: TItem) => TFormData;
  onSubmit: (formData: TFormData, editingItem: TItem | null) => Promise<void>;
}