import type { RequiredDocumentChecklist, NaStatusValue } from '../types/document.types';

export interface DocStatusInput {
  latestDoc?: {
    uploadedAt: string;
    reviewStatus?: { reviewStatusId: number; statusName: string } | null;
    uploadedBy?: { userTypeId: number } | null;
  } | null;
  naStatus?: { status: NaStatusValue; setAt: string } | null;
  reviewItem?: { reviewStatus: { reviewStatusId: number; statusName: string } } | null;
  reviewedAt?: string | null;
}

export interface DocStatusResult {
  statusName: string;
  badgeClass: string;
  type: 'na' | 'document' | 'review' | 'default';
}

export function resolveDocumentStatus(input: DocStatusInput): DocStatusResult {
  const { latestDoc, naStatus, reviewItem, reviewedAt } = input;
  const naSetAfterReview = naStatus?.setAt && reviewedAt
    && new Date(naStatus.setAt) > new Date(reviewedAt);
  const docUploadedAfterNa = latestDoc && naStatus?.setAt
    && new Date(latestDoc.uploadedAt) > new Date(naStatus.setAt);
  const uploadedByStaff = latestDoc?.uploadedBy && [1, 2, 4].includes(latestDoc.uploadedBy.userTypeId);

  // Staff uploads always override N/A
  // Client uploads override N/A only if uploaded after N/A was set
  if (naStatus && !docUploadedAfterNa && !uploadedByStaff && (!reviewItem || naSetAfterReview)) {
    const label = naStatus.status === 'not_available' ? 'Not Available' : 'Not Applicable';
    return { statusName: label, badgeClass: 'status-badge na-status', type: 'na' };
  }

  // Document exists
  if (latestDoc) {
    const uploadedAfterReview = reviewedAt && new Date(latestDoc.uploadedAt) > new Date(reviewedAt);
    if (!reviewItem || uploadedAfterReview) {
      if (latestDoc.reviewStatus) {
        return {
          statusName: latestDoc.reviewStatus.statusName,
          badgeClass: `status-badge ${latestDoc.reviewStatus.statusName.toLowerCase().replace(/\s+/g, '-')}`,
          type: 'document',
        };
      }
      return { statusName: 'Pending', badgeClass: 'status-badge pending', type: 'default' };
    }
    return {
      statusName: reviewItem.reviewStatus.statusName,
      badgeClass: `status-badge ${reviewItem.reviewStatus.statusName.toLowerCase().replace(/\s+/g, '-')}`,
      type: 'review',
    };
  }

  return { statusName: 'Not Received', badgeClass: 'status-badge not-received', type: 'default' };
}

export function groupByDocumentType<T extends { documentType: { typeName: string } }>(
  items: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = item.documentType.typeName;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}

export function isDocDenied(req: RequiredDocumentChecklist): boolean {
  const s = req.reviewStatus?.statusName?.toLowerCase() ?? '';
  return s.includes('deny') || s.includes('reject');
}

export function isDocAddressed(req: RequiredDocumentChecklist): boolean {
  if (isDocDenied(req)) return false;
  return !!req.uploadedDocument || !!req.naStatus;
}

export function isPropertyTypeGroupComplete(reqs: RequiredDocumentChecklist[]): boolean {
  return reqs.length > 0 && reqs.every(isDocAddressed);
}

export function areAllDocsAddressed(reqs: RequiredDocumentChecklist[]): boolean {
  return reqs.length > 0 && reqs.every(r => {
    if (isDocDenied(r)) {
      if (r.naStatus && r.naStatusSetAt && r.reviewedAt) {
        return new Date(r.naStatusSetAt) > new Date(r.reviewedAt);
      }
      if (!r.uploadedDocument || !r.reviewedAt) return false;
      return new Date(r.uploadedDocument.uploadedAt) > new Date(r.reviewedAt);
    }
    return !!r.uploadedDocument || !!r.naStatus;
  });
}
