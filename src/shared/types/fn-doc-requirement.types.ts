export interface FileNumberDocumentRequirement {
  fnDocRequirementId: number;
  fileId: number;
  documentTypeId: number;
  propertyTypeId: number | null;
  versionLabel: string;
  notes: string | null;
  documentType: { documentTypeId: number; typeName: string };
  propertyType: { propertyTypeId: number; propertyTypeName: string } | null;
}

export interface CreateRequirementVersionInput {
  documentTypeId: number;
  propertyTypeId?: number | null;
  versionLabel: string;
}
