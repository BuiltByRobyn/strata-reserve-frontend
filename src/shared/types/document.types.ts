import type { ReviewStatus } from './entities.types';

export type { ReviewStatus };

export interface DocumentUploadData {
  documentName: string;
  file: File | null;
  documentTypeId: number | null;
  strataName?: string;
  strataId?: string;
  notes?: string;
  propertyTypeId?: number | null;
}

export interface DocumentType {
  documentTypeId: number;
  typeName: string;
}

export interface UploadedDocument {
  fileNumberDocumentId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
  documentTypeId: number;
  uploadedByProfileId: string;
  notes?: string;
  reviewStatusId?: number | null;
  propertyTypeId?: number | null;
}

export interface DocumentWithDetails {
  fileNumberDocumentId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
  notes?: string;
  documentType: { documentTypeId: number; typeName: string };
  fileNumber: {
    fileNumberId: number;
    strata: { strataId: number; strataPlan: string | null; complexName: string | null };
  };
  uploadedBy: { id: string; firstName?: string | null; lastName?: string | null; displayName?: string | null };
  reviewStatus?: { reviewStatusId: number; statusName: string } | null;
}

export interface RequiredDocumentChecklist {
  requiredDocumentId: number;
  isRequired: boolean;
  documentType: { documentTypeId: number; typeName: string };
  propertyType?: { propertyTypeId: number; propertyTypeName: string } | null;
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
  token: string;
  onDelete?: () => void;
}

export interface SRDocRequirement {
  fnDocRequirementId: number;
  fileNumberId: number;
  documentTypeId: number;
  propertyTypeId: number | null;
  isRequired: boolean;
  quantity: number;
  notes: string | null;
  documentType: { documentTypeId: number; typeName: string };
  propertyType: { propertyTypeId: number; propertyTypeName: string } | null;
}

export interface UploadDocumentParams {
  token: string;
  file: File;
  documentTypeId: number;
  strataId: string;
  strataName?: string;
  notes?: string;
  propertyTypeId?: number;
  propertyTypeName?: string;
}

export interface SRUploadedDocument {
  fileNumberDocumentId: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
  notes?: string | null;
  documentTypeId: number;
  documentType: { documentTypeId: number; typeName: string };
  uploadedBy: { id: string; firstName?: string | null; lastName?: string | null; displayName?: string | null };
  reviewStatus?: { reviewStatusId: number; statusName: string } | null;
  propertyType?: { propertyTypeId: number; propertyTypeName: string } | null;
}
