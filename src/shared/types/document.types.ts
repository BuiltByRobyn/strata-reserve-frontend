import type { ReviewStatus } from './entities.types';

export type { ReviewStatus };

export interface DocumentUploadData {
  documentName: string;
  file: File | null;
  documentTypeId: number | null;
  strataName: string;
  strataId: string;
  adminNotes?: string;
}

export interface DocumentType {
  documentTypeId: number;
  typeName: string;
}

export interface UploadedDocument {
  serviceRequestDocumentId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
  documentTypeId: number;
  uploadedByProfileId: string;
  notes?: string;
  reviewStatusId?: number | null;
}

export interface DocumentWithDetails {
  serviceRequestDocumentId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
  notes?: string;
  documentType: { documentTypeId: number; typeName: string };
  serviceRequest: {
    serviceRequestId: number;
    strata: { strataId: number; strataPlan: string | null; complexName: string | null };
  };
  uploadedBy: { id: string; firstName?: string | null; lastName?: string | null; displayName?: string | null };
  reviewStatus?: { reviewStatusId: number; statusName: string } | null;
}

export interface RequiredDocumentChecklist {
  requiredDocumentId: number;
  isRequired: boolean;
  documentType: { documentTypeId: number; typeName: string };
  uploadedDocument?: UploadedDocument | null;
}

export interface DocumentPreviewData {
  documentId: number;
  fileName: string;
  documentType: string;
  signedUrl: string;
  expiresIn: number;
}

export interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number | null;
  documentName: string;
  endpoint?: 'admin' | 'client';
}