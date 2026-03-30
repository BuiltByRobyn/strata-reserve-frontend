import type { ReviewStatus } from './entities.types';

export type { ReviewStatus };

export type NaStatusValue = 'not_available' | 'not_applicable';

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
  fnDocRequirementId?: number | null;
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
    fileId: number;
    strata: { strataId: number; strataPlan: string | null; complexName: string | null };
  };
  uploadedBy: { id: string; firstName?: string | null; lastName?: string | null; displayName?: string | null };
  reviewStatus?: { reviewStatusId: number; statusName: string } | null;
}

export interface RequiredDocumentChecklist {
  fnDocRequirementId: number;
  fileId: number;
  documentTypeId: number;
  propertyTypeId: number | null;
  versionLabel: string;
  documentType: { documentTypeId: number; typeName: string };
  propertyType: { propertyTypeId: number; propertyTypeName: string } | null;
  naStatus: NaStatusValue | null;
  naStatusSetAt: string | null;
  uploadedDocument: {
    fileNumberDocumentId: number;
    fileName: string;
    filePath: string;
    uploadedAt: string;
    fnDocRequirementId: number | null;
  } | null;
  reviewId: number | null;
  reviewedAt: string | null;
  reviewStatus: { reviewStatusId: number; statusName: string } | null;
  denialNote: string | null;
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
  fileId: number;
  documentTypeId: number;
  propertyTypeId: number | null;
  versionLabel: string;
  notes: string | null;
  documentType: { documentTypeId: number; typeName: string };
  propertyType: { propertyTypeId: number; propertyTypeName: string } | null;
  naStatus: { status: NaStatusValue; setAt: string } | null;
  fileNumberDocuments: Array<{
    fileNumberDocumentId: number;
    fileName: string;
    filePath: string;
    uploadedAt: string;
    fnDocRequirementId: number | null;
    reviewStatus?: { reviewStatusId: number; statusName: string } | null;
    uploadedBy?: { userTypeId: number } | null;
  }>;
}

export interface UploadDocumentParams {
  token: string;
  file: File;
  documentTypeId: number;
  strataId: string;
  fnDocRequirementId?: number;
  isReplace?: boolean;
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

export interface BatchDocumentReviewItem {
  fnDocRequirementId: number;
  reviewStatusId: number;
  notes?: string;
}

export interface BatchDocumentReviewInput {
  items: BatchDocumentReviewItem[];
}

export interface DocumentReviewResultItem {
  reviewItemId: number;
  fnDocRequirementId: number;
  reviewStatus: { reviewStatusId: number; statusName: string };
  notes: string | null;
}

export interface DocumentReviewResult {
  reviewId: number;
  fileId: number;
  reviewedAt: string;
  clientNotifiedAt: string | null;
  reviewedBy: { id: string; firstName: string | null; lastName: string | null };
  items: DocumentReviewResultItem[];
}

export interface DocumentReviewResponse {
  requirements: SRDocRequirement[];
  review: DocumentReviewResult | null;
}
