import { formatDate as formatDateSafe, formatDateShort as formatDateShortSafe } from './dateUtils';
export { formatDateLong, formatDateMedium, formatTime12h } from './dateUtils';

export const formatTypeName = (name: string): string =>
  name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export const formatDate = formatDateSafe;

export const formatDateShort = formatDateShortSafe;

export const getStatusBadgeClass = (statusName?: string): string => {
  if (!statusName) return 'status-badge pending';
  switch (statusName.toLowerCase()) {
    case 'approved': return 'status-badge approved';
    case 'rejected': return 'status-badge rejected';
    case 'needs revision': return 'status-badge needs-revision';
    default: return 'status-badge pending';
  }
};
