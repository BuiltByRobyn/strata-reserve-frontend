import type { RequiredDocumentChecklist, NaStatusValue } from '../../shared/types/document.types';

interface VersionDocumentRowProps {
  requirement: RequiredDocumentChecklist;
  uploading: boolean;
  onUpload: (req: RequiredDocumentChecklist, isReplace: boolean) => void;
  onSetNaStatus: (req: RequiredDocumentChecklist, status: NaStatusValue) => void;
  onPreview: (req: RequiredDocumentChecklist) => void;
}

export function VersionDocumentRow({
  requirement,
  uploading,
  onUpload,
  onSetNaStatus,
  onPreview,
}: VersionDocumentRowProps) {
  const { versionLabel, naStatus, uploadedDocument } = requirement;
  const isUploaded = !!uploadedDocument;

  return (
    <div className={`version-row${isUploaded ? ' version-row--uploaded' : ''}`}>
      <span className="version-row__label">{versionLabel || 'Default'}</span>

      <div className="version-row__status">
        {isUploaded && <span className="uploaded-badge">Uploaded</span>}
        {!isUploaded && naStatus && (
          <span className="na-status-indicator">
            {naStatus === 'not_available' ? 'Not Available' : 'Not Applicable'}
          </span>
        )}
      </div>

      <div className="version-row__actions">
        {isUploaded && (
          <button className="btn-view" onClick={() => onPreview(requirement)}>
            View
          </button>
        )}

        {isUploaded ? (
          <button
            className="btn-replace"
            onClick={() => onUpload(requirement, true)}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Replace'}
          </button>
        ) : (
          <button
            className="btn-upload"
            onClick={() => onUpload(requirement, false)}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        )}

        <button
          className={`btn-not-available${naStatus === 'not_available' ? ' active' : ''}`}
          onClick={() => onSetNaStatus(requirement, 'not_available')}
        >
          Not Available
        </button>

        <button
          className={`btn-not-applicable${naStatus === 'not_applicable' ? ' active' : ''}`}
          onClick={() => onSetNaStatus(requirement, 'not_applicable')}
        >
          Not Applicable
        </button>
      </div>
    </div>
  );
}
