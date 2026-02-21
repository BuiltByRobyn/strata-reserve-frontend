export interface ServiceRequestDocumentRequirement {
  srDocRequirementId: number;
  serviceRequestId: number;
  documentTypeId: number;
  propertyTypeId: number | null;
  isRequired: boolean;
  quantity: number;
  notes: string | null;
  documentType: { documentTypeId: number; typeName: string };
  propertyType: { propertyTypeId: number; propertyTypeName: string } | null;
}

export interface CreateSRDocRequirementInput {
  documentTypeId: number;
  propertyTypeId?: number | null;
  isRequired?: boolean;
  quantity?: number;
  notes?: string | null;
}

export interface UpdateSRDocRequirementInput {
  isRequired?: boolean;
  quantity?: number;
  notes?: string | null;
}
