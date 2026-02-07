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
    strataEmployees: number;
    strataServices: number;
  };
}

export interface StrataWithDetails extends Strata {
  company: Company | null;
  legalType: LegalType | null;
  propertyType: PropertyType | null;
  strataNotes: StrataNoteWithCreator[];
  strataEmployees: StrataEmployeeWithProfile[];
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

export interface StrataEmployeeWithProfile extends StrataEmployee {
  profile: ProfileBasic;
}

export interface StrataEmployeeWithStrata extends StrataEmployee {
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
  middleName: string | null;
  phoneNumber: string | null;
  userTypeId: number | null;
  mustChangePassword: boolean | null;
  userType?: UserType | null;
  _count?: {
    strataEmployees: number;
  };
}

export interface ProfileWithStratas extends Profile {
  strataEmployees: StrataEmployeeWithStrata[];
}

export interface UpdateProfileInput {
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  displayName?: string;
  phoneNumber?: string | null;
  userTypeId?: number | null;
  mustChangePassword?: boolean;
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
