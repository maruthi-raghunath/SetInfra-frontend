import React, { useRef, useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { ApiErrorResponse, FileRecord, PaginatedResponse, ProcessFilesResponse, UploadFileResponse } from '../../types';

const UploadFilesPage = () => {
  const { study_id } = useParams<{ study_id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const [studyName, setStudyName] = useState<string>(location.state?.studyName || '');
  const [protocolFile, setProtocolFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [schemaFile, setSchemaFile] = useState<File | null>(null);
  const [existingFiles, setExistingFiles] = useState<FileRecord[]>([]);

  const protocolInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const schemaInputRef = useRef<HTMLInputElement>(null);
  const csvDisplayRef = useRef<HTMLInputElement>(null);

  const [uploadCount, setUploadCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [savingType, setSavingType] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [processSuccess, setProcessSuccess] = useState(false);

  const fetchExistingFiles = async () => {
    if (!study_id) return;
    try {
      const res = await api.get<PaginatedResponse<FileRecord>>(`/files/${study_id}`);
      setExistingFiles(res.data.data);
      
      // If all files are processed, we can consider processSuccess true
      if (res.data.data.length > 0 && res.data.data.every(f => f.is_processed)) {
        setProcessSuccess(true);
      } else if (res.data.data.length > 0 && res.data.data.some(f => !f.is_processed)) {
        // If some files are still processing, we keep showing the "wait" message
        setProcessSuccess(true); 
      }
    } catch (err) {
      console.error('Failed to fetch existing files', err);
    }
  };

  useEffect(() => {
    fetchExistingFiles();
  }, [study_id]);

  // Polling for file status
  useEffect(() => {
    let interval: any;
    const hasUnprocessed = existingFiles.some(f => !f.is_processed);
    
    if (hasUnprocessed) {
      interval = setInterval(() => {
        fetchExistingFiles();
      }, 5000); // Poll every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [existingFiles]);

  useEffect(() => {
    if (studyName) return;
    const fetchStudyName = async () => {
      if (!study_id) return;
      try {
        const res = await api.get<PaginatedResponse<{ id: string; study_name: string }>>('/studies');
        const s = res.data.data.find(x => x.id === study_id);
        setStudyName(s?.study_name || '');
      } catch {
        setStudyName('');
      }
    };
    fetchStudyName();
  }, [study_id]);

  const handleSave = async (type: string, file: File | null) => {
    if (!file || !study_id) return;
    setError('');
    setMessage('');
    setSavingType(type);

    const formData = new FormData();
    formData.append('study_id', study_id);
    formData.append('file_type', type);
    formData.append('file', file);

    try {
      await api.post<UploadFileResponse>('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadCount((prev) => prev + 1);
      setMessage(`${type} file uploaded successfully.`);
      fetchExistingFiles();
    } catch (err) {
      const apiError = err as AxiosError<ApiErrorResponse>;
      setError(apiError.response?.data?.message || `Error saving ${type} file.`);
    } finally {
      setSavingType(null);
    }
  };

  const handleProcess = async () => {
    if (!study_id) return;
    setError('');
    setMessage('');
    setProcessing(true);
    setProcessSuccess(false);

    try {
      await api.post<ProcessFilesResponse>(`/files/process/${study_id}`);
      setProcessSuccess(true);
      setMessage('Processing started in the background. Please wait for the ✅ status below.');
      fetchExistingFiles();
    } catch (err) {
      const apiError = err as AxiosError<ApiErrorResponse>;
      setError(apiError.response?.data?.message || 'Error processing files.');
    } finally {
      setProcessing(false);
    }
  };

  const renderRow = (
    label: string,
    file: File | null,
    type: string,
    inputRef: React.RefObject<HTMLInputElement>,
    setFile: (f: File | null) => void,
    onCancel: () => void,
    displayRef?: React.RefObject<HTMLInputElement>
  ) => (
    <div className="form-grid" key={type}>
      <label>{label}</label>
      <div className="file-input-wrapper">
        <input
          type="text"
          className="input-field"
          readOnly
          placeholder={`Choose ${label} file...`}
          value={file ? file.name : ''}
          ref={displayRef}
        />
        <input
          type="file"
          ref={inputRef}
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setFile(f);
          }}
        />
        <button className="btn-small" onClick={() => inputRef.current?.click()}>Browse</button>
      </div>
      <div className="button-group">
        <button
          className="btn-small btn-success"
          disabled={!file || savingType !== null}
          onClick={() => handleSave(type, file)}
        >
          {savingType === type ? 'Saving...' : 'Save'}
        </button>
        <button className="btn-small btn-danger" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );

  return (
    <section className="screen">
      <h1 className="title">SetInfra - Upload Protocol, SDTM & Schema - {studyName || '...'}</h1>
      <div className="screen-body">
        <div className="screen-wide">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {renderRow('Protocol', protocolFile, 'Protocol', protocolInputRef, setProtocolFile, () => {
              setProtocolFile(null);
              if (protocolInputRef.current) protocolInputRef.current.value = '';
            })}
            {renderRow('CSV', csvFile, 'SDTM_CSV', csvInputRef, setCsvFile, () => {
              setCsvFile(null);
              if (csvInputRef.current) csvInputRef.current.value = '';
            }, csvDisplayRef)}
            {renderRow('Schema', schemaFile, 'Schema_JSON', schemaInputRef, setSchemaFile, () => {
              setSchemaFile(null);
              if (schemaInputRef.current) schemaInputRef.current.value = '';
            })}
          </div>

          <p className="message" style={{ margin: '12px 0' }}>Schema files must be uploaded as CSV or Excel.</p>
          
          <div className="actions-row">
            <button className="btn" onClick={handleProcess} disabled={uploadCount === 0 && existingFiles.length === 0 || processing || savingType !== null}>
              {processing ? 'Processing...' : 'Process'}
            </button>
            <button
              className="btn"
              onClick={() => navigate(`/chat/new?study_id=${encodeURIComponent(study_id ?? '')}`)}
              disabled={!processSuccess}
            >
              New Chat
            </button>
            <button className="btn" onClick={() => navigate('/home')}>Home</button>
            <button className="btn" onClick={() => navigate(-1)}>Back</button>
          </div>

          {message && !processSuccess ? <p className="message success">{message}</p> : null}
          {processSuccess && !existingFiles.some(f => !f.is_processed) ? <p className="message success">Processing complete ✅</p> : null}
          {processSuccess && existingFiles.some(f => !f.is_processed) ? <p className="message">Processing started in background (wait for ✅)</p> : null}
          {error ? <p className="message error">{error}</p> : null}

          <div className="existing-files-section" style={{ marginTop: '2rem' }}>
            <h3>Files in this Study</h3>
            {existingFiles.length === 0 ? (
              <p className="message">No files uploaded yet.</p>
            ) : (
              <table className="data-table" style={{ width: '100%', marginTop: '0.5rem' }}>
                <thead>
                  <tr>
                    <th>File Name</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {existingFiles.map((file) => (
                    <tr key={file.id}>
                      <td>{file.file_name}</td>
                      <td>{file.file_type}</td>
                      <td>
                        {file.is_processed ? (
                          <span title="Processed">✅ Complete</span>
                        ) : (
                          <span title="Processing" className="processing-spin">⏳ Processing...</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .processing-spin {
          display: inline-block;
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
};

export default UploadFilesPage;
