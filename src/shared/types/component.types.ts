import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import type { SurveySection } from './survey.types';
import type { StrataPropertyType } from './entities.types';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
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
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'small' | 'medium' | 'large' | 'preview';
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