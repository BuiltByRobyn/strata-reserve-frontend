export const formatTypeName = (name: string): string =>
  name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

export const formatDateShort = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear().toString().slice(-2);
  return `${day} ${month} ${year}`;
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
