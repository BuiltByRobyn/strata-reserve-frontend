import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import type { SurveySection, AdminQuestion } from './survey.types';
import type { StrataPropertyType, InspectorAvailableDate, CreateInspectorAvailableDateInput, UpdateInspectorAvailableDateInput, AppointmentRequest, AppointmentWithDetails, AppointmentTimeSlot, Profile, ReviewStatus } from './entities.types';
import type { SRDocRequirement } from './document.types';
import type { BatchDocumentReviewInput, DocumentReviewResult, RequiredDocumentChecklist, NaStatusValue } from './document.types';
import type { AdminProfileFormData } from './entities.types';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T, index: number) => ReactNode;
  width?: string;
}

export interface DataTableProps<T> {
  title?: string;
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  actions?: (item: T) => ReactNode;
  actionsColumnHeader?: string;
}

export interface BaseFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  helpText?: string;
}

export interface InputFieldProps extends BaseFieldProps,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  type?: 'text' | 'email' | 'tel' | 'password' | 'number' | 'url' | 'date' | 'time';
}

export interface SelectFieldProps extends BaseFieldProps,
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  options: { value: string | number; label: string }[];
  placeholder?: string;
}

export interface TextareaFieldProps extends BaseFieldProps,
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  rows?: number;
}

export interface FormRowProps {
  children: ReactNode;
}

export interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireClient?: boolean;
  allowedRoles?: Array<'admin' | 'inspector' | 'assistant' | 'client'>;
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'small' | 'medium' | 'large' | 'preview';
  className?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export interface Tab {
  key: string;
  label: string;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (key: string) => void;
  variant?: 'default' | 'pill';
}

export interface SurveyProgressBarProps {
  answered: number;
  total: number;
}

export interface SurveyCategoryNavProps {
  sections: SurveySection[];
  activeSection: string;
  onSelect: (sectionKey: string) => void;
  completionMap?: Record<string, boolean>;
}

export interface MobileDropdownProps {
  label: string;
  value: string;
  options: { key: string; label: string }[];
  onChange: (value: string) => void;
}

export interface MultiSelectDropdownProps extends BaseFieldProps {
  options: { value: number; label: string }[];
  selectedValues: number[];
  onChange: (values: number[]) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
}

export interface SingleSelectDropdownProps extends BaseFieldProps {
  options: { value: string | number; label: string }[];
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  style?: import('react').CSSProperties;
}

export interface PropertyTypeSelectorProps {
  availablePropertyTypes: StrataPropertyType[];
  onRequestSubmitted: () => void;
}

export interface LegalLayoutProps {
  title: string;
  children: ReactNode;
}

export interface InspectorAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: InspectorAvailableDate | null;
  onSubmitBulkCreate: (inputs: CreateInspectorAvailableDateInput[], onProgress: (current: number, total: number) => void) => Promise<void>;
  onSubmitUpdate: (id: number, data: UpdateInspectorAvailableDateInput) => Promise<any>;
  onDeleteClick?: () => void;
  lockedInspectorProfileId?: string;
}

export interface NavItem {
  to: string;
  label: string;
  end?: boolean;
  hideForRoles?: string[];
}

export interface UserInfo {
  label: string;
  value: string;
}

export interface NavbarProps {
  variant: 'admin' | 'client';
  navItems: NavItem[];
  userInfoRows: UserInfo[];
  loading?: boolean;
}

export interface DeleteAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: InspectorAvailableDate;
  onDelete: (id: number) => Promise<any>;
}

export interface OfferAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: number;
  strataPlan: string;
  targetDate: string | null;
  appointmentTypes: import('./entities.types').AppointmentType[];
  inspectors: import('./entities.types').Profile[];
  initialTypeId: number | null;
  initialInspectorId: string | null;
  initialSecondInspectorId: string | null;
  locations: import('./entities.types').Location[];
  initialLocationId: number | null;
  onSubmit: (fileId: number, data: {
    appointmentTypeId?: number;
    inspectorProfileId?: string;
    secondInspectorProfileId?: string;
  }) => Promise<void>;
  onAddNote?: (message: string) => Promise<void>;
}

export interface AppointmentRequestReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: AppointmentRequest | null;
  inspectors: Profile[];
  onReview: (requestId: number, data: {
    approved: boolean;
    inspectorProfileId?: string;
    secondInspectorProfileId?: string;
    approvedDateChoice?: number;
    rejectionReason?: string;
    comments?: string;
  }) => Promise<any>;
}

export interface CancelAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AppointmentWithDetails | null;
  onCancel: (appointmentId: number, reason?: string) => Promise<any>;
}

export interface CompanyHolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: { holidayName: string; holidayDate: string; isRecurringAnnually?: boolean; companyHolidayId: number } | null;
  onSubmitCreate: (data: { holidayName: string; holidayDate: string; isRecurringAnnually: boolean }) => Promise<any>;
  onSubmitUpdate: (id: number, data: { holidayName: string; holidayDate: string; isRecurringAnnually: boolean }) => Promise<any>;
  onDeleteClick?: () => void;
}

export interface RescheduleAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AppointmentWithDetails | null;
  timeSlots: AppointmentTimeSlot[];
  inspectors: Profile[];
  onReschedule: (appointmentId: number, newDate: string, newTimeSlotId: number, options: {
    inspectorProfileId?: string;
    secondInspectorProfileId?: string | null;
    reason?: string;
  }) => Promise<any>;
}

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface CreateQuestionModalProps extends BaseModalProps {
  parentQuestionId?: number | null;
  onCreated?: (questionId: number) => void;
  parentQuestion?: AdminQuestion | null;
}

export interface ToastProps {
  message: string | null;
  onDismiss: () => void;
}

export interface DocumentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: number | null;
  docRequirements: SRDocRequirement[];
  reviewStatuses: ReviewStatus[];
  review: DocumentReviewResult | null;
  initialSelections?: Record<number, number>;
  loading: boolean;
  token: string;
  onSubmit: (fileId: number, input: BatchDocumentReviewInput, partial?: boolean) => Promise<void>;
}

export interface VersionDocumentRowProps {
  requirement: RequiredDocumentChecklist;
  uploading: boolean;
  onUpload: (req: RequiredDocumentChecklist, isReplace: boolean) => void;
  onSetNaStatus: (req: RequiredDocumentChecklist, status: NaStatusValue) => void;
  onPreview: (req: RequiredDocumentChecklist) => void;
  readOnly?: boolean;
}

export interface ClientCancelAppointmentModalProps {
  onConfirm: (reason?: string) => void;
  onClose: () => void;
  loading: boolean;
}

export interface InspectorAvailabilityManagerProps {
  inspectorProfileId?: string;
}

export interface ProfileFieldProps {
  label: string;
  field: keyof AdminProfileFormData;
  value: string;
  placeholder?: string;
  readOnly?: boolean;
  error?: string | null;
  type?: string;
  onChange: (field: keyof AdminProfileFormData, value: string) => void;
}