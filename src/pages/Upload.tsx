import { useState } from 'react';

const API_URL = 'http://localhost:3000';

export const Upload = () => {
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    setIsUploading(true);
    setUploadStatus('Uploading...');
    
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    
    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
      });
      const text = await res.text();
      
      try {
        const json = JSON.parse(text);
        setUploadStatus(JSON.stringify(json, null, 2));
      } catch {
        setUploadStatus(text);
      }
    } catch (err: any) {
      setUploadStatus(`Error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="page-container">
      <h1>Upload Document</h1>
      <div className="upload-container">
        <label className="upload-label">
          Select Document
          <input 
            type="file" 
            onChange={uploadFile} 
            disabled={isUploading}
            style={{ display: 'none' }} 
          />
        </label>
        <p className="helper-text">Click to select a file from your computer.</p>
      </div>

      {uploadStatus && (
        <div className="response-area">
          <h3>Upload Status:</h3>
          <pre>{uploadStatus}</pre>
        </div>
      )}
    </div>
  );
};
