// DocumentPreviewModal - Display document preview with download option
import { useState, useEffect } from 'react';
import { Modal } from '../Modal/Modal';
import { LoadingSpinner } from '../LoadingSpinner/LoadingSpinner';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number | null;
  documentName: string;
  endpoint?: 'admin' | 'client';
}

interface PreviewData {
  documentId: number;
  fileName: string;
  documentType: string;
  signedUrl: string;
  expiresIn: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function DocumentPreviewModal({ isOpen, onClose, documentId, documentName, endpoint = 'admin' }: DocumentPreviewModalProps) {
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && documentId) {
      fetchPreviewUrl();
    }
  }, [isOpen, documentId, endpoint]);

  const fetchPreviewUrl = async () => {
    if (!documentId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/${endpoint}/documents/${documentId}/preview`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch preview');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setPreviewData(data.data);
      } else {
        throw new Error(data.error || 'Failed to load preview');
      }
    } catch (err) {
      console.error('Error fetching preview:', err);
      setError('Failed to load document preview. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFileType = (fileName: string): 'pdf' | 'image' | 'other' => {
    const extension = fileName.toLowerCase().split('.').pop();
    if (extension === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image';
    return 'other';
  };

  const renderPreview = () => {
    if (!previewData) return null;
    
    const fileType = getFileType(previewData.fileName);
    
    switch (fileType) {
      case 'pdf':
        return (
          <iframe
            src={previewData.signedUrl}
            title={previewData.fileName}
            className="document-preview-iframe"
            frameBorder="0"
          />
        );
      case 'image':
        return (
          <img
            src={previewData.signedUrl}
            alt={previewData.fileName}
            className="document-preview-image"
          />
        );
      default:
        return (
          <div className="document-preview-other">
            <p>Preview not available for this file type.</p>
            <a
              href={previewData.signedUrl}
              download={previewData.fileName}
              className="btn btn-primary"
            >
              Download File
            </a>
          </div>
        );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={documentName || 'Document Preview'}
      size="large"
      footer={
        previewData && (
          <div className="modal-footer-actions">
            <a
              href={previewData.signedUrl}
              download={previewData.fileName}
              className="btn btn-primary"
            >
              Download
            </a>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
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
        
        {!loading && !error && previewData && (
          <div className="document-preview-content">
            {renderPreview()}
          </div>
        )}
      </div>
    </Modal>
  );
}
