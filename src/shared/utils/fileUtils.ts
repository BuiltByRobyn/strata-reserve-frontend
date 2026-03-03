/**
 * Parse the filename from a Content-Disposition response header.
 * Supports both `filename*=UTF-8''...` and `filename="..."` formats.
 */
export const getFilenameFromDisposition = (value: string | null): string | null => {
  if (!value) return null;
  const match = value.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  const raw = match?.[1] || match?.[2];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

/**
 * Trigger a browser file download from a Blob.
 * Creates a temporary anchor element, clicks it, and cleans up.
 */
export const triggerBlobDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
