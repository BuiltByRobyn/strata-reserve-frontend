import type { VersionDocumentRowProps } from '../../shared/types/component.types';
import { formatNaStatus } from '../../shared/utils/formatters';

export function VersionDocumentRow({
  requirement,
  uploading,
  onUpload,
  onSetNaStatus,
  onPreview,
  readOnly = false,
}: VersionDocumentRowProps) {
  const { versionLabel, naStatus, naStatusSetAt, uploadedDocument, reviewStatus, denialNote, reviewedAt } = requirement;
  const isUploaded = !!uploadedDocument;
  const isDenied = (() => {
    const s = reviewStatus?.statusName?.toLowerCase() ?? '';
    return s.includes('deny') || s.includes('reject');
  })();
  const isRespondedAfterDenial = isDenied && !!reviewedAt && (
    (!!naStatus && !!naStatusSetAt && new Date(naStatusSetAt) > new Date(reviewedAt)) ||
    (!!uploadedDocument && new Date(uploadedDocument.uploadedAt) > new Date(reviewedAt))
  );

  return (
    <div className={`version-row${isUploaded ? ' version-row--uploaded' : ''}${isDenied && !isRespondedAfterDenial ? ' version-row--denied' : ''}`}>
      <span className="version-row__label">{versionLabel || 'Default'}</span>

      <div className="version-row__status">
        {isUploaded && !naStatus && <span className="uploaded-file-name">{uploadedDocument!.fileName}</span>}
        {isRespondedAfterDenial && !naStatus && <span className="version-row__replaced-badge">Replaced</span>}
        {isDenied && !isRespondedAfterDenial && <span className="version-row__denied-badge">Denied</span>}
        {isDenied && !isRespondedAfterDenial && denialNote && (
          <span className="version-row__denial-note">{denialNote}</span>
        )}
        {naStatus && (
          <span className="na-status-indicator">
            {formatNaStatus(naStatus)}
          </span>
        )}
      </div>

      <div className="version-row__actions">
        {isUploaded && !naStatus && (
          <button className="btn-view" onClick={() => onPreview(requirement)}>
            View
          </button>
        )}

        {!readOnly && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
