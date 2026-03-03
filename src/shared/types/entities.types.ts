export interface UserType {
  userTypeId: number;
  userTypeName: string;
}

export interface LegalType {
  legalTypeId: number;
  legalTypeName: string;
}

export interface PropertyType {
  propertyTypeId: number;
  propertyTypeName: string;
  description: string | null;
}

export interface Section {
  sectionId: number;
  sectionName: string;
}

export interface QuestionType {
  questionTypeId: number;
  questionTypeName: string;
}

export interface Service {
  serviceId: number;
  serviceName: string;
  serviceDescription: string | null;
}

export interface Location {
  locationId: number;
  locationCode: string;
  locationName: string;
}

export interface StrataSection {
  strataSectionId: number;
  strataId: number;
  sectionId: number;
  section: Section;
}

export interface StrataProfileSection {
  strataProfileSectionId: number;
  strataProfileId: number;
  sectionId: number;
  section: Section;
}

export interface Company {
  companyId: number;
  companyName: string;
  companyTelephone: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    stratas: number;
  };
}

export interface CreateCompanyInput {
  companyName: string;
  companyTelephone?: string;
}

export interface UpdateCompanyInput {
  companyName?: string;
  companyTelephone?: string | null;
}

export interface StrataBasic {
  strataId: number;
  strataPlan: string | null;
  complexName: string | null;
  town: string | null;
}

export interface StrataPropertyType {
  strataPropertyTypeId: number;
  strataId: number;
  propertyTypeId: number;
  propertyType: PropertyType;
}

export interface Strata extends StrataBasic {
  unitNumber: string | null;
  streetName: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  website: string | null;
  legalTypeId: number | null;
  propertyTypeId: number | null;
  companyId: number | null;
  locationId: number | null;
  fiscalYearEnd: string | null;
  createdAt: string;
  updatedAt: string;
  company?: { companyId: number; companyName: string } | null;
  legalType?: { legalTypeId: number; legalTypeName: string } | null;
  propertyType?: { propertyTypeId: number; propertyTypeName: string } | null;
  location?: Location | null;
  strataSections?: StrataSection[];
  strataPropertyTypes?: StrataPropertyType[];
  _count?: {
    strataNotes: number;
    strataProfiles: number;
    serviceRequests: number;
  };
}

export interface DocumentNote {
  serviceRequestDocumentId: number;
  notes: string | null;
  uploadedAt: string;
  fileName: string;
  uploadedBy: ProfileBasic | null;
}

export interface StrataWithDetails extends Strata {
  company: Company | null;
  legalType: LegalType | null;
  propertyType: PropertyType | null;
  strataNotes: StrataNoteWithCreator[];
  strataProfiles: StrataProfileWithProfile[];
  strataSections: StrataSection[];
  serviceRequests?: { serviceRequestDocuments: DocumentNote[] }[];
}

export type StrataInfo = Pick<
  Strata,
  'strataId' | 'strataPlan' | 'complexName' | 'streetName' | 'town' | 'province' | 'postalCode' | 'legalType' | 'propertyType'
>;

export interface StrataProfileResult {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
}

export interface StrataMemberInfo {
  profileId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  position: string | null;
}

export interface CreateStrataInput {
  strataPlan?: string;
  complexName?: string;
  unitNumber?: string;
  streetName?: string;
  town?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  legalTypeId?: number;
  propertyTypeId?: number;
  companyId?: number;
  locationId?: number | null;
  sectionIds?: number[];
  propertyTypeIds?: number[];
  fiscalYearEnd?: string;
  companyName?: string;
}

export interface UpdateStrataInput extends Partial<CreateStrataInput> {}

// ============================================
// Strata Note Types
// ============================================

export interface StrataNoteBasic {
  noteId: number;
  noteMessage: string;
  createdAt: string;
  createdByUser: string | null;
  strataId: number;
  createdByProfileId: string | null;
}

export interface StrataNoteWithCreator extends StrataNoteBasic {
  createdBy: ProfileBasic | null;
}

export interface CreateStrataNoteInput {
  noteMessage: string;
  createdByProfileId?: string;
  createdByUser?: string;
}

// ============================================
// Strata Employee Types
// ============================================

export interface StrataEmployee {
  strataEmployeeId: number;
  strataPosition: string | null;
  strataId: number;
  profileId: string;
  createdAt: string;
}

export interface StrataProfileWithProfile extends StrataEmployee {
  profile: ProfileBasic;
  strataProfileSections?: StrataProfileSection[];
}

