import type { RequiredDocumentChecklist } from '../types/document.types';

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
