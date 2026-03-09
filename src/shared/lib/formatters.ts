import { formatDate as formatDateSafe, formatDateShort as formatDateShortSafe, parseTimestamp } from './dateUtils';
export { formatDateLong, formatDateMedium, formatTime12h, parseTimestamp } from './dateUtils';

export const formatRelativeTime = (value: string | null | undefined): string => {
  const date = parseTimestamp(value);
  if (!date) return 'Recently';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatTypeName = (name: string): string =>
  name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export const formatDate = formatDateSafe;

export const formatDateShort = formatDateShortSafe;

export const getUserDisplayName = (
  user: { displayName?: string | null; firstName?: string | null; lastName?: string | null } | null | undefined,
  fallback = 'Unknown'
): string => {
  if (!user) return fallback;
  return user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || fallback;
};

export const getStatusBadgeClass = (statusName?: string): string => {
  if (!statusName) return 'status-badge pending';
  switch (statusName.toLowerCase()) {
    case 'approved': return 'status-badge approved';
    case 'rejected': return 'status-badge rejected';
    case 'needs revision': return 'status-badge needs-revision';
    default: return 'status-badge pending';
  }
};