export interface StrataProfilePropertyType {
  strataProfilePropertyTypeId?: number;
  propertyTypeId: number;
  propertyType: PropertyType;
}

export interface StrataProfileWithStrata extends StrataEmployee {
  strata: StrataBasic & {
    company?: { companyName: string } | null;
    strataPropertyTypes?: StrataPropertyType[];
  };
  strataProfileSections?: StrataProfileSection[];
  strataProfilePropertyTypes?: StrataProfilePropertyType[];
}

export interface CreateStrataEmployeeInput {
  profileId: string;
  strataPosition?: string;
}


// ============================================
// Profile Types (Extended)
// ============================================

export interface ProfileBasic {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  email?: string | null;
}

export interface Profile extends ProfileBasic {
  isAdmin: boolean | null;
  createdAt: string;
  phoneNumber: string | null;
  userTypeId: number | null;
  mustChangePassword: boolean | null;
  companyName?: string | null;
  userType?: UserType | null;
  _count?: {
    strataProfiles: number;
  };
}



export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface CompanyWithStratas extends Company {
  stratas: Strata[];
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  userTypeId: number;
  companyName?: string;
  strataAssociations: Array<{
    strataId: number;
    strataPosition?: string;
    sectionIds?: number[];
    propertyTypeIds?: number[];
  }>;
}

export interface UserWithStratas extends Profile {
  strataProfiles: StrataProfileWithStrata[];
}

// ============================================
// Appointment Types
// ============================================

export interface ReviewStatus {
  reviewStatusId: number;
  statusName: string; // Approved, Rejected, Needs Revision
}

export interface AppointmentTimeSlot {
  timeSlotId: number;
  slotTime: string; // hh:mm:ss format
  slotName: string; // 10AM, 2PM, 6PM
}

export interface AppointmentType {
  appointmentTypeId: number;
  typeName: string; // Standard Inspection, Elevator Assessment, Draft Meeting
  durationType: string; // Half Day, Full Day
  description: string | null;
  isDraftMeeting: boolean;
  serviceId: number;
  service?: Service;
}

export interface ServiceRequest {
  serviceRequestId: number;
  requestDate: string;
  status: string; // Draft, Pending Approval, Approved, Rejected, Appointment Scheduled, Completed
  submittedForReviewDate: string | null;
  notes: string | null;
  archived: boolean;
  archivedDate: string | null;
  serviceId: number;
  strataId: number;
  requestedByProfileId: string;
  fiscalYearEnd?: string | null;
  lastAgmDate?: string | null;
  noAgmToDate?: boolean;
  lastDepreciationReportDate?: string | null;
  noReportToDate?: boolean;
  targetDate?: string | null;
  appointmentOfferedAt?: string | null;
  appointmentOfferedByProfileId?: string | null;
  appointmentOfferTypeId?: number | null;
  appointmentOfferInspectorId?: string | null;
  appointmentOfferSecondInspectorId?: string | null;
  rebookingRequestedAt?: string | null;
  service?: Service;
  strata?: Strata;
  requestedBy?: ProfileBasic;
  clientPropertyTypes?: Array<{ propertyTypeId: number }>;
  latestDocumentUploadDate?: string | null;
  latestSurveyAnswerDate?: string | null;
  appointments?: Array<{
    appointmentId: number;
    appointmentDate: string;
    status: string;
    timeSlotId: number;
  }>;
  _count?: {
    questionResponses: number;
    serviceRequestDocuments: number;
    appointments: number;
  };
}

export interface ServiceRequestWithDetails extends ServiceRequest {
  service: Service;
  strata: Strata;
  requestedBy: ProfileBasic;
  _count?: {
    questionResponses: number;
    serviceRequestDocuments: number;
    appointments: number;
  };
}

export interface CreateServiceRequestInput {
  serviceId: number;
  strataId: number;
  requestedByProfileId: string;
  notes?: string;
}

export interface AppointmentRequest {
  appointmentRequestId: number;
  firstChoiceDate: string;
  secondChoiceDate: string | null;
  specialRequirements: string | null;
  status: string; // Pending Review, Approved, Rejected, Cancelled
  requestDate: string;
  serviceRequestId: number;
  appointmentTypeId: number;
  firstChoiceTimeSlotId: number;
  secondChoiceTimeSlotId: number | null;
  requestedByProfileId: string;
  appointmentType?: AppointmentType;
  firstChoiceTimeSlot?: AppointmentTimeSlot;
  secondChoiceTimeSlot?: AppointmentTimeSlot | null;
  requestedBy?: ProfileBasic;
  serviceRequest?: {
    serviceRequestId: number;
    status: string;
    requestDate: string;
    strata: StrataBasic;
    service: Service;
    requestedBy?: ProfileBasic;
    appointmentOfferInspector?: ProfileBasic | null;
    appointmentOfferSecondInspector?: ProfileBasic | null;
  };
}

