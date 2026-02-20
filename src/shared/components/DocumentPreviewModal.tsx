import { useState, useEffect, useCallback } from 'react';
import { Modal } from './Modal';
import { LoadingSpinner } from './LoadingSpinner';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/constants';
import type { DocumentPreviewModalProps } from '../types/document.types';

const getFileType = (contentType: string): 'pdf' | 'image' | 'other' => {
  if (contentType.includes('application/pdf')) return 'pdf';
  if (contentType.startsWith('image/')) return 'image';
  return 'other';
};

export function DocumentPreviewModal({ isOpen, onClose, documentId, documentName, token, onDelete }: DocumentPreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fileContentType, setFileContentType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanup = useCallback(() => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
    }
    setError(null);
    setFileContentType('');
  }, [blobUrl]);

  useEffect(() => {
    if (!isOpen || !documentId || !token) return;

    let cancelled = false;

    const fetchPreview = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/preview-document`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ documentId }),
        });

        const contentType = response.headers.get('Content-Type') || '';

        if (contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to load preview');
        }

        if (!response.ok) {
          throw new Error('Failed to load preview');
        }

        const blob = await response.blob();
        if (!cancelled) {
          setFileContentType(contentType);
          setBlobUrl(URL.createObjectURL(blob));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load document preview.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPreview();

    return () => {
      cancelled = true;
    };
  }, [isOpen, documentId, token]);

  const handleClose = () => {
    cleanup();
    onClose();
  };

  const renderPreview = () => {
    if (!blobUrl) return null;

    const fileType = getFileType(fileContentType);

    switch (fileType) {
      case 'pdf':
        return (
          <iframe
            src={`${blobUrl}#navpanes=0`}
            title={documentName}
            className="document-preview-iframe"
          />
        );
      case 'image':
        return (
          <img
            src={blobUrl}
            alt={documentName}
            className="document-preview-image"
          />
        );
      default:
        return (
          <div className="document-preview-other">
            <p>Preview not available for this file type.</p>
            <a href={blobUrl} download={documentName} className="btn btn-primary">
              Download File
            </a>
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={documentName || 'Document Preview'}
      size="large"
      footer={
        blobUrl && (
          <div className="modal-footer-actions">
            {onDelete && (
              <button type="button" className="btn btn-delete" onClick={() => { onDelete(); handleClose(); }}>
                Delete
              </button>
            )}
            <a href={blobUrl} download={documentName} className="btn btn-primary">
              Download
            </a>
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              Close
            </button>
          </div>
        )
      }
    >
      <div className="document-preview-container">
        {loading && (
          <div className="document-preview-loading">
            <LoadingSpinner />
            <p>Loading preview...</p>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {!loading && !error && blobUrl && (
          <div className="document-preview-content">
            {renderPreview()}
          </div>
        )}
      </div>
    </Modal>
  );
}
