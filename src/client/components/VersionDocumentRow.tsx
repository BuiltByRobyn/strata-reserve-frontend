import type { VersionDocumentRowProps } from '../../shared/types/component.types';
import { formatNaStatus } from '../../shared/utils/formatters';

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
        {isUploaded && <span className="uploaded-file-name">{uploadedDocument!.fileName}</span>}
        {!isUploaded && naStatus && (
          <span className="na-status-indicator">
            {formatNaStatus(naStatus)}
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