export interface AppointmentReview {
  appointmentReviewId: number;
  reviewDate: string;
  approvedDateChoice: number | null; // 1 or 2
  comments: string | null;
  rejectionReason: string | null;
  appointmentRequestId: number;
  reviewedByProfileId: string;
  reviewStatusId: number;
  reviewStatus?: ReviewStatus;
  reviewedBy?: ProfileBasic;
}

export interface Appointment {
  appointmentId: number;
  appointmentDate: string;
  status: string; // Scheduled, Completed, Cancelled, Rescheduled
  completionNote: string | null;
  completedAt: string | null;
  appointmentRequestId: number;
  serviceRequestId: number;
  appointmentTypeId: number;
  timeSlotId: number;
  inspectorProfileId: string | null;
}

export interface AppointmentWithDetails extends Appointment {
  appointmentType: AppointmentType;
  timeSlot: AppointmentTimeSlot;
  serviceRequest: {
    serviceRequestId: number;
    strata: StrataBasic;
    service: Service;
    appointmentOfferSecondInspector?: ProfileBasic | null;
  };
  appointmentRequest?: AppointmentRequest;
  inspector: ProfileBasic | null;
}

// ============================================
// Inspector Availability Types
// ============================================

export interface InspectorAvailableLocation {
  inspectorAvailableLocationId: number;
  inspectorAvailableDateId: number;
  locationCode: string;
}

export interface InspectorAvailableDate {
  inspectorAvailableDateId: number;
  availableStartDate: string;
  availableEndDate: string;
  availableStartTime: string | null;
  availableEndTime: string | null;
  createdAt: string;
  inspectorProfileId: string;
  inspectorProfile?: ProfileBasic;
  locations: InspectorAvailableLocation[];
}

export interface CreateInspectorAvailableDateInput {
  availableStartDate: string;
  availableEndDate: string;
  availableStartTime?: string;
  availableEndTime?: string;
  inspectorProfileId: string;
  locationCodes: string[];
}

export interface UpdateInspectorAvailableDateInput {
  availableStartDate?: string;
  availableEndDate?: string;
  availableStartTime?: string | null;
  availableEndTime?: string | null;
  locationCodes?: string[];
}

// ============================================
// Company Holiday Types
// ============================================

export interface CompanyHoliday {
  companyHolidayId: number;
  holidayDate: string;
  holidayName: string;
  isRecurringAnnually: boolean;
}

export interface CreateCompanyHolidayInput {
  holidayDate: string;
  holidayName: string;
  isRecurringAnnually?: boolean;
}

export interface UpdateCompanyHolidayInput {
  holidayDate?: string;
  holidayName?: string;
  isRecurringAnnually?: boolean;
}

// ============================================
// Property Type Request Types
// ============================================

export interface PropertyTypeRequest {
  propertyTypeRequestId: number;
  strataProfileId: number;
  requestedPropertyTypeIds: number[];
  status: string;
  rejectionReason: string | null;
  reviewedByProfileId: string | null;
  createdAt: string;
  reviewedAt: string | null;
  strataProfile?: {
    profile: ProfileBasic & { email?: string | null };
    strata: StrataBasic;
  };
  reviewedBy?: ProfileBasic | null;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type ApiListResponse<T> = ApiResponse<T[]>;
export type ApiSingleResponse<T> = ApiResponse<T>;

export interface StrataAssociation {
  strataId: number;
  strataPosition?: string;
  sectionIds?: number[];
  propertyTypeIds?: number[];
}

export interface BaseProfileFormData {
  companyName: string;
  role: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  email: string;
}

export interface AdminProfileFormData extends BaseProfileFormData {
  contactName: string;
}

export interface ClientProfileFormData extends BaseProfileFormData {
  firstName: string;
  lastName: string;
  cellNumber: string;
  officeNumber: string;
}

export interface EditableField {
  [key: string]: boolean;
}

export interface CreateSRFormData {
  serviceId: string;
}

export interface UpdateAdminProfileInput {
  fullName?: string;
  email?: string;
  companyName?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
}

export interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  userTypeId: number | undefined;
  companyName: string;
  strataAssociations: StrataAssociation[];
}

export type AuthFetchFn = (url: string, options?: RequestInit) => Promise<Response>;