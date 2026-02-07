// Entity types for Strata Reserve Planning

// ============================================
// Lookup Types
// ============================================

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

export interface Service {
  serviceId: number;
  serviceName: string;
  serviceDescription: string | null;
}

// ============================================
// Company Types
// ============================================

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

export interface CompanyWithStratas extends Company {
  stratas: StrataBasic[];
}

export interface CreateCompanyInput {
  companyName: string;
  companyTelephone?: string;
}

export interface UpdateCompanyInput {
  companyName?: string;
  companyTelephone?: string | null;
}

// ============================================
// Strata Types
// ============================================

export interface StrataBasic {
  strataId: number;
  strataPlan: string | null;
  complexName: string | null;
  town: string | null;
}

export interface Strata {
  strataId: number;
  strataPlan: string | null;
  complexName: string | null;
  unitNumber: string | null;
  streetName: string | null;
  town: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  website: string | null;
  legalTypeId: number | null;
  propertyTypeId: number | null;
  companyId: number | null;
  createdAt: string;
  updatedAt: string;
  company?: { companyId: number; companyName: string } | null;
  legalType?: { legalTypeId: number; legalTypeName: string } | null;
  propertyType?: { propertyTypeId: number; propertyTypeName: string } | null;
  _count?: {
    strataNotes: number;
    strataProfiles: number;
    strataServices: number;
  };
}

export interface StrataWithDetails extends Strata {
  company: Company | null;
  legalType: LegalType | null;
  propertyType: PropertyType | null;
  strataNotes: StrataNoteWithCreator[];
  strataProfiles: StrataProfileWithProfile[];
  strataServices: StrataServiceWithDetails[];
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
}

export interface StrataProfileWithStrata extends StrataEmployee {
  strata: StrataBasic & {
    company?: { companyName: string } | null;
  };
}

export interface CreateStrataEmployeeInput {
  profileId: string;
  strataPosition?: string;
}

// ============================================
// Strata Service Types
// ============================================

export interface StrataService {
  strataServiceId: number;
  strataId: number;
  serviceId: number;
  createdAt: string;
}

export interface StrataServiceWithDetails extends StrataService {
  service: Service;
}

export interface CreateStrataServiceInput {
  serviceId: number;
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

export interface ProfileWithStratas extends Profile {
  strataProfiles: StrataProfileWithStrata[];
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phoneNumber?: string | null;
  userTypeId?: number | null;
  mustChangePassword?: boolean;
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
  service?: Service;
  strata?: Strata;
  requestedBy?: ProfileBasic;
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
  };
  appointmentRequest?: AppointmentRequest;
  inspector: ProfileBasic | null;
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
